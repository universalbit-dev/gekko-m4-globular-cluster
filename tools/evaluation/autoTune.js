#!/usr/bin/env node
/**
 * tools/evaluation/autoTune.js (enhanced)
 *
 * Purpose:
 * - Read evaluate_results_augmented.json (falls back to evaluate_results.json)
 * - Produce autoTune_results.json with:
 *   - per-indicator candidate aggregations
 *   - ensure a lower minSamples threshold by default (5)
 *   - optionally create parameter permutations (if tuneCandidates provided)
 *   - create a "global" aggregated candidate set if per-indicator is too small
 *
 * Usage:
 *   node tools/evaluation/autoTune.js
 *   node tools/evaluation/autoTune.js --dry-run --list-indicators
 *
 * Environment:
 *   IN_PATH (default evaluate_results_augmented.json inside this script dir)
 *   OUT_PATH (default autoTune_results.json inside this script dir)
 *   MIN_SAMPLES (default 5)
 *   GENERATE_PERMUTATIONS (default 0)  -- if 1, generate simple parameter permutations
 *
 * Notes:
 * - If IN_PATH or OUT_PATH are provided via environment variables and are relative
 *   paths, they are now resolved relative to this script's directory (tools/evaluation).
 *   Absolute paths are left as-is. This avoids files being read/written relative to
 *   the process working directory.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const EVAL_DIR = path.resolve(__dirname);
const FALLBACK_IN = path.join(EVAL_DIR, './evaluate_results.json');

// Resolve environment paths so relative env paths are anchored to EVAL_DIR
function resolveEnvPath(envValue, fallback) {
  if (envValue && typeof envValue === 'string' && envValue.length) {
    // If envValue is absolute, return normalized absolute path.
    // If relative, resolve it relative to EVAL_DIR so we don't depend on cwd.
    return path.isAbsolute(envValue) ? path.resolve(envValue) : path.resolve(EVAL_DIR, envValue);
  }
  return fallback;
}

const DEFAULT_IN = path.join(EVAL_DIR, './evaluate_results_augmented.json');
const DEFAULT_OUT = path.join(EVAL_DIR, './autoTune_results.json');

const IN_PATH = resolveEnvPath(process.env.IN_PATH, DEFAULT_IN);
const OUT_PATH = resolveEnvPath(process.env.OUT_PATH, DEFAULT_OUT);

const MIN_SAMPLES = parseInt(process.env.MIN_SAMPLES || '5', 10);
const GENERATE_PERMUTATIONS = process.env.GENERATE_PERMUTATIONS === '1';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIST_IND = args.includes('--list-indicators');
const VERBOSE = args.includes('--verbose');

function log(...a) { if (VERBOSE) console.log('[AUTOTUNE]', ...a); }

function safeReadJSON(fp) {
  try {
    if (!fs.existsSync(fp)) return null;
    const raw = fs.readFileSync(fp, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[AUTOTUNE] read failed', fp, e && e.message ? e.message : e);
    return null;
  }
}

function safeWriteJSON(fp, obj) {
  try {
    // ensure directory exists
    const dir = path.dirname(fp);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[AUTOTUNE] write failed', fp, e && e.message ? e.message : e);
    return false;
  }
}

let records = safeReadJSON(IN_PATH);
if (!records) {
  // fallback read (FALLBACK_IN is already absolute to EVAL_DIR)
  records = safeReadJSON(FALLBACK_IN) || [];
  if (records && records.length) log(`[AUTOTUNE] Using fallback input ${FALLBACK_IN}`);
  else {
    // if IN_PATH was provided via env and doesn't exist, log helpful message
    if (process.env.IN_PATH) {
      console.warn(`[AUTOTUNE] Environment IN_PATH resolved to ${IN_PATH} but no file was found; also tried fallback ${FALLBACK_IN}`);
    }
  }
}

if (!Array.isArray(records) || records.length === 0) {
  console.error('[AUTOTUNE] No evaluation records found (checked', IN_PATH, 'and', FALLBACK_IN, ')');
  process.exit(1);
}

function groupByIndicator(recs) {
  const map = new Map();
  for (const r of recs) {
    const key = (r && (r.indicator || r.strategy)) ? (r.indicator || r.strategy) : '_global';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return map;
}

function summarizeGroup(arr) {
  const sample = arr[0] || {};
  const numericKeys = Object.keys(sample).filter(k => typeof sample[k] === 'number');
  // simple stats
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

function generateCandidatesForIndicator(key, arr) {
  const stats = summarizeGroup(arr);
  // base candidate uses simple scoreKey avg of absolute 'abs' if present, else 'score' or 'pnl'
  const scoreKey = arr[0] && typeof arr[0].abs === 'number' ? 'abs' : (arr[0] && typeof arr[0].score === 'number' ? 'score' : (arr[0] && typeof arr[0].pnl === 'number' ? 'pnl' : null));
  // create one candidate per indicator summarizing essential info
  const base = {
    indicator: key,
    samples: arr.length,
    scoreKey,
    stats
  };
  const candidates = [base];
  if (GENERATE_PERMUTATIONS) {
    // generate simple permuted thresholds based on data sd/mean heuristics
    const perm = [];
    for (const k of Object.keys(stats)) {
      const s = stats[k];
      const t1 = s.mean + s.sd;
      const t2 = s.mean - s.sd;
      perm.push({ key: k, thr: t1 });
      perm.push({ key: k, thr: t2 });
    }
    // attach to base candidate
    candidates.push({ indicator: key, samples: arr.length, generatedPermutations: perm });
  }
  return candidates;
}

function buildAutoTune() {
  const grouped = groupByIndicator(records);
  const results = [];
  for (const [k, arr] of grouped.entries()) {
    if (arr.length < MIN_SAMPLES) {
      log(`[AUTOTUNE] Indicator ${k} has only ${arr.length} samples (< MIN_SAMPLES=${MIN_SAMPLES})`);
      continue;
    }
    const cands = generateCandidatesForIndicator(k, arr);
    results.push({ indicator: k, candidates: cands });
  }

  // If results empty (no per-indicator group met MIN_SAMPLES), create a global candidate
  if (!results.length) {
    const allStats = summarizeGroup(records);
    results.push({ indicator: '_global', candidates: [{ indicator: '_global', samples: records.length, stats: allStats }] });
  }
  return results;
}

if (LIST_IND) {
  const grouped = groupByIndicator(records);
  console.log('[AUTOTUNE] Indicators discovered and counts:');
  for (const [k, arr] of grouped.entries()) console.log(` - ${k}: ${arr.length}`);
  if (DRY_RUN) process.exit(0);
}

const autotuneResult = buildAutoTune();

if (DRY_RUN) {
  console.log('[AUTOTUNE] Dry-run: built autotune summary below:');
  console.log(JSON.stringify(autotuneResult, null, 2));
  process.exit(0);
}

const ok = safeWriteJSON(OUT_PATH, autotuneResult);
if (ok) console.log(`[AUTOTUNE] Wrote ${OUT_PATH} with ${autotuneResult.length} entries (indicators)`);
else process.exit(1);
