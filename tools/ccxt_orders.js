/**
 * ccxt_orders.js (Zenith Version)
 * 
 * Automated trading bot for cryptocurrency using ccxt, Node.js, and custom signal logs.
 * Now with dynamic PVVM/PVD thresholds, bull/bear support, adjustable trade size, reason logging, and dynamic trade frequency.
 * 
 * - Loads buy/sell signals from log files (basic and magnitude versions supported).
 * - Trades on the specified exchange (default Kraken) and trading pair (default BTC/EUR).
 * - Places market BUY orders on 'bull' or 'strong_bull' signals when not already in a position.
 * - Places market SELL/SHORT orders on 'bear' or 'strong_bear' signals when not already in a position (if supported).
 * - Places market SELL/Cover orders on 'weak_bull' or 'weak_bear' signals with PVVM/PVD near zero when in a position.
 * - Dynamic thresholding based on recent PVVM/PVD values.
 * - Adjustable trade size based on PVVM/PVD magnitude.
 * - Stop Loss or Take Profit triggers.
 * - Deduplicates processed signals to avoid double trading.
 * - Logs all trade actions and outcomes to a log file, including trade reason.
 * - Configurable via environment variables.
 * - Dynamically adapts order submission frequency to market volatility (PVVM/PVD).
 * 
 * Author: universalbit-dev
 * Repo: https://github.com/universalbit-dev/gekko-m4-globular-cluster
 */

require('dotenv').config();
const ccxt = require('ccxt');
const fs = require('fs');
const path = require('path');

// Paths
const SIGNAL_LOG_PATH = path.resolve(__dirname, './ccxt_signal.log');
const MAG_SIGNAL_LOG_PATH = path.resolve(__dirname, './ccxt_signal_magnitude.log');
const ORDER_LOG_PATH = path.resolve(__dirname, './ccxt_order.log');

// Exchange setup
const EXCHANGE = process.env.EXCHANGE || 'kraken';
const API_KEY = process.env.KEY || '';
const API_SECRET = process.env.SECRET || '';
const PAIR = process.env.PAIR || 'BTC/EUR';
const ORDER_AMOUNT = parseFloat(process.env.ORDER_AMOUNT) || 0.00006;
const MIN_ALLOWED_ORDER_AMOUNT = parseFloat(process.env.MIN_ALLOWED_ORDER_AMOUNT) || 0.00006;

const STOP_LOSS_PCT = parseFloat(process.env.STOP_LOSS_PCT) || 2;
const TAKE_PROFIT_PCT = parseFloat(process.env.TAKE_PROFIT_PCT) || 4;

// Dynamic PVVM/PVD thresholds
const PVVM_BASE_THRESHOLD = parseFloat(process.env.PVVM_BASE_THRESHOLD) || 10.0;
const PVD_BASE_THRESHOLD = parseFloat(process.env.PVD_BASE_THRESHOLD) || 10.0;
const DYNAMIC_WINDOW = parseInt(process.env.DYNAMIC_WINDOW, 10) || 10;
const DYNAMIC_FACTOR = parseFloat(process.env.DYNAMIC_FACTOR) || 1.2;

// Dynamic frequency configs (ms)
const INTERVAL_HIGH = parseInt(process.env.INTERVAL_HIGH, 10) || 60 * 1000;    // 1 min
const INTERVAL_DEFAULT = parseInt(process.env.INTERVAL_DEFAULT, 10) || 5 * 60 * 1000; // 5 min
const INTERVAL_LOW = parseInt(process.env.INTERVAL_LOW, 10) || 30 * 60 * 1000; // 30 min

// Default interval (used on first run, will be overwritten dynamically)
let INTERVAL_MS = INTERVAL_DEFAULT;

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

// Helper: Load processed signals (dedup by timestamp|prediction|label)
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

// Helper: Log order
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

// Helper: Load and unify signals
function loadUnifiedSignals() {
  const basicLines = fs.existsSync(SIGNAL_LOG_PATH)
    ? fs.readFileSync(SIGNAL_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean)
    : [];
  const magLines = fs.existsSync(MAG_SIGNAL_LOG_PATH)
    ? fs.readFileSync(MAG_SIGNAL_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean)
    : [];

  // Parse mag signals: timestamp -> obj
  const magMap = {};
  for (const line of magLines) {
    const [timestamp, prediction, price, PVVM, PVD, label] = line.split('\t');
    if (timestamp) magMap[timestamp] = { timestamp, prediction, price, PVVM: parseFloat(PVVM), PVD: parseFloat(PVD), label };
  }

  // Merge: prefer magnitude version if exists
  const unifiedMap = {};
  for (const line of basicLines) {
    const [timestamp, prediction] = line.split('\t');
    if (!timestamp) continue;
    unifiedMap[timestamp] = magMap[timestamp] || { timestamp, prediction };
  }
  for (const timestamp in magMap) {
    unifiedMap[timestamp] = magMap[timestamp];
  }

  return Object.values(unifiedMap).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Dynamic threshold calculation
function getDynamicThresholds(signals) {
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

// Dynamic frequency logic: choose INTERVAL_MS based on most recent PVVM/PVD
function getDynamicInterval(PVVM, PVD, pvvmThreshold, pvdThreshold) {
  if (PVVM > pvvmThreshold * 2 && PVD > pvdThreshold * 2) {
    return INTERVAL_HIGH;    // High freq (market is moving!)
  }
  if (PVVM < pvvmThreshold * 0.7 && PVD < pvdThreshold * 0.7) {
    return INTERVAL_LOW;     // Long-term (market is quiet)
  }
  return INTERVAL_DEFAULT;   // Moderate freq (normal regime)
}

let isRunning = false;
let positionOpen = false;
let entryPrice = null;
let lastAction = null;

async function syncPosition() {
  try {
    const balance = await exchange.fetchBalance();
    const baseCurrency = PAIR.split('/')[0];
    if (balance.total[baseCurrency] && balance.total[baseCurrency] >= ORDER_AMOUNT) {
      positionOpen = true;
      entryPrice = null;
      lastAction = 'BUY';
      console.log(`[Startup] Detected open position in ${baseCurrency} (amount: ${balance.total[baseCurrency]}). Bot will start IN POSITION.`);
    } else {
      positionOpen = false;
      entryPrice = null;
      lastAction = null;
      console.log(`[Startup] No open position detected on exchange. Bot will start FLAT.`);
    }
  } catch (err) {
    console.error('Error syncing position with exchange:', err.message || err);
  }
}

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
        console.log('Short logic skipped: Margin trading not supported on this exchange.');
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

async function main() {
  if (isRunning) {
    console.warn(`[${new Date().toISOString()}] Previous cycle still running, skipping this interval.`);
    return;
  }
  isRunning = true;

  try {
    const signals = loadUnifiedSignals();
    if (signals.length === 0) {
      console.log('No signals found.');
      scheduleNext(INTERVAL_DEFAULT); // fallback frequency
      return;
    }
    const lastSignal = signals[signals.length - 1];
    const { timestamp, prediction, label, PVVM = NaN, PVD = NaN } = lastSignal;
    const processedSignals = loadProcessedSignals();
    const signalKey = `${timestamp}|${prediction}|${label || ''}`;
    if (processedSignals.has(signalKey)) {
      console.log('Signal already processed. Skipping.');
      scheduleNext(INTERVAL_DEFAULT); // fallback frequency
      return;
    }

    // Dynamic thresholds
    const { PVVM: pvvmThreshold, PVD: pvdThreshold } = getDynamicThresholds(signals);

    // --- Dynamic Frequency: set interval for next cycle
    INTERVAL_MS = getDynamicInterval(PVVM, PVD, pvvmThreshold, pvdThreshold);
    console.log(`[${timestamp}] Chosen INTERVAL_MS: ${INTERVAL_MS / 1000}s (PVVM=${PVVM}, PVD=${PVD}, thresholds: ${pvvmThreshold}, ${pvdThreshold})`);

    // --- DYNAMIC STOP LOSS / TAKE PROFIT LOGIC ---
    
/**
 * Enhanced Stop Loss / Take Profit Block
 * --------------------------------------
 * - Calculates stop loss and take profit percentages dynamically based on PVVM/PVD volatility.
 * - On trigger, sells your entire BTC position (avoids partial sells).
 * - Handles dust and minimum order size requirements for the exchange.
 * - Maintains logging and console output as before for transparency and debugging.
 */
 
if (positionOpen && entryPrice) {
  try {
    const ticker = await exchange.fetchTicker(PAIR);
    const currentPrice = ticker.last;

 /**
 * Dynamic SL/TP Parameter Table
 * ------------------------------------------------------------------------
 * | Setting      | BASE_SL | BASE_TP | VOL_SCALING | Use Case            |
 * |--------------|---------|---------|-------------|---------------------|
 * | Ultra-HF     | 0.15%   | 0.25%   | 0.003        | Ultra High-freq    |
 * | HF           | 0.3%    | 0.5%    | 0.005        | High-frequency     |
 * | Moderate     | 1%      | 2%      | 0.010        | Moderate           |
 * | LongTerm     | 2%      | 4%      | 0.010        | Long-term/swing    |
 * ------------------------------------------------------------------------
 * - VOL_SCALING: Each 1 unit PVVM/PVD adds that % to SL/TP (adapts to volatility).
 * - Always tune for your pair, volatility, and backtest results.
 */
 
    //Custom Configuration 
    const BASE_SL = 1; // 1% base Stop Loss
    const BASE_TP = 2; // 2% base Take Profit 
    const VOL_SCALING = 0.010; // Each 1 PVVM/PVD adds 0.010% to SL/TP


    // If PVVM/PVD are undefined, fall back to base only
    const avgVol = (typeof PVVM === 'number' && typeof PVD === 'number')
      ? (PVVM + PVD) / 2
      : 0;

    const dynamicSL = BASE_SL + (VOL_SCALING * avgVol);
    const dynamicTP = BASE_TP + (VOL_SCALING * avgVol);

    const stopLossPrice = entryPrice * (1 - dynamicSL / 100);
    const takeProfitPrice = entryPrice * (1 + dynamicTP / 100);

    // --- SELL ALL POSITION ON TRIGGER ---
    const balance = await exchange.fetchBalance();
    const baseCurrency = PAIR.split('/')[0];
    let orderSize = balance.free[baseCurrency] || 0;
    // Optionally avoid dust:
    if (orderSize > 0.00001) orderSize -= 0.00000001;

    if (currentPrice <= stopLossPrice) {
      if (orderSize < MIN_ALLOWED_ORDER_AMOUNT) {
        console.log(`Not enough ${baseCurrency} for STOP LOSS sell. Needed: ${MIN_ALLOWED_ORDER_AMOUNT}, Available: ${orderSize}`);
        await syncPosition();
        scheduleNext(INTERVAL_MS);
        return;
      }
      if (!(await hasEnoughBalanceForOrder('SELL', orderSize, currentPrice))) {
        await syncPosition();
        scheduleNext(INTERVAL_MS);
        return;
      }
      try {
        const result = await exchange.createMarketSellOrder(PAIR, orderSize);
        positionOpen = false;
        entryPrice = null;
        lastAction = 'STOP_LOSS';
        logOrder(timestamp, prediction, label, 'STOP_LOSS', result, `Price dropped to ${currentPrice} (SL at ${stopLossPrice}, dynamic SL: ${dynamicSL.toFixed(2)}%)`);
        console.log(`[${timestamp}] STOP LOSS triggered at ${currentPrice}`);
      } catch (err) {
        logOrder(timestamp, prediction, label, 'STOP_LOSS', null, 'Failed to submit STOP_LOSS', err.message || err);
        console.error('Order error:', err.message || err);
        if (err.message && err.message.includes('Insufficient funds')) await syncPosition();
      }
      scheduleNext(INTERVAL_MS);
      return;
    }
    if (currentPrice >= takeProfitPrice) {
      if (orderSize < MIN_ALLOWED_ORDER_AMOUNT) {
        console.log(`Not enough ${baseCurrency} for TAKE PROFIT sell. Needed: ${MIN_ALLOWED_ORDER_AMOUNT}, Available: ${orderSize}`);
        await syncPosition();
        scheduleNext(INTERVAL_MS);
        return;
      }
      if (!(await hasEnoughBalanceForOrder('SELL', orderSize, currentPrice))) {
        await syncPosition();
        scheduleNext(INTERVAL_MS);
        return;
      }
      try {
        const result = await exchange.createMarketSellOrder(PAIR, orderSize);
        positionOpen = false;
        entryPrice = null;
        lastAction = 'TAKE_PROFIT';
        logOrder(timestamp, prediction, label, 'TAKE_PROFIT', result, `Price rose to ${currentPrice} (TP at ${takeProfitPrice}, dynamic TP: ${dynamicTP.toFixed(2)}%)`);
        console.log(`[${timestamp}] TAKE PROFIT triggered at ${currentPrice}`);
      } catch (err) {
        logOrder(timestamp, prediction, label, 'TAKE_PROFIT', null, 'Failed to submit TAKE_PROFIT', err.message || err);
        console.error('Order error:', err.message || err);
        if (err.message && err.message.includes('Insufficient funds')) await syncPosition();
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

    // Fetch ticker price for balance check
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

    // --- Entry Logic ---
    if (
      !positionOpen &&
      (prediction === 'bull' || label === 'strong_bull') &&
      PVVM > pvvmThreshold && PVD > pvdThreshold
    ) {
      if (!(await hasEnoughBalanceForOrder('BUY', orderSize, currentPrice))) {
        await syncPosition();
        scheduleNext(INTERVAL_MS);
        isRunning = false;
        return;
      }
      try {
        const result = await exchange.createMarketBuyOrder(PAIR, orderSize);
        positionOpen = true;
        entryPrice = result.price || result.average || null;
        lastAction = 'BUY';
        logOrder(timestamp, prediction, label, 'BUY', result, `Bull/Strong Bull & PVVM/PVD above dynamic threshold (${PVVM.toFixed(2)}, ${PVD.toFixed(2)})`);
        console.log(`[${timestamp}] BUY order submitted (bull/strong_bull & PVVM/PVD strong)`);
      } catch (err) {
        logOrder(timestamp, prediction, label, 'BUY', null, 'Failed to submit BUY', err.message || err);
        console.error('Order error:', err.message || err);
        if (err.message && err.message.includes('Insufficient funds')) await syncPosition();
      }
      scheduleNext(INTERVAL_MS);
      isRunning = false;
      return;
    }

    // SHORT Entry
    if (
      !positionOpen &&
      (prediction === 'bear' || label === 'strong_bear') &&
      PVVM > pvvmThreshold && PVD > pvdThreshold
    ) {
      if (!exchange.has['margin']) {
        console.log('Short/SELL signals ignored: Spot trading only (no margin enabled).');
        scheduleNext(INTERVAL_MS);
        isRunning = false;
        return;
      }
      if (!(await hasEnoughBalanceForOrder('SHORT', orderSize, currentPrice))) {
        await syncPosition();
        scheduleNext(INTERVAL_MS);
        isRunning = false;
        return;
      }
      try {
        const result = await exchange.createMarketSellOrder(PAIR, orderSize);
        positionOpen = true;
        entryPrice = result.price || result.average || null;
        lastAction = 'SHORT';
        logOrder(timestamp, prediction, label, 'SHORT', result, `Bear/Strong Bear & PVVM/PVD above dynamic threshold (${PVVM.toFixed(2)}, ${PVD.toFixed(2)})`);
        console.log(`[${timestamp}] SHORT order submitted (bear/strong_bear & PVVM/PVD strong)`);
      } catch (err) {
        logOrder(timestamp, prediction, label, 'SHORT', null, 'Failed to submit SHORT', err.message || err);
        console.error('Order error:', err.message || err);
        if (err.message && err.message.includes('Insufficient funds')) await syncPosition();
      }
      scheduleNext(INTERVAL_MS);
      isRunning = false;
      return;
    }
    // --- Exit Logic ---
    if (
      positionOpen &&
      label === 'weak_bull' &&
      PVVM < pvvmThreshold && PVD < pvdThreshold
    ) {
      if (!(await hasEnoughBalanceForOrder('SELL', orderSize, currentPrice))) {
        await syncPosition();
        scheduleNext(INTERVAL_MS);
        isRunning = false;
        return;
      }
      try {
        const result = await exchange.createMarketSellOrder(PAIR, orderSize);
        positionOpen = false;
        entryPrice = null;
        lastAction = 'SELL';
        logOrder(timestamp, prediction, label, 'SELL', result, `Weak Bull & PVVM/PVD near zero (${PVVM.toFixed(2)}, ${PVD.toFixed(2)})`);
        console.log(`[${timestamp}] SELL order submitted (weak_bull & PVVM/PVD near zero)`);
        await syncPosition();
      } catch (err) {
        logOrder(timestamp, prediction, label, 'SELL', null, 'Failed to submit SELL', err.message || err);
        console.error('Order error:', err.message || err);
        if (err.message && err.message.includes('Insufficient funds')) await syncPosition();
      }
      scheduleNext(INTERVAL_MS);
      isRunning = false;
      return;
    }

    // Weak Bear Exit (cover, if shorting)
    if (
      positionOpen &&
      label === 'weak_bear' &&
      PVVM < pvvmThreshold && PVD < pvdThreshold
    ) {
      if (!exchange.has['margin']) {
        console.log('Cover signals ignored: Spot trading only (no margin enabled).');
        scheduleNext(INTERVAL_MS);
        isRunning = false;
        return;
      }
      try {
        const balance = await exchange.fetchBalance();
        const [base, quote] = PAIR.split('/');
        const feeBuffer = 1.005;
        const availableEUR = balance.free[quote] || 0;
        const maxBuyable = availableEUR / (currentPrice * feeBuffer);
        const coverOrderSize = Math.min(orderSize, maxBuyable);

        if (coverOrderSize < MIN_ALLOWED_ORDER_AMOUNT) {
          console.log(`Not enough ${quote} for COVER. Needed: ${orderSize * currentPrice}, Available: ${availableEUR}. COVER order skipped.`);
          logOrder(timestamp, prediction, label, 'COVER', null, `COVER skipped: not enough ${quote} for minimum order size`, null);
          scheduleNext(INTERVAL_MS);
          isRunning = false;
          return;
        }

        const result = await exchange.createMarketBuyOrder(PAIR, coverOrderSize);
        positionOpen = false;
        entryPrice = null;
        lastAction = 'COVER';
        logOrder(timestamp, prediction, label, 'COVER', result, `Weak Bear & PVVM/PVD near zero (${PVVM.toFixed(2)}, ${PVD.toFixed(2)})`);
        console.log(`[${timestamp}] COVER order submitted (weak_bear & PVVM/PVD near zero)`);
        await syncPosition();
      } catch (err) {
        logOrder(timestamp, prediction, label, 'COVER', null, 'Failed to submit COVER', err.message || err);
        console.error('Order error:', err.message || err);
        if (err.message && err.message.includes('Insufficient funds')) await syncPosition();
      }
      scheduleNext(INTERVAL_MS);
      isRunning = false;
      return;
    }

    // If nothing triggered, just reschedule
    scheduleNext(INTERVAL_MS);

  } finally {
    isRunning = false;
  }
}

// --- Dynamic interval scheduling ---
let intervalHandle = null;
function scheduleNext(ms) {
  if (intervalHandle) clearTimeout(intervalHandle);
  intervalHandle = setTimeout(main, ms);
}

// --- Startup: Sync position with exchange, then start main loop ---
(async () => {
  await syncPosition();
  console.log(`Starting ccxt_orders.js with initial interval: ${INTERVAL_MS / 1000}s`);
  main();
})();
