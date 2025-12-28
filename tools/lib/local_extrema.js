'use strict';

/**
 * tools/lib/local_extrema.js
 *
 * Lightweight local extrema library + CLI/watcher.
 *
 * Purpose
 * - Detect local extrema (peaks/troughs) in numeric series.
 * - Designed to work with OHLCV prediction JSON logs produced by the
 *   gekko-m4-globular-cluster pipeline (tools/logs/json/ohlcv).
 *
 * Key behavior
 * - Prefer prediction JSON files named like:
 *     ohlcv_ccxt_data_<tf>_prediction.json
 *   where <tf> is one of: 1m, 5m, 15m, 30m, 1h, 4h, 1d
 * - If --file points to a directory, the CLI picks the best prediction file
 *   inside (prefers *_prediction.json; use --tf to prefer a timeframe).
 * - Does NOT attempt to parse .js or .csv files as JSON. Only JSON prediction
 *   files are used by default.
 *
 * Quick commands
 * - Watch a specific prediction file (live):
 *     node local_extrema.js --file ~/m4/tools/logs/json/ohlcv/ohlcv_ccxt_data_1h_prediction.json --watch
 *
 * - Auto-select best prediction file in ohlcv dir and watch (prefer 5m):
 *     node local_extrema.js --file ~/m4/tools/logs/json/ohlcv/ --tf 5m --watch
 *
 * - Run once on a specific file (useful for scheduled checks):
 *     node local_extrema.js --file ~/m4/tools/logs/json/ohlcv/ohlcv_ccxt_data_5m_prediction.json --once
 *
 * Useful flags
 * - --file <file|dir>    Path to JSON file or directory containing JSONs
 * - --tf <timeframe>     Prefer files containing this timeframe (e.g. 1m,5m,15m,1h)
 * - --field <name>       Numeric field inside entries to use (e.g. prediction, close)
 * - --once               Run once and exit
 * - --watch              Watch file (fs.watch) for changes (falls back to polling)
 * - --interval <ms>      Poll interval in ms (default 5000)
 * - --minProm <num>      Minimum prominence to accept an extrema
 * - --minDist <int>      Minimum distance between extrema (samples)
 * - --smoothing <method> Smoothing method: 'ewma' or 'sma' or 'none'
 * - --alpha <num>        EWMA alpha (when smoothing=ewma)
 * - --window <int>       SMA window (when smoothing=sma)
 * - --maxSamples <int>   (future) limit series to last N samples before processing
 *
 * Notes
 * - If you want the script to use a specific file regardless of naming, pass the
 *   exact path with --file <path>. The script will accept explicit JSON file paths.
 * - For best results on live/high-frequency feeds, consider truncating the series
 *   (e.g., last N points) to bound CPU and latency. I can add a --maxSamples option.
 *
 * Example:
 *   node local_extrema.js --file ~/m4/tools/logs/json/ohlcv/ --tf 1h --field prediction --watch
 *
 * Exports:
 *   - findLocalExtrema(series, options)
 *   - ewma(series, alpha)
 *   - sma(series, window)
 *   - derivative(series, dx)
 *   - secondDerivative(series, dx)
 *   - computeProminence(series, idx, type, searchWindow)
 *
 * Implementation details omitted from this header (see functions below).
 */

const fs = require('fs');
const path = require('path');

/* --------------------------
   Runtime defaults (env override)
   -------------------------- */
const DEFAULTS = {
  INTERVAL_MS: Number(process.env.LOCAL_EXTREMA_INTERVAL || 5000),
  MIN_PROMINENCE: Number(process.env.LOCAL_EXTREMA_MIN_PROMINENCE || 0),
  MIN_DISTANCE: Math.max(1, Number(process.env.LOCAL_EXTREMA_MIN_DISTANCE || 1)),
  SMOOTH_METHOD: process.env.LOCAL_EXTREMA_SMOOTHING || 'ewma',
  SMOOTH_ALPHA: Number(process.env.LOCAL_EXTREMA_ALPHA || 0.25),
  SMOOTH_WINDOW: Math.max(1, Number(process.env.LOCAL_EXTREMA_WINDOW || 3)),
  MIN_SERIES_LEN: 3
};

/* --------------------------
   Numeric helpers
   -------------------------- */
function isFiniteNumber(x) {
  return typeof x === 'number' && Number.isFinite(x);
}
function safeNumber(x, fallback = 0) {
  if (isFiniteNumber(x)) return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

/* --------------------------
   Smoothing helpers
   -------------------------- */
function ewma(series, alpha = 0.3) {
  const n = series.length;
  const out = new Array(n);
  if (n === 0) return out;
  let prev = safeNumber(series[0], 0);
  out[0] = prev;
  for (let i = 1; i < n; i++) {
    const v = safeNumber(series[i], 0);
    prev = alpha * v + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

function sma(series, window = 3) {
  const n = series.length;
  const out = new Array(n);
  if (n === 0) return out;
  const w = Math.max(1, Math.floor(window));
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += safeNumber(series[i], 0);
    if (i >= w) sum -= safeNumber(series[i - w], 0);
    const denom = Math.min(w, i + 1);
    out[i] = sum / denom;
  }
  return out;
}

/* --------------------------
   Numerical derivative helpers
   -------------------------- */
function derivative(series, dx = 1) {
  const n = series.length;
  const d = new Array(n).fill(0);
  if (n === 0) return d;
  if (n === 1) return d;
  d[0] = (safeNumber(series[1], 0) - safeNumber(series[0], 0)) / dx;
  for (let i = 1; i < n - 1; i++) {
    d[i] = (safeNumber(series[i + 1], 0) - safeNumber(series[i - 1], 0)) / (2 * dx);
  }
  d[n - 1] = (safeNumber(series[n - 1], 0) - safeNumber(series[n - 2], 0)) / dx;
  return d;
}

function secondDerivative(series, dx = 1) {
  const n = series.length;
  const d2 = new Array(n).fill(0);
  if (n < 3) return d2;
  for (let i = 1; i < n - 1; i++) {
    d2[i] = (safeNumber(series[i + 1], 0) - 2 * safeNumber(series[i], 0) + safeNumber(series[i - 1], 0)) / (dx * dx);
  }
  return d2;
}

/* --------------------------
   Prominence helper (robust/simple)
   -------------------------- */
function computeProminence(series, idx, type = 'max', searchWindow = null) {
  const n = series.length;
  if (idx < 0 || idx >= n) return { prominence: 0, leftBaseIdx: null, rightBaseIdx: null };

  const val = safeNumber(series[idx], 0);
  // search left for base
  let leftBase = val;
  let leftIdx = idx;
  const leftLimit = searchWindow ? Math.max(0, idx - searchWindow) : 0;
  for (let i = idx - 1; i >= leftLimit; i--) {
    const v = safeNumber(series[i], 0);
    if (type === 'max') {
      if (v < leftBase) { leftBase = v; leftIdx = i; }
    } else {
      if (v > leftBase) { leftBase = v; leftIdx = i; }
    }
  }

  // search right for base
  let rightBase = val;
  let rightIdx = idx;
  const rightLimit = searchWindow ? Math.min(n - 1, idx + searchWindow) : n - 1;
  for (let i = idx + 1; i <= rightLimit; i++) {
    const v = safeNumber(series[i], 0);
    if (type === 'max') {
      if (v < rightBase) { rightBase = v; rightIdx = i; }
    } else {
      if (v > rightBase) { rightBase = v; rightIdx = i; }
    }
  }

  const referenceBase = (type === 'max') ? Math.max(leftBase, rightBase) : Math.min(leftBase, rightBase);
  const prominence = Math.abs(val - referenceBase);
  return { prominence, leftBaseIdx: leftIdx, rightBaseIdx: rightIdx };
}

/* --------------------------
   Raw candidate detection
   -------------------------- */
function rawFindCandidates(series) {
  const n = series.length;
  if (n < 3) return [];
  const d = derivative(series, 1);
  const candidates = [];

  let i = 1;
  while (i < n - 1) {
    const dl = d[i - 1];
    const dr = d[i];
    const cur = safeNumber(series[i], 0);
    const prev = safeNumber(series[i - 1], 0);
    const next = safeNumber(series[i + 1], 0);

    // zero-crossing style detection
    if (dl > 0 && dr <= 0 && cur >= prev) {
      candidates.push({ idx: i, type: 'max', dLeft: dl, dRight: dr });
    } else if (dl < 0 && dr >= 0 && cur <= prev) {
      candidates.push({ idx: i, type: 'min', dLeft: dl, dRight: dr });
    } else {
      // plateau detection
      if (cur === prev && cur === next) {
        // find plateau bounds
        let left = i - 1;
        while (left >= 0 && safeNumber(series[left], 0) === cur) left--;
        let right = i + 1;
        while (right < n && safeNumber(series[right], 0) === cur) right++;
        const leftVal = left >= 0 ? safeNumber(series[left], 0) : cur;
        const rightVal = right < n ? safeNumber(series[right], 0) : cur;
        const center = Math.floor((left + 1 + right - 1) / 2);
        if (leftVal < cur && rightVal < cur) candidates.push({ idx: center, type: 'max', plateau: { left: left + 1, right: right - 1 } });
        else if (leftVal > cur && rightVal > cur) candidates.push({ idx: center, type: 'min', plateau: { left: left + 1, right: right - 1 } });
        i = right;
        continue;
      }
    }
    i++;
  }

  return candidates;
}

/* --------------------------
   enforceMinDistance
   -------------------------- */
function enforceMinDistance(cands, minDistance, seriesLength) {
  if (!minDistance || minDistance <= 1) return cands.slice().sort((a, b) => a.idx - b.idx);
  // sort by prominence desc then value desc
  const sorted = cands.slice().sort((a, b) => (b.prominence - a.prominence) || (Math.abs(b.value - a.value)));
  const keep = [];
  const occupied = new Array(seriesLength).fill(false);
  for (const cand of sorted) {
    const start = Math.max(0, cand.idx - minDistance);
    const end = Math.min(seriesLength - 1, cand.idx + minDistance);
    let conflict = false;
    for (let j = start; j <= end; j++) if (occupied[j]) { conflict = true; break; }
    if (!conflict) {
      keep.push(cand);
      for (let j = start; j <= end; j++) occupied[j] = true;
    }
  }
  return keep.sort((a, b) => a.idx - b.idx);
}

/* --------------------------
   Primary API: findLocalExtrema
   -------------------------- */
function findLocalExtrema(seriesRaw, options = {}) {
  if (!Array.isArray(seriesRaw)) throw new Error('series must be an array');

  const opts = Object.assign({
    x: null,
    smoothing: { method: DEFAULTS.SMOOTH_METHOD, alpha: DEFAULTS.SMOOTH_ALPHA, window: DEFAULTS.SMOOTH_WINDOW },
    minProminence: DEFAULTS.MIN_PROMINENCE,
    minDistance: DEFAULTS.MIN_DISTANCE,
    secondDerivCheck: false,
    prominenceWindow: null
  }, options);

  const series = seriesRaw.map(v => safeNumber((typeof v === 'object' && v !== null && v.value !== undefined) ? v.value : v, 0));
  const n = series.length;
  if (n < DEFAULTS.MIN_SERIES_LEN) {
    return {
      peaks: [],
      troughs: [],
      absolute: { max: null, min: null },
      seriesSmoothed: series.slice(),
      derivative: derivative(series),
      secondDerivative: secondDerivative(series),
      diagnostics: { seriesLength: n, note: 'series too short' }
    };
  }

  // smoothing
  let seriesSmoothed = series.slice();
  if (opts.smoothing && opts.smoothing.method) {
    if (opts.smoothing.method === 'ewma') seriesSmoothed = ewma(series, Number(opts.smoothing.alpha ?? DEFAULTS.SMOOTH_ALPHA));
    else if (opts.smoothing.method === 'sma') seriesSmoothed = sma(series, Number(opts.smoothing.window ?? DEFAULTS.SMOOTH_WINDOW));
  }

  const d1 = derivative(seriesSmoothed, 1);
  const d2 = secondDerivative(seriesSmoothed, 1);
  const rawCandidates = rawFindCandidates(seriesSmoothed);

  const peaks = [];
  const troughs = [];

  for (const c of rawCandidates) {
    const type = c.type;
    const idx = c.idx;
    const p = computeProminence(seriesSmoothed, idx, type, opts.prominenceWindow);
    if (opts.secondDerivCheck) {
      const conc = d2[idx] || 0;
      if (type === 'max' && conc >= 0) continue;
      if (type === 'min' && conc <= 0) continue;
    }
    if (p.prominence + 1e-12 >= Number(opts.minProminence || 0)) {
      const item = {
        idx,
        x: Array.isArray(opts.x) ? opts.x[idx] : idx,
        value: seriesSmoothed[idx],
        rawValue: series[idx],
        type,
        prominence: p.prominence,
        leftBaseIdx: p.leftBaseIdx,
        rightBaseIdx: p.rightBaseIdx,
        d1Left: c.dLeft ?? (d1[idx - 1] ?? null),
        d1Right: c.dRight ?? (d1[idx] ?? null),
        plateau: c.plateau || null
      };
      if (type === 'max') peaks.push(item);
      else troughs.push(item);
    }
  }

  const peaksFiltered = enforceMinDistance(peaks, Number(opts.minDistance || DEFAULTS.MIN_DISTANCE), n);
  const troughsFiltered = enforceMinDistance(troughs, Number(opts.minDistance || DEFAULTS.MIN_DISTANCE), n);

  // absolute min/max on smoothed series
  let absoluteMax = null;
  let absoluteMin = null;
  if (n > 0) {
    let maxIdx = 0, minIdx = 0;
    for (let i = 1; i < n; i++) {
      if (seriesSmoothed[i] > seriesSmoothed[maxIdx]) maxIdx = i;
      if (seriesSmoothed[i] < seriesSmoothed[minIdx]) minIdx = i;
    }
    absoluteMax = { idx: maxIdx, x: Array.isArray(opts.x) ? opts.x[maxIdx] : maxIdx, value: seriesSmoothed[maxIdx], rawValue: series[maxIdx] };
    absoluteMin = { idx: minIdx, x: Array.isArray(opts.x) ? opts.x[minIdx] : minIdx, value: seriesSmoothed[minIdx], rawValue: series[minIdx] };
  }

  const diagnostics = {
    seriesLength: n,
    numCandidates: rawCandidates.length,
    numPeaks: peaksFiltered.length,
    numTroughs: troughsFiltered.length,
    smoothingApplied: !!(opts.smoothing && opts.smoothing.method),
    smoothingMethod: opts.smoothing && opts.smoothing.method ? opts.smoothing.method : 'none'
  };

  return {
    peaks: peaksFiltered,
    troughs: troughsFiltered,
    absolute: { max: absoluteMax, min: absoluteMin },
    seriesSmoothed,
    derivative: d1,
    secondDerivative: d2,
    diagnostics
  };
}

/* --------------------------
   File/dir parsing helpers (strict selection for ohlcv prediction JSONs)
   -------------------------- */

function listFilesSafe(dir) {
  try {
    if (!dir || !fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).map(f => path.join(dir, f));
  } catch (e) {
    return [];
  }
}

function statMtime(fp) {
  try { return fs.statSync(fp).mtimeMs || 0; } catch (e) { return 0; }
}

/**
 * chooseFileFromDirStrict
 * - prefer files that match ohlcv prediction naming:
 *   ohlcv_ccxt_data_<tf>_prediction.json
 * - if preferTf provided, prefer matches that include that timeframe.
 * - otherwise, pick newest matching prediction JSON
 * - fallback: any json in dir (newest)
 */
function chooseFileFromDirStrict(dir, preferTf) {
  const all = listFilesSafe(dir).filter(fp => !path.basename(fp).startsWith('.') && fs.existsSync(fp));
  if (!all.length) return null;

  // only consider JSON files for the primary selection
  const jsonFiles = all.filter(fp => fp.toLowerCase().endsWith('.json'));
  // regex for exactly the filenames you listed (support common TFs)
  const predRegex = /^ohlcv_ccxt_data_(1m|5m|15m|30m|1h|4h|1d)_prediction\.json$/i;

  // find prediction-matching files
  const preds = jsonFiles.filter(fp => predRegex.test(path.basename(fp)));
  if (preds.length) {
    // if user specified timeframe prefer those first
    if (preferTf) {
      const tfLower = preferTf.toLowerCase();
      const tfMatches = preds.filter(fp => path.basename(fp).toLowerCase().includes(tfLower));
      if (tfMatches.length) {
        tfMatches.sort((a, b) => statMtime(b) - statMtime(a));
        return tfMatches[0];
      }
    }
    // otherwise return newest prediction file
    preds.sort((a, b) => statMtime(b) - statMtime(a));
    return preds[0];
  }

  // fallback: any json that contains 'ohlcv' or 'ccxt' or 'data' in name
  const ohlcvJson = jsonFiles.filter(fp => /(ohlcv|ccxt|data)/i.test(path.basename(fp)));
  if (preferTf && ohlcvJson.length) {
    const tfLower = preferTf.toLowerCase();
    const tfMatches = ohlcvJson.filter(fp => path.basename(fp).toLowerCase().includes(tfLower));
    if (tfMatches.length) { tfMatches.sort((a, b) => statMtime(b) - statMtime(a)); return tfMatches[0]; }
  }
  if (ohlcvJson.length) { ohlcvJson.sort((a, b) => statMtime(b) - statMtime(a)); return ohlcvJson[0]; }

  // last fallback: newest JSON in dir
  if (jsonFiles.length) { jsonFiles.sort((a, b) => statMtime(b) - statMtime(a)); return jsonFiles[0]; }

  // if no JSON, don't pick CSV; return newest file only if user explicitly passed the directory (but prefer null)
  return null;
}

/* --------------------------
   CLI / watcher + strict chooseDefaultFile
   -------------------------- */
if (require.main === module) {
  const argv = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (!a) continue;
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = raw[i + 1];
      if (!next || next.startsWith('--')) { argv[k] = true; continue; }
      argv[k] = next;
      i++;
    } else if (a.startsWith('-')) {
      const k = a.slice(1);
      const next = raw[i + 1];
      if (!next || next.startsWith('-')) { argv[k] = true; continue; }
      argv[k] = next;
      i++;
    }
  }

  const DEFAULT_LOG_DIR = path.resolve(__dirname, '..', 'logs');
  const PREFERRED_OHLCV_DIR = path.join(process.cwd(), 'tools', 'logs', 'json', 'ohlcv');

  function chooseDefaultFileStrict(fileArg, preferTf) {
    // explicit env or arg
    const envFile = process.env.LOCAL_EXTREMA_FILE;
    if (envFile && fs.existsSync(envFile)) return envFile;
    if (fileArg) {
      const expanded = fileArg.replace(/^~(?=$|\/|\\)/, process.env.HOME || '');
      try {
        if (fs.existsSync(expanded) && fs.statSync(expanded).isDirectory()) {
          const picked = chooseFileFromDirStrict(expanded, preferTf);
          if (picked) return picked;
          return null;
        }
      } catch (e) {}
      if (fs.existsSync(expanded)) {
        // if it's a JSON file but named incorrectly, still allow explicit file choice
        const isJson = expanded.toLowerCase().endsWith('.json');
        if (isJson) return expanded;
        // if explicit non-json file given, return it (user requested)
        return expanded;
      }
      // try resolve relative to cwd
      const alt = path.resolve(process.cwd(), expanded);
      if (fs.existsSync(alt)) return alt;
      return expanded;
    }

    // primary: prefer exact ohlcv prediction files in PREFERRED_OHLCV_DIR
    if (fs.existsSync(PREFERRED_OHLCV_DIR)) {
      const pick = chooseFileFromDirStrict(PREFERRED_OHLCV_DIR, preferTf);
      if (pick) return pick;
    }

    // secondary: try DEFAULT_LOG_DIR (less strict)
    if (fs.existsSync(DEFAULT_LOG_DIR)) {
      const pick = chooseFileFromDirStrict(DEFAULT_LOG_DIR, preferTf);
      if (pick) return pick;
    }

    // tertiary: try tools/logs
    const toolsLogs = path.join(process.cwd(), 'tools', 'logs');
    if (fs.existsSync(toolsLogs)) {
      const pick = chooseFileFromDirStrict(toolsLogs, preferTf);
      if (pick) return pick;
    }

    return null;
  }

  const FILE_ARG = argv.file || argv.f || null;
  const TF = argv.tf || argv.timeframe || null; // e.g. '5m'
  const FIELD = argv.field || null; // e.g. 'prediction' or 'close'
  const INTERVAL_MS = Number(argv.interval || argv.i || process.env.LOCAL_EXTREMA_INTERVAL || DEFAULTS.INTERVAL_MS);
  const WATCH = !!(argv.watch || argv.w);
  const ONCE = !!(argv.once || argv.o);
  const MIN_PROM = Number(argv.minProm || argv.minprom || argv.p || process.env.LOCAL_EXTREMA_MIN_PROMINENCE || DEFAULTS.MIN_PROMINENCE);
  const MIN_DIST = Math.max(1, Number(argv.minDist || argv.mindist || argv.d || process.env.LOCAL_EXTREMA_MIN_DISTANCE || DEFAULTS.MIN_DISTANCE));
  const SMOOTH = (argv.smoothing || argv.s || process.env.LOCAL_EXTREMA_SMOOTHING || DEFAULTS.SMOOTH_METHOD);
  const ALPHA = Number(argv.alpha || process.env.LOCAL_EXTREMA_ALPHA || DEFAULTS.SMOOTH_ALPHA);
  const WINDOW = Math.max(1, Number(argv.window || process.env.LOCAL_EXTREMA_WINDOW || DEFAULTS.SMOOTH_WINDOW));

  const FILE = chooseDefaultFileStrict(FILE_ARG, TF);

  if (!FILE) {
    console.error('[local_extrema] No input prediction JSON found. Use --file <file|dir> or set LOCAL_EXTREMA_FILE.');
    process.exit(2);
  }

  function extractValueFromEntry(entry, fieldPriority = []) {
    if (entry === null || entry === undefined) return null;
    if (typeof entry === 'number') return entry;
    if (typeof entry === 'string') {
      const n = Number(entry);
      return Number.isFinite(n) ? n : null;
    }
    if (Array.isArray(entry)) {
      // common OHLCV array shapes:
      // [ts, open, high, low, close, volume] -> close is index 4
      if (entry.length >= 5 && typeof entry[4] === 'number') return entry[4];
      if (entry.length >= 4 && typeof entry[3] === 'number') return entry[3];
      for (let i = entry.length - 1; i >= 0; i--) {
        if (typeof entry[i] === 'number') return entry[i];
      }
      return null;
    }
    if (typeof entry === 'object') {
      for (const f of fieldPriority) {
        if (f && Object.prototype.hasOwnProperty.call(entry, f)) {
          const v = entry[f];
          if (typeof v === 'number') return v;
          if (typeof v === 'string') { const n = Number(v); if (Number.isFinite(n)) return n; }
          if (v && typeof v === 'object') {
            if (typeof v.value === 'number') return v.value;
            if (typeof v.close === 'number') return v.close;
          }
        }
      }
      const tried = ['prediction', 'pred', 'value', 'close', 'closePrice', 'c', 'consensusScoreSmoothed', 'consensusScore', 'price'];
      for (const f of tried) {
        if (Object.prototype.hasOwnProperty.call(entry, f)) {
          const v = entry[f];
          if (typeof v === 'number') return v;
          if (typeof v === 'string') { const n = Number(v); if (Number.isFinite(n)) return n; }
        }
      }
      const prefer = ['close', 'high', 'low', 'open', 'value', 'price'];
      for (const p of prefer) {
        if (Object.prototype.hasOwnProperty.call(entry, p) && typeof entry[p] === 'number') return entry[p];
      }
      for (const k of Object.keys(entry)) {
        if (typeof entry[k] === 'number') return entry[k];
        if (typeof entry[k] === 'string') { const n = Number(entry[k]); if (Number.isFinite(n)) return n; }
      }
      return null;
    }
    return null;
  }

  function extractSeriesFromParsed(parsed, preferTf = null, fieldPriority = []) {
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && parsed.every(x => typeof x === 'number')) {
        return parsed.map(Number);
      }
      const out = parsed.map(entry => extractValueFromEntry(entry, fieldPriority)).filter(v => v !== null);
      if (out.length) return out;
      return [];
    }
    if (parsed && typeof parsed === 'object') {
      const keys = Object.keys(parsed);
      const keyScores = keys.map(k => {
        const kl = k.toLowerCase();
        let score = 0;
        if (preferTf && kl.includes(preferTf.toLowerCase())) score += 100;
        if (kl.includes('prediction') || kl.includes('pred')) score += 80;
        if (kl.includes('ohlcv') || kl.includes('ccxt') || kl.match(/\b(1m|5m|15m|1h|4h|1d)\b/)) score += 60;
        if (Array.isArray(parsed[k])) score += 10;
        return { k, score };
      }).sort((a, b) => b.score - a.score);

      for (const ks of keyScores) {
        const k = ks.k;
        const v = parsed[k];
        if (Array.isArray(v)) {
          const s = v.map(entry => extractValueFromEntry(entry, fieldPriority)).filter(x => x !== null);
          if (s.length) return s;
        }
      }

      for (const k of keys) {
        const v = parsed[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const innerKeys = Object.keys(v || {});
          const innerScores = innerKeys.map(ik => {
            const il = ik.toLowerCase();
            let score = 0;
            if (preferTf && il.includes(preferTf.toLowerCase())) score += 100;
            if (il.includes('prediction') || il.includes('pred')) score += 80;
            if (il.match(/\b(1m|5m|15m|1h|4h|1d)\b/)) score += 60;
            if (Array.isArray(v[ik])) score += 10;
            return { ik, score };
          }).sort((a, b) => b.score - a.score);

          for (const iks of innerScores) {
            const iv = v[iks.ik];
            if (Array.isArray(iv)) {
              const s = iv.map(entry => extractValueFromEntry(entry, fieldPriority)).filter(x => x !== null);
              if (s.length) return s;
            }
          }
        }
      }
    }
    return [];
  }

  function loadSeriesFromState(fp) {
    try {
      // if fp is a directory, choose a file inside
      try {
        if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) {
          const picked = chooseFileFromDirStrict(fp, TF);
          if (!picked) return { series: [], rawHistory: null, fileUsed: null };
          fp = picked;
        }
      } catch (e) {}

      if (!fs.existsSync(fp)) return { series: [], rawHistory: null, fileUsed: fp };

      // don't parse .js or .csv; we only accept JSON here for prediction files
      if (!fp.toLowerCase().endsWith('.json')) {
        // if user explicitly passed a non-json file, we'll return no series and report it
        return { series: [], rawHistory: null, fileUsed: fp };
      }

      const txt = fs.readFileSync(fp, 'utf8');
      let parsed;
      try {
        parsed = JSON.parse(txt);
      } catch (e) {
        // try JSONL fallback (last json line)
        const lines = txt.trim().split(/\r?\n/).filter(Boolean);
        if (lines.length > 1) {
          let last = lines[lines.length - 1].trim();
          try { parsed = JSON.parse(last); } catch (e2) { throw e; }
        } else {
          throw e;
        }
      }

      const fieldPriority = [];
      if (FIELD) fieldPriority.push(FIELD);

      const series = extractSeriesFromParsed(parsed, TF, fieldPriority);
      if (series && series.length) return { series, rawHistory: parsed, fileUsed: fp };

      // try common container keys
      const commonKeys = ['predictions', 'prediction', 'history', 'data', 'ohlcv', 'ohlcvData', 'values', 'candles', 'series'];
      for (const k of commonKeys) {
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed[k]) && parsed[k].length) {
          const s = extractSeriesFromParsed(parsed[k], TF, fieldPriority);
          if (s && s.length) return { series: s, rawHistory: parsed[k], fileUsed: fp };
        }
      }

      // fallback: attempt extracting from top-level array if present
      if (Array.isArray(parsed) && parsed.length) {
        const fallback = parsed.map(e => extractValueFromEntry(e, fieldPriority)).filter(x => x !== null);
        if (fallback.length) return { series: fallback, rawHistory: parsed, fileUsed: fp };
      }

      return { series: [], rawHistory: parsed, fileUsed: fp };
    } catch (e) {
      console.error('[local_extrema] load error', e && e.message ? e.message : e);
      return { series: [], rawHistory: null, fileUsed: fp };
    }
  }

  function summarizeAndPrint(res, rawSeries, fileUsed) {
    const shortPeaks = (res.peaks || []).slice(-6).map(p => ({ idx: p.idx, value: Number(p.value.toFixed(6)), prominence: Number(p.prominence.toFixed(6)) }));
    const shortTroughs = (res.troughs || []).slice(-6).map(t => ({ idx: t.idx, value: Number(t.value.toFixed(6)), prominence: Number(t.prominence.toFixed(6)) }));
    const out = {
      iso: new Date().toISOString(),
      file: fileUsed || FILE,
      seriesLength: (rawSeries || []).length,
      peaks: (res.peaks || []).length,
      troughs: (res.troughs || []).length,
      absolute: {
        max: res.absolute.max ? { idx: res.absolute.max.idx, value: Number(res.absolute.max.value.toFixed(6)) } : null,
        min: res.absolute.min ? { idx: res.absolute.min.idx, value: Number(res.absolute.min.value.toFixed(6)) } : null
      },
      recentPeaks: shortPeaks,
      recentTroughs: shortTroughs,
      diagnostics: res.diagnostics
    };
    console.log(JSON.stringify(out));
  }

  function processOnce() {
    const { series, rawHistory, fileUsed } = loadSeriesFromState(FILE) || { series: [], rawHistory: null, fileUsed: FILE };
    if (!series || !Array.isArray(series)) {
      console.error('[local_extrema] no numeric series extracted from file:', fileUsed || FILE);
      return;
    }
    if (series.length < DEFAULTS.MIN_SERIES_LEN) {
      console.log(JSON.stringify({ iso: new Date().toISOString(), file: fileUsed || FILE, seriesLength: series.length, note: 'series too short for extrema detection' }));
      return;
    }
    const sumAbs = series.reduce((s, v) => s + Math.abs(Number(v) || 0), 0);
    if (sumAbs === 0) {
      console.log(JSON.stringify({ iso: new Date().toISOString(), file: fileUsed || FILE, seriesLength: series.length, note: 'series all zeros' }));
      return;
    }
    let smoothingOpt = (SMOOTH === 'none' ? null : { method: SMOOTH, alpha: ALPHA, window: WINDOW });
    const res = findLocalExtrema(series, {
      smoothing: smoothingOpt,
      minProminence: MIN_PROM,
      minDistance: MIN_DIST,
      secondDerivCheck: false
    });
    summarizeAndPrint(res, series, fileUsed || FILE);
  }

  if (ONCE) {
    console.error(`[local_extrema] polling ${FILE} once`);
    processOnce();
    process.exit(0);
  }

  if (WATCH) {
    try {
      fs.watch(FILE, { persistent: true }, (ev) => {
        if (process._le_timer) clearTimeout(process._le_timer);
        process._le_timer = setTimeout(() => { processOnce(); }, 200);
      });
      console.error(`[local_extrema] watching ${FILE} (fs.watch)`);
      processOnce();
    } catch (e) {
      console.error('[local_extrema] watch failed, falling back to poll mode', e && e.message ? e.message : e);
      setInterval(() => processOnce(), INTERVAL_MS).unref();
    }
  } else {
    console.error(`[local_extrema] polling ${FILE} every ${INTERVAL_MS}ms`);
    processOnce();
    setInterval(() => processOnce(), INTERVAL_MS).unref();
  }
}
