#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const zlib = require('zlib');

// Config: target aggregation timeframe for microstructure (e.g.,'1m' '5m', '15m', '1h')
const OHLCV_CANDLE_SIZE = process.env.MICRO_OHLCV_CANDLE_SIZE || '1m,5m';
const PAIR = process.env.PAIR || 'BTC/EUR';
const OHLCV_JSON_DIR = path.resolve(__dirname, '../logs/json/ohlcv');

// Optional atomic save settings. When enabled results are written atomically (tmp -> replace),
// never appended (prevents unbounded file growth).
const MICRO_SAVE_AGGREGATED = process.env.MICRO_SAVE_AGGREGATED === 'true' || false;
const AGG_OUTPUT = process.env.MICRO_AGG_OUTPUT ? path.resolve(process.env.MICRO_AGG_OUTPUT) : path.resolve(__dirname, '../logs/json/aggregated_ohlcv.json');
const MICRO_SAVE_GZIP = process.env.MICRO_SAVE_GZIP === 'true' || false;

// Logging for aggregated operations (optional).
// Prevents "flat increase" of aggregated.log by rotating when exceeding size and keeping N backups.
const MICRO_AGG_LOG ='true';
const AGG_LOG_PATH = process.env.MICRO_AGG_LOG_PATH ? path.resolve(process.env.MICRO_AGG_LOG_PATH) : path.resolve(__dirname, './aggregated.log');
const AGG_LOG_MAX_BYTES = parseInt(process.env.MICRO_AGG_LOG_MAX_BYTES || String(5 * 1024 * 1024), 10); // default 5MB
const AGG_LOG_MAX_FILES = parseInt(process.env.MICRO_AGG_LOG_MAX_FILES || '2', 10); // keep 2 backups

/* ---------- Utilities ---------- */

function parseInterval(intervalStr) {
  if (intervalStr === undefined || intervalStr === null) throw new Error('Missing interval string');
  if (typeof intervalStr === 'number' && Number.isFinite(intervalStr)) return intervalStr;
  const s = String(intervalStr).trim();
  const num = parseInt(s, 10);
  if (s.endsWith('m')) return num * 60 * 1000;
  if (s.endsWith('h')) return num * 60 * 60 * 1000;
  if (s.endsWith('d')) return num * 24 * 60 * 60 * 1000;
  if (s.endsWith('w')) return num * 7 * 24 * 60 * 60 * 1000;
  if (s.endsWith('M')) return num * 30 * 24 * 60 * 60 * 1000;
  throw new Error('Unsupported interval format: ' + intervalStr);
}

function _ensureDirExists(fp) {
  try { fs.mkdirSync(path.dirname(fp), { recursive: true }); } catch (e) { /* ignore */ }
}

/* ---------- Lightweight log rotation (no deps) ----------
 - appendAggregatedLog(msg): appends a timestamped line
 - _rotateLogIfNeeded(): if AGG_LOG_PATH >= AGG_LOG_MAX_BYTES, rotate with timestamp suffix
 - rotation keeps up to AGG_LOG_MAX_FILES backups (oldest removed)

*/
function _rotateLogIfNeeded() {
  try {
    if (!fs.existsSync(AGG_LOG_PATH)) return;
    const st = fs.statSync(AGG_LOG_PATH);
    if (st.size < AGG_LOG_MAX_BYTES) return;

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const rotated = `${AGG_LOG_PATH}.${ts}`;
    try {
      fs.renameSync(AGG_LOG_PATH, rotated);
    } catch (e) {
      // if rename fails, attempt copy+truncate fallback
      try {
        const data = fs.readFileSync(AGG_LOG_PATH);
        fs.writeFileSync(rotated, data, { flag: 'w' });
        fs.truncateSync(AGG_LOG_PATH, 0);
      } catch (e2) {
        // give up rotation; avoid throwing to not break aggregator
        return;
      }
    }

    // cleanup old rotated files (keep newest AGG_LOG_MAX_FILES)
    try {
      const dir = path.dirname(AGG_LOG_PATH);
      const base = path.basename(AGG_LOG_PATH);
      const candidates = fs.readdirSync(dir)
        .filter(f => f.startsWith(base + '.'))
        .map(f => ({ f, path: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtime.getTime() }))
        .sort((a, b) => b.mtime - a.mtime);
      if (candidates.length > AGG_LOG_MAX_FILES) {
        const toRemove = candidates.slice(AGG_LOG_MAX_FILES);
        for (const r of toRemove) {
          try { fs.unlinkSync(r.path); } catch (e) { /* ignore */ }
        }
      }
    } catch (e) {
      // ignore cleanup errors
    }
  } catch (e) {
    // ignore rotation errors
  }
}

function appendAggregatedLog(msg) {
  if (!MICRO_AGG_LOG) return;
  try {
    _ensureDirExists(AGG_LOG_PATH);
    _rotateLogIfNeeded();
    const line = `${new Date().toISOString()} ${msg}\n`;
    // append asynchronously (non-blocking) but don't crash on error
    fs.appendFile(AGG_LOG_PATH, line, { encoding: 'utf8' }, () => { /* ignore errors */ });
  } catch (e) {
    // swallow logging errors
  }
}

/* ---------- Input helpers ---------- */

// Helper: validate candidate object looks like an OHLCV row we expect
function isValidRow(obj) {
  return obj && typeof obj === 'object' && typeof obj.timestamp === 'number' && typeof obj.symbol === 'string';
}

// Loads prediction-labeled candles from the correct file (defensive parsing)
function loadRecentPredictionCandles(pair, baseTimeframe = '1m', limit = 60) {
  const predFile = path.join(OHLCV_JSON_DIR, `ohlcv_ccxt_data_${baseTimeframe}_prediction.json`);
  if (!fs.existsSync(predFile)) {
    appendAggregatedLog(`[WARN] Prediction file not found: ${predFile}`);
    console.warn(`[Microstructure] Prediction file not found: ${predFile}`);
    return [];
  }

  const content = fs.readFileSync(predFile, 'utf8') || '';
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    appendAggregatedLog(`[WARN] Prediction file empty: ${predFile}`);
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
    appendAggregatedLog(`[WARN] Failed to parse prediction JSON normally: ${err && err.message ? err.message : String(err)}; trying fallbacks for ${predFile}`);
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
      } catch (e) { /* skip unparsable lines */ }
    }
    if (ndRecords.length) {
      appendAggregatedLog(`[INFO] Parsed ${ndRecords.length} records using NDJSON fallback from ${predFile}`);
      console.info(`[Microstructure] Parsed ${ndRecords.length} records using NDJSON fallback from ${predFile}`);
      return processArray(ndRecords);
    }

    // 2) Try to fix a common trailing-comma-before-closing-bracket issue
    try {
      const fixed = trimmedContent.replace(/,\s*]/g, ']');
      const allFixed = JSON.parse(fixed);
      if (Array.isArray(allFixed)) {
        appendAggregatedLog(`[INFO] Parsed after trailing-comma fix: ${predFile}`);
        console.info(`[Microstructure] Successfully parsed prediction file after trailing-comma fix: ${predFile}`);
        return processArray(allFixed);
      }
    } catch (e) { /* continue to final failure */ }

    // Last resort: include snippet to help debugging
    const snippet = trimmedContent.slice(0, 1024).replace(/\n/g, '\\n');
    appendAggregatedLog(`[ERROR] Unable to parse ${predFile}. Head: ${snippet}`);
    console.error(`[Microstructure] Error loading prediction candles: unable to parse ${predFile}. File head (first 1k chars): ${snippet}`);
    return [];
  }
}

/* ---------- Aggregation logic ---------- */

// Helper to aggregate a bucket of candles into one OHLCV + predictions
function aggregateBucket(bucket) {
  if (!bucket || !bucket.length) return null;
  const open = bucket[0].open;
  const close = bucket[bucket.length - 1].close;
  const high = Math.max(...bucket.map(c => c.high));
  const low = Math.min(...bucket.map(c => c.low));
  const volume = bucket.reduce((sum, c) => sum + (c.volume || 0), 0);
  // For predictions, aggregate numeric predictions (avg) if present
  const predNums = bucket.map(c => (typeof c.prediction === 'number' ? c.prediction : null)).filter(p => p !== null);
  const prediction = predNums.length ? predNums.reduce((s, v) => s + v, 0) / predNums.length : null;
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

// Aggregates base candles into target timeframe (e.g., 1m → 5m).
// Uses canonical alignment: floor(ts/targetMs) * targetMs to ensure consistent boundaries.
// Does NOT write files by itself. If saving is enabled via env, results are saved atomically (no append).
function aggregateCandlesToTarget(candles, targetIntervalMs) {
  if (!Array.isArray(candles) || candles.length === 0) return [];
  const sorted = candles.slice().sort((a, b) => a.timestamp - b.timestamp);

  const aggregated = [];
  // align first bucket start to canonical boundary
  let bucketStart = Math.floor(sorted[0].timestamp / targetIntervalMs) * targetIntervalMs;
  let bucket = [];

  for (const candle of sorted) {
    const ts = Number(candle.timestamp);
    const canonical = Math.floor(ts / targetIntervalMs) * targetIntervalMs;
    if (canonical !== bucketStart) {
      if (bucket.length) {
        const agg = aggregateBucket(bucket);
        if (agg) aggregated.push(agg);
      }
      bucket = [];
      bucketStart = canonical;
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

/* ---------- Atomic save (defined here so available at export) ---------- */

/* Safe-replace: write to tmp then atomically replace dest. Ensures no appending or file growth due to repeated appends. */
function _safeReplace(tmpPath, destPath) {
  try {
    if (fs.existsSync(destPath)) {
      try { fs.unlinkSync(destPath); } catch (e) { /* ignore unlink errors */ }
    }
    fs.renameSync(tmpPath, destPath);
  } catch (e) {
    // fallback copy
    try {
      const data = fs.readFileSync(tmpPath);
      fs.writeFileSync(destPath, data, { flag: 'w' });
      fs.unlinkSync(tmpPath);
    } catch (e2) {
      throw e2 || e;
    }
  }
}

// Atomically save JSON array (optionally gzipped). This function NEVER appends.
function saveAggregatedResults(aggregatedArray, opts = {}) {
  const output = opts.outputPath ? path.resolve(opts.outputPath) : AGG_OUTPUT;
  const saveGz = typeof opts.saveGzip === 'boolean' ? opts.saveGzip : MICRO_SAVE_GZIP;
  _ensureDirExists(output);
  try {
    const json = JSON.stringify(aggregatedArray, null, 2);
    if (saveGz) {
      const gzTmp = output + '.gz.tmp';
      const gz = zlib.gzipSync(Buffer.from(json, 'utf8'));
      _ensureDirExists(gzTmp);
      fs.writeFileSync(gzTmp, gz, { flag: 'w' });
      _safeReplace(gzTmp, output + '.gz');

      // also write plain JSON atomically (optional, keeps a readable copy)
      const tmp = output + '.tmp';
      fs.writeFileSync(tmp, json, { encoding: 'utf8', flag: 'w' });
      _safeReplace(tmp, output);
    } else {
      const tmp = output + '.tmp';
      fs.writeFileSync(tmp, json, { encoding: 'utf8', flag: 'w' });
      _safeReplace(tmp, output);
    }
  } catch (e) {
    // Do not throw to avoid breaking callers; log error for debugging
    appendAggregatedLog && appendAggregatedLog(`[ERROR] saveAggregatedResults failed: ${e && e.message ? e.message : String(e)}`);
    console.error('[microOHLCV] Failed to save aggregated results atomically:', e && e.message ? e.message : e);
  }
}

/* ---------- Public API and main wrapper ---------- */

// MAIN: Load and aggregate prediction-labeled candles for target timeframe
function getAggregatedPredictionCandles(pair = PAIR, targetFrame = OHLCV_CANDLE_SIZE, baseFrame = '1m', limit = 60) {
  const baseCandles = loadRecentPredictionCandles(pair, baseFrame, limit);
  const targetMs = parseInterval(targetFrame);
  const aggregated = aggregateCandlesToTarget(baseCandles, targetMs);

  // optional atomic save; never append
  if (MICRO_SAVE_AGGREGATED) {
    try {
      saveAggregatedResults(aggregated, { outputPath: AGG_OUTPUT, saveGzip: MICRO_SAVE_GZIP });
      appendAggregatedLog && appendAggregatedLog(`[INFO] Saved ${aggregated.length} aggregated bars to ${AGG_OUTPUT}`);
    } catch (e) {
      appendAggregatedLog && appendAggregatedLog(`[ERROR] Failed saving aggregated bars: ${e && e.message ? e.message : String(e)}`);
    }
  } else {
    appendAggregatedLog && appendAggregatedLog(`[DEBUG] Computed ${aggregated.length} aggregated bars (not saved)`);
  }

  return aggregated;
}

module.exports = {
  getAggregatedPredictionCandles,
  loadRecentPredictionCandles,
  aggregateCandlesToTarget,
  aggregateBucket,
  saveAggregatedResults,
  parseInterval,
  OHLCV_CANDLE_SIZE,
  PAIR,
  AGG_OUTPUT,
  // logging controls for tests or callers:
  _appendAggregatedLog: appendAggregatedLog,
  _rotateLogIfNeeded: _rotateLogIfNeeded
};
