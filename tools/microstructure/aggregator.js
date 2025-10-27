const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

/**
 * Parse interval string (e.g., "5m", "1h") to milliseconds.
 * @param {string} intervalStr
 * @returns {number}
 */
function parseInterval(intervalStr) {
  if (intervalStr.endsWith('m')) return parseInt(intervalStr) * 60 * 1000;
  if (intervalStr.endsWith('h')) return parseInt(intervalStr) * 60 * 60 * 1000;
  throw new Error('Unsupported interval format: ' + intervalStr);
}

const OHLCV_CANDLE_SIZE = process.env.MICRO_OHLCV_CANDLE_SIZE || '5m';
const AGG_WINDOW_MS = parseInterval(OHLCV_CANDLE_SIZE);

/**
 * Aggregates an array of candle objects or arrays into a single OHLCV bar.
 * Accepts either:
 *   - [{timestamp, open, high, low, close, volume, prediction?, label?}, ...]
 *   - [[timestamp, open, high, low, close, volume, prediction?, label?], ...]
 * Returns null if no candles.
 * @param {Array} candles
 * @returns {Object|null}
 */
function aggregateCandles(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return null;

  // Detect and convert objects to arrays if needed
  let first = candles[0];
  let isObj = typeof first === 'object' && !Array.isArray(first);
  let arrCandles = isObj
    ? candles.map(c => [
        c.timestamp,
        c.open,
        c.high,
        c.low,
        c.close,
        c.volume,
        c.prediction,
        c.label
      ])
    : candles;

  return {
    timestamp: arrCandles[0][0],
    open: arrCandles[0][1],
    high: Math.max(...arrCandles.map(c => c[2])),
    low: Math.min(...arrCandles.map(c => c[3])),
    close: arrCandles[arrCandles.length - 1][4],
    volume: arrCandles.reduce((sum, c) => sum + c[5], 0),
    length: arrCandles.length,
    // Aggregate prediction/label if present:
    prediction: arrCandles[0][6] !== undefined
      ? arrCandles.reduce((sum, c) => sum + (c[6] || 0), 0) / arrCandles.length
      : undefined,
    labels: arrCandles[0][7] !== undefined
      ? arrCandles.map(c => c[7])
      : undefined,
  };
}

module.exports = {
  AGG_WINDOW_MS,
  aggregateCandles
};
