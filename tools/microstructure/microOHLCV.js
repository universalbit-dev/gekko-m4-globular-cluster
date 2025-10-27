require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');

// Config: target aggregation timeframe for microstructure (e.g.,'1m' '5m', '15m', '1h')
const OHLCV_CANDLE_SIZE = process.env.MICRO_OHLCV_CANDLE_SIZE || '1m';
const PAIR = process.env.PAIR || 'BTC/EUR';
const OHLCV_JSON_DIR = path.resolve(__dirname, '../logs/json/ohlcv');

// Parses interval string like '1m', '5m', '1h' to milliseconds
function parseInterval(intervalStr) {
  if (!intervalStr) throw new Error('Missing interval string');
  if (intervalStr.endsWith('m')) return parseInt(intervalStr) * 60 * 1000;
  if (intervalStr.endsWith('h')) return parseInt(intervalStr) * 60 * 60 * 1000;
  if (intervalStr.endsWith('d')) return parseInt(intervalStr) * 24 * 60 * 60 * 1000;
  if (intervalStr.endsWith('w')) return parseInt(intervalStr) * 7 * 24 * 60 * 60 * 1000;
  if (intervalStr.endsWith('M')) return parseInt(intervalStr) * 30 * 24 * 60 * 60 * 1000;
  throw new Error('Unsupported interval format: ' + intervalStr);
}

// Loads prediction-labeled candles from the correct file
function loadRecentPredictionCandles(pair, baseTimeframe = '1m', limit = 60) {
  const predFile = path.join(OHLCV_JSON_DIR, `ohlcv_ccxt_data_${baseTimeframe}_prediction.json`);
  if (!fs.existsSync(predFile)) {
    console.warn(`[Microstructure] Prediction file not found: ${predFile}`);
    return [];
  }
  try {
    const all = JSON.parse(fs.readFileSync(predFile, 'utf8'));
    // Filter by pair/symbol
    const filtered = all.filter(row => row.symbol === pair);
    // Sort oldest to newest
    filtered.sort((a, b) => a.timestamp - b.timestamp);
    // Return only the last 'limit' candles
    return filtered.slice(-limit);
  } catch (err) {
    console.error(`[Microstructure] Error loading prediction candles:`, err);
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
      aggregated.push(aggregateBucket(bucket));
      bucket = [];
      bucketStart = candle.timestamp;
    }
    bucket.push(candle);
  }
  // Last bucket
  if (bucket.length) aggregated.push(aggregateBucket(bucket));
  return aggregated;
}

// Helper to aggregate a bucket of candles into one OHLCV + predictions
function aggregateBucket(bucket) {
  if (!bucket.length) return null;
  const open = bucket[0].open;
  const close = bucket[bucket.length - 1].close;
  const high = Math.max(...bucket.map(c => c.high));
  const low = Math.min(...bucket.map(c => c.low));
  const volume = bucket.reduce((sum, c) => sum + c.volume, 0);
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
