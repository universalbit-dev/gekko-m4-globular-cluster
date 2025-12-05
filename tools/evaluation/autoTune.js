#!/usr/bin/env node
/**
 * tools/evaluation/autoTune.js (simple, expects evaluate_results.*.json created by evaluate.js)
 *
 * Behavior:
 * - If IN_PATH points to a file evaluate_results.json, process that combined flattened array.
 * - If IN_PATH points to a directory, discover files named evaluate_results.<tf>.json
 *   and produce per-timeframe autoTune outputs plus a combined map at OUT_PATH.
 * - Will ignore evaluate_results_augmented.json unless DELETE_AUGMENTED=1, in which case it removes it.
 *
 * Usage:
 *  IN_PATH defaults to tools/evaluation
 *  OUT_PATH defaults to tools/evaluation/autoTune_results.json
 *  MIN_SAMPLES default 1 (env MIN_SAMPLES)
 *  GENERATE_PERMUTATIONS=1 enables simple permutation generation
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const EVAL_DIR = path.resolve(__dirname);
const DEFAULT_IN = path.join(EVAL_DIR);
const DEFAULT_OUT = path.join(EVAL_DIR, 'autoTune_results.json');

function resolveEnvPath(envValue, fallback) {
  if (envValue && typeof envValue === 'string' && envValue.length) {
    return path.isAbsolute(envValue) ? path.resolve(envValue) : path.resolve(EVAL_DIR, envValue);
  }
  return fallback;
}

const IN_PATH = resolveEnvPath(process.env.IN_PATH, DEFAULT_IN);
const OUT_PATH = resolveEnvPath(process.env.OUT_PATH, DEFAULT_OUT);
const MIN_SAMPLES = parseInt(process.env.MIN_SAMPLES || '1', 10);
const GENERATE_PERMUTATIONS = process.env.GENERATE_PERMUTATIONS === '1';
const DELETE_AUGMENTED = process.env.DELETE_AUGMENTED === '1';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

function vlog(...a) { if (VERBOSE) console.log('[AUTOTUNE]', ...a); }

function safeReadJSON(fp) {
  try {
    if (!fs.existsSync(fp)) return null;
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) {
    console.warn('[AUTOTUNE] read failed', fp, e && e.message ? e.message : e);
    return null;
  }
}
function safeWriteJSONAtomic(fp, obj) {
  try {
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    const tmp = fp + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
    fs.renameSync(tmp, fp);
    return true;
  } catch (e) {
    console.error('[AUTOTUNE] write failed', fp, e && e.message ? e.message : e);
    return false;
  }
}

function summarizeGroup(arr) {
  if (!Array.isArray(arr) || !arr.length) return {};
  const sample = arr[0];
  const numericKeys = Object.keys(sample).filter(k => typeof sample[k] === 'number');
  const stats = {};
  for (const k of numericKeys) {
    const vals = arr.map(x => Number.isFinite(x[k]) ? x[k] : null).filter(v => v !== null);
    if (!vals.length) continue;
    const sum = vals.reduce((a,b)=>a+b,0);
    const mean = sum/vals.length;
    const sd = Math.sqrt(vals.reduce((a,b)=>a + Math.pow(b-mean,2),0)/vals.length);
    stats[k] = { mean, sd, n: vals.length };
  }
  return stats;
}

function generateCandidates(records) {
  const grouped = new Map();
  for (const r of records) {
    const key = (r && (r.indicator || r.strategy)) ? (r.indicator || r.strategy) : '_global';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(r);
  }
  const results = [];
  for (const [k, arr] of grouped.entries()) {
    if (arr.length < MIN_SAMPLES) {
      vlog(`[AUTOTUNE] Indicator ${k} has only ${arr.length} samples (< MIN_SAMPLES=${MIN_SAMPLES})`);
      continue;
    }
    const stats = summarizeGroup(arr);
    let scoreKey = null;
    if (arr[0] && typeof arr[0].abs === 'number') scoreKey = 'abs';
    else if (arr[0] && typeof arr[0].score === 'number') scoreKey = 'score';
    else if (arr[0] && typeof arr[0].pnl === 'number') scoreKey = 'pnl';
    else {
      const sks = Object.keys(stats);
      if (sks.length) scoreKey = sks[0];
    }
    const base = { indicator: k, samples: arr.length, scoreKey, stats };
    const cands = [base];
    if (GENERATE_PERMUTATIONS) {
      const perm = [];
      for (const kk of Object.keys(stats)) {
        const s = stats[kk];
        perm.push({ key: kk, thr: s.mean + s.sd });
        perm.push({ key: kk, thr: s.mean - s.sd });
      }
      cands.push({ indicator: k, samples: arr.length, generatedPermutations: perm });
    }
    results.push({ indicator: k, candidates: cands });
  }
  if (!results.length) {
    const allStats = summarizeGroup(records);
    results.push({ indicator: '_global', candidates: [{ indicator: '_global', samples: records.length, stats: allStats }] });
  }
  return results;
}

// discover evaluate results files in IN_PATH
function listEvaluateFiles(inPath) {
  try {
    if (fs.existsSync(inPath) && fs.statSync(inPath).isFile()) {
      // single file input
      return [inPath];
    }
    const dir = fs.existsSync(inPath) && fs.statSync(inPath).isDirectory() ? inPath : EVAL_DIR;
    const names = fs.readdirSync(dir);
    // prefer explicit combined file evaluate_results.json
    const combined = names.find(n => n === 'evaluate_results.json');
    const perTf = names.filter(n => n.match(/^evaluate_results\.[^.]+\.json$/));
    if (combined) return [path.join(dir, combined)];
    if (perTf.length) return perTf.map(n => path.join(dir, n));
    // fallback to any evaluate_results*.json
    const fallback = names.filter(n => n.startsWith('evaluate_results') && n.endsWith('.json')).map(n => path.join(dir, n));
    return fallback;
  } catch (e) {
    console.warn('[AUTOTUNE] listEvaluateFiles failed', e && e.message ? e.message : e);
    return [];
  }
}

function processOnce() {
  const files = listEvaluateFiles(IN_PATH);
  if (!files.length) {
    console.error('[AUTOTUNE] No evaluate_results files found in', IN_PATH);
    process.exit(1);
  }

  // optional delete augmented file if requested
  if (DELETE_AUGMENTED) {
    const augmented = path.join(path.dirname(files[0]), 'evaluate_results_augmented.json');
    if (fs.existsSync(augmented)) {
      try { fs.unlinkSync(augmented); vlog('[AUTOTUNE] Deleted augmented file', augmented); } catch (e) { warn('Failed to delete augmented', e && e.message); }
    }
  }

  // If a single combined file exists, process it as flattened array
  if (files.length === 1 && path.basename(files[0]) === 'evaluate_results.json') {
    const recs = safeReadJSON(files[0]) || [];
    const result = generateCandidates(recs);
    if (VERBOSE || DRY_RUN) console.log(JSON.stringify(result, null, 2));
    if (!DRY_RUN) {
      safeWriteJSONAtomic(OUT_PATH, result);
      console.log(`[AUTOTUNE] Wrote ${OUT_PATH}`);
    }
    return;
  }

  // Otherwise, files are per-timeframe evaluate_results.<tf>.json
  const combined = {};
  for (const f of files) {
    const name = path.basename(f);
    const m = name.match(/^evaluate_results\.(.+)\.json$/);
    const tf = m ? m[1] : path.basename(f, '.json');
    const recs = safeReadJSON(f) || [];
    const result = generateCandidates(recs);
    combined[tf] = result;
    const outPer = OUT_PATH + '.' + tf + '.json';
    if (VERBOSE || DRY_RUN) {
      console.log(`[AUTOTUNE] Per-timeframe ${tf} ->`);
      console.log(JSON.stringify(result, null, 2));
    }
    if (!DRY_RUN) safeWriteJSONAtomic(outPer, result);
  }

  if (VERBOSE || DRY_RUN) {
    console.log('[AUTOTUNE] Combined map ->');
    console.log(JSON.stringify(combined, null, 2));
  }
  if (!DRY_RUN) {
    safeWriteJSONAtomic(OUT_PATH, combined);
    console.log(`[AUTOTUNE] Wrote combined ${OUT_PATH}`);
  } else {
    console.log('[AUTOTUNE] Dry-run complete; no files written.');
  }
}

// run
if (require.main === module) processOnce();

module.exports = { processOnce };
