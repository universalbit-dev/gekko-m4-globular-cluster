/**
 * Macrostructure trading bot: modular, auto-tuned, multi-timeframe.
 * Executes real trades if credentials are set!
 */

const path = require('path');
const fs = require('fs');
const ccxt = require('ccxt');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// --- Indicator Scorers ---
const INDICATOR_SCORERS = {
  RSI: require('./evaluation/score/rsi_score'),
  ATR: require('./evaluation/score/atr_score'),
  ADX: require('./evaluation/score/adx_score'),
  DX:  require('./evaluation/score/dx_score'),
  SMA: require('./evaluation/score/sma_score'),
};
const { getBestParam } = require('./getBestParams');
const { scoreTrade } = require('./tradeQualityScore');

// --- Paths ---
const autoTuneResultsPath = path.resolve(__dirname, './evaluation/autoTune_results.json');
const LOGS_DIR = path.resolve(__dirname, './logs');
const OHLCV_DIR = path.resolve(__dirname, './logs/json/ohlcv');
const ORDER_LOG_PATH = path.join(LOGS_DIR, 'ccxt_order.log');
const WINNER_MODEL_PATH = path.resolve(__dirname, './challenge/model_winner.json');

// --- Config ---
const OHLCV_CANDLE_SIZES = (process.env.OHLCV_CANDLE_SIZE || '1m,5m,15m,1h').split(',').map(s => s.trim()).filter(Boolean);
const TIMEFRAME = process.env.MACRO_TIMEFRAME || '1h';
const EXCHANGE = process.env.EXCHANGE || 'kraken';
const API_KEY = process.env.KEY || '';
const API_SECRET = process.env.SECRET || '';
const PAIR = process.env.PAIR || 'BTC/EUR';
const ORDER_AMOUNT = parseFloat(process.env.ORDER_AMOUNT) || 0.0001;
const MIN_ALLOWED_ORDER_AMOUNT = parseFloat(process.env.MIN_ALLOWED_ORDER_AMOUNT) || 0.0001;
const MAX_ORDER_AMOUNT = parseFloat(process.env.MAX_ORDER_AMOUNT) || 0.01;
const INTERVAL_AFTER_TRADE = parseInt(process.env.INTERVAL_AFTER_TRADE, 10) || 30000;
const INTERVAL_AFTER_SKIP = parseInt(process.env.INTERVAL_AFTER_SKIP, 10) || 90000;
const INTERVAL_AFTER_HOLD = parseInt(process.env.INTERVAL_AFTER_HOLD, 10) || 180000;
const INTERVAL_AFTER_ERROR = parseInt(process.env.INTERVAL_AFTER_ERROR, 10) || 60000;

// --- State ---
let isRunning = false;
let positionOpen = false;
let entryPrice = null;
let lastTradeTimestamp = 0;

// --- Dynamic indicator configs using auto-tuned params ---
function getAutoTunedParams(metric = 'profit') {
  return {
    RSI: { interval: getBestParam('rsi', metric, autoTuneResultsPath) ?? 14 },
    ADX: { period: getBestParam('adx', metric, autoTuneResultsPath) ?? 14 },
    DX:  { period: getBestParam('dx', metric, autoTuneResultsPath) ?? 14 },
    ATR: { period: getBestParam('atr', metric, autoTuneResultsPath) ?? 14 },
    SMA: { interval: getBestParam('sma', metric, autoTuneResultsPath) ?? 14 },
  };
}

function buildIndicatorConfigs() {
  const best = getAutoTunedParams();
  return Object.entries(best).map(([name, param]) => {
    const scorer = INDICATOR_SCORERS[name];
    if (typeof scorer !== 'function') {
      console.warn(`[WARN] Indicator ${name} is missing a scorer function.`);
    }
    return { name, scorer, param };
  });
}

let INDICATOR_CONFIGS = buildIndicatorConfigs();

fs.watchFile(autoTuneResultsPath, { interval: 60000 }, () => {
  INDICATOR_CONFIGS = buildIndicatorConfigs();
  console.log('[INFO][MACRO] Reloaded auto-tuned indicator configs:', INDICATOR_CONFIGS);
});

// --- Utility Functions ---
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

function getIndicatorScores(tf) {
  const scores = {};
  for (const cfg of INDICATOR_CONFIGS) {
    if (typeof cfg.scorer !== "function") continue;
    try {
      const scoreParams = {
        symbol: PAIR, exchange: EXCHANGE, timeframes: [tf],
        ...cfg.param,
        dataDir: OHLCV_DIR
      };
      scores[cfg.name] = cfg.scorer(scoreParams)[tf];
    } catch (e) {
      console.warn(`[WARN] Error scoring ${cfg.name}: ${e.message}`);
      scores[cfg.name] = null;
    }
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

function loadWinnerAnalysis() {
  try { return JSON.parse(fs.readFileSync(WINNER_MODEL_PATH, 'utf8')); }
  catch { return {}; }
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
  timestamp, model, prediction, label, action, result, reason, error = null, fullSignal,
  indicatorScores = {}, win_rate, dominant_periods, volatility, active_model,
  tradeQualityScore = null, tradeQualityBreakdown = null
}) {
  const logLine = [
    new Date().toISOString(),
    timestamp, model, prediction, label || '', action,
    error ? `ERROR: ${error}` : 'SUCCESS',
    error ? '' : JSON.stringify(result),
    reason || '', fullSignal ? JSON.stringify(fullSignal) : '',
    JSON.stringify(indicatorScores),
    win_rate ?? '', volatility ?? '', active_model ?? '',
    dominant_periods ? JSON.stringify(dominant_periods) : '',
    tradeQualityScore !== null ? tradeQualityScore : '',
    tradeQualityBreakdown !== null ? JSON.stringify(tradeQualityBreakdown) : '',
    `[tf: ${TIMEFRAME}]`
  ].join('\t') + '\n';
  fs.appendFileSync(ORDER_LOG_PATH, logLine);
}

function canTradeNow(currentTimestamp) {
  return !lastTradeTimestamp || new Date(currentTimestamp).getTime() - lastTradeTimestamp > 120000;
}

function scheduleNext(ms, reason = "") {
  if (reason) console.log(`[DEBUG] Scheduling next run in ${ms / 1000}s. Reason: ${reason}`);
  else console.log(`[DEBUG] Scheduling next run in ${ms / 1000}s`);
  setTimeout(main, ms);
}

function selectBestTimeframe(winnerAnalysis, candleSizes) {
  let bestTf = null, bestScore = -Infinity;
  for (const tf of candleSizes) {
    const info = winnerAnalysis[tf];
    if (!info || !info.summary) continue;
    const winRate = info.summary.win_rate || 0;
    const volatility = info.recent_win?.volatility || Infinity;
    if (info.summary.active_model === 'no_winner' || volatility > (process.env.MACRO_MAX_VOLATILITY || 100)) continue;
    if (winRate > bestScore) {
      bestScore = winRate;
      bestTf = tf;
    }
  }
  return bestTf || candleSizes[0];
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

    const STOP_LOSS_PCT = parseFloat(process.env.STOP_LOSS_PCT) || 0.003;
    const TAKE_PROFIT_PCT = parseFloat(process.env.TAKE_PROFIT_PCT) || 0.006;
    const MIN_QUALITY = parseFloat(process.env.MACRO_TRADE_QUALITY_THRESHOLD) || 70;
    const MIN_HOLD = parseInt(process.env.MIN_HOLD, 10) || 10;
    const MAX_VOLATILITY = parseFloat(process.env.MACRO_MAX_VOLATILITY) || 100;
    const MIN_WIN_RATE = parseFloat(process.env.MACRO_MIN_WIN_RATE) || 0.2;

    console.log(`[INFO] Macrostructure bot config [${TIMEFRAME}]:`, {
      TAKE_PROFIT_PCT, STOP_LOSS_PCT, MIN_QUALITY, MIN_HOLD
    });

    const signals = loadLatestSignals(OHLCV_CANDLE_SIZES, OHLCV_DIR);
    if (signals.length === 0) return scheduleNext(INTERVAL_AFTER_HOLD, "No multi-timeframe prediction signals found.");

    const winnerAnalysis = loadWinnerAnalysis();
    const tf = selectBestTimeframe(winnerAnalysis, OHLCV_CANDLE_SIZES);
    let lastSignal = signals.find(s => s.timeframe === tf) || signals[signals.length - 1];
    if (!lastSignal) return scheduleNext(INTERVAL_AFTER_HOLD, "No valid signal selected.");

    const info = winnerAnalysis[tf] || {};
    const summary = info.summary || {};
    const recentWin = info.recent_win || {};
    const winnerModel = summary.active_model;
    const predCol = `prediction_${winnerModel}`;
    const labelCol = `label_${winnerModel}`;
    const prediction = lastSignal[predCol] || lastSignal.ensemble_label;
    const label = lastSignal[labelCol] || lastSignal.ensemble_label;
    const price = parseFloat(lastSignal.close);

    // --- Modular Indicator Scoring ---
    const indicatorScores = getIndicatorScores(tf);

    const win_rate = summary.win_rate, dominant_periods = summary.dominant_periods;
    const volatility = recentWin.volatility, active_model = summary.active_model;

    if (!lastSignal.timestamp || isNaN(price) || !label)
      return scheduleNext(INTERVAL_AFTER_SKIP, `Skipping invalid signal: ${JSON.stringify(lastSignal)}`);
    if (!canTradeNow(lastSignal.timestamp))
      return scheduleNext(INTERVAL_AFTER_SKIP, `Aggregation interval not met for trade. Last: ${lastTradeTimestamp}, Current: ${lastSignal.timestamp}`);
    if (winnerModel === "no_winner")
      return scheduleNext(INTERVAL_AFTER_SKIP, "No active winner model for this timeframe.");
    if (win_rate < MIN_WIN_RATE)
      return scheduleNext(INTERVAL_AFTER_SKIP, `Win rate too low (${win_rate}).`);
    if (volatility >= MAX_VOLATILITY)
      return scheduleNext(INTERVAL_AFTER_SKIP, `Volatility too high (${volatility}).`);

    const { ticker, balance } = await fetchTickerAndBalance(exchange);
    const currentPrice = ticker.last;
    let orderSize = clamp(ORDER_AMOUNT, MIN_ALLOWED_ORDER_AMOUNT, MAX_ORDER_AMOUNT);

    // --- Trade Quality Score (pre-trade) ---
    const tradeQuality = scoreTrade({
      signalStrength: label === 'strong_bull' ? 90 : label === 'strong_bear' ? 90 : 50,
      modelWinRate: win_rate,
      riskReward: TAKE_PROFIT_PCT / STOP_LOSS_PCT,
      executionQuality: 90,
      volatility,
      tradeOutcome: null,
      ...Object.fromEntries(Object.entries(indicatorScores).map(([k, v]) => [`${k.toLowerCase()}Score`, v]))
    });

    console.log(`[DEBUG] Trade Quality Score (pre-trade): ${tradeQuality.totalScore}`, tradeQuality.breakdown);

    if (tradeQuality.totalScore < MIN_QUALITY) {
      logOrder({
        timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
        win_rate, dominant_periods, volatility, active_model, action: 'SKIP',
        result: null, reason: `Trade quality score too low (${tradeQuality.totalScore})`, fullSignal: lastSignal,
        indicatorScores, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
      });
      return scheduleNext(INTERVAL_AFTER_SKIP, `Trade quality score too low (${tradeQuality.totalScore})`);
    }

    // --- BUY logic ---
    if (!positionOpen &&
      recentWin.winner_label === 'strong_bull' &&
      indicatorScores.RSI !== null && indicatorScores.RSI < 30) {
      if (!hasEnoughBalance(balance, 'BUY', orderSize, currentPrice)) {
        logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
          win_rate, dominant_periods, volatility, active_model, action: 'BUY',
          result: null, reason: 'Insufficient balance for BUY', fullSignal: lastSignal,
          indicatorScores, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        return scheduleNext(INTERVAL_AFTER_SKIP, "Insufficient balance for BUY.");
      }
      try {
        const result = await exchange.createMarketBuyOrder(PAIR, orderSize);
        positionOpen = true; entryPrice = result.price || result.average || currentPrice;
        logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
          win_rate, dominant_periods, volatility, active_model, action: 'BUY',
          result, reason: `Winner strong_bull & RSI < 30 on ${tf} (RSI=${indicatorScores.RSI})`, fullSignal: lastSignal,
          indicatorScores, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        lastTradeTimestamp = Number(lastSignal.timestamp);
        console.log(`[DEBUG] [${lastSignal.timestamp}] BUY order submitted on ${tf}`);
        return scheduleNext(INTERVAL_AFTER_TRADE, "BUY order submitted.");
      } catch (err) {
        logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
          win_rate, dominant_periods, volatility, active_model, action: 'BUY',
          result: null, reason: 'Failed to submit BUY', error: err.message || err, fullSignal: lastSignal,
          indicatorScores, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        return scheduleNext(INTERVAL_AFTER_ERROR, "Failed to submit BUY.");
      }
    }
    // Extend: SELL, STOP LOSS, TAKE PROFIT logic as needed for macro bot

    logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
      win_rate, dominant_periods, volatility, active_model,
      action: 'HOLD', result: null, reason: `No trade condition met on ${tf}`, fullSignal: lastSignal,
      indicatorScores, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
    });
    scheduleNext(INTERVAL_AFTER_HOLD, `No trade condition met on ${tf}.`);
  } catch (e) {
    console.error('[DEBUG] UNCAUGHT EXCEPTION:', e);
    scheduleNext(INTERVAL_AFTER_ERROR, "Uncaught exception.");
  }
  isRunning = false;
}

// --- Startup ---
(async () => {
  console.log(`[DEBUG] Starting macro_ccxt_orders_optimized_tuning.js for timeframe ${TIMEFRAME} using multi-timeframe backtest integration`);
  main();
})();

process.on('uncaughtException', (err) => {
  console.error('[DEBUG] UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[DEBUG] UNHANDLED REJECTION:', reason);
});
