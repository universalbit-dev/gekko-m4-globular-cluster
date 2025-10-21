/**
 * Microstructure trading bot: modular, auto-tuned, multi-timeframe.
 * Enhanced: syncs live trading with latest backtest results for adaptive position management!
 * Executes real trades if credentials are set!
 * Optimized: Uses only autoTune_results.json for indicator configuration and supports dynamic metric selection.
 * Robust: Never crashes or gets stuck. Recoverable after log cleaning or file errors.
 * Diagnostics: Tracks cycles, last error, and last trade for runtime visibility.
 * Improvements:
 * - Enhanced backtest stats diagnostics (pinpoints missing tf, variant, or strategy)
 * - Logs possible causes for missing stats
 * - Reports available strategies for each timeframe/variant when missing
 * - Prints a summary of last N cycles and errors
 */

const path = require('path');
const fs = require('fs');
const ccxt = require('ccxt');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { scoreTrade } = require('../tradeQualityScore');

const autoTuneResultsPath = path.resolve(__dirname, '../evaluation/autoTune_results.json');
const OHLCV_DIR = path.resolve(__dirname, '../logs/json/ohlcv');
const ORDER_LOG_PATH = path.resolve(__dirname, '../logs/micro_ccxt_orders.log');
const BACKTEST_JSON_PATH = path.resolve(__dirname, '../backtest/backtest_results.json');

const MICRO_TIMEFRAMES = (process.env.MICRO_TIMEFRAMES || '1m,5m,15m').split(',').map(s => s.trim()).filter(Boolean);
const MICRO_PAIR = process.env.MICRO_PAIR || process.env.PAIR || 'BTC/EUR';
const MICRO_EXCHANGE = process.env.MICRO_EXCHANGE || process.env.EXCHANGE || 'kraken';
const ORDER_AMOUNT = parseFloat(process.env.MICRO_ORDER_AMOUNT) || 0.001;
const MICRO_INTERVAL = parseInt(process.env.MICRO_INTERVAL_MS, 10) || 300000;

const API_KEY    = process.env.KEY    || '';
const API_SECRET = process.env.SECRET || '';

const STRATEGY = process.env.MICRO_STRATEGY || 'Balanced+';
const VARIANT  = process.env.MICRO_VARIANT  || 'PREDICTION';
const METRIC   = process.env.MICRO_METRIC   || 'hit-rate';

const INTERVAL_AFTER_TRADE = 30000;
const INTERVAL_AFTER_SKIP  = 60000;
const INTERVAL_AFTER_ERROR = 60000;

let isRunning = false;
let positionOpen = false;
let entryPrice = null;
let lastTradeTimestamp = 0;
let autoTuneCache = null;
let autoTuneCacheMTime = 0;
let diagnostics = { cycles: 0, lastError: null, lastTrade: null, history: [] };

// --- Utility Functions ---
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

function safeJsonRead(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const text = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(text);
  } catch (err) {
    console.warn(`[MICRO][WARN] Failed to read/parse ${filePath}:`, err);
    return fallback;
  }
}

function loadAutoTuneCache() {
  try {
    const stat = fs.statSync(autoTuneResultsPath);
    if (!autoTuneCache || stat.mtimeMs !== autoTuneCacheMTime) {
      autoTuneCache = JSON.parse(fs.readFileSync(autoTuneResultsPath, 'utf8'));
      autoTuneCacheMTime = stat.mtimeMs;
      console.log('[MICRO][INFO] Reloaded autoTune_results.json');
    }
    return autoTuneCache;
  } catch (err) {
    console.warn('[MICRO][WARN] Could not load autoTune_results.json:', err);
    return [];
  }
}

fs.watchFile(autoTuneResultsPath, { interval: 60000 }, () => {
  autoTuneCache = null;
});

function getIndicatorParams(metric = METRIC) {
  const INDICATORS = [
    { key: 'rsi', param: 'interval', default: 14 },
    { key: 'adx', param: 'period',   default: 14 },
    { key: 'dx',  param: 'period',   default: 14 },
    { key: 'atr', param: 'period',   default: 14 },
    { key: 'sma', param: 'interval', default: 14 },
  ];
  const stats = loadAutoTuneCache();
  const params = {};
  for (const { key, param, default: def } of INDICATORS) {
    const res = stats.find(r => r.indicator === key && r.scoring === metric);
    params[key.toUpperCase()] = { [param]: res ? res.bestParam : def };
  }
  return params;
}

function loadLatestSignals(timeframes, dir) {
  return timeframes.map(tf => {
    const fp = path.join(dir, `ohlcv_ccxt_data_${tf}_prediction.json`);
    const arr = safeJsonRead(fp, []);
    if (Array.isArray(arr) && arr.length > 0) {
      const last = arr[arr.length - 1];
      last.timeframe = tf;
      return last;
    }
    return null;
  }).filter(Boolean);
}

// --- Enhanced backtest stats diagnostics ---
function getLatestBacktestStats(tf, strategyName = STRATEGY, variant = VARIANT, diagnosticsRef = null) {
  const results = safeJsonRead(BACKTEST_JSON_PATH, []);
  if (!Array.isArray(results) || results.length === 0) {
    if (diagnosticsRef) diagnosticsRef.lastError = {stage: 'backtest', message: `Backtest results file missing or empty.`};
    return null;
  }
  // Find tf/variant
  const tfResult = results.find(r =>
    r.source && r.source.includes(tf) && (!r.variant || r.variant === variant)
  );
  if (!tfResult) {
    if (diagnosticsRef) diagnosticsRef.lastError = {
      stage: 'backtest',
      message: `No entry for timeframe [${tf}] and variant [${variant}] in backtest results. (Sources found: ${results.map(x => x.source).join(', ')})`
    };
    return null;
  }
  // Find strategy
  const stratResult = tfResult.results.find(x => x.params.name === strategyName);
  if (!stratResult) {
    if (diagnosticsRef) diagnosticsRef.lastError = {
      stage: 'backtest',
      message: `No strategy "${strategyName}" found for [${tf}] [${variant}]. Available: ${tfResult.results.map(r=>r.params.name).join(', ')}`
    };
    return null;
  }
  // Zero trades
  if (!stratResult.stats || stratResult.stats.numTrades === 0) {
    if (diagnosticsRef) diagnosticsRef.lastError = {
      stage: 'backtest',
      message: `Stats present for [${tf}] [${strategyName}] [${variant}], but no trades executed. Lower threshold or check signal quality.`
    };
    return null;
  }
  // All good
  return stratResult.stats;
}

async function fetchTickerAndBalance(exchange) {
  try {
    const pair = MICRO_PAIR.toUpperCase();
    const [ticker, balance] = await Promise.all([
      exchange.fetchTicker(pair),
      exchange.fetchBalance()
    ]);
    return { ticker, balance };
  } catch (err) {
    throw new Error('Failed to fetch ticker or balance: ' + err.message);
  }
}

function hasEnoughBalance(balance, action, orderSize, currentPrice) {
  const [base, quote] = MICRO_PAIR.split('/').map(s => s.toUpperCase());
  if (action === 'BUY')  return (balance.free[quote] || 0) >= orderSize * currentPrice;
  if (action === 'SELL') return (balance.free[base]  || 0) >= orderSize;
  return false;
}

function logOrder({
  timestamp, model, prediction, label, action, result, reason, error = null, fullSignal,
  indicatorParams = {}, tradeQualityScore = null, tradeQualityBreakdown = null, backtestStats = null, diagnosticsExtra = null
}) {
  const logLine = [
    new Date().toISOString(),
    timestamp, model, prediction, label || '', action,
    error ? `ERROR: ${error}` : 'SUCCESS',
    error ? '' : JSON.stringify(result),
    reason || '', fullSignal ? JSON.stringify(fullSignal) : '',
    JSON.stringify(indicatorParams),
    tradeQualityScore !== null ? tradeQualityScore : '',
    tradeQualityBreakdown !== null ? JSON.stringify(tradeQualityBreakdown) : '',
    backtestStats !== null ? JSON.stringify(backtestStats) : '',
    diagnosticsExtra !== null ? JSON.stringify(diagnosticsExtra) : ''
  ].join('\t') + '\n';
  fs.appendFileSync(ORDER_LOG_PATH, logLine);
}

function canTradeNow(currentTimestamp) {
  return !lastTradeTimestamp || new Date(currentTimestamp).getTime() - lastTradeTimestamp > MICRO_INTERVAL;
}

function scheduleNext(ms, reason = "") {
  if (reason) console.log(`[MICRO][INFO] Next run in ${ms / 1000}s. Reason: ${reason}`);
  setTimeout(main, ms);
}

function printDiagnostics() {
  diagnostics.history = diagnostics.history || [];
  diagnostics.history.push({
    cycle: diagnostics.cycles,
    error: diagnostics.lastError,
    lastTrade: diagnostics.lastTrade,
    ts: new Date().toISOString()
  });
  if (diagnostics.history.length > 10) diagnostics.history = diagnostics.history.slice(-10);
  console.log(`[MICRO][DIAGNOSTICS]`, {
  cycles: diagnostics.cycles,
  lastError: diagnostics.lastError,
  lastTrade: diagnostics.lastTrade,
  timestamp: new Date().toISOString(),
  recentErrors: diagnostics.history.map(h => ({
    cycle: h.cycle,
    error: h.error ? JSON.stringify(h.error) : null,
    lastTrade: h.lastTrade,
    ts: h.ts
  }))
});
}

// --- Main Trading Logic ---
async function main() {
  diagnostics.cycles++;
  if (isRunning) {
    console.warn(`[MICRO][WARN] Previous cycle still running, skipping at ${new Date().toISOString()}.`);
    return;
  }
  isRunning = true;

  let exchange;
  try {
    const ExchangeClass = ccxt[MICRO_EXCHANGE];
    if (!ExchangeClass) throw new Error(`Exchange '${MICRO_EXCHANGE}' not supported by ccxt.`);
    exchange = new ExchangeClass({
      apiKey: API_KEY,
      secret: API_SECRET,
      enableRateLimit: true,
    });
  } catch (err) {
    diagnostics.lastError = {stage: 'exchange_init', message: err.message || err};
    console.error(`[MICRO][ERROR] Exchange init failed:`, err);
    printDiagnostics();
    scheduleNext(INTERVAL_AFTER_ERROR, "Exchange init failed.");
    isRunning = false; return;
  }

  try {
    const signals = loadLatestSignals(MICRO_TIMEFRAMES, OHLCV_DIR);
    if (signals.length === 0) {
      diagnostics.lastError = {stage: 'signal', message: 'No prediction signals found'};
      printDiagnostics();
      scheduleNext(MICRO_INTERVAL, "No prediction signals found.");
      isRunning = false; return;
    }

    // Pick the lowest timeframe for microstructure (e.g., '1m')
    const tf        = MICRO_TIMEFRAMES[0];
    const lastSignal = signals.find(s => s.timeframe === tf) || signals[signals.length - 1];
    if (!lastSignal || !lastSignal.timestamp || typeof lastSignal.close === 'undefined') {
      diagnostics.lastError = {stage: 'signal', message: 'No valid signal'};
      printDiagnostics();
      scheduleNext(MICRO_INTERVAL, "No valid signal.");
      isRunning = false; return;
    }

    // --- Get auto-tuned indicator parameters for the selected metric ---
    const indicatorParams = getIndicatorParams(METRIC);

    // --- Enhanced: Get latest backtest stats for this timeframe/strategy ---
    const backtestStats = getLatestBacktestStats(tf, STRATEGY, VARIANT, diagnostics);
    if (!backtestStats) {
      printDiagnostics();
      scheduleNext(MICRO_INTERVAL, "No backtest stats.");
      isRunning = false; return;
    }
    console.log(`[MICRO][DEBUG] Latest backtest stats for ${tf} ${STRATEGY} ${VARIANT}:`, backtestStats);

    // --- Trade Quality Score (pre-trade) ---
    const tradeQuality = scoreTrade({
      signalStrength: lastSignal.prediction === 'strong_bull' ? 90 : lastSignal.prediction === 'strong_bear' ? 90 : 50,
      modelWinRate: backtestStats.winRate,
      riskReward: 2,
      executionQuality: 90,
      volatility: 1,
      tradeOutcome: null,
      ...Object.fromEntries(Object.entries(indicatorParams).map(([k, v]) => [`${k.toLowerCase()}Param`, v]))
    });
    console.log(`[MICRO][DEBUG] Trade Quality Score (pre-trade): ${tradeQuality.totalScore}`, tradeQuality.breakdown);

    // --- Sync trading to backtest regime ---
    if (backtestStats.totalPNL <= 0 || backtestStats.winRate < 0.5) {
      logOrder({
        timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
        label: lastSignal.label, action: 'SKIP', result: null,
        reason: `Backtest regime negative (PNL=${backtestStats.totalPNL}, WinRate=${backtestStats.winRate})`,
        fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore,
        tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics
      });
      printDiagnostics();
      scheduleNext(INTERVAL_AFTER_SKIP, "Backtest regime negative.");
      isRunning = false; return;
    }

    if (tradeQuality.totalScore < 65) {
      logOrder({
        timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
        label: lastSignal.label, action: 'SKIP', result: null, reason: `Trade quality low (${tradeQuality.totalScore})`,
        fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics
      });
      printDiagnostics();
      scheduleNext(INTERVAL_AFTER_SKIP, `Trade quality too low (${tradeQuality.totalScore})`);
      isRunning = false; return;
    }

    const { ticker, balance } = await fetchTickerAndBalance(exchange);
    const currentPrice = ticker.last;
    let orderSize = clamp(ORDER_AMOUNT, 0.0001, 0.01);

    // --- Simple BUY logic ---
    if (!positionOpen && lastSignal.prediction === 'strong_bull' && canTradeNow(lastSignal.timestamp)) {
      if (!hasEnoughBalance(balance, 'BUY', orderSize, currentPrice)) {
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
          label: lastSignal.label, action: 'BUY', result: null, reason: 'Insufficient balance for BUY',
          fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore,
          tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics
        });
        printDiagnostics();
        scheduleNext(INTERVAL_AFTER_SKIP, "Insufficient balance for BUY.");
        isRunning = false; return;
      }
      try {
        const result = await exchange.createMarketBuyOrder(MICRO_PAIR, orderSize);
        positionOpen = true; entryPrice = result.price || result.average || currentPrice;
        diagnostics.lastTrade = {action: 'BUY', timestamp: lastSignal.timestamp, tf};
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
          label: lastSignal.label, action: 'BUY', result,
          reason: `strong_bull & auto-tuned params for ${tf}`,
          fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics
        });
        lastTradeTimestamp = Number(lastSignal.timestamp);
        printDiagnostics();
        console.log(`[MICRO][INFO][${lastSignal.timestamp}] BUY order submitted on ${tf}`);
        scheduleNext(INTERVAL_AFTER_TRADE, "BUY order submitted.");
      } catch (err) {
        diagnostics.lastError = {stage: 'buy', message: err.message || err};
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
          label: lastSignal.label, action: 'BUY', result: null, reason: 'Failed to submit BUY', error: err.message || err,
          fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics
        });
        printDiagnostics();
        scheduleNext(INTERVAL_AFTER_ERROR, "Failed to submit BUY.");
      }
      isRunning = false; return;
    }

    // --- Enhanced: Close position if backtest regime turns negative ---
    if (positionOpen && (backtestStats.totalPNL <= 0 || backtestStats.winRate < 0.5)) {
      try {
        const result = await exchange.createMarketSellOrder(MICRO_PAIR, orderSize);
        diagnostics.lastTrade = {action: 'SELL', timestamp: lastSignal.timestamp, tf};
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
          label: lastSignal.label, action: 'SELL', result,
          reason: `Backtest regime negative (PNL=${backtestStats.totalPNL}, WinRate=${backtestStats.winRate}) - closing position`,
          fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics
        });
        positionOpen = false; entryPrice = null;
        lastTradeTimestamp = Number(lastSignal.timestamp);
        printDiagnostics();
        scheduleNext(INTERVAL_AFTER_TRADE, "SELL order submitted (regime negative).");
      } catch (err) {
        diagnostics.lastError = {stage: 'sell', message: err.message || err};
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
          label: lastSignal.label, action: 'SELL', result: null, reason: 'Failed to submit SELL', error: err.message || err,
          fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics
        });
        printDiagnostics();
        scheduleNext(INTERVAL_AFTER_ERROR, "Failed to submit SELL.");
      }
      isRunning = false; return;
    }

    logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
      label: lastSignal.label, action: 'HOLD', result: null, reason: `No trade condition met on ${tf}`,
      fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics
    });
    printDiagnostics();
    scheduleNext(MICRO_INTERVAL, `No trade condition met on ${tf}.`);
  } catch (e) {
    diagnostics.lastError = {stage: 'main', message: e.message || e};
    printDiagnostics();
    console.error('[MICRO][UNCAUGHT EXCEPTION]:', e);
    scheduleNext(INTERVAL_AFTER_ERROR, "Uncaught exception.");
  }
  isRunning = false;
}

// --- Startup ---
console.log(`[MICRO][INFO] microstructure.js starting for timeframes ${MICRO_TIMEFRAMES.join(', ')} with strategy [${STRATEGY}], variant [${VARIANT}], metric [${METRIC}]`);
main();

process.on('uncaughtException', (err) => {
  diagnostics.lastError = {stage: 'uncaughtException', message: err.message || err};
  printDiagnostics();
  console.error('[MICRO][UNCAUGHT EXCEPTION]:', err);
});
process.on('unhandledRejection', (reason) => {
  diagnostics.lastError = {stage: 'unhandledRejection', message: reason && reason.message ? reason.message : reason};
  printDiagnostics();
  console.error('[MICRO][UNHANDLED REJECTION]:', reason);
});
