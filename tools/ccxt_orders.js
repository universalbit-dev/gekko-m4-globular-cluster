/**
 * WARNING: REAL TRADING & FINANCIAL RISK
 * 
 * This script (ccxt_orders.js) will execute real trading orders on your linked exchange account using your API credentials.
 * 
 * - All actions taken by this script will result in actual financial transactions on the connected exchange.
 * - Only run this script if you fully understand the risks involved in cryptocurrency trading.
 * - You are solely responsible for any losses or liabilities incurred.
 * - This is NOT a simulation or backtest; all trades are live.
 * - Use at your own risk. No warranty is provided.
 * 
 * EU MiCA Notice: This tool is for registered, authenticated users only and delegates all compliance, security, and asset custody to the exchange.
 */

/**
 * ccxt_orders.js (Zenith Version, robust comparative log parsing, auto-tuning parameters, model winner adaptive with P&L selection)
 * Automated trading bot for cryptocurrency using ccxt, Node.js, and comparative signal logs.
 * Author: universalbit-dev
 */

const path = require('path');
const fs = require('fs');
const ccxt = require('ccxt');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// --- Config ---
const MAG_SIGNAL_LOG_PATH = path.resolve(__dirname, './ccxt_signal_comparative.log');
const ORDER_LOG_PATH = path.resolve(__dirname, './ccxt_order.log');
const MODEL_WINNER_PATH = path.resolve(__dirname, './model_winner.json');
const MODEL_PERFORMANCE_PATH = path.resolve(__dirname, './model_performance.json');
const EXCHANGE = process.env.EXCHANGE || 'kraken';
const API_KEY = process.env.KEY || '';
const API_SECRET = process.env.SECRET || '';
const PAIR = process.env.PAIR || 'BTC/EUR';
const ORDER_AMOUNT = parseFloat(process.env.ORDER_AMOUNT) || 0.0001;
const MIN_ALLOWED_ORDER_AMOUNT = parseFloat(process.env.MIN_ALLOWED_ORDER_AMOUNT) || 0.0001;
const INTERVAL_HIGH = parseInt(process.env.INTERVAL_HIGH, 10) || 60 * 1000;
const INTERVAL_DEFAULT = parseInt(process.env.INTERVAL_DEFAULT, 10) || 5 * 60 * 1000;
const INTERVAL_LOW = parseInt(process.env.INTERVAL_LOW, 10) || 30 * 60 * 1000;
let INTERVAL_MS = parseInt(process.env.INTERVAL_MS, 10) || 15 * 60 * 1000;
const MODEL_PNL_UPDATE_FREQ = 4;
const AUTOTUNE_FREQ = 4;

// --- Model Winner Loader ---
function getActiveModel() {
  try {
    if (fs.existsSync(MODEL_WINNER_PATH)) {
      const data = JSON.parse(fs.readFileSync(MODEL_WINNER_PATH, 'utf8'));
      return data.active_model || 'ensemble';
    }
  } catch (err) {
    console.error('Error reading model_winner.json:', err);
  }
  return 'ensemble'; // fallback
}

// --- Model P&L Tracking ---
function loadModelPerformance() {
  if (fs.existsSync(MODEL_PERFORMANCE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(MODEL_PERFORMANCE_PATH, 'utf8'));
    } catch (e) {
      console.error('Error loading model performance:', e);
    }
  }
  // Initial structure
  return { tf: { pnl: 0, trades: 0 }, convnet: { pnl: 0, trades: 0 }, ensemble: { pnl: 0, trades: 0 } };
}

function saveModelPerformance(performance) {
  fs.writeFileSync(MODEL_PERFORMANCE_PATH, JSON.stringify(performance, null, 2));
}

function recordModelTrade(model, pnl) {
  const performance = loadModelPerformance();
  if (!performance[model]) performance[model] = { pnl: 0, trades: 0 };
  performance[model].pnl += pnl;
  performance[model].trades += 1;
  saveModelPerformance(performance);
}

function selectWinnerModel() {
  const performance = loadModelPerformance();
  let winner = 'ensemble';
  let maxPnl = performance.ensemble.pnl;
  for (const m of ['tf', 'convnet']) {
    if (performance[m].pnl > maxPnl) {
      winner = m;
      maxPnl = performance[m].pnl;
    }
  }
  fs.writeFileSync(MODEL_WINNER_PATH, JSON.stringify({ active_model: winner }, null, 2));
  console.log(`[WINNER SELECTION] Updated active model to: ${winner} (P&L: ${maxPnl})`);
}

function calculateTradePnL(action, entryPrice, exitPrice, amount) {
  if (!entryPrice || !exitPrice || !amount) return 0;
  if (['SELL', 'TAKE_PROFIT', 'STOP_LOSS', 'COVER'].includes(action)) {
    return (exitPrice - entryPrice) * amount;
  }
  if (['SHORT'].includes(action)) {
    // Opening short: log 0 for now, close on COVER
    return 0;
  }
  return 0;
}

async function afterTrade(action, model, entryPrice, exitPrice, amount) {
  const pnl = calculateTradePnL(action, entryPrice, exitPrice, amount);
  recordModelTrade(model, pnl);

  // Update winner model every N trades
  const performance = loadModelPerformance();
  const totalTrades =
    (performance.tf?.trades || 0) +
    (performance.convnet?.trades || 0) +
    (performance.ensemble?.trades || 0);
  if (totalTrades % MODEL_PNL_UPDATE_FREQ === 0) {
    selectWinnerModel();
  }
  if (totalTrades % AUTOTUNE_FREQ === 0) {
    autoTuneParameters();
  }
}

// --- ML-based adaptation ---
let stopLossHits = 0, takeProfitHits = 0, totalTrades = 0;
function recordTradeOutcome(outcome) {
  totalTrades++;
  if (outcome === 'STOP_LOSS') stopLossHits++;
  if (outcome === 'TAKE_PROFIT') takeProfitHits++;
}

// Dynamic variables for tuning
let minTrades = 8;
let SL_STEP = 0.2;
let TP_STEP = 0.2;
let SL_MIN = 0.5, SL_MAX = 5;
let TP_MIN = 1, TP_MAX = 10;

// Optionally, keep a history of recent P&L for further auto-tuning
let recentPnlHistory = [];

function autoTuneAdaptParams() {
  // Example logic: tune parameters based on performance, trade volatility, etc.
  const avgPnl = recentPnlHistory.length ? recentPnlHistory.reduce((a, b) => a + b, 0) / recentPnlHistory.length : 0;

  // If average P&L drops, be more conservative
  if (avgPnl < 0) {
    SL_STEP = Math.max(0.1, SL_STEP - 0.05);
    TP_STEP = Math.max(0.1, TP_STEP - 0.05);
    minTrades = Math.min(20, minTrades + 2); // wait longer before adapting
    SL_MIN = Math.min(SL_MIN + 0.1, SL_MAX); // slightly wider stop loss
    TP_MIN = Math.max(TP_MIN - 0.1, 0.5);    // slightly tighter take profit
  }
  // If average P&L is high, be more aggressive
  if (avgPnl > 0.5) {
    SL_STEP = Math.min(1.0, SL_STEP + 0.05);
    TP_STEP = Math.min(1.0, TP_STEP + 0.05);
    minTrades = Math.max(4, minTrades - 2);  // adapt quicker
    SL_MIN = Math.max(0.3, SL_MIN - 0.1);    // slightly tighter stop loss
    TP_MIN = Math.min(TP_MIN + 0.1, TP_MAX); // slightly wider take profit
  }
  // Clamp values to safe ranges
  SL_STEP = Math.max(0.1, Math.min(SL_STEP, 1.0));
  TP_STEP = Math.max(0.1, Math.min(TP_STEP, 1.0));
  minTrades = Math.max(4, Math.min(minTrades, 20));
  SL_MIN = Math.max(0.3, Math.min(SL_MIN, SL_MAX));
  TP_MIN = Math.max(0.5, Math.min(TP_MIN, TP_MAX));
}

// Your main adaptParameters function now uses dynamically tuned variables
function adaptParameters() {
  let BASE_SL = 1, BASE_TP = 2;

  autoTuneAdaptParams();

  if (totalTrades >= minTrades) {
    const slRatio = stopLossHits / totalTrades;
    const tpRatio = takeProfitHits / totalTrades;

    if (slRatio > 0.5) BASE_SL = Math.min(BASE_SL + SL_STEP, SL_MAX);
    if (tpRatio < 0.2) BASE_TP = Math.max(BASE_TP - TP_STEP, TP_MIN);

    // Reset counters for next window
    stopLossHits = 0; takeProfitHits = 0; totalTrades = 0;
  }
  return { BASE_SL, BASE_TP };
}

// --- Auto-tuning Sensitive Parameters ---
let PVVM_THRESHOLDS = [1.0, 2.5, 5.0];
let PVD_THRESHOLDS = [1.0, 2.5, 5.0];
let DYNAMIC_WINDOWS = [4, 7, 12];
let DYNAMIC_FACTORS = [1.03, 1.07, 1.12];

function getPNLStats() {
  const perf = loadModelPerformance();
  let tradeCount = 0, winCount = 0, maxDrawdown = 0, cumPnL = 0;
  for (const m of Object.keys(perf)) {
    tradeCount += perf[m].trades;
    cumPnL += perf[m].pnl;
    if (perf[m].pnl > 0) winCount += perf[m].trades;
    if (perf[m].pnl < maxDrawdown) maxDrawdown = perf[m].pnl;
  }
  return {
    winRate: tradeCount > 0 ? winCount / tradeCount : 0,
    maxDrawdown: maxDrawdown,
    tradeCount: tradeCount,
    cumPnL: cumPnL,
  };
}

function autoTuneParameters() {
  const pnlStats = getPNLStats();
  // If win rate < 50%, tighten thresholds and increase factors
  if (pnlStats.winRate < 0.5) {
    PVVM_THRESHOLDS = PVVM_THRESHOLDS.map(x => Math.max(0.1, x + 0.5));
    PVD_THRESHOLDS = PVD_THRESHOLDS.map(x => Math.max(0.1, x + 0.5));
    DYNAMIC_FACTORS = DYNAMIC_FACTORS.map(x => x + 0.02);
    console.log(`[AUTOTUNE] Win rate low (${(pnlStats.winRate*100).toFixed(1)}%), making bot more conservative.`);
  }
  // If win rate > 70%, loosen thresholds and decrease factors
  if (pnlStats.winRate > 0.7) {
    PVVM_THRESHOLDS = PVVM_THRESHOLDS.map(x => Math.max(0.1, x - 0.3));
    PVD_THRESHOLDS = PVD_THRESHOLDS.map(x => Math.max(0.1, x - 0.3));
    DYNAMIC_FACTORS = DYNAMIC_FACTORS.map(x => Math.max(1.0, x - 0.01));
    console.log(`[AUTOTUNE] Win rate high (${(pnlStats.winRate*100).toFixed(1)}%), making bot more aggressive.`);
  }
  // If max drawdown is large, use shorter windows (faster adaptation)
  if (pnlStats.maxDrawdown < -0.10) {
    DYNAMIC_WINDOWS = DYNAMIC_WINDOWS.map(x => Math.max(2, x - 2));
    console.log(`[AUTOTUNE] Max drawdown (${pnlStats.maxDrawdown.toFixed(3)}) high, adapting faster.`);
  }
  // If trades are too few, decrease all thresholds a little
  if (pnlStats.tradeCount < 5) {
    PVVM_THRESHOLDS = PVVM_THRESHOLDS.map(x => Math.max(0.1, x - 0.2));
    PVD_THRESHOLDS = PVD_THRESHOLDS.map(x => Math.max(0.1, x - 0.2));
    console.log(`[AUTOTUNE] Trade count low (${pnlStats.tradeCount}), lowering thresholds for more trades.`);
  }
  // Optionally: Save to disk for inspection
  fs.writeFileSync(path.resolve(__dirname, './autotune_params.json'), JSON.stringify({
    PVVM_THRESHOLDS, PVD_THRESHOLDS, DYNAMIC_WINDOWS, DYNAMIC_FACTORS
  }, null, 2));
}

// --- Comparative Signal Log Parser ---
function parseComparativeSignalLine(line) {
  const parts = line.split('\t');
  if (parts.length < 9) return null;
  const [
    timestamp,
    prediction_convnet,
    prediction_tf,
    price,
    PVVM,
    PVD,
    label_convnet,
    label_tf,
    ensemble_label
  ] = parts;

  const parsedPrice = Number(price);
  const parsedPVVM = Number(PVVM);
  const parsedPVD = Number(PVD);

  if (
    !timestamp ||
    typeof prediction_convnet !== 'string' ||
    typeof prediction_tf !== 'string' ||
    isNaN(parsedPrice) ||
    isNaN(parsedPVVM) ||
    isNaN(parsedPVD) ||
    !ensemble_label
  ) {
    return null;
  }

  return {
    timestamp: timestamp.trim(),
    prediction_convnet: prediction_convnet.trim(),
    prediction_tf: prediction_tf.trim(),
    price: parsedPrice,
    PVVM: parsedPVVM,
    PVD: parsedPVD,
    label_convnet: label_convnet ? label_convnet.trim() : null,
    label_tf: label_tf ? label_tf.trim() : null,
    ensemble_label: ensemble_label.trim()
  };
}

function loadComparativeSignals(logPath) {
  if (!fs.existsSync(logPath)) return [];
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(1).map(parseComparativeSignalLine).filter(Boolean);
}

// --- Helper: Load processed signals (dedup by timestamp|prediction|label)
function loadProcessedSignals() {
  if (!fs.existsSync(ORDER_LOG_PATH)) return new Set();
  const set = new Set();
  const lines = fs.readFileSync(ORDER_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 4) {
      set.add(parts[1] + '|' + parts[2] + '|' + (parts[3] || ''));
    }
  }
  return set;
}

// --- Helper: Log order
function logOrder(timestamp, prediction, label, action, result, reason, error = null) {
  const logLine = [
    new Date().toISOString(),
    timestamp,
    prediction,
    label || '',
    action,
    error ? `ERROR: ${error}` : 'SUCCESS',
    error ? '' : JSON.stringify(result),
    reason || ''
  ].join('\t') + '\n';
  fs.appendFileSync(ORDER_LOG_PATH, logLine);
}

// --- Dynamic threshold calculation
function getDynamicThresholds(signals, PVVM_BASE_THRESHOLD, PVD_BASE_THRESHOLD, DYNAMIC_WINDOW, DYNAMIC_FACTOR) {
  const recent = signals.slice(-DYNAMIC_WINDOW);
  const pvvmList = recent.map(s => s.PVVM).filter(x => typeof x === 'number' && !isNaN(x));
  const pvdList = recent.map(s => s.PVD).filter(x => typeof x === 'number' && !isNaN(x));
  const avgPVVM = pvvmList.length ? pvvmList.reduce((a,b) => a+b, 0) / pvvmList.length : PVVM_BASE_THRESHOLD;
  const avgPVD  = pvdList.length  ? pvdList.reduce((a,b) => a+b, 0) / pvdList.length : PVD_BASE_THRESHOLD;
  return {
    PVVM: avgPVVM * DYNAMIC_FACTOR,
    PVD: avgPVD * DYNAMIC_FACTOR,
  };
}

// --- Dynamic frequency logic
function getDynamicInterval(PVVM, PVD, pvvmThreshold, pvdThreshold) {
  if (PVVM > pvvmThreshold * 2 && PVD > pvdThreshold * 2) return INTERVAL_HIGH;
  if (PVVM < pvvmThreshold * 0.7 && PVD < pvdThreshold * 0.7) return INTERVAL_LOW;
  return INTERVAL_DEFAULT;
}

// --- Exchange setup
const exchangeClass = ccxt[EXCHANGE];
if (!exchangeClass) {
  console.error(`Exchange '${EXCHANGE}' not supported by ccxt.`);
  process.exit(1);
}
const exchange = new exchangeClass({
  apiKey: API_KEY,
  secret: API_SECRET,
  enableRateLimit: true,
});

// --- Bot state
let isRunning = false;
let positionOpen = false;
let entryPrice = null;
let lastAction = null;

// --- Sync position from exchange
async function syncPosition() {
  try {
    const balance = await exchange.fetchBalance();
    const baseCurrency = PAIR.split('/')[0];
    if (balance.total[baseCurrency] && balance.total[baseCurrency] > MIN_ALLOWED_ORDER_AMOUNT * 1.2) {
      positionOpen = true;
      entryPrice = null;
      lastAction = 'BUY';
      console.log(`[Startup] Detected open position in ${baseCurrency} (${balance.total[baseCurrency]}).`);
    } else {
      positionOpen = false;
      entryPrice = null;
      lastAction = null;
      console.log(`[Startup] No open position detected. Starting flat.`);
    }
  } catch (err) {
    console.error('Error syncing position:', err.message || err);
  }
}

// --- Balance check for orders
async function hasEnoughBalanceForOrder(action, orderSize, currentPrice) {
  try {
    const balance = await exchange.fetchBalance();
    const [base, quote] = PAIR.split('/');
    if (action === 'BUY') {
      const required = orderSize * currentPrice;
      if ((balance.free[quote] || 0) < required) {
        console.log(`Not enough ${quote} for BUY. Needed: ${required}, Available: ${balance.free[quote]}`);
        return false;
      }
    }
    if (action === 'SELL') {
      if ((balance.free[base] || 0) < orderSize) {
        console.log(`Not enough ${base} for SELL. Needed: ${orderSize}, Available: ${balance.free[base]}`);
        return false;
      }
    }
    if (action === 'SHORT') {
      if (!exchange.has['margin']) {
        console.log('Short logic skipped: Margin trading not supported.');
        return false;
      }
    }
    if (action === 'COVER') {
      const required = orderSize * currentPrice;
      if ((balance.free[quote] || 0) < required) {
        console.log(`Not enough ${quote} for COVER. Needed: ${required}, Available: ${balance.free[quote]}`);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error('Balance check error:', err.message || err);
    return false;
  }
}

// --- Insufficient funds handler
async function handleInsufficientFunds(signalKey, rescheduleMs) {
  console.error('[Funds] Insufficient funds/margin; will resync and retry.');
  await syncPosition();
  scheduleNext(rescheduleMs || INTERVAL_DEFAULT);
  isRunning = false;
}

// --- Main trading loop ---
async function main() {
  if (isRunning) {
    console.warn(`[${new Date().toISOString()}] Previous cycle still running, skipping.`);
    return;
  }
  isRunning = true;
  console.log(`[DEBUG] Entering main loop at ${new Date().toISOString()}`);

  try {
    const signals = loadComparativeSignals(MAG_SIGNAL_LOG_PATH);
    console.log(`[DEBUG] Loaded ${signals.length} signals`);
    if (signals.length === 0) {
      console.log('No signals found.');
      scheduleNext(INTERVAL_DEFAULT);
      return;
    }

    const lastSignal = signals[signals.length - 1];
    const { timestamp, prediction_convnet, prediction_tf, PVVM = NaN, PVD = NaN, price } = lastSignal;

    // --- MODEL WINNER ADAPTATION ---
    const activeModel = getActiveModel();
    let prediction, label;
    if (activeModel === 'tf') {
      prediction = lastSignal.prediction_tf;
      label = lastSignal.label_tf;
    } else if (activeModel === 'convnet') {
      prediction = lastSignal.prediction_convnet;
      label = lastSignal.label_convnet;
    } else {
      prediction = lastSignal.ensemble_label;
      label = lastSignal.ensemble_label;
    }

    // Validate signal
    if (typeof price !== 'number' || isNaN(price)) {
      console.warn('[Signal] Skipping signal with invalid price field:', lastSignal);
      scheduleNext(INTERVAL_MS);
      return;
    }
    if (!label || typeof label !== 'string') {
      console.warn('[Signal] Skipping signal with invalid label field:', lastSignal);
      scheduleNext(INTERVAL_MS);
      return;
    }
    const processedSignals = loadProcessedSignals();
    const signalKey = `${timestamp}|${prediction}|${label || ''}`;
    console.log(`[DEBUG] Last signal: ${JSON.stringify(lastSignal)}`);
    console.log(`[DEBUG] Using active model: ${activeModel}, label: ${label}, prediction: ${prediction}`);

    // --- Dynamic PVVM/PVD thresholds (now auto-tuned) ---
    const avgVol = (typeof PVVM === 'number' && typeof PVD === 'number')
      ? (PVVM + PVD) / 2
      : 0;

    let PVVM_BASE_THRESHOLD, PVD_BASE_THRESHOLD, DYNAMIC_WINDOW, DYNAMIC_FACTOR;

    if (avgVol < 50) {
      PVVM_BASE_THRESHOLD = PVVM_THRESHOLDS[0];
      PVD_BASE_THRESHOLD  = PVD_THRESHOLDS[0];
      DYNAMIC_WINDOW      = DYNAMIC_WINDOWS[0];
      DYNAMIC_FACTOR      = DYNAMIC_FACTORS[0];
    } else if (avgVol < 150) {
      PVVM_BASE_THRESHOLD = PVVM_THRESHOLDS[1];
      PVD_BASE_THRESHOLD  = PVD_THRESHOLDS[1];
      DYNAMIC_WINDOW      = DYNAMIC_WINDOWS[1];
      DYNAMIC_FACTOR      = DYNAMIC_FACTORS[1];
    } else {
      PVVM_BASE_THRESHOLD = PVVM_THRESHOLDS[2];
      PVD_BASE_THRESHOLD  = PVD_THRESHOLDS[2];
      DYNAMIC_WINDOW      = DYNAMIC_WINDOWS[2];
      DYNAMIC_FACTOR      = DYNAMIC_FACTORS[2];
    }

    // Calculate dynamic thresholds
    const { PVVM: pvvmThreshold, PVD: pvdThreshold } = getDynamicThresholds(
      signals,
      PVVM_BASE_THRESHOLD,
      PVD_BASE_THRESHOLD,
      DYNAMIC_WINDOW,
      DYNAMIC_FACTOR
    );

    // Calculate dynamic interval for scheduling
    const INTERVAL_MS = getDynamicInterval(PVVM, PVD, pvvmThreshold, pvdThreshold);

    // Prevent duplicate signal processing
    if (processedSignals.has(signalKey)) {
      console.log('Signal already processed. Skipping.');
      scheduleNext(INTERVAL_MS);
      return;
    }

    // --- ML-adaptive SL/TP ---
    const { BASE_SL: adaptiveBASE_SL, BASE_TP: adaptiveBASE_TP } = adaptParameters();

    // --- SL/TP logic ---
    if (positionOpen && entryPrice) {
      try {
        const ticker = await exchange.fetchTicker(PAIR);
        const currentPrice = ticker.last;
        let BASE_SL = adaptiveBASE_SL, BASE_TP = adaptiveBASE_TP, VOL_SCALING;
        if (avgVol < 50) VOL_SCALING = 0.002;
        else if (avgVol < 150) VOL_SCALING = 0.005;
        else VOL_SCALING = 0.02;

        const dynamicSL = BASE_SL + (VOL_SCALING * avgVol);
        const dynamicTP = BASE_TP + (VOL_SCALING * avgVol);
        const stopLossPrice = entryPrice * (1 - dynamicSL / 100);
        const takeProfitPrice = entryPrice * (1 + dynamicTP / 100);

        const balance = await exchange.fetchBalance();
        const baseCurrency = PAIR.split('/')[0];
        let orderSize = balance.free[baseCurrency] || 0;
        if (orderSize > 0.00001) orderSize -= 0.00000001;

        // STOP LOSS
        if (currentPrice <= stopLossPrice) {
          if (orderSize < MIN_ALLOWED_ORDER_AMOUNT ||
              !(await hasEnoughBalanceForOrder('SELL', orderSize, currentPrice))) {
            await handleInsufficientFunds(signalKey, INTERVAL_MS);
            return;
          }
          try {
            const result = await exchange.createMarketSellOrder(PAIR, orderSize);
            positionOpen = false;
            lastAction = 'STOP_LOSS';
            logOrder(timestamp, prediction, label, 'STOP_LOSS', result, `SL at ${stopLossPrice}, dynamic SL: ${dynamicSL.toFixed(2)}%`);
            recordTradeOutcome(lastAction);
            await afterTrade('STOP_LOSS', activeModel, entryPrice, result.price || result.average || currentPrice, orderSize);
            entryPrice = null;
            console.log(`[${timestamp}] STOP LOSS triggered at ${currentPrice}`);
          } catch (err) {
            logOrder(timestamp, prediction, label, 'STOP_LOSS', null, 'Failed to submit STOP_LOSS', err.message || err);
            await handleInsufficientFunds(signalKey, INTERVAL_MS);
            return;
          }
          scheduleNext(INTERVAL_MS);
          return;
        }
        // TAKE PROFIT
        if (currentPrice >= takeProfitPrice) {
          if (orderSize < MIN_ALLOWED_ORDER_AMOUNT ||
              !(await hasEnoughBalanceForOrder('SELL', orderSize, currentPrice))) {
            await handleInsufficientFunds(signalKey, INTERVAL_MS);
            return;
          }
          try {
            const result = await exchange.createMarketSellOrder(PAIR, orderSize);
            positionOpen = false;
            lastAction = 'TAKE_PROFIT';
            logOrder(timestamp, prediction, label, 'TAKE_PROFIT', result, `TP at ${takeProfitPrice}, dynamic TP: ${dynamicTP.toFixed(2)}%`);
            recordTradeOutcome(lastAction);
            await afterTrade('TAKE_PROFIT', activeModel, entryPrice, result.price || result.average || currentPrice, orderSize);
            entryPrice = null;
            console.log(`[${timestamp}] TAKE PROFIT triggered at ${currentPrice}`);
          } catch (err) {
            logOrder(timestamp, prediction, label, 'TAKE_PROFIT', null, 'Failed to submit TAKE_PROFIT', err.message || err);
            await handleInsufficientFunds(signalKey, INTERVAL_MS);
            return;
          }
          scheduleNext(INTERVAL_MS);
          return;
        }
      } catch (err) {
        console.error('SL/TP check error:', err.message || err);
      }
    }

    // --- Trade Size Adjustment ---
    let orderSize = ORDER_AMOUNT;
    if (PVVM > pvvmThreshold * 2 && PVD > pvdThreshold * 2) orderSize *= 2;
    if (PVVM < pvvmThreshold && PVD < pvdThreshold) orderSize *= 0.5;
    orderSize = Math.max(orderSize, MIN_ALLOWED_ORDER_AMOUNT);

    // --- Fetch ticker price
    let ticker = null;
    try {
      ticker = await exchange.fetchTicker(PAIR);
    } catch (err) {
      console.error('Ticker fetch error:', err.message || err);
      scheduleNext(INTERVAL_MS);
      isRunning = false;
      return;
    }
    const currentPrice = ticker.last;

    // --- Entry Logic: BUY ---
    if (
      !positionOpen &&
      (label === 'strong_bull') &&
      PVVM > pvvmThreshold && PVD > pvdThreshold
    ) {
      if (!(await hasEnoughBalanceForOrder('BUY', orderSize, currentPrice))) {
        await handleInsufficientFunds(signalKey, INTERVAL_MS);
        return;
      }
      try {
        const result = await exchange.createMarketBuyOrder(PAIR, orderSize);
        positionOpen = true;
        entryPrice = result.price || result.average || currentPrice;
        lastAction = 'BUY';
        logOrder(timestamp, prediction, label, 'BUY', result, `Strong Bull & PVVM/PVD above dynamic threshold`);
        recordTradeOutcome(lastAction);
        await afterTrade('BUY', activeModel, null, entryPrice, orderSize);
        console.log(`[${timestamp}] BUY order submitted`);
      } catch (err) {
        logOrder(timestamp, prediction, label, 'BUY', null, 'Failed to submit BUY', err.message || err);
        await handleInsufficientFunds(signalKey, INTERVAL_MS);
        return;
      }
      scheduleNext(INTERVAL_MS);
      isRunning = false;
      return;
    }

    // --- Entry Logic: SHORT ---
    if (
      !positionOpen &&
      (label === 'strong_bear') &&
      PVVM > pvvmThreshold && PVD > pvdThreshold
    ) {
      if (!exchange.has['margin']) {
        console.log('Short/SELL signals ignored: Spot trading only.');
        scheduleNext(INTERVAL_MS);
        isRunning = false;
        return;
      }
      if (!(await hasEnoughBalanceForOrder('SHORT', orderSize, currentPrice))) {
        await handleInsufficientFunds(signalKey, INTERVAL_MS);
        return;
      }
      try {
        const result = await exchange.createMarketSellOrder(PAIR, orderSize);
        positionOpen = true;
        entryPrice = result.price || result.average || currentPrice;
        lastAction = 'SHORT';
        logOrder(timestamp, prediction, label, 'SHORT', result, `Strong Bear & PVVM/PVD above dynamic threshold`);
        recordTradeOutcome(lastAction);
        await afterTrade('SHORT', activeModel, null, entryPrice, orderSize);
        console.log(`[${timestamp}] SHORT order submitted`);
      } catch (err) {
        logOrder(timestamp, prediction, label, 'SHORT', null, 'Failed to submit SHORT', err.message || err);
        await handleInsufficientFunds(signalKey, INTERVAL_MS);
        return;
      }
      scheduleNext(INTERVAL_MS);
      isRunning = false;
      return;
    }

    // --- Exit Logic: SELL (weak_bull) ---
    if (
      positionOpen &&
      label === 'weak_bull' &&
      PVVM < pvvmThreshold && PVD < pvdThreshold
    ) {
      if (!(await hasEnoughBalanceForOrder('SELL', orderSize, currentPrice))) {
        await handleInsufficientFunds(signalKey, INTERVAL_MS);
        return;
      }
      try {
        const result = await exchange.createMarketSellOrder(PAIR, orderSize);
        positionOpen = false;
        lastAction = 'SELL';
        logOrder(timestamp, prediction, label, 'SELL', result, `Weak Bull & PVVM/PVD near zero`);
        recordTradeOutcome(lastAction);
        await afterTrade('SELL', activeModel, entryPrice, result.price || result.average || currentPrice, orderSize);
        entryPrice = null;
        console.log(`[${timestamp}] SELL order submitted`);
        await syncPosition();
      } catch (err) {
        logOrder(timestamp, prediction, label, 'SELL', null, 'Failed to submit SELL', err.message || err);
        await handleInsufficientFunds(signalKey, INTERVAL_MS);
        return;
      }
      scheduleNext(INTERVAL_MS);
      isRunning = false;
      return;
    }
    
    // --- Exit Logic: COVER (weak_bear) ---
    if (
      positionOpen &&
      label === 'weak_bear' &&
      PVVM < pvvmThreshold && PVD < pvdThreshold
    ) {
      if (!exchange.has['margin']) {
        console.log('Cover signals ignored: Spot trading only.');
        scheduleNext(INTERVAL_MS);
        isRunning = false;
        return;
      }
      try {
        const balance = await exchange.fetchBalance();
        const [base, quote] = PAIR.split('/');
        const feeBuffer = 1.005;
        const availableQuote = balance.free[quote] || 0;

        const maxCoverable = availableQuote / (currentPrice * feeBuffer);

        if (maxCoverable >= MIN_ALLOWED_ORDER_AMOUNT) {
          const openPositionSize = balance.total[base] || 0;
          const coverOrderSize = Math.min(openPositionSize, maxCoverable);

          if (coverOrderSize >= MIN_ALLOWED_ORDER_AMOUNT) {
            const result = await exchange.createMarketBuyOrder(PAIR, coverOrderSize);
            positionOpen = false;
            lastAction = 'COVER';
            logOrder(timestamp, prediction, label, 'COVER', result, `Weak Bear & PVVM/PVD near zero`);
            recordTradeOutcome(lastAction);
            await afterTrade('COVER', activeModel, entryPrice, result.price || result.average || currentPrice, coverOrderSize);
            entryPrice = null;
            console.log(`[${timestamp}] COVER order submitted`);
            await syncPosition();
          } else {
            console.log(`Not enough ${quote} for COVER. Needed: ${MIN_ALLOWED_ORDER_AMOUNT * currentPrice}, Available: ${availableQuote}.`);
            logOrder(timestamp, prediction, label, 'COVER', null, 'COVER skipped: not enough quote for minimum size', null);
            recordTradeOutcome('COVER');
            await handleInsufficientFunds(signalKey, INTERVAL_MS);
          }
        } else {
          console.log(`Not enough ${quote} for COVER. Needed: ${MIN_ALLOWED_ORDER_AMOUNT * currentPrice}, Available: ${availableQuote}.`);
          logOrder(timestamp, prediction, label, 'COVER', null, 'COVER skipped: not enough quote for minimum size', null);
          recordTradeOutcome('COVER');
          await handleInsufficientFunds(signalKey, INTERVAL_MS);
        }
      } catch (err) {
        logOrder(timestamp, prediction, label, 'COVER', null, 'Failed to submit COVER', err.message || err);
        await handleInsufficientFunds(signalKey, INTERVAL_MS);
        return;
      }
      scheduleNext(INTERVAL_MS);
      isRunning = false;
      return;
    }
    
    // --- Default: Reschedule if no trade triggered ---
    scheduleNext(INTERVAL_MS);

  } catch (e) {
    console.error('[UNCAUGHT EXCEPTION]', e);
    scheduleNext(INTERVAL_DEFAULT);
  } finally {
    isRunning = false;
    console.log(`[DEBUG] Exiting main loop at ${new Date().toISOString()}`);
  }
}

// --- Interval scheduling ---
let intervalHandle = null;
function scheduleNext(ms) {
  if (intervalHandle) clearTimeout(intervalHandle);
  console.log(`[DEBUG] Scheduling next run in ${ms / 1000}s`);
  intervalHandle = setTimeout(main, ms);
}

// --- Startup ---
(async () => {
  await syncPosition();
  console.log(`Starting ccxt_orders.js with INTERVAL_MS: ${INTERVAL_MS / 1000}s`);
  main();
})();

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
