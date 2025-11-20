const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');

// Config: target aggregation timeframe for microstructure (e.g.,'1m' '5m', '15m', '1h')
const OHLCV_CANDLE_SIZE = process.env.MICRO_OHLCV_CANDLE_SIZE || '1m,5m';
const PAIR = process.env.PAIR || 'BTC/EUR';
const OHLCV_JSON_DIR = path.resolve(__dirname, '../logs/json/ohlcv');

// Parses interval string like '1m', '5m', '15m', '1h' to milliseconds
function parseInterval(intervalStr) {
  if (!intervalStr) throw new Error('Missing interval string');
  if (intervalStr.endsWith('m')) return parseInt(intervalStr, 10) * 60 * 1000;
  if (intervalStr.endsWith('h')) return parseInt(intervalStr, 10) * 60 * 60 * 1000;
  if (intervalStr.endsWith('d')) return parseInt(intervalStr, 10) * 24 * 60 * 60 * 1000;
  if (intervalStr.endsWith('w')) return parseInt(intervalStr, 10) * 7 * 24 * 60 * 60 * 1000;
  if (intervalStr.endsWith('M')) return parseInt(intervalStr, 10) * 30 * 24 * 60 * 60 * 1000;
  throw new Error('Unsupported interval format: ' + intervalStr);
}

// Helper: validate candidate object looks like an OHLCV row we expect
function isValidRow(obj) {
  return obj && typeof obj === 'object' && typeof obj.timestamp === 'number' && typeof obj.symbol === 'string';
}

// Loads prediction-labeled candles from the correct file
function loadRecentPredictionCandles(pair, baseTimeframe = '1m', limit = 60) {
  const predFile = path.join(OHLCV_JSON_DIR, `ohlcv_ccxt_data_${baseTimeframe}_prediction.json`);
  if (!fs.existsSync(predFile)) {
    console.warn(`[Microstructure] Prediction file not found: ${predFile}`);
    return [];
  }

  const content = fs.readFileSync(predFile, 'utf8') || '';
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    console.warn(`[Microstructure] Prediction file empty: ${predFile}`);
    return [];
  }

  // Helper to post-process parsed array: filter by pair, sort, slice
  function processArray(arr) {
    const filtered = arr.filter(isValidRow).filter(row => row.symbol === pair);
    filtered.sort((a, b) => a.timestamp - b.timestamp);
    return filtered.slice(-limit);
  }

  try {
    const all = JSON.parse(trimmedContent);
    if (!Array.isArray(all)) {
      throw new Error('Parsed JSON is not an array');
    }
    return processArray(all);
  } catch (err) {
    console.warn(`[Microstructure] Failed to parse prediction JSON normally: ${err.message}. Attempting NDJSON/trial fixes for file: ${predFile}`);

    // 1) Try NDJSON (newline-delimited JSON)
    const ndRecords = [];
    const lines = trimmedContent.split(/\r?\n/);
    for (const line of lines) {
      const ln = line.trim();
      if (!ln) continue;
      try {
        const parsed = JSON.parse(ln);
        if (isValidRow(parsed)) ndRecords.push(parsed);
      } catch (e) {
        // skip lines that are not JSON
      }
    }
    if (ndRecords.length) {
      console.info(`[Microstructure] Parsed ${ndRecords.length} records using NDJSON fallback from ${predFile}`);
      return processArray(ndRecords);
    }

    // 2) Try to fix a common trailing-comma-before-closing-bracket issue
    try {
      const fixed = trimmedContent.replace(/,\s*]/g, ']');
      const allFixed = JSON.parse(fixed);
      if (Array.isArray(allFixed)) {
        console.info(`[Microstructure] Successfully parsed prediction file after trailing-comma fix: ${predFile}`);
        return processArray(allFixed);
      }
    } catch (e) {
      // continue to final failure
    }

    // Last resort: include snippet to help debugging
    const snippet = trimmedContent.slice(0, 1024).replace(/\n/g, '\\n');
    console.error(`[Microstructure] Error loading prediction candles: unable to parse ${predFile}. File head (first 1k chars): ${snippet}`);
    return [];
  }
}

// Aggregates base candles into target timeframe (e.g., 1m → 5m)
function aggregateCandlesToTarget(candles, targetIntervalMs) {
  if (!candles.length) return [];
  let aggregated = [];
  let bucket = [];
  let bucketStart = candles[0].timestamp;
  for (const candle of candles) {
    if (candle.timestamp >= bucketStart + targetIntervalMs) {
      // Aggregate bucket
      const agg = aggregateBucket(bucket);
      if (agg) aggregated.push(agg);
      bucket = [];
      bucketStart = candle.timestamp;
    }
    bucket.push(candle);
  }
  // Last bucket
  if (bucket.length) {
    const agg = aggregateBucket(bucket);
    if (agg) aggregated.push(agg);
  }
  return aggregated;
}

// Helper to aggregate a bucket of candles into one OHLCV + predictions
function aggregateBucket(bucket) {
  if (!bucket.length) return null;
  const open = bucket[0].open;
  const close = bucket[bucket.length - 1].close;
  const high = Math.max(...bucket.map(c => c.high));
  const low = Math.min(...bucket.map(c => c.low));
  const volume = bucket.reduce((sum, c) => sum + (c.volume || 0), 0);
  // For predictions, you can aggregate (avg, max, vote, etc.) as needed
  const prediction = bucket.reduce((sum, c) => sum + (c.prediction || 0), 0) / bucket.length;
  return {
    timestamp: bucket[0].timestamp,
    open,
    high,
    low,
    close,
    volume,
    length: bucket.length,
    prediction,
    // Optionally carry over other model outputs/labels
    labels: bucket.map(c => c.label),
  };
}

// MAIN: Load and aggregate prediction-labeled candles for target timeframe
function getAggregatedPredictionCandles(pair = PAIR, targetFrame = OHLCV_CANDLE_SIZE, baseFrame = '1m', limit = 60) {
  const baseCandles = loadRecentPredictionCandles(pair, baseFrame, limit);
  const targetMs = parseInterval(targetFrame);
  return aggregateCandlesToTarget(baseCandles, targetMs);
}

module.exports = {
  getAggregatedPredictionCandles,
  OHLCV_CANDLE_SIZE,
  PAIR
};
