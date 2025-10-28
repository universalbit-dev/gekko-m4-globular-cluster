#!/usr/bin/env node
/**
 * chart_ccxt_recognition.js
 *
 * Multi-timeframe recognition runner (enhanced).
 *
 * Added refinements:
 * - Robust model pointer handling: trained_ccxt_ohlcv_<TF>_latest.json may be a pointer or a model.
 * - Resilient model loading with retries and clearer error messages.
 * - Input JSON validation (skip invalid per-TF JSON rather than proceeding).
 * - Atomic write for prediction JSON (write tmp then rename).
 * - Optional append/merge mode for prediction JSONs (APPEND_PREDICTION=1).
 * - Option to validate input JSONs before use (VALIDATE_INPUT_JSON=1).
 *
 * Usage examples:
 *   TIMEFRAMES=1m,5m,15m,1h node tools/chart/chart_ccxt_recognition.js
 *   PREFER_JSON=1 VALIDATE_INPUT_JSON=1 APPEND_PREDICTION=0 node tools/chart/chart_ccxt_recognition.js
 */

const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const ConvNet = require('../../core/convnet.js');

// --- Import labeling logic ---
const { labelCandles, EPSILON } = require('../train/label_ohlcv.js');

const LOGS_ROOT = path.resolve(__dirname, '../logs');
const CSV_DIR = path.resolve(__dirname, '../../logs/csv');
const OHLCV_JSON_DIR = path.resolve(__dirname, '../logs/json/ohlcv');
const TRAINED_ROOT = path.resolve(__dirname, '../trained'); // tools/trained
const MODEL_DIR = path.join(TRAINED_ROOT, ''); // per-timeframes subfolders live here
const SIGNAL_LOG_PATH = path.resolve(__dirname, '../logs/ccxt_signal.log');

const LABELS = ['bull', 'bear', 'idle'];
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS, 10) || 3600000;
const TIMEFRAMES = (process.env.TIMEFRAMES || process.env.TIMEFRAME || '1m,5m,15m,1h')
  .split(',').map(s => s.trim()).filter(Boolean);

// Behavior flags
const PREFER_JSON ='1';
const VALIDATE_INPUT_JSON = !/^(0|false|no)$/i.test(String(process.env.VALIDATE_INPUT_JSON || '1'));
const APPEND_PREDICTION = /^(1|true|yes)$/i.test(String(process.env.APPEND_PREDICTION || '0'));
const PRED_TMP_SUFFIX = '.tmp';

// --- Helpers ---

function safeReadJson(filePath) {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return null;
  }
}

function looksLikeModelObject(obj) {
  if (!obj || typeof obj !== 'object') return false;
  // ConvNet JSON varies; check for some expected properties:
  if (Array.isArray(obj.layers) || Array.isArray(obj.filters) || obj.meta || obj.net) return true;
  // older convnetjs uses properties like "layers" - this is permissive
  return Object.keys(obj).length > 0 && (obj.layers || obj.w || obj.bias || obj.filters) ? true : false;
}

/**
 * Resolve pointer files:
 * - If file contains a string -> treat as path to model
 * - If file contains an object with `modelPath` or `path` -> use that
 * - If it appears to be a model JSON itself -> return it
 */
function resolveModelFileCandidate(candidatePath) {
  if (!fs.existsSync(candidatePath)) return null;
  const raw = fs.readFileSync(candidatePath, 'utf8').trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      // pointer to path
      const p = path.isAbsolute(parsed) ? parsed : path.resolve(path.dirname(candidatePath), parsed);
      return fs.existsSync(p) ? p : null;
    }
    if (typeof parsed === 'object') {
      // pointer object?
      if (parsed.modelPath || parsed.path) {
        const p = String(parsed.modelPath || parsed.path);
        const rp = path.isAbsolute(p) ? p : path.resolve(path.dirname(candidatePath), p);
        if (fs.existsSync(rp)) return rp;
      }
      // if it already looks like a model blob, we want to treat candidatePath as real model path
      if (looksLikeModelObject(parsed)) return candidatePath;
      // otherwise pointer-like object not helpful
      return null;
    }
  } catch (e) {
    // not JSON -> maybe plain model (unlikely), fall back to returning candidatePath
    return candidatePath;
  }
  return null;
}

/**
 * Find latest model JSON path (robust):
 * - prefer per-TF folder newest file
 * - fallback to pointer top-level trained_ccxt_ohlcv_<TF>_latest.json (resolve pointer)
 * - search recursively for newest .json under modelRoot
 * - fallback to newest top-level trained_ccxt_ohlcv_*_latest.json pointers (resolve)
 */
function findLatestModelPath(modelRoot, timeframe = null) {
  try {
    // 1) TF subfolder newest file
    if (timeframe) {
      const tfDir = path.join(modelRoot, timeframe);
      if (fs.existsSync(tfDir) && fs.statSync(tfDir).isDirectory()) {
        const files = fs.readdirSync(tfDir).filter(f => f.endsWith('.json')).map(f => path.join(tfDir, f));
        if (files.length) {
          files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
          const candidate = files[0];
          const resolved = resolveModelFileCandidate(candidate);
          if (resolved) return resolved;
          // if candidate wasn't model, keep trying other files
          for (let i = 1; i < files.length; i++) {
            const r = resolveModelFileCandidate(files[i]);
            if (r) return r;
          }
        }
      }
      // 2) top-level latest pointer name
      const topLatest = path.join(path.dirname(modelRoot), `trained_ccxt_ohlcv_${timeframe}_latest.json`);
      const resolvedTop = resolveModelFileCandidate(topLatest);
      if (resolvedTop) return resolvedTop;
    }

    // 3) recursive search for newest .json under modelRoot
    if (fs.existsSync(modelRoot)) {
      const candidates = [];
      const walk = dir => {
        for (const name of fs.readdirSync(dir)) {
          const p = path.join(dir, name);
          const st = fs.statSync(p);
          if (st.isDirectory()) walk(p);
          else if (st.isFile() && name.endsWith('.json')) candidates.push(p);
        }
      };
      walk(modelRoot);
      // try the newest candidate that resolves
      candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      for (const c of candidates) {
        const r = resolveModelFileCandidate(c);
        if (r) return r;
      }
    }

    // 4) newest top-level latest pointer
    const parentDir = path.dirname(modelRoot);
    if (fs.existsSync(parentDir)) {
      const topCandidates = fs.readdirSync(parentDir).filter(f => f.startsWith('trained_ccxt_ohlcv_') && f.endsWith('_latest.json'));
      topCandidates.sort((a, b) => fs.statSync(path.join(parentDir, b)).mtimeMs - fs.statSync(path.join(parentDir, a)).mtimeMs);
      for (const t of topCandidates) {
        const candidatePath = path.join(parentDir, t);
        const resolved = resolveModelFileCandidate(candidatePath);
        if (resolved) return resolved;
      }
    }
    return null;
  } catch (e) {
    console.warn('[MODEL] findLatestModelPath error:', e && e.message ? e.message : e);
    return null;
  }
}

function loadModelAtPath(modelPath) {
  const txt = fs.readFileSync(modelPath, 'utf8');
  const parsed = JSON.parse(txt);
  const net = new ConvNet.Net();
  net.fromJSON(parsed);
  return { net, modelPath };
}

function safeLoadLatestModel(modelRoot, timeframe = null) {
  const modelPath = findLatestModelPath(modelRoot, timeframe);
  if (!modelPath) return null;
  try {
    const mdl = loadModelAtPath(modelPath);
    console.log(`[MODEL] Loaded model for ${timeframe || 'aggregate'}: ${modelPath}`);
    return mdl;
  } catch (e) {
    console.warn('[MODEL] failed to load model from', modelPath, ':', e && e.message ? e.message : e);
    return null;
  }
}

// Prediction helpers (unchanged logic but defensive)
function safePredictSingle(net, input) {
  if (!Array.isArray(input) || input.length === 0) return { label: 'idle', probs: [] };
  const safe = input.map(x => (Number.isFinite(Number(x)) ? Number(x) : 0));
  try {
    const v = new ConvNet.Vol(safe);
    const out = net.forward(v);
    const probs = Array.isArray(out.w) ? out.w.map(x => Number(x) || 0) : [];
    if (!probs.length || probs.some(p => !isFinite(p))) return { label: 'idle', probs };
    const idx = probs.indexOf(Math.max(...probs));
    const label = LABELS[idx] || 'idle';
    return { label, probs };
  } catch (err) {
    return { label: 'idle', probs: [] };
  }
}
function predictAll(candles, net) {
  return candles.map(candle => {
    const input = [candle.open, candle.high, candle.low, candle.close, candle.volume];
    return safePredictSingle(net, input);
  });
}

// Input validation: ensure parsed array has minimal fields
function validateInputArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return { valid: false, reason: 'not_array_or_empty' };
  // check a few rows for fields
  let seen = 0, ok = 0;
  for (let i = Math.max(0, arr.length - 10); i < arr.length; i++) {
    const r = arr[i] || {};
    seen++;
    if ((r.timestamp || r.time || r.signal_timestamp) && r.close !== undefined && r.open !== undefined) ok++;
  }
  const pctOk = (ok / seen) * 100;
  return { valid: pctOk >= 60, reason: pctOk >= 60 ? null : `insufficient_fields (${pctOk}% rows ok)` };
}

// Safe read JSON array with validation option
function readJsonArrayValidated(filePath) {
  let arr;
  try {
    arr = readJsonArray(filePath);
  } catch (e) {
    return { ok: false, error: 'parse_error', message: e.message };
  }
  if (VALIDATE_INPUT_JSON) {
    const v = validateInputArray(arr);
    if (!v.valid) return { ok: false, error: 'validation_failed', message: v.reason };
  }
  return { ok: true, arr };
}

function readJsonArray(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.data)) return parsed.data;
  let best = null;
  for (const k of Object.keys(parsed || {})) {
    if (Array.isArray(parsed[k]) && (!best || parsed[k].length > best.length)) best = parsed[k];
  }
  if (best) return best;
  throw new Error('Unrecognized JSON structure (expected array) in ' + filePath);
}

function loadCsvRows(csvPath) {
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found at: ${csvPath}`);
  let rows = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  rows = rows.filter(row => !/^timestamp,open,high,low,close,volume/i.test(row));
  return rows;
}
function csvToJsonRows(rows) {
  const candles = rows.map(line => {
    const parts = line.split(',');
    const [timestamp, open, high, low, close, volume] = parts;
    return { timestamp: String(timestamp), open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume) };
  }).filter(c =>
    c.timestamp && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) &&
    Number.isFinite(c.close) && Number.isFinite(c.volume)
  );
  return candles;
}

// Outputs
function writeEnhancedCsvPerTf(tf, candles, predictions) {
  const outFile = path.resolve(LOGS_ROOT, `ohlcv_ccxt_data_prediction_${tf}.csv`);
  const header = 'timestamp,open,high,low,close,volume,label,prediction,probabilities\n';
  const lines = candles.map((c, i) => {
    const pred = predictions[i] || { label: 'idle', probs: [] };
    const probsStr = Array.isArray(pred.probs) ? JSON.stringify(pred.probs) : '';
    const trueLabel = (typeof c.label === 'number' && LABELS[c.label]) ? LABELS[c.label] : '';
    return `${c.timestamp},${c.open},${c.high},${c.low},${c.close},${c.volume},${trueLabel},${pred.label},${probsStr}`;
  });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, header + lines.join('\n') + '\n');
  console.log(`[OUT] Wrote enhanced CSV: ${outFile}`);
  return outFile;
}

function atomicWriteJson(filePath, arr) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = filePath + PRED_TMP_SUFFIX;
    fs.writeFileSync(tmp, JSON.stringify(arr, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
    return true;
  } catch (e) {
    console.error('[OUT] atomicWriteJson failed:', e && e.message ? e.message : e);
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    return false;
  }
}

/**
 * Write or append/merge prediction JSON file.
 * If APPEND_PREDICTION=true then merge by timestamp (new rows override old by timestamp).
 * Otherwise overwrite atomically.
 */
function writePredictionJson(tf, candles, predictions) {
  try {
    const outArr = candles.map((c, i) => {
      const p = predictions[i] || { label: 'idle', probs: [] };
      return {
        timestamp: Number(c.timestamp),
        open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
        label: (typeof c.label === 'number' ? c.label : undefined),
        prediction_convnet: p.label || null,
        prediction_tf: null,
        ensemble_label: p.label || null,
        ensemble_confidence: p.probs && p.probs.length ? Math.round(Math.max(...p.probs) * 100) : 50,
        timeframe: tf,
        logged_at: new Date().toISOString(),
        signal_timestamp: Number(c.timestamp)
      };
    });

    const fname = path.join(OHLCV_JSON_DIR, `ohlcv_ccxt_data_${tf}_prediction.json`);

    if (APPEND_PREDICTION && fs.existsSync(fname)) {
      // merge
      let existing = [];
      try { existing = readJsonArray(fname); } catch (e) { existing = []; }
      const map = new Map();
      for (const r of existing) if (r && r.timestamp) map.set(Number(r.timestamp), r);
      for (const r of outArr) map.set(Number(r.timestamp), r);
      const merged = Array.from(map.values()).sort((a,b)=>Number(a.timestamp)-Number(b.timestamp));
      const ok = atomicWriteJson(fname, merged);
      if (ok) console.log(`[OUT] Merged+Wrote prediction JSON: ${fname} (rows: ${merged.length})`);
      return ok ? fname : null;
    } else {
      const ok = atomicWriteJson(fname, outArr);
      if (ok) console.log(`[OUT] Wrote prediction JSON: ${fname} (rows: ${outArr.length})`);
      return ok ? fname : null;
    }
  } catch (e) {
    console.error('[OUT] Failed to write prediction json:', e && e.message ? e.message : e);
    return null;
  }
}

// Append TF-prefixed state transitions to global ccxt_signal.log (dedupe after write)
function appendSignalTransitionsTf(tf, candles, predictions, logPath) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  let prevPrediction = null;
  let lines = [];
  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i] && predictions[i].label ? predictions[i].label : 'idle';
    if (pred !== prevPrediction) {
      lines.push(`${candles[i].timestamp}\t${tf}\t${pred}`);
      prevPrediction = pred;
    }
  }
  if (lines.length) {
    fs.appendFileSync(logPath, lines.join('\n') + '\n');
    console.log(`[LOG] Appended ${lines.length} transitions to ${logPath}`);
    deduplicateTfLogFile(logPath);
  }
}

function deduplicateTfLogFile(logPath) {
  if (!fs.existsSync(logPath)) return;
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
  const deduped = [];
  let prev = null;
  for (const line of lines) {
    const parts = line.split('\t').map(p => p.trim());
    const prediction = parts.length >= 3 ? parts[2] : parts[1];
    if (prediction !== prev) {
      deduped.push(line);
      prev = prediction;
    }
  }
  fs.writeFileSync(logPath, deduped.join('\n') + '\n');
}

// --- Main loop for TFs ---

function runAllRecognition() {
  for (const tf of TIMEFRAMES) {
    try {
      console.log(`\n[RUN] Processing timeframe: ${tf} (preferJson=${PREFER_JSON})`);
      // discover input
      const perTfJson = path.join(OHLCV_JSON_DIR, `ohlcv_ccxt_data_${tf}.json`);
      const aggJson = path.join(OHLCV_JSON_DIR, 'ohlcv_ccxt_data.json');
      const perTfCsv = path.join(CSV_DIR, `ohlcv_ccxt_data_${tf}.csv`);
      const genericCsv = path.join(CSV_DIR, 'ohlcv_ccxt_data.csv');

      let input = null;
      if (PREFER_JSON) {
        if (fs.existsSync(perTfJson)) input = { type: 'json', path: perTfJson };
        else if (fs.existsSync(aggJson)) input = { type: 'json', path: aggJson };
        else if (fs.existsSync(perTfCsv)) input = { type: 'csv', path: perTfCsv };
        else if (fs.existsSync(genericCsv)) input = { type: 'csv', path: genericCsv };
      } else {
        if (fs.existsSync(perTfCsv)) input = { type: 'csv', path: perTfCsv };
        else if (fs.existsSync(genericCsv)) input = { type: 'csv', path: genericCsv };
        else if (fs.existsSync(perTfJson)) input = { type: 'json', path: perTfJson };
        else if (fs.existsSync(aggJson)) input = { type: 'json', path: aggJson };
      }

      if (!input) {
        console.warn(`[SKIP] No input CSV/JSON found for timeframe ${tf}; skipping.`);
        continue;
      }

      let candles = [];
      if (input.type === 'csv') {
        console.log(`[INPUT] Using CSV: ${input.path}`);
        const rows = loadCsvRows(input.path);
        candles = csvToJsonRows(rows);
      } else {
        console.log(`[INPUT] Using JSON: ${input.path}`);
        const res = readJsonArrayValidated(input.path);
        if (!res.ok) {
          console.warn(`[SKIP] Input JSON validation failed for ${tf}:`, res.error || res.message);
          continue;
        }
        candles = res.arr.map(c => ({
          timestamp: String(c.timestamp ?? c.time ?? c.signal_timestamp ?? ''),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume)
        }));
      }

      if (!candles.length) {
        console.warn(`[SKIP] No valid candle rows for ${tf}`);
        continue;
      }

      const labeled = labelCandles(candles, EPSILON);

      const mdl = safeLoadLatestModel(MODEL_DIR, tf);
      if (!mdl || !mdl.net) {
        console.warn(`[SKIP] No model available for TF ${tf}; skipping predictions for this TF.`);
        continue;
      }

      const predictions = predictAll(labeled, mdl.net);

      // outputs
      writeEnhancedCsvPerTf(tf, labeled, predictions);
      const written = writePredictionJson(tf, labeled, predictions);

      if (written) appendSignalTransitionsTf(tf, labeled, predictions, SIGNAL_LOG_PATH);

      console.log(`[DONE] timeframe ${tf} processed.`);
    } catch (err) {
      console.error(`[ERROR] timeframe ${tf} failed:`, err && (err.message || err));
    }
  }
}

runAllRecognition();
setInterval(runAllRecognition, INTERVAL_MS);
