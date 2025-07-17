/**
 * ccxt_orders.js
 * 
 * Automated trading bot for cryptocurrency using ccxt, Node.js, and custom signal logs.
 * Now with dynamic PVVM/PVD thresholds, bull/bear support, adjustable trade size, and reason logging.
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
 * 
 * Author: universalbit-dev
 * Repo: https://github.com/universalbit-dev/gekko-m4-globular-cluster
 */

require('dotenv').config();
const ccxt = require('ccxt');
const fs = require('fs');
const path = require('path');

// Paths
const SIGNAL_LOG_PATH = path.join(__dirname, './ccxt_signal.log');
const MAG_SIGNAL_LOG_PATH = path.join(__dirname, './ccxt_signal_magnitude.log');
const ORDER_LOG_PATH = path.join(__dirname, './ccxt_order.log');

// IMPORTANT: INTERVAL_MS must be the same in all related scripts for consistent signal processing and order logic.
// Set INTERVAL_MS in .env to synchronize intervals.
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS, 10) || 3600000; // default 1h

// Exchange setup
const EXCHANGE = process.env.EXCHANGE || 'kraken';
const API_KEY = process.env.KEY || '';
const API_SECRET = process.env.SECRET || '';
const PAIR = process.env.PAIR || 'BTC/EUR';
const ORDER_AMOUNT = parseFloat(process.env.ORDER_AMOUNT) || 0.00005;

const STOP_LOSS_PCT = parseFloat(process.env.STOP_LOSS_PCT) || 2;
const TAKE_PROFIT_PCT = parseFloat(process.env.TAKE_PROFIT_PCT) || 4;

// Dynamic PVVM/PVD thresholds
/*
 * threshold parameters
 * |               | PVVM | PVD | Window | Factor | Sensitivity/Notes            |
 * |---------------|------|-----|--------|--------|------------------------------|
 * | HighFreq      | 5.0  | 5.0 |   5    | 1.0    | Highly sensitive, fast reacts|
 * | Default       |10.0  |10.0 |  10    | 1.2    | Balanced, moderate           |
 * | Daily         |15.0  |15.0 |  20    | 1.5    | Less sensitive, filters noise|
 * | LongTerm      |20.0  |20.0 |  30    | 2.0    | Very selective, strong moves |
 *
 * PVVM/PVD: Base move strength threshold.
 * Window: Number of recent signals for dynamic calculation.
 * Factor: Multiplier for threshold (lower = more sensitive).
 */
const PVVM_BASE_THRESHOLD = 10.0;
const PVD_BASE_THRESHOLD = 10.0;
const DYNAMIC_WINDOW = 10;  
const DYNAMIC_FACTOR = 1.2;  

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

let isRunning = false;
let positionOpen = false;
let entryPrice = null;
let lastAction = null;

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
      return;
    }
    const lastSignal = signals[signals.length - 1];
    const { timestamp, prediction, label, PVVM = NaN, PVD = NaN } = lastSignal;
    const processedSignals = loadProcessedSignals();
    const signalKey = `${timestamp}|${prediction}|${label || ''}`;
    if (processedSignals.has(signalKey)) {
      console.log('Signal already processed. Skipping.');
      return;
    }

    // Dynamic thresholds
    const { PVVM: pvvmThreshold, PVD: pvdThreshold } = getDynamicThresholds(signals);

    // --- STOP LOSS / TAKE PROFIT LOGIC ---
    if (positionOpen && entryPrice) {
      try {
        const ticker = await exchange.fetchTicker(PAIR);
        const currentPrice = ticker.last;
        const stopLossPrice = entryPrice * (1 - STOP_LOSS_PCT / 100);
        const takeProfitPrice = entryPrice * (1 + TAKE_PROFIT_PCT / 100);

        if (currentPrice <= stopLossPrice) {
          const result = await exchange.createMarketSellOrder(PAIR, ORDER_AMOUNT);
          positionOpen = false;
          entryPrice = null;
          lastAction = 'STOP_LOSS';
          logOrder(timestamp, prediction, label, 'STOP_LOSS', result, `Price dropped to ${currentPrice} (SL at ${stopLossPrice})`);
          console.log(`[${timestamp}] STOP LOSS triggered at ${currentPrice}`);
          return;
        }
        if (currentPrice >= takeProfitPrice) {
          const result = await exchange.createMarketSellOrder(PAIR, ORDER_AMOUNT);
          positionOpen = false;
          entryPrice = null;
          lastAction = 'TAKE_PROFIT';
          logOrder(timestamp, prediction, label, 'TAKE_PROFIT', result, `Price rose to ${currentPrice} (TP at ${takeProfitPrice})`);
          console.log(`[${timestamp}] TAKE PROFIT triggered at ${currentPrice}`);
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

    // --- Entry Logic ---
    // Bull/Strong Bull Entry
    if (
      !positionOpen &&
      (prediction === 'bull' || label === 'strong_bull') &&
      PVVM > pvvmThreshold && PVD > pvdThreshold
    ) {
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
      }
      return;
    }
    // Bear/Strong Bear Entry (if shorting supported)
    if (
      !positionOpen &&
      (prediction === 'bear' || label === 'strong_bear') &&
      PVVM > pvvmThreshold && PVD > pvdThreshold
    ) {
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
      }
      return;
    }
    // --- Exit Logic ---
    // Weak Bull Exit
    if (
      positionOpen &&
      label === 'weak_bull' &&
      PVVM < pvvmThreshold && PVD < pvdThreshold
    ) {
      try {
        const result = await exchange.createMarketSellOrder(PAIR, orderSize);
        positionOpen = false;
        entryPrice = null;
        lastAction = 'SELL';
        logOrder(timestamp, prediction, label, 'SELL', result, `Weak Bull & PVVM/PVD near zero (${PVVM.toFixed(2)}, ${PVD.toFixed(2)})`);
        console.log(`[${timestamp}] SELL order submitted (weak_bull & PVVM/PVD near zero)`);
      } catch (err) {
        logOrder(timestamp, prediction, label, 'SELL', null, 'Failed to submit SELL', err.message || err);
        console.error('Order error:', err.message || err);
      }
      return;
    }
    // Weak Bear Exit (cover, if shorting)
    if (
      positionOpen &&
      label === 'weak_bear' &&
      PVVM < pvvmThreshold && PVD < pvdThreshold
    ) {
      try {
        const result = await exchange.createMarketBuyOrder(PAIR, orderSize);
        positionOpen = false;
        entryPrice = null;
        lastAction = 'COVER';
        logOrder(timestamp, prediction, label, 'COVER', result, `Weak Bear & PVVM/PVD near zero (${PVVM.toFixed(2)}, ${PVD.toFixed(2)})`);
        console.log(`[${timestamp}] COVER order submitted (weak_bear & PVVM/PVD near zero)`);
      } catch (err) {
        logOrder(timestamp, prediction, label, 'COVER', null, 'Failed to submit COVER', err.message || err);
        console.error('Order error:', err.message || err);
      }
      return;
    }
    // No Trade (idle, neutral, etc)
    logOrder(timestamp, prediction, label, 'IDLE', {}, 'No action taken');
    console.log(`[${timestamp}] No order submitted (IDLE)`);
  } finally {
    isRunning = false;
  }
}

console.log(`Starting CCXT Orders`);

main();
setInterval(main, INTERVAL_MS);


/*
 * PVD/PVVM Move Strength Table
 * | Value     | Strength     | Meaning                       |
 * |-----------|--------------|-------------------------------|
 * | 0 to 3    | Very Weak    | Noise, likely insignificant   |
 * | 3 to 7    | Weak         | Minor move, low conviction    |
 * | 7 to 10   | Moderate     | Becoming meaningful           |
 * | 10 to 20  | Significant  | Strong move, worth trading    |
 * | > 20      | Very Strong  | High conviction, strong trend |
 *
 * This script uses dynamic PVVM/PVD thresholds, trade size adjustment, and logs reason for every action.
 * Shorting logic assumes exchange/pair supports it. If not, disable bear/short logic.
 */
