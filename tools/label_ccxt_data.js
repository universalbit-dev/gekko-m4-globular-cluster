/**
 * Continuous Labeling Script
 *
 * Monitors and labels new OHLCV candle data in a JSON file on a regular interval.
 * - Reads ../logs/json/ohlcv/ohlcv_ccxt_data.json every 15 minutes (configurable).
 * - Assigns a label to each candle:
 *     0 = bull  (close > open)
 *     1 = bear  (close < open)
 *     2 = idle  (close === open)
 * - Overwrites the file with the updated labeled data.
 * - Designed for automated pipelines where new candle data is appended over time.
 *
 * Usage:
 *   node label_ccxt_data.js
 *
 * Adjust INTERVAL_MS as needed for your data frequency.
 */

const fs = require('fs');
const path = require('path');

const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const filePath = path.join(__dirname, '../logs/json/ohlcv/ohlcv_ccxt_data.json');

function labelCandles() {
  let candles;
  try {
    candles = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error('Failed to read or parse:', e.message);
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
  console.log(`[${new Date().toISOString()}] Candles labeled and saved.`);
}

// Run once at start
labelCandles();
// Then repeat every 15 minutes
setInterval(labelCandles, INTERVAL_MS);
