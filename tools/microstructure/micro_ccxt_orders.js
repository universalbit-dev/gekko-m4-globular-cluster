/**
 * Microstructure trading bot: modular, auto-tuned, multi-timeframe.
 * Enhanced: syncs live trading with latest backtest results for adaptive position management!
 * Executes real trades if credentials are set!
 */

const path = require('path');
const fs = require('fs');
const ccxt = require('ccxt');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const scoreRSI = require('../evaluation/score/rsi_score');
const scoreATR = require('../evaluation/score/atr_score');
const scoreADX = require('../evaluation/score/adx_score');
const scoreDX  = require('../evaluation/score/dx_score');
const scoreSMA = require('../evaluation/score/sma_score');
const { getBestParam } = require('../getBestParams');
const { scoreTrade } = require('../tradeQualityScore');

const autoTuneResultsPath = path.resolve(__dirname, '../evaluation/autoTune_results.json');
const OHLCV_DIR = path.resolve(__dirname, '../logs/json/ohlcv');
const ORDER_LOG_PATH = path.resolve(__dirname, '../logs/micro_ccxt_orders.log');
const BACKTEST_JSON_PATH = path.resolve(__dirname, '../backtest_results.json');
const BACKTEST_CSV_PATH = path.resolve(__dirname, '../backtest_trades.csv');

const MICRO_TIMEFRAMES = (process.env.MICRO_TIMEFRAMES || '1m,5m,15m').split(',').map(s => s.trim()).filter(Boolean);
const MICRO_PAIR = process.env.MICRO_PAIR || process.env.PAIR || 'BTC/EUR';
const MICRO_EXCHANGE = process.env.MICRO_EXCHANGE || process.env.EXCHANGE || 'kraken';
const ORDER_AMOUNT = parseFloat(process.env.MICRO_ORDER_AMOUNT) || 0.001;
const MICRO_INTERVAL = parseInt(process.env.MICRO_INTERVAL_MS, 10) || 300000;

const API_KEY    = process.env.KEY    || '';
const API_SECRET = process.env.SECRET || '';

const INTERVAL_AFTER_TRADE = 30000;
const INTERVAL_AFTER_SKIP  = 60000;
const INTERVAL_AFTER_ERROR = 60000;

let isRunning = false;
let positionOpen = false;
let entryPrice = null;
let lastTradeTimestamp = 0;

// --- Indicator scoring configs, auto-tuned ---
function getAutoTunedParams(metric = 'profit') {
  return {
    RSI: { interval: getBestParam('rsi', metric, autoTuneResultsPath) ?? 14 },
    ADX: { period: getBestParam('adx', metric, autoTuneResultsPath) ?? 14 },
    DX:  { period: getBestParam('dx',  metric, autoTuneResultsPath) ?? 14 },
    ATR: { period: getBestParam('atr', metric, autoTuneResultsPath) ?? 14 },
    SMA: { interval: getBestParam('sma', metric, autoTuneResultsPath) ?? 14 }
  };
}
let INDICATOR_CONFIGS = buildIndicatorConfigs();
function buildIndicatorConfigs() {
  const best = getAutoTunedParams();
  return [
    { name: "RSI", scorer: scoreRSI, param: best.RSI },
    { name: "ADX", scorer: scoreADX, param: best.ADX },
    { name: "DX",  scorer: scoreDX,  param: best.DX },
    { name: "ATR", scorer: scoreATR, param: best.ATR },
    { name: "SMA", scorer: scoreSMA, param: best.SMA },
  ];
}
fs.watchFile(autoTuneResultsPath, { interval: 60000 }, () => {
  INDICATOR_CONFIGS = buildIndicatorConfigs();
  console.log('[INFO][MICRO] Reloaded auto-tuned indicator configs:', INDICATOR_CONFIGS);
});

// --- Utility Functions ---
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

function getIndicatorScores(tf) {
  const scores = {};
  for (const cfg of INDICATOR_CONFIGS) {
    if (typeof cfg.scorer !== "function") {
      console.warn(`[WARN] Indicator ${cfg.name} missing scorer`);
      continue;
    }
    const scoreParams = {
      symbol: MICRO_PAIR, exchange: MICRO_EXCHANGE, timeframes: [tf],
      ...cfg.param,
      dataDir: OHLCV_DIR
    };
    scores[cfg.name] = cfg.scorer(scoreParams)[tf];
  }
  return scores;
}

function loadLatestSignals(timeframes, dir) {
  return timeframes.map(tf => {
    const fp = path.join(dir, `ohlcv_ccxt_data_${tf}_prediction.json`);
    if (!fs.existsSync(fp)) return null;
    try {
      const arr = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (arr.length > 0) {
        const last = arr[arr.length - 1];
        last.timeframe = tf;
        return last;
      }
    } catch (err) {
      console.warn(`[DEBUG] [SIGNAL LOAD] Error reading ${fp}:`, err);
    }
    return null;
  }).filter(Boolean);
}

// --- Enhanced: Read latest backtest stats for microstructure logic ---
function getLatestBacktestStats(tf, strategyName = "Aggressive+", variant = "RAW") {
  try {
    const results = JSON.parse(fs.readFileSync(BACKTEST_JSON_PATH, 'utf8'));
    // Find the result for this timeframe and strategy
    const tfResult = results.find(r =>
      r.source.includes(tf) && r.variant === variant
    );
    if (!tfResult) return null;
    const strategyResult = tfResult.results.find(x => x.params.name === strategyName);
    return strategyResult ? strategyResult.stats : null;
  } catch (err) {
    console.warn(`[WARN] Could not read backtest_results.json:`, err);
    return null;
  }
}

async function fetchTickerAndBalance(exchange) {
  const pair = MICRO_PAIR.toUpperCase();
  const [ticker, balance] = await Promise.all([
    exchange.fetchTicker(pair),
    exchange.fetchBalance()
  ]);
  return { ticker, balance };
}

function hasEnoughBalance(balance, action, orderSize, currentPrice) {
  const [base, quote] = MICRO_PAIR.split('/').map(s => s.toUpperCase());
  if (action === 'BUY')  return (balance.free[quote] || 0) >= orderSize * currentPrice;
  if (action === 'SELL') return (balance.free[base]  || 0) >= orderSize;
  return false;
}

function logOrder({
  timestamp, model, prediction, label, action, result, reason, error = null, fullSignal,
  indicatorScores = {}, tradeQualityScore = null, tradeQualityBreakdown = null, backtestStats = null
}) {
  const logLine = [
    new Date().toISOString(),
    timestamp, model, prediction, label || '', action,
    error ? `ERROR: ${error}` : 'SUCCESS',
    error ? '' : JSON.stringify(result),
    reason || '', fullSignal ? JSON.stringify(fullSignal) : '',
    JSON.stringify(indicatorScores),
    tradeQualityScore !== null ? tradeQualityScore : '',
    tradeQualityBreakdown !== null ? JSON.stringify(tradeQualityBreakdown) : '',
    backtestStats !== null ? JSON.stringify(backtestStats) : ''
  ].join('\t') + '\n';
  fs.appendFileSync(ORDER_LOG_PATH, logLine);
}

function canTradeNow(currentTimestamp) {
  return !lastTradeTimestamp || new Date(currentTimestamp).getTime() - lastTradeTimestamp > MICRO_INTERVAL;
}

function scheduleNext(ms, reason = "") {
  if (reason) console.log(`[DEBUG] Scheduling next run in ${ms / 1000}s. Reason: ${reason}`);
  else console.log(`[DEBUG] Scheduling next run in ${ms / 1000}s`);
  setTimeout(main, ms);
}

// --- Main Trading Logic ---
async function main() {
  if (isRunning) {
    console.warn(`[DEBUG] Previous cycle still running, skipping at ${new Date().toISOString()}.`);
    return;
  }
  isRunning = true;

  // --- Exchange Instance ---
  const exchangeClass = ccxt[MICRO_EXCHANGE];
  if (!exchangeClass) {
    console.error(`[DEBUG] Exchange '${MICRO_EXCHANGE}' not supported by ccxt.`);
    isRunning = false;
    return;
  }
  const exchange = new exchangeClass({
    apiKey: API_KEY,
    secret: API_SECRET,
    enableRateLimit: true,
  });

  try {
    const signals = loadLatestSignals(MICRO_TIMEFRAMES, OHLCV_DIR);
    if (signals.length === 0) {
      scheduleNext(MICRO_INTERVAL, "No prediction signals found.");
      isRunning = false; return;
    }

    // Pick the lowest timeframe for microstructure (e.g., '1m')
    const tf        = MICRO_TIMEFRAMES[0];
    const lastSignal = signals.find(s => s.timeframe === tf) || signals[signals.length - 1];
    if (!lastSignal || !lastSignal.timestamp || typeof lastSignal.close === 'undefined') {
      scheduleNext(MICRO_INTERVAL, "No valid signal.");
      isRunning = false; return;
    }

    // --- Indicator Scoring ---
    const indicatorScores = getIndicatorScores(tf);

    // --- Enhanced: Get latest backtest stats for this timeframe/strategy ---
    const backtestStats = getLatestBacktestStats(tf, "Aggressive+", "RAW");
    if (!backtestStats) {
      console.warn(`[WARN][MICRO] No backtest stats for ${tf} Aggressive+ RAW, skipping trade.`);
      scheduleNext(MICRO_INTERVAL, "No backtest stats.");
      isRunning = false; return;
    }
    console.log(`[DEBUG][MICRO] Latest backtest stats for ${tf} Aggressive+ RAW:`, backtestStats);

    // --- Trade Quality Score (pre-trade) ---
    const tradeQuality = scoreTrade({
      signalStrength: lastSignal.prediction === 'strong_bull' ? 90 : lastSignal.prediction === 'strong_bear' ? 90 : 50,
      modelWinRate: backtestStats.winRate * 100, // use backtest winRate as modelWinRate
      riskReward: 2,
      executionQuality: 90,
      volatility: 1,
      tradeOutcome: null,
      ...Object.fromEntries(Object.entries(indicatorScores).map(([k, v]) => [`${k.toLowerCase()}Score`, v]))
    });
    console.log(`[DEBUG][MICRO] Trade Quality Score (pre-trade): ${tradeQuality.totalScore}`, tradeQuality.breakdown);

    // --- Sync trading to backtest regime ---
    if (backtestStats.totalPNL <= 0 || backtestStats.winRate < 0.5) {
      // Don't trade in a negative regime!
      logOrder({
        timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
        label: lastSignal.label, action: 'SKIP', result: null,
        reason: `Backtest regime negative (PNL=${backtestStats.totalPNL}, WinRate=${backtestStats.winRate})`,
        fullSignal: lastSignal, indicatorScores, tradeQualityScore: tradeQuality.totalScore,
        tradeQualityBreakdown: tradeQuality.breakdown, backtestStats
      });
      scheduleNext(INTERVAL_AFTER_SKIP, "Backtest regime negative.");
      isRunning = false; return;
    }

    if (tradeQuality.totalScore < 65) {
      logOrder({
        timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
        label: lastSignal.label, action: 'SKIP', result: null, reason: `Trade quality low (${tradeQuality.totalScore})`,
        fullSignal: lastSignal, indicatorScores, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats
      });
      scheduleNext(INTERVAL_AFTER_SKIP, `Trade quality too low (${tradeQuality.totalScore})`);
      isRunning = false; return;
    }

    const { ticker, balance } = await fetchTickerAndBalance(exchange);
    const currentPrice = ticker.last;
    let orderSize = clamp(ORDER_AMOUNT, 0.0001, 0.01);

    // --- Simple BUY logic ---
    if (!positionOpen && lastSignal.prediction === 'strong_bull' && indicatorScores.RSI !== null && indicatorScores.RSI < 30) {
      if (!hasEnoughBalance(balance, 'BUY', orderSize, currentPrice)) {
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
          label: lastSignal.label, action: 'BUY', result: null, reason: 'Insufficient balance for BUY',
          fullSignal: lastSignal, indicatorScores, tradeQualityScore: tradeQuality.totalScore,
          tradeQualityBreakdown: tradeQuality.breakdown, backtestStats
        });
        scheduleNext(INTERVAL_AFTER_SKIP, "Insufficient balance for BUY.");
        isRunning = false; return;
      }
      try {
        const result = await exchange.createMarketBuyOrder(MICRO_PAIR, orderSize);
        positionOpen = true; entryPrice = result.price || result.average || currentPrice;
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
          label: lastSignal.label, action: 'BUY', result,
          reason: `strong_bull & RSI < 30 for ${tf} (RSI=${indicatorScores.RSI})`,
          fullSignal: lastSignal, indicatorScores, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats
        });
        lastTradeTimestamp = Number(lastSignal.timestamp);
        console.log(`[DEBUG][MICRO][${lastSignal.timestamp}] BUY order submitted on ${tf}`);
        scheduleNext(INTERVAL_AFTER_TRADE, "BUY order submitted.");
      } catch (err) {
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
          label: lastSignal.label, action: 'BUY', result: null, reason: 'Failed to submit BUY', error: err.message || err,
          fullSignal: lastSignal, indicatorScores, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats
        });
        scheduleNext(INTERVAL_AFTER_ERROR, "Failed to submit BUY.");
      }
      isRunning = false; return;
    }

    // --- Enhanced: Close position if backtest regime turns negative ---
    if (positionOpen && (backtestStats.totalPNL <= 0 || backtestStats.winRate < 0.5)) {
      try {
        const result = await exchange.createMarketSellOrder(MICRO_PAIR, orderSize);
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
          label: lastSignal.label, action: 'SELL', result,
          reason: `Backtest regime negative (PNL=${backtestStats.totalPNL}, WinRate=${backtestStats.winRate}) - closing position`,
          fullSignal: lastSignal, indicatorScores, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats
        });
        positionOpen = false; entryPrice = null;
        lastTradeTimestamp = Number(lastSignal.timestamp);
        scheduleNext(INTERVAL_AFTER_TRADE, "SELL order submitted (regime negative).");
      } catch (err) {
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
          label: lastSignal.label, action: 'SELL', result: null, reason: 'Failed to submit SELL', error: err.message || err,
          fullSignal: lastSignal, indicatorScores, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats
        });
        scheduleNext(INTERVAL_AFTER_ERROR, "Failed to submit SELL.");
      }
      isRunning = false; return;
    }

    logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model, prediction: lastSignal.prediction,
      label: lastSignal.label, action: 'HOLD', result: null, reason: `No trade condition met on ${tf}`,
      fullSignal: lastSignal, indicatorScores, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats
    });
    scheduleNext(MICRO_INTERVAL, `No trade condition met on ${tf}.`);
  } catch (e) {
    console.error('[DEBUG][MICRO] UNCAUGHT EXCEPTION:', e);
    scheduleNext(INTERVAL_AFTER_ERROR, "Uncaught exception.");
  }
  isRunning = false;
}

// --- Startup ---
(async () => {
  console.log(`[DEBUG] Starting micro_ccxt_orders.js for timeframes ${MICRO_TIMEFRAMES.join(', ')} using auto-tuning and synced to backtest stats`);
  main();
})();

process.on('uncaughtException', (err) => {
  console.error('[DEBUG][MICRO] UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[DEBUG][MICRO] UNHANDLED REJECTION:', reason);
});
