/**
 * Enhanced aggregator for microstructure:
 * - Supports canonical alignment of buckets (floor(timestamp / targetMs) * targetMs)
 * - Supports target timeframe list in env (MICRO_OHLCV_CANDLE_SIZE='1m,5m,15m,1h')
 * - Exposes utility parseInterval and aggregateToTarget which returns coverage/confidence metadata
 * - Backwards-compatible aggregateCandles (aggregates a single bucket array)
 *
 * Usage:
 *  - aggregateCandles(arr) -> returns a single OHLCV aggregated from the provided candles
 *  - aggregateToTarget(candles, targetFrame, baseFrame, options) ->
 *      returns array of aggregated bars aligned to canonical boundaries with metadata:
 *      { timestamp, open, high, low, close, volume, length, expected, coverage, confidence, prediction, labels, agg_method }
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const path = require('path');
const fs = require('fs');

// Parse interval string (e.g., "1m", "5m", "1h", "1d") to milliseconds.
// Throws on unsupported format.
function parseInterval(intervalStr) {
  if (!intervalStr || typeof intervalStr !== 'string') throw new Error('Missing interval string');
  const s = intervalStr.trim();
  const num = parseInt(s, 10);
  if (s.endsWith('m')) return num * 60 * 1000;
  if (s.endsWith('h')) return num * 60 * 60 * 1000;
  if (s.endsWith('d')) return num * 24 * 60 * 60 * 1000;
  if (s.endsWith('w')) return num * 7 * 24 * 60 * 60 * 1000;
  if (s.endsWith('M')) return num * 30 * 24 * 60 * 60 * 1000;
  throw new Error('Unsupported interval format: ' + intervalStr);
}

// Helper: parse list of frames from env like "1m,5m,15m"
function parseFramesList(framesStr) {
  if (!framesStr || typeof framesStr !== 'string') return [];
  return framesStr.split(',').map(s => s.trim()).filter(Boolean);
}

// Read env for default frames
const OHLCV_CANDLE_SIZE = process.env.MICRO_OHLCV_CANDLE_SIZE || '1m,5m';
const FRAMES = parseFramesList(OHLCV_CANDLE_SIZE);
const DEFAULT_TARGET_FRAME = FRAMES[0] || '5m';
let AGG_WINDOW_MS;
try {
  AGG_WINDOW_MS = parseInterval(DEFAULT_TARGET_FRAME);
} catch (e) {
  AGG_WINDOW_MS = parseInterval('5m');
}

// Backwards-compatible single-bucket aggregator
// Accepts either array of objects [{timestamp,open,high,low,close,volume,prediction?,label?}, ...]
// or array-of-arrays [[timestamp,open,high,low,close,volume,prediction?,label?], ...]
function aggregateCandles(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return null;

  const first = candles[0];
  const isObj = typeof first === 'object' && !Array.isArray(first);

  const arr = isObj
    ? candles.map(c => [
        Number(c.timestamp),
        Number(c.open),
        Number(c.high),
        Number(c.low),
        Number(c.close),
        Number(c.volume || 0),
        (c.prediction !== undefined ? c.prediction : undefined),
        (c.label !== undefined ? c.label : undefined)
      ])
    : candles.map(c => c.map((v, i) => (i <= 5 ? Number(v) : v))); // keep potential non-numeric predictions/labels

  const timestamp = arr[0][0];
  const open = arr[0][1];
  const high = Math.max(...arr.map(c => Number(c[2])));
  const low = Math.min(...arr.map(c => Number(c[3])));
  const close = arr[arr.length - 1][4];
  const volume = arr.reduce((sum, c) => sum + (Number(c[5]) || 0), 0);
  const length = arr.length;

  const predExists = arr.some(c => c[6] !== undefined && c[6] !== null && !Number.isNaN(Number(c[6])));
  const prediction = predExists ? (arr.reduce((s, c) => s + (Number(c[6]) || 0), 0) / length) : undefined;
  const labelExists = arr.some(c => c[7] !== undefined);
  const labels = labelExists ? arr.map(c => c[7]) : undefined;

  return {
    timestamp,
    open,
    high,
    low,
    close,
    volume,
    length,
    prediction,
    labels
  };
}

// Aggregate many base candles into aligned target timeframe buckets.
// - candles: array of objects (must include .timestamp in ms) sorted or unsorted.
// - targetFrame: string like '5m' or ms number. default: DEFAULT_TARGET_FRAME
// - baseFrame: string like '1m' or ms number. default: '1m'
// - options:
//     { allowPartial: true|false, minCandlesRatio: 0..1, aggMethod: 'avg'|'median'|'vote'|'weighted' }
function aggregateToTarget(candles, targetFrame = DEFAULT_TARGET_FRAME, baseFrame = process.env.MICRO_OHLCV_BASE_FRAME || '1m', options = {}) {
  if (!Array.isArray(candles) || candles.length === 0) return [];

  // normalize intervals to ms
  const targetMs = typeof targetFrame === 'number' ? targetFrame : parseInterval(String(targetFrame));
  const baseMs = typeof baseFrame === 'number' ? baseFrame : parseInterval(String(baseFrame));

  const allowPartial = options.allowPartial ?? (process.env.MICRO_OHLCV_ALLOW_PARTIAL === 'true' || true);
  const minCandlesRatio = typeof options.minCandlesRatio === 'number' ? options.minCandlesRatio : Number(process.env.MICRO_OHLCV_MIN_CANDLES_RATIO ?? 0.66);
  const aggMethod = options.aggMethod || process.env.MICRO_OHLCV_AGG_METHOD || 'weighted';

  // ensure sorted ascending by timestamp
  const sorted = candles.slice().sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  const expectedCount = Math.max(1, Math.round(targetMs / baseMs));
  const aggregated = [];
  let bucket = [];
  // align first bucket to canonical boundary
  let bucketStart = Math.floor(Number(sorted[0].timestamp) / targetMs) * targetMs;

  for (const c of sorted) {
    const ts = Number(c.timestamp);
    if (ts >= bucketStart + targetMs) {
      if (bucket.length) {
        const agg = _aggregateBucket(bucket, bucketStart, expectedCount, aggMethod);
        if (_shouldKeep(agg, allowPartial, minCandlesRatio)) aggregated.push(agg);
      }
      // advance bucketStart to the candle's canonical bucket
      bucketStart = Math.floor(ts / targetMs) * targetMs;
      bucket = [];
    }
    bucket.push(c);
  }

  // last bucket
  if (bucket.length) {
    const agg = _aggregateBucket(bucket, bucketStart, expectedCount, aggMethod);
    if (_shouldKeep(agg, allowPartial, minCandlesRatio)) aggregated.push(agg);
  }

  return aggregated;
}

// internal helper to decide whether to keep aggregated bucket
function _shouldKeep(agg, allowPartial, minCandlesRatio) {
  if (!agg) return false;
  if (agg.coverage >= 1) return true;
  if (allowPartial) return agg.coverage >= (minCandlesRatio || 0);
  return false;
}

// internal helpers for numeric aggregation
function _mean(arr) {
  if (!arr || !arr.length) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function _median(arr) {
  if (!arr || !arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function _majority(arr) {
  if (!arr || !arr.length) return null;
  const cnt = Object.create(null);
  for (const v of arr) {
    const k = v === null || v === undefined ? '__null__' : String(v);
    cnt[k] = (cnt[k] || 0) + 1;
  }
  let best = null, bestN = 0;
  for (const k of Object.keys(cnt)) if (cnt[k] > bestN) { best = k; bestN = cnt[k]; }
  return best === '__null__' ? null : best;
}
function _weightedMean(values, weights) {
  if (!values || !values.length) return null;
  let sum = 0, wsum = 0;
  for (let i = 0; i < values.length; i++) {
    const v = Number(values[i]);
    const w = Number(weights[i] || 0);
    if (!Number.isFinite(v) || !Number.isFinite(w)) continue;
    sum += v * w;
    wsum += w;
  }
  return wsum > 0 ? (sum / wsum) : null;
}

// internal bucket aggregator
function _aggregateBucket(bucket, bucketStart, expectedCount, aggMethod) {
  if (!bucket || !bucket.length) return null;

  // normalize each candle object into known shape
  const mapped = bucket.map(c => {
    // support either arrays or objects
    if (Array.isArray(c)) {
      // expected: [timestamp, open, high, low, close, volume, prediction?, label?]
      return {
        timestamp: Number(c[0]),
        open: Number(c[1]),
        high: Number(c[2]),
        low: Number(c[3]),
        close: Number(c[4]),
        volume: Number(c[5] || 0),
        prediction: c[6],
        label: c[7]
      };
    }
    return {
      timestamp: Number(c.timestamp),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume || 0),
      prediction: c.prediction,
      label: c.label
    };
  });

  const open = mapped[0].open;
  const close = mapped[mapped.length - 1].close;
  const high = Math.max(...mapped.map(c => Number(c.high)));
  const low = Math.min(...mapped.map(c => Number(c.low)));
  const volume = mapped.reduce((s, c) => s + (Number(c.volume) || 0), 0);

  // predictions: numeric and labels
  const predNums = mapped.map(c => (typeof c.prediction === 'number' ? c.prediction : null)).filter(p => p !== null);
  const labels = mapped.map(c => c.label).filter(l => l !== undefined);

  let prediction = null;
  if (aggMethod === 'median') prediction = predNums.length ? _median(predNums) : null;
  else if (aggMethod === 'weighted') prediction = predNums.length ? _weightedMean(predNums, mapped.map(m => m.volume || 0)) : null;
  else if (aggMethod === 'vote') prediction = labels.length ? _majority(labels) : (predNums.length ? (predNums.reduce((s, v) => s + v, 0) / predNums.length) : null);
  else prediction = predNums.length ? _mean(predNums) : null; // default 'avg'

  const length = mapped.length;
  const expected = Math.max(1, expectedCount || 1);
  const coverage = Math.min(1, length / expected);
  const confidence = coverage; // simple confidence; extend with volatility/model info if desired

  return {
    timestamp: bucketStart,
    open,
    high,
    low,
    close,
    volume,
    length,
    expected,
    coverage,
    confidence,
    prediction,
    labels,
    agg_method: aggMethod
  };
}

module.exports = {
  parseInterval,
  parseFramesList,
  AGG_WINDOW_MS,
  DEFAULT_TARGET_FRAME,
  aggregateCandles,    // single-bucket aggregator (backwards-compatible)
  aggregateToTarget   // aligned multi-bucket aggregator with metadata
};
