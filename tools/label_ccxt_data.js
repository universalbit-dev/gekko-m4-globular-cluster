/**
 * Continuous Labeling Script
 *
 * Monitors and labels new OHLCV candle data in a JSON file on a regular interval.
 * - Reads ../logs/json/ohlcv/ohlcv_ccxt_data.json at configurable intervals.
 * - Assigns a label to each candle:
 *     0 = bull  (close > open)
 *     1 = bear  (close < open)
 *     2 = idle  (close === open)
 * - Overwrites the file with the updated labeled data.
 * - Designed for automated pipelines where new candle data is appended over time.
 * - Prevents duplicate execution if previous run is still ongoing.
 *
 * Usage:
 *   node label_ccxt_data.js
 *   INTERVAL_KEY=1h node label_ccxt_data.js
 *
 * Configuration:
 *   - Edit INTERVAL_MS line below to change default interval
 *   - Set INTERVAL_KEY environment variable to override (5m, 15m, 1h, 24h)
 */

const fs = require('fs');
const path = require('path');

// INTERVALS: Define commonly used intervals in milliseconds for easy reference.
const INTERVALS = {
  '5m': 5 * 60 * 1000,        // 5 minutes  (high frequency)
  '15m': 15 * 60 * 1000,      // 15 minutes (high frequency)
  '1h': 60 * 60 * 1000,       // 1 hour     (medium term)
  '24h': 24 * 60 * 60 * 1000  // 24 hours   (long term)
};

// Select the interval you want to use here:
const INTERVAL_MS = INTERVALS[process.env.INTERVAL_KEY] || INTERVALS['15m']; // Change to '5m', '1h', or '24h' as needed

const filePath = path.join(__dirname, '../logs/json/ohlcv/ohlcv_ccxt_data.json');

// State tracking for duplicate execution prevention
let isRunning = false;

function labelCandles() {
  let candles;
  try {
    candles = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Failed to read or parse:`, e.message);
    return;
  }

  candles = candles.map(candle => {
    let label;
    if (candle.close > candle.open) label = 0;         // bull
    else if (candle.close < candle.open) label = 1;    // bear
    else label = 2;                                    // idle
    return { ...candle, label };
  });

  fs.writeFileSync(filePath, JSON.stringify(candles, null, 2));
  console.log(`[${new Date().toISOString()}] Candles labeled and saved (${candles.length} entries processed).`);
}

async function main() {
  // Check if previous execution is still running
  if (isRunning) {
    console.warn(`[${new Date().toISOString()}] WARNING: Previous execution still running, skipping this cycle.`);
    return;
  }

  isRunning = true;
  try {
    console.log(`[${new Date().toISOString()}] Starting candle labeling process...`);
    labelCandles();
    console.log(`[${new Date().toISOString()}] Candle labeling process completed.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during candle labeling:`, error.message);
  } finally {
    isRunning = false;
  }
}

// Log startup information
console.log(`[${new Date().toISOString()}] Continuous Labeling Script started`);
console.log(`[${new Date().toISOString()}] Interval: ${INTERVAL_MS}ms (${INTERVAL_MS / 1000 / 60} minutes)`);
console.log(`[${new Date().toISOString()}] Data file: ${filePath}`);
console.log(`[${new Date().toISOString()}] Environment override: ${process.env.INTERVAL_KEY || 'none'}`);

// Run once at start
main();

// Set up continuous execution
const timer = setInterval(main, INTERVAL_MS);

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log(`\n[${new Date().toISOString()}] Received SIGINT, shutting down gracefully...`);
  clearInterval(timer);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n[${new Date().toISOString()}] Received SIGTERM, shutting down gracefully...`);
  clearInterval(timer);
  process.exit(0);
});
