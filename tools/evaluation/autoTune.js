#!/usr/bin/env node
/**
 * tools/evaluation/autoTune.js
 *
 * Consumes evaluation outputs (single file or directory of evaluation JSONs or .js modules)
 * and produces a compact autoTune_results.json containing the best params per indicator.
 *
 * This version adds safe support for .js files that export evaluation data (CommonJS).
 *
 * CLI:
 *   --input <file|dir>     (default: ./evaluate_results.json in this script dir)
 *   --out <path>           (default: ./autoTune_results.json in this script dir)
 *   --score-key <key>      (default: score)
 *   --merge                (merge with existing out file)
 *   --min-samples <n>      (default: 1)
 *   --recursive / --no-recursive
 *   --verbose / --quiet
 *
 * Notes:
 *  - .json files are parsed as usual.
 *  - .js files are executed in a restricted VM sandbox to read module.exports or exports.
 *    The sandbox disables require and limits execution time to avoid accidental side effects.
 *  - If a .js file cannot be safely evaluated, the script will skip it and report the reason.
 *
 * Example:
 *   node tools/evaluation/autoTune.js --input tools/evaluation --out tools/evaluation/autoTune_results.json --verbose
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SCRIPT_DIR = path.resolve(__dirname || '.');
require('dotenv').config({ path: path.resolve(SCRIPT_DIR, '../../.env') });

/* ---------- Utilities ---------- */

function safeReadJsonFile(fp) {
  try {
    if (!fp || !fs.existsSync(fp)) return { ok: false, reason: 'missing' };
    const txt = fs.readFileSync(fp, 'utf8');
    if (!txt) return { ok: false, reason: 'empty' };
    try {
      const parsed = JSON.parse(txt);
      return { ok: true, data: parsed };
    } catch (e) {
      return { ok: false, reason: 'parse-error', error: e && e.message ? e.message : String(e) };
    }
  } catch (e) {
    return { ok: false, reason: 'io-error', error: e && e.message ? e.message : String(e) };
  }
}

/**
 * Evaluate a .js file in a restricted VM to extract module.exports (CommonJS).
 * - Disables require (throws)
 * - Provides console so user code can log
 * - Runs with a time limit via script.runInContext with limited microtask queue support via setTimeout stub
 */
function safeRequireJsFile(fp, timeoutMs = 1000) {
  try {
    const code = fs.readFileSync(fp, 'utf8');
    if (!code) return { ok: false, reason: 'empty' };
    // Wrap in IIFE to emulate module scope and capture module.exports
    const wrapper = `(function(exports, module){
${code}
})(exports, module);`;
    const sandbox = {
      module: { exports: {} },
      exports: {},
      console: {
        log: (...a) => {}, // swallow logs to avoid noise; could forward if verbose
        warn: (...a) => {},
        error: (...a) => {},
        info: (...a) => {},
      },
      // deliberately disable require and process to avoid side-effects
      require: function () {
        throw new Error('require is disabled in sandboxed evaluation');
      },
      process: { env: {} },
      Buffer: Buffer,
      setTimeout: setTimeout, // allowed but long-running tasks will be limited by timeout below
      setInterval: function () { throw new Error('setInterval disabled in sandbox'); },
      clearInterval: clearInterval,
    };
    const context = vm.createContext(sandbox);
    const script = new vm.Script(wrapper, { filename: fp, displayErrors: true });
    // Run with limited CPU by using runInContext and manual timeout via Promise.race
    let finished = false;
    const run = () => {
      script.runInContext(context, { timeout: timeoutMs });
      finished = true;
      return { ok: true, data: context.module && context.module.exports ? context.module.exports : context.exports };
    };
    // run synchronously but VM has timeout option (node v10+). Wrap in try/catch.
    try {
      return run();
    } catch (e) {
      return { ok: false, reason: 'vm-error', error: e && e.message ? e.message : String(e) };
    }
  } catch (e) {
    return { ok: false, reason: 'io-error', error: e && e.message ? e.message : String(e) };
  }
}

function safeWriteJson(fp, obj) {
  try {
    const tmp = fp + '.tmp';
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
    fs.renameSync(tmp, fp);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

function listFilesRec(dir, recursive = true, exts = ['.json', '.js']) {
  const out = [];
  try {
    if (!fs.existsSync(dir)) return out;
    const entries = fs.readdirSync(dir);
    for (const ent of entries) {
      const full = path.join(dir, ent);
      let st;
      try { st = fs.statSync(full); } catch { continue; }
      if (st.isFile() && exts.includes(path.extname(ent).toLowerCase())) out.push(full);
      else if (recursive && st.isDirectory()) out.push(...listFilesRec(full, recursive, exts));
    }
  } catch (e) {
    // swallow and return what we have
  }
  return out;
}

function getArgVal(name, def = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return def;
  return process.argv[i + 1] && !String(process.argv[i + 1]).startsWith('--') ? process.argv[i + 1] : def;
}
function hasFlag(name) {
  return process.argv.includes(name);
}

// stable stringify for params: sort object keys recursively
function stableStringify(obj) {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

// Normalize any raw item to { indicator, params, score, raw }
function normalizeItem(raw, scoreKeyCandidates = ['score']) {
  if (!raw || typeof raw !== 'object') return null;
  const indicator = raw.indicator || raw.name || raw.indicatorName || raw.strategy || raw.id || raw.metric;
  if (!indicator) return null;
  const params = raw.params || raw.parameters || raw.opts || raw.config || {};
  // score detection
  let score = NaN;
  for (const k of scoreKeyCandidates) {
    // support nested keys like 'score.mean'
    if (k.includes('.')) {
      const parts = k.split('.');
      let cur = raw;
      for (const p of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
        else { cur = undefined; break; }
      }
      if (cur !== undefined && cur !== null) {
        const n = Number(cur);
        if (isFinite(n)) { score = n; break; }
      }
    } else if (Object.prototype.hasOwnProperty.call(raw, k) && raw[k] !== undefined && raw[k] !== null) {
      const n = Number(raw[k]);
      if (isFinite(n)) { score = n; break; }
    }
  }
  // fallback to 'score' if present somewhere
  if (!isFinite(score) && 'score' in raw) {
    const n = Number(raw.score);
    if (isFinite(n)) score = n;
  }
  return { indicator: String(indicator), params: params || {}, score: score, raw };
}

/* ---------- CLI / options ---------- */
const userInput = getArgVal('--input') || process.env.AUTOTUNE_INPUT || path.join(SCRIPT_DIR, 'evaluate_results.json');
const outPath = getArgVal('--out') || process.env.AUTOTUNE_OUTPUT || path.join(SCRIPT_DIR, 'autoTune_results.json');
const scoreKey = getArgVal('--score-key') || process.env.AUTOTUNE_SCORE_KEY || 'score';
const mergeFlag = hasFlag('--merge');
const verbose = hasFlag('--verbose') || !hasFlag('--quiet');
const recursive = !hasFlag('--no-recursive');
const minSamples = Number(getArgVal('--min-samples') || process.env.AUTOTUNE_MIN_SAMPLES || '1');

if (verbose) {
  console.log('autoTune: options:', { userInput, outPath, scoreKey, mergeFlag, recursive, minSamples });
}

/* ---------- gather candidate files ---------- */
let files = [];
try {
  if (userInput.includes('*')) {
    // Very small glob support: base path then filter by wildcard pieces.
    const base = userInput.replace(/[*].*$/, '') || '.';
    const all = listFilesRec(path.resolve(base), recursive, ['.json', '.js']);
    const pattern = '^' + userInput.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$';
    const re = new RegExp(pattern);
    files = all.filter(f => re.test(f));
  } else if (fs.existsSync(userInput)) {
    const s = fs.statSync(userInput);
    if (s.isDirectory()) files = listFilesRec(path.resolve(userInput), recursive, ['.json', '.js']);
    else files = [path.resolve(userInput)];
  } else {
    // fallback: search script directory recursively
    files = listFilesRec(SCRIPT_DIR, recursive, ['.json', '.js']);
  }
} catch (e) {
  files = [];
}

if (files.length === 0) {
  if (verbose) console.warn('autoTune: no candidate files found (checked input and script directory).');
  console.warn('autoTune: no valid entries');
  process.exit(0);
}

if (verbose) console.log('autoTune: candidate files:', files);

/* ---------- parse files and extract entries (supports .json and .js) ---------- */
const scoreKeyCandidates = [scoreKey, 'score', 'profit', 'sharpe', 'score.mean', 'meanScore'];

const allEntries = [];
const fileReports = {}; // filename -> { ok, added, skippedReasons: [] }

for (const f of files) {
  fileReports[f] = { ok: false, added: 0, skippedReasons: [] };
  const ext = path.extname(f).toLowerCase();
  let r;
  if (ext === '.json') {
    r = safeReadJsonFile(f);
  } else if (ext === '.js') {
    r = safeRequireJsFile(f);
    // r.data may contain objects exported from JS; keep shape consistent
  } else {
    fileReports[f].skippedReasons.push('unsupported-ext');
    continue;
  }

  fileReports[f].ok = !!r.ok;
  if (!r.ok) {
    fileReports[f].skippedReasons.push(r.reason || 'read-failed');
    if (r.error && verbose) fileReports[f].skippedReasons.push(`error:${r.error}`);
    continue;
  }

  const data = r.data;

  // detect shapes:
  // - Array of items
  // - { results: [...] } or { evaluations: [...] }
  // - Map-of-arrays: { rsi: [ ... ], atr: [ ... ] }
  // - Single object resembling a single result
  const items = [];

  if (Array.isArray(data)) {
    items.push(...data);
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.results)) items.push(...data.results);
    else if (Array.isArray(data.evaluations)) items.push(...data.evaluations);
    else {
      // map-of-arrays: assume keys are indicators
      let mapped = false;
      for (const [k, v] of Object.entries(data)) {
        if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
          mapped = true;
          for (const it of v) {
            const copy = Object.assign({}, it);
            if (!copy.indicator) copy.indicator = k;
            items.push(copy);
          }
        }
      }
      if (!mapped) {
        // treat as single item if it resembles one
        const maybe = normalizeItem(data, scoreKeyCandidates);
        if (maybe) items.push(data);
      }
    }
  }

  if (!items.length) {
    fileReports[f].skippedReasons.push('no-items-found');
    continue;
  }

  for (const rawItem of items) {
    const norm = normalizeItem(rawItem, scoreKeyCandidates);
    if (!norm) {
      fileReports[f].skippedReasons.push('item-missing-indicator');
      continue;
    }
    allEntries.push(Object.assign({}, norm, { __source: f }));
    fileReports[f].added += 1;
  }
}

if (verbose) {
  console.log('autoTune: file report summary:');
  for (const [f, rep] of Object.entries(fileReports)) {
    console.log(' -', f, 'ok=', rep.ok, 'added=', rep.added, 'skipped=', rep.skippedReasons.join('|') || 'none');
  }
}

if (!allEntries.length) {
  if (verbose) console.warn('autoTune: found no candidate entries in any file.');
  console.warn('autoTune: no valid entries');
  process.exit(0);
}

if (verbose) console.log('autoTune: total raw entries discovered:', allEntries.length);

/* ---------- group by indicator and params ---------- */
const byIndicator = Object.create(null);
for (const e of allEntries) {
  if (!e || !e.indicator) continue;
  const key = String(e.indicator).toLowerCase();
  byIndicator[key] ??= [];
  byIndicator[key].push(e);
}

const autoTune = [];

for (const [ind, entries] of Object.entries(byIndicator)) {
  const byParams = new Map();
  for (const e of entries) {
    const paramsKey = stableStringify(e.params || {});
    if (!byParams.has(paramsKey)) byParams.set(paramsKey, []);
    byParams.get(paramsKey).push(e);
  }

  let best = null;
  for (const [paramsKey, arr] of byParams.entries()) {
    const scores = arr.map(a => Number(a.score)).filter(n => isFinite(n));
    if (scores.length < minSamples) {
      if (verbose) {
        console.log(`autoTune: indicator=${ind} params=${paramsKey} skipped (samples=${scores.length} < minSamples=${minSamples})`);
      }
      continue;
    }
    const meanScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : NaN;
    const entry = {
      indicator: ind,
      params: arr[0].params || {},
      meanScore,
      samples: arr.length,
      sources: Array.from(new Set(arr.map(x => x.__source))).slice(0, 10),
      examples: arr.slice(0, 3).map(x => ({ score: Number(x.score), params: x.params, source: x.__source })),
    };
    if (!best || (Number(entry.meanScore) > Number(best.meanScore))) best = entry;
  }

  if (best) {
    autoTune.push({
      indicator: ind,
      bestParams: best.params,
      meanScore: Number(best.meanScore),
      samples: best.samples,
      examples: best.examples,
      sources: best.sources,
    });
  } else if (verbose) {
    console.log(`autoTune: indicator=${ind} had no param-sets that met requirements (minSamples=${minSamples}).`);
  }
}

if (!autoTune.length) {
  if (verbose) console.warn('autoTune: no indicators produced valid tuning results after grouping/filtering.');
  console.warn('autoTune: no valid entries');
  process.exit(0);
}

/* ---------- merge with existing (optional) ---------- */
let finalOut = { generated_at: new Date().toISOString(), results: autoTune };
if (mergeFlag && fs.existsSync(outPath)) {
  const old = safeReadJsonFile(outPath);
  if (old.ok && old.data && (Array.isArray(old.data.results) || Array.isArray(old.data))) {
    const existingArr = Array.isArray(old.data.results) ? old.data.results : old.data;
    const map = new Map();
    for (const r of existingArr) map.set(String(r.indicator).toLowerCase(), r);
    for (const r of autoTune) map.set(String(r.indicator).toLowerCase(), r);
    finalOut = { generated_at: new Date().toISOString(), results: Array.from(map.values()) };
  } else if (old.ok && Array.isArray(old.data)) {
    const map = new Map();
    for (const r of old.data) map.set(String(r.indicator).toLowerCase(), r);
    for (const r of autoTune) map.set(String(r.indicator).toLowerCase(), r);
    finalOut = { generated_at: new Date().toISOString(), results: Array.from(map.values()) };
  } else {
    finalOut = { generated_at: new Date().toISOString(), results: autoTune };
  }
}

/* ---------- write results ---------- */
const wrote = safeWriteJson(outPath, finalOut);
if (!wrote.ok) {
  console.error('autoTune: failed to write', outPath, 'error=', wrote.error);
  process.exit(2);
}
console.log('autoTune: wrote', outPath, 'indicators=', finalOut.results.length);

module.exports = { autoTune: autoTune, _internal: { safeReadJsonFile, safeRequireJsFile, safeWriteJson, listFilesRec, normalizeItem } };
