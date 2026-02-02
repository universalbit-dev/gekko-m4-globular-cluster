/**
 * tools/train/label_ohlcv_aggregate.js
 * Improved aggregate labeling with:
 *  - pair-aware LABEL_EPSILON overrides
 *  - atomic writes
 *  - robust timestamp handling
 *  - O(n) mapping when copying labels back
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');
const { labelCandles } = require('./label_ohlcv.js');

const RAW_AGGREGATE_FILE = process.env.TRAIN_AGGREGATE_FILE || '../logs/json/ohlcv/ohlcv_ccxt_data.json';
const AGGREGATE_FILE = path.resolve(__dirname, RAW_AGGREGATE_FILE);
const TIMEFRAMES = (process.env.TRAIN_OHLCV_TIMEFRAMES || '1m,5m,15m,1h')
  .split(',').map(s => s.trim()).filter(Boolean);
const MULTI_INTERVAL_MS = parseInt(process.env.MULTI_INTERVAL_MS, 10) || 60000;
const PAIR = (process.env.PAIR || process.env.MARKET || '').trim(); // optional

// Helper: per-pair / global epsilon resolution (same precedence as other scripts)
function resolveEpsilonForPair(pair) {
  if (!pair) return undefined;
  const key = `LABEL_EPSILON_${pair.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`;
  const p = process.env[key];
  if (p !== undefined && String(p).trim() !== '') {
    const n = Number(p);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const global = process.env.LABEL_EPSILON;
  if (global !== undefined && String(global).trim() !== '') {
    const n = Number(global);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined; // use module default
}

function atomicWriteJson(filePath, obj) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
    return true;
  } catch (err) {
    console.error('[AGGREGATE] atomic write failed:', err && err.message ? err.message : err);
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    return false;
  }
}

function normalizeTimestamp(ts) {
  // Return a string key representation that is robust for numbers and strings
  if (ts === undefined || ts === null) return '';
  if (typeof ts === 'number') return String(ts);
  // maybe it's numeric string
  if (/^\d+$/.test(ts)) return ts;
  // ISO dates -> toISOString
  const d = new Date(ts);
  if (!isNaN(d.getTime())) return String(d.getTime());
  return String(ts);
}

function summarizeLabelsFromArray(arr) {
  const counts = { bull: 0, bear: 0, idle: 0, other: 0 };
  for (const c of arr) {
    if (c && (typeof c.label === 'number')) {
      if (c.label === 0) counts.bull++;
      else if (c.label === 1) counts.bear++;
      else if (c.label === 2) counts.idle++;
      else counts.other++;
    } else {
      counts.other++;
    }
  }
  return counts;
}

function labelAggregateFile() {
  if (!fs.existsSync(AGGREGATE_FILE)) {
    console.warn(`[AGGREGATE] OHLCV aggregate file not found: ${AGGREGATE_FILE}`);
    return;
  }

  let raw;
  try {
    raw = fs.readFileSync(AGGREGATE_FILE, 'utf8');
  } catch (err) {
    console.error(`[AGGREGATE] Failed to read ${AGGREGATE_FILE}:`, err && err.message ? err.message : err);
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`[AGGREGATE] Failed to parse ${AGGREGATE_FILE}:`, err && err.message ? err.message : err);
    return;
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.warn('[AGGREGATE] No candle data in aggregate file');
    return;
  }

  // Build a mapping from (tf, normalizedTimestamp) -> indices (support duplicates)
  const indexMap = new Map();
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    const tf = c.ohlcvCandleSize || c.source_timeframe || c.timeframe || '';
    if (!tf) continue;
    const k = `${tf}::${normalizeTimestamp(c.timestamp)}`;
    if (!indexMap.has(k)) indexMap.set(k, []);
    indexMap.get(k).push(i);
  }

  const epsilonOverride = resolveEpsilonForPair(PAIR);
  const epsilonReport = epsilonOverride !== undefined ? epsilonOverride : '(module default)';
  console.log(`[AGGREGATE] Labeling using epsilon=${epsilonReport} (pair=${PAIR || '<none>'})`);

  let totalLabeled = 0;
  const processed = [];
  const skipped = [];

  for (const tf of TIMEFRAMES) {
    // Collect group (take candles where ohlcvCandleSize or source_timeframe matches tf)
    const group = data.filter(c => (c.ohlcvCandleSize === tf || c.source_timeframe === tf || c.timeframe === tf));
    if (!group.length) {
      console.warn(`[AGGREGATE][${tf}] No candles found for tf=${tf}`);
      skipped.push(tf);
      continue;
    }

    // Label this group (pass epsilonOverride if provided)
    const labeled = labelCandles(group, epsilonOverride);
    // Copy labels back to data using indexMap (fast)
    let applied = 0;
    for (const lc of labeled) {
      const key = `${tf}::${normalizeTimestamp(lc.timestamp)}`;
      const idxList = indexMap.get(key) || [];
      // Apply to all matching indices (in case multiple identical timestamps exist)
      for (const idx of idxList) {
        data[idx].label = lc.label;
        applied++;
      }
    }

    const summary = summarizeLabelsFromArray(labeled);
    console.log(`[AGGREGATE][${tf}] Labeled ${labeled.length} candles (applied=${applied}). Distribution: bull=${summary.bull} bear=${summary.bear} idle=${summary.idle} other=${summary.other}`);
    totalLabeled += applied;
    processed.push(tf);
  }

  // Atomic write back
  const ok = atomicWriteJson(AGGREGATE_FILE, data);
  if (!ok) {
    console.error('[AGGREGATE] Failed to write labeled aggregate file (atomic write failed)');
    return;
  }

  console.log(`[AGGREGATE] Finished. Total labeled entries applied: ${totalLabeled}. Processed: ${processed.join(', ') || '<none>'}. Skipped: ${skipped.join(', ') || '<none>'}`);
}

// Run once now
labelAggregateFile();
// schedule
setInterval(labelAggregateFile, MULTI_INTERVAL_MS);
