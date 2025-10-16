/**
 * Multi-timeframe OHLCV aggregate labeling script.
 * Purpose:
 *   - Continuously labels candles in the aggregate OHLCV file (ohlcv_ccxt_data.json)
 *   - Supports multiple timeframes in a single file
 *   - Adds a .label property for each candle (bull/bear/idle) using labelCandles()
 *   - Robust: never crashes if file/data is missing or corrupt, auto-resumes
 *   - Logs processing summary and errors for each run
 *   - Interval and timeframes are configurable via .env
 * Usage:
 *   node label_ohlcv_aggregate.js
 *   (or run automatically, e.g., via PM2, cron, etc.)
 *
 * Output:
 *   Overwrites ohlcv_ccxt_data.json with labeled candles for all timeframes
 *   Logs each processed timeframe and any skipped or errored ones
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); 
const fs = require('fs');
const { labelCandles, EPSILON } = require('./label_ohlcv.js');

const AGGREGATE_FILE = path.resolve(__dirname, '../logs/json/ohlcv/ohlcv_ccxt_data.json');
const TIMEFRAMES = (process.env.TRAIN_OHLCV_TIMEFRAMES || '1m,5m,15m,1h')
  .split(',').map(s => s.trim()).filter(Boolean);
const MULTI_INTERVAL_MS = parseInt(process.env.MULTI_INTERVAL_MS, 10) || 60000; // default 1 minute

function labelAggregateFile() {
  if (!fs.existsSync(AGGREGATE_FILE)) {
    console.warn(`[AGGREGATE] OHLCV file not found: ${AGGREGATE_FILE}`);
    return;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(AGGREGATE_FILE, 'utf8'));
  } catch (e) {
    console.error(`[AGGREGATE] Failed to read or parse ${AGGREGATE_FILE}:`, e.message);
    return;
  }
  if (!Array.isArray(data) || data.length === 0) {
    console.warn(`[AGGREGATE] No data in file: ${AGGREGATE_FILE}`);
    return;
  }

  let totalLabeled = 0;
  let processed = [], skipped = [];
  // Group candles by timeframe
  TIMEFRAMES.forEach(tf => {
    const group = data.filter(c => c.ohlcvCandleSize === tf || c.source_timeframe === tf);
    if (!group.length) {
      console.warn(`[AGGREGATE][${tf}] No candles found for ${tf}`);
      skipped.push(tf);
      return;
    }
    const labeled = labelCandles(group, EPSILON);
    // Copy labels back to original data
    labeled.forEach((labeledCandle, i) => {
      // Find matching candle in data by timestamp and tf
      const idx = data.findIndex(c => c.timestamp === labeledCandle.timestamp && (c.ohlcvCandleSize === tf || c.source_timeframe === tf));
      if (idx !== -1) {
        data[idx].label = labeledCandle.label;
      }
    });
    console.log(`[AGGREGATE][${tf}] Labeled ${labeled.length} candles`);
    totalLabeled += labeled.length;
    processed.push(tf);
  });

  fs.writeFileSync(AGGREGATE_FILE, JSON.stringify(data, null, 2));
  console.log(`[AGGREGATE] Total labeled candles: ${totalLabeled}`);
  if (processed.length || skipped.length) {
    console.log(`[AGGREGATE] Processed: ${processed.join(', ')} | Skipped: ${skipped.join(', ')}`);
  }
}

// Run once immediately
labelAggregateFile();

// Run at regular intervals (robust to missing file, errors, and changing data)
setInterval(labelAggregateFile, MULTI_INTERVAL_MS);
