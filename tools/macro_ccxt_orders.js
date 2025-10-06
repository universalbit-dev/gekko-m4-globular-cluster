/**
 * Macrostructure trading bot: fluent, auto-tuned, multi-timeframe (15m, 1h).
 * Executes real trades if credentials are set!
 * Optimized: Uses only autoTune_results.json for indicator configuration and supports dynamic metric selection.
 */

const path = require('path');
const fs = require('fs');
const ccxt = require('ccxt');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const autoTuneResultsPath = path.resolve(__dirname, './evaluation/autoTune_results.json');
const OHLCV_DIR = path.resolve(__dirname, './logs/json/ohlcv');
const ORDER_LOG_PATH = path.resolve(__dirname, './logs/ccxt_order.log');
const BACKTEST_JSON_PATH = path.resolve(__dirname, './backtest_results.json');
const { scoreTrade } = require('./tradeQualityScore');

// --- Config ---
const MACRO_TIMEFRAMES = ['15m', '1h'];
const EXCHANGE = process.env.EXCHANGE || 'kraken';
const API_KEY = process.env.KEY || '';
const API_SECRET = process.env.SECRET || '';
const PAIR = process.env.PAIR || 'BTC/EUR';
const ORDER_AMOUNT = parseFloat(process.env.ORDER_AMOUNT) || 0.001;
const MIN_ORDER_AMOUNT = parseFloat(process.env.MIN_ORDER_AMOUNT) || 0.001;
const MAX_ORDER_AMOUNT = parseFloat(process.env.MAX_ORDER_AMOUNT) || 0.01;
const INTERVAL_AFTER_TRADE = parseInt(process.env.INTERVAL_AFTER_TRADE, 10) || 30000;
const INTERVAL_AFTER_SKIP = parseInt(process.env.INTERVAL_AFTER_SKIP, 10) || 90000;
const INTERVAL_AFTER_HOLD = parseInt(process.env.INTERVAL_AFTER_HOLD, 10) || 180000;
const INTERVAL_AFTER_ERROR = parseInt(process.env.INTERVAL_AFTER_ERROR, 10) || 60000;
const METRIC = process.env.MACRO_METRIC || 'profit'; // <-- Dynamic metric selection

// --- State ---
let isRunning = false;
let positionOpen = false;
let entryPrice = null;
let lastTradeTimestamp = 0;
let autoTuneCache = null;
let autoTuneCacheMTime = 0;

// --- Utility Functions ---
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

function getBestParam(indicator, metric, resultsPath = autoTuneResultsPath) {
  try {
    const stats = loadAutoTuneCache();
    const res = stats.find(r => r.indicator === indicator && r.scoring === metric);
    return res ? res.bestParam : null;
  } catch {
    return null;
  }
}

function getIndicatorParams(metric = METRIC) {
  const INDICATORS = [
    { key: 'rsi', param: 'interval', default: 14 },
    { key: 'adx', param: 'period',   default: 14 },
    { key: 'dx',  param: 'period',   default: 14 },
    { key: 'atr', param: 'period',   default: 14 },
    { key: 'sma', param: 'interval', default: 14 },
  ];
  const params = {};
  for (const { key, param, default: def } of INDICATORS) {
    const best = getBestParam(key, metric);
    params[key.toUpperCase()] = { [param]: best ?? def };
  }
  return params;
}

function loadAutoTuneCache() {
  // Hot reload if file changed
  const stat = fs.statSync(autoTuneResultsPath);
  if (!autoTuneCache || stat.mtimeMs !== autoTuneCacheMTime) {
    autoTuneCache = JSON.parse(fs.readFileSync(autoTuneResultsPath, 'utf8'));
    autoTuneCacheMTime = stat.mtimeMs;
    console.log('[INFO][MACRO] Reloaded autoTune_results.json');
  }
  return autoTuneCache;
}

fs.watchFile(autoTuneResultsPath, { interval: 60000 }, () => {
  autoTuneCache = null; // force reload next call
});

function loadLatestSignal(tf, dir) {
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
    console.warn(`[DEBUG][MACRO] Error reading ${fp}:`, err);
  }
  return null;
}

function getLatestBacktestStats(tf, strategyName = "Balanced+", variant = "RAW") {
  try {
    const results = JSON.parse(fs.readFileSync(BACKTEST_JSON_PATH, 'utf8'));
    const tfResult = results.find(r =>
      r.source.includes(tf) && (!r.variant || r.variant === variant)
    );
    if (!tfResult) return null;
    const strategyResult = tfResult.results.find(x => x.params.name === strategyName);
    return strategyResult ? strategyResult.stats : null;
  } catch (err) {
    return null;
  }
}

async function fetchTickerAndBalance(exchange) {
  const pair = PAIR.toUpperCase();
  const [ticker, balance] = await Promise.all([
    exchange.fetchTicker(pair),
    exchange.fetchBalance()
  ]);
  return { ticker, balance };
}

function hasEnoughBalance(balance, action, orderSize, currentPrice) {
  const [base, quote] = PAIR.split('/').map(s => s.toUpperCase());
  if (action === 'BUY') return (balance.free[quote] || 0) >= orderSize * currentPrice;
  if (action === 'SELL') return (balance.free[base] || 0) >= orderSize;
  return false;
}

function logOrder({
  timestamp, action, result, reason, error = null, regime, stats, signal, indicatorParams = {}, tradeQualityScore = null, tradeQualityBreakdown = null
}) {
  const logLine = [
    new Date().toISOString(),
    timestamp, action,
    error ? `ERROR: ${error}` : 'SUCCESS',
    error ? '' : JSON.stringify(result),
    reason || '', regime || '',
    stats ? JSON.stringify(stats) : '',
    signal ? JSON.stringify(signal) : '',
    JSON.stringify(indicatorParams),
    tradeQualityScore !== null ? tradeQualityScore : '',
    tradeQualityBreakdown !== null ? JSON.stringify(tradeQualityBreakdown) : '',
  ].join('\t') + '\n';
  fs.appendFileSync(ORDER_LOG_PATH, logLine);
}

function canTradeNow(currentTimestamp, interval = 12 * 60 * 1000) {
  return !lastTradeTimestamp || new Date(currentTimestamp).getTime() - lastTradeTimestamp > interval;
}

function regimeFromStats(stats) {
  if (!stats) return "Unknown";
  if (stats.totalPNL > 0 && stats.winRate > 0.45) return "Bull";
  if (stats.totalPNL < 0 && stats.winRate < 0.45) return "Bear";
  return "Flat";
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
  try {
    const exchangeClass = ccxt[EXCHANGE];
    if (!exchangeClass) throw new Error(`Exchange '${EXCHANGE}' not supported by ccxt.`);
    const exchange = new exchangeClass({
      apiKey: API_KEY,
      secret: API_SECRET,
      enableRateLimit: true,
    });

    // --- For each macro timeframe, check backtest stats and signal ---
    let bestTf = null, bestStats = null, bestSignal = null;
    for (const tf of MACRO_TIMEFRAMES) {
      const stats = getLatestBacktestStats(tf, "Balanced+", "RAW");
      const signal = loadLatestSignal(tf, OHLCV_DIR);
      const regime = regimeFromStats(stats);
      console.log(`[DEBUG][MACRO] Latest stats for ${tf} Balanced+ RAW:`, stats, `Regime: ${regime}`);
      if (!stats || !signal) continue;
      if (regime === "Bull" && (!bestStats || stats.totalPNL > bestStats.totalPNL)) {
        bestTf = tf;
        bestStats = stats;
        bestSignal = signal;
      }
    }

    if (!bestTf || !bestStats || !bestSignal) {
      console.log(`[INFO][MACRO] No valid Bull regime detected for any macro timeframe.`);
      return scheduleNext(INTERVAL_AFTER_HOLD, "No positive macro regime.");
    }

    // --- Get indicator params from autoTune_results.json using selected metric ---
    const indicatorParams = getIndicatorParams(METRIC);

    // --- Trade Quality Score ---
    const tradeQuality = scoreTrade({
      signalStrength: bestSignal.ensemble_label === 'strong_bull' ? 90 : bestSignal.ensemble_label === 'strong_bear' ? 90 : 50,
      modelWinRate: bestStats.winRate,
      riskReward: 2,
      executionQuality: 90,
      volatility: bestStats.volatility || 1,
      tradeOutcome: null,
      ...Object.fromEntries(Object.entries(indicatorParams).map(([k, v]) => [`${k.toLowerCase()}Param`, v]))
    });

    console.log(`[DEBUG][MACRO] Trade Quality Score (pre-trade): ${tradeQuality.totalScore}`, tradeQuality.breakdown);

    // --- Decision logic ---
    if (!positionOpen &&
        bestSignal.ensemble_label === 'strong_bull' &&
        tradeQuality.totalScore >= 70 &&
        canTradeNow(bestSignal.timestamp)) {
      const { ticker, balance } = await fetchTickerAndBalance(exchange);
      const currentPrice = ticker.last;
      let orderSize = clamp(ORDER_AMOUNT, MIN_ORDER_AMOUNT, MAX_ORDER_AMOUNT);

      if (!hasEnoughBalance(balance, 'BUY', orderSize, currentPrice)) {
        logOrder({ timestamp: bestSignal.timestamp, action: 'SKIP', result: null,
          reason: 'Insufficient balance for BUY', regime: 'Bull', stats: bestStats,
          signal: bestSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        return scheduleNext(INTERVAL_AFTER_SKIP, "Insufficient balance for BUY.");
      }
      try {
        const result = await exchange.createMarketBuyOrder(PAIR, orderSize);
        positionOpen = true; entryPrice = result.price || result.average || currentPrice;
        lastTradeTimestamp = Number(bestSignal.timestamp);
        logOrder({ timestamp: bestSignal.timestamp, action: 'BUY', result,
          reason: `strong_bull & auto-tuned params (${METRIC}) on ${bestTf}`, regime: 'Bull', stats: bestStats,
          signal: bestSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        console.log(`[DEBUG][MACRO][${bestSignal.timestamp}] BUY order submitted on ${bestTf}`);
        return scheduleNext(INTERVAL_AFTER_TRADE, "BUY order submitted.");
      } catch (err) {
        logOrder({ timestamp: bestSignal.timestamp, action: 'BUY', result: null,
          error: err.message || err, reason: 'Failed to submit BUY', regime: 'Bull', stats: bestStats,
          signal: bestSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        return scheduleNext(INTERVAL_AFTER_ERROR, "Failed to submit BUY.");
      }
    }

    // --- SELL logic: close position if regime turns negative ---
    if (positionOpen && (
      bestStats.totalPNL <= 0 ||
      bestStats.winRate < 0.45 ||
      bestSignal.ensemble_label === 'strong_bear'
    )) {
      const { ticker, balance } = await fetchTickerAndBalance(exchange);
      const currentPrice = ticker.last;
      let orderSize = clamp(ORDER_AMOUNT, MIN_ORDER_AMOUNT, MAX_ORDER_AMOUNT);

      try {
        const result = await exchange.createMarketSellOrder(PAIR, orderSize);
        positionOpen = false; entryPrice = null;
        lastTradeTimestamp = Number(bestSignal.timestamp);
        logOrder({ timestamp: bestSignal.timestamp, action: 'SELL', result,
          reason: `Regime negative or bear signal on ${bestTf}`, regime: regimeFromStats(bestStats), stats: bestStats,
          signal: bestSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        scheduleNext(INTERVAL_AFTER_TRADE, "SELL order submitted (regime negative/bear signal).");
      } catch (err) {
        logOrder({ timestamp: bestSignal.timestamp, action: 'SELL', result: null,
          error: err.message || err, reason: 'Failed to submit SELL', regime: regimeFromStats(bestStats), stats: bestStats,
          signal: bestSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        scheduleNext(INTERVAL_AFTER_ERROR, "Failed to submit SELL.");
      }
      isRunning = false; return;
    }

    logOrder({ timestamp: bestSignal.timestamp, action: 'HOLD', result: null,
      reason: `No trade condition met on ${bestTf}`, regime: regimeFromStats(bestStats), stats: bestStats,
      signal: bestSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
    });
    scheduleNext(INTERVAL_AFTER_HOLD, `No trade condition met on ${bestTf}.`);
  } catch (e) {
    console.error('[DEBUG][MACRO] UNCAUGHT EXCEPTION:', e);
    scheduleNext(INTERVAL_AFTER_ERROR, "Uncaught exception.");
  }
  isRunning = false;
}

// --- Startup ---
(async () => {
  console.log(`[DEBUG] Starting macro_ccxt_orders.js for macrostructure [15m,1h] using auto-tuned params with metric [${METRIC}]`);
  main();
})();

process.on('uncaughtException', (err) => {
  console.error('[DEBUG][MACRO] UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[DEBUG][MACRO] UNHANDLED REJECTION:', reason);
});
