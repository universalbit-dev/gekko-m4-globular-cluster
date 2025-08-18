/**
 * ccxt_orders.js (Zenith Version, robust comparative log parsing, model winner adaptive)
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

// --- ML-based adaptation ---
let stopLossHits = 0, takeProfitHits = 0, totalTrades = 0;
function recordTradeOutcome(outcome) {
  totalTrades++;
  if (outcome === 'STOP_LOSS') stopLossHits++;
  if (outcome === 'TAKE_PROFIT') takeProfitHits++;
}
function adaptParameters() {
  let BASE_SL = 1, BASE_TP = 2;
  if (totalTrades >= 10) {
    if (stopLossHits / totalTrades > 0.5) BASE_SL += 0.5;
    if (takeProfitHits / totalTrades < 0.2) BASE_TP -= 0.5;
    stopLossHits = 0; takeProfitHits = 0; totalTrades = 0;
  }
  return { BASE_SL, BASE_TP };
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

    // --- Dynamic PVVM/PVD thresholds ---
    const avgVol = (typeof PVVM === 'number' && typeof PVD === 'number')
      ? (PVVM + PVD) / 2
      : 0;

    const PVVM_THRESHOLDS = [1.0, 2.5, 5.0];
    const PVD_THRESHOLDS = [1.0, 2.5, 5.0];
    const DYNAMIC_WINDOWS = [4, 7, 12];
    const DYNAMIC_FACTORS = [1.03, 1.07, 1.12];

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
            entryPrice = null;
            lastAction = 'STOP_LOSS';
            logOrder(timestamp, prediction, label, 'STOP_LOSS', result, `SL at ${stopLossPrice}, dynamic SL: ${dynamicSL.toFixed(2)}%`);
            recordTradeOutcome(lastAction);
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
            entryPrice = null;
            lastAction = 'TAKE_PROFIT';
            logOrder(timestamp, prediction, label, 'TAKE_PROFIT', result, `TP at ${takeProfitPrice}, dynamic TP: ${dynamicTP.toFixed(2)}%`);
            recordTradeOutcome(lastAction);
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
        entryPrice = result.price || result.average || null;
        lastAction = 'BUY';
        logOrder(timestamp, prediction, label, 'BUY', result, `Strong Bull & PVVM/PVD above dynamic threshold`);
        recordTradeOutcome(lastAction);
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
        entryPrice = result.price || result.average || null;
        lastAction = 'SHORT';
        logOrder(timestamp, prediction, label, 'SHORT', result, `Strong Bear & PVVM/PVD above dynamic threshold`);
        recordTradeOutcome(lastAction);
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
        entryPrice = null;
        lastAction = 'SELL';
        logOrder(timestamp, prediction, label, 'SELL', result, `Weak Bull & PVVM/PVD near zero`);
        recordTradeOutcome(lastAction);
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
        const maxBuyable = availableQuote / (currentPrice * feeBuffer);
        const coverOrderSize = Math.min(orderSize, maxBuyable);

        if (coverOrderSize < MIN_ALLOWED_ORDER_AMOUNT) {
          console.log(`Not enough ${quote} for COVER. Needed: ${orderSize * currentPrice}, Available: ${availableQuote}.`);
          logOrder(timestamp, prediction, label, 'COVER', null, 'COVER skipped: not enough quote for minimum size', null);
          recordTradeOutcome('COVER');
          await handleInsufficientFunds(signalKey, INTERVAL_MS);
          return;
        }

        const result = await exchange.createMarketBuyOrder(PAIR, coverOrderSize);
        positionOpen = false;
        entryPrice = null;
        lastAction = 'COVER';
        logOrder(timestamp, prediction, label, 'COVER', result, `Weak Bear & PVVM/PVD near zero`);
        recordTradeOutcome(lastAction);
        console.log(`[${timestamp}] COVER order submitted`);
        await syncPosition();
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
