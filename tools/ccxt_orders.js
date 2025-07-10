/**
 * ccxt_orders.js
 * 
 * Automated trading bot for cryptocurrency using ccxt, Node.js, and custom signal logs.
 * Now with Stop Loss and Take Profit support.
 * 
 * - Loads buy/sell signals from log files (basic and magnitude versions supported).
 * - Trades on the specified exchange (default Kraken) and trading pair (default BTC/EUR).
 * - Places market BUY orders on 'bull' or 'strong_bull' signals when not already in a position.
 * - Places market SELL orders on 'weak_bull' signals with PVVM and PVD near zero when in a position.
 * - Stop Loss or Take Profit triggers.
 * - Deduplicates processed signals to avoid double trading.
 * - Logs all trade actions and outcomes to a log file.
 * - Configurable via environment variables:
 *      INTERVAL_KEY: trade interval ('5m', '15m', '30m', '1h', '24h')
 *      EXCHANGE: exchange id (e.g., 'kraken')
 *      KEY: API key
 *      API_SECRET: API secret
 *      PAIR: trading pair (default 'BTC/EUR')
 *      ORDER_AMOUNT: order size in base currency
 *      STOP_LOSS_PCT: percent below entry to trigger stop loss (default 2)
 *      TAKE_PROFIT_PCT: percent above entry to trigger take profit (default 4)
 * 
 * Dependencies:
 *   - ccxt
 *   - dotenv
 *   - Node.js fs and path modules
 * 
 * Usage:
 *   1. Set up .env with your exchange credentials and desired parameters.
 *   2. Run: node ccxt_orders.js
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

// Intervals
const INTERVALS = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000
};
const INTERVAL_KEY = process.env.INTERVAL_KEY || '30m';
const INTERVAL_MS = INTERVALS[INTERVAL_KEY] || INTERVALS['30m'];

// Exchange setup
const EXCHANGE = process.env.EXCHANGE || 'kraken';
const API_KEY = process.env.KEY || 'P3nRHjVMqaIfgqqnnnay4e/L3FVDRVQdO4N63UR5by1Wu/ar3Pn89izJ';
const API_SECRET = process.env.SECRET || 'jLnXApENbiwh6dugyJs/TlXCsJl1iR6wa67/QKoE96S0vqOyv4PBxfRC7P6MSqw2hb22GSWqPXODyN3qkH7h6g==';
const PAIR = process.env.PAIR || 'BTC/EUR';
const ORDER_AMOUNT = parseFloat(process.env.ORDER_AMOUNT) || 0.00005;

const STOP_LOSS_PCT = parseFloat(process.env.STOP_LOSS_PCT) || 2;
const TAKE_PROFIT_PCT = parseFloat(process.env.TAKE_PROFIT_PCT) || 4;
// Core logic: specialized bullish
/**
 * PVD/PVVM Move Strength Interpretation Table
 *
 * This table provides guidance for interpreting PVD (Price-Volume Delta)
 * and PVVM (Price-Volume Volatility Metric) values in trading strategies.
 *
 * | PVD/PVVM Value | Move Strength  | Indicative/Significative Meaning             |
 * |----------------|---------------|----------------------------------------------|
 * | 0 to 3         | Very Weak     | Noise, likely insignificant                  |
 * | 3 to 7         | Weak          | Minor move, low conviction                   |
 * | 7 to 10        | Moderate      | Becoming meaningful, but not strong          |
 * | 10 to 20       | Significant   | Strong move, worth considering for trades    |
 * | > 20           | Very Strong   | High conviction, strong trend/move           |
 *
 * Use these thresholds to filter market noise and identify meaningful moves.
 * Adjust values as needed based on market conditions.
 */
 
// PVVM/PVD thresholds (as per user)
const PVVM_THRESHOLD = 10.0;
const PVD_THRESHOLD = 10.0;

const exchangeClass = ccxt[EXCHANGE];
if (!exchangeClass) {
  console.error(`Exchange '${EXCHANGE}' not supported by ccxt.`);
  process.exit(1);
}
const exchange = new exchangeClass({
  apiKey: API_KEY,
  secret: API_SECRET,
  enableRateLimit: true
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
function logOrder(timestamp, prediction, label, action, result, error = null) {
  const logLine = [
    new Date().toISOString(),
    timestamp,
    prediction,
    label || '',
    action,
    error ? `ERROR: ${error}` : 'SUCCESS',
    error ? '' : JSON.stringify(result)
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

let isRunning = false;
let positionOpen = false; // Only one position at a time
let entryPrice = null;    // Track entry price for SL/TP

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
    // Only process latest signal (strategy is interval-based)
    const lastSignal = signals[signals.length - 1];
    const { timestamp, prediction, label, PVVM = NaN, PVD = NaN } = lastSignal;
    const processedSignals = loadProcessedSignals();
    const signalKey = `${timestamp}|${prediction}|${label || ''}`;
    if (processedSignals.has(signalKey)) {
      console.log('Signal already processed. Skipping.');
      return;
    }

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
          logOrder(timestamp, prediction, label, 'STOP_LOSS', result);
          console.log(`[${timestamp}] STOP LOSS triggered at ${currentPrice}`);
          return;
        }
        if (currentPrice >= takeProfitPrice) {
          const result = await exchange.createMarketSellOrder(PAIR, ORDER_AMOUNT);
          positionOpen = false;
          entryPrice = null;
          logOrder(timestamp, prediction, label, 'TAKE_PROFIT', result);
          console.log(`[${timestamp}] TAKE PROFIT triggered at ${currentPrice}`);
          return;
        }
      } catch (err) {
        console.error('SL/TP check error:', err.message || err);
      }
    }

    // --- PVVM/PVD-based entries and exits (your custom logic) ---
    if (
      !positionOpen &&
      (prediction === 'bull' || label === 'strong_bull') &&
      !isNaN(PVVM) && !isNaN(PVD) &&
      Math.abs(PVVM) > PVVM_THRESHOLD && Math.abs(PVD) > PVD_THRESHOLD
    ) {
      try {
        const result = await exchange.createMarketBuyOrder(PAIR, ORDER_AMOUNT);
        positionOpen = true;
        entryPrice = result.price || result.average || null;
        logOrder(timestamp, prediction, label, 'BUY', result);
        console.log(`[${timestamp}] BUY order submitted (bull/strong_bull & PVVM/PVD strong)`);
      } catch (err) {
        logOrder(timestamp, prediction, label, 'BUY', null, err.message || err);
        console.error('Order error:', err.message || err);
      }
    } else if (
      positionOpen &&
      label === 'weak_bull' &&
      !isNaN(PVVM) && !isNaN(PVD) &&
      Math.abs(PVVM) < PVVM_THRESHOLD && Math.abs(PVD) < PVD_THRESHOLD
    ) {
      try {
        const result = await exchange.createMarketSellOrder(PAIR, ORDER_AMOUNT);
        positionOpen = false;
        entryPrice = null;
        logOrder(timestamp, prediction, label, 'SELL', result);
        console.log(`[${timestamp}] SELL order submitted (weak_bull & PVVM/PVD near zero)`);
      } catch (err) {
        logOrder(timestamp, prediction, label, 'SELL', null, err.message || err);
        console.error('Order error:', err.message || err);
      }
    } else {
      logOrder(timestamp, prediction, label, 'IDLE', {});
      console.log(`[${timestamp}] No order submitted (IDLE)`);
    }
  } finally {
    isRunning = false;
  }
}

console.log(`Starting ccxt_orders.js with interval: ${INTERVAL_KEY} (${INTERVAL_MS / 1000}s)`);

main();
setInterval(main, INTERVAL_MS);
