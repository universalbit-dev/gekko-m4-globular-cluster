#!/usr/bin/env node
/**
 * autoTune.js
 *
 * Consumes evaluation outputs (single file or directory of evaluation JSONs)
 * and produces a compact autoTune_results.json containing the best params per indicator.
 *
 * Goals / improvements:
 * - Resilient reads (skip invalid files)
 * - Support single-file or directory input
 * - Choose best parameter set per indicator by score (configurable scoring key)
 * - Atomic write of results and optional merging with existing file
 * - CLI: --input <file|dir>, --out <path>, --score-key <score|sharpe|...>
 *
 * Example:
 *  node tools/evaluation/autoTune.js --input tools/evaluation/evaluate_results.json --out tools/evaluation/autoTune_results.json
 */
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function safeReadJson(fp) {
  try { if (!fp || !fs.existsSync(fp)) return null; const txt = fs.readFileSync(fp, 'utf8'); return txt ? JSON.parse(txt) : null; } catch (e) { console.warn('safeReadJson error', fp, e && e.message ? e.message : e); return null; }
}
function safeWriteJson(fp, obj) {
  try { const tmp = fp + '.tmp'; fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); fs.renameSync(tmp, fp); return true; } catch (e) { console.error('safeWriteJson failed', e && e.message ? e.message : e); return false; }
}
function listJsonFilesInDir(dir) {
  try { if (!fs.existsSync(dir)) return []; return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => path.join(dir, f)); } catch (e) { return []; }
}

function getArgVal(name, def = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return def;
  return process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}

const input = getArgVal('--input') || process.env.AUTOTUNE_INPUT || path.resolve(__dirname, 'evaluate_results.json');
const outPath = getArgVal('--out') || process.env.AUTOTUNE_OUTPUT || path.resolve(__dirname, 'autoTune_results.json');
const scoreKey = getArgVal('--score-key') || process.env.AUTOTUNE_SCORE_KEY || 'score';

// gather candidate files
let files = [];
if (fs.existsSync(input)) {
  const s = fs.statSync(input);
  if (s.isDirectory()) files = listJsonFilesInDir(input);
  else files = [input];
} else {
  // try common fallback: tools/evaluation/*.json
  files = listJsonFilesInDir(path.resolve(__dirname));
}
if (!files.length) { console.warn('No evaluation JSON files found for autoTune'); process.exit(0); }

// aggregate entries
const allEntries = [];
for (const f of files) {
  const data = safeReadJson(f);
  if (!data) continue;
  // data expected to be an array of result objects
  if (Array.isArray(data)) {
    for (const item of data) {
      allEntries.push(Object.assign({}, item, { __source: f }));
    }
  } else if (typeof data === 'object' && data.results && Array.isArray(data.results)) {
    for (const item of data.results) allEntries.push(Object.assign({}, item, { __source: f }));
  }
}

// group by indicator + params signature (we'll pick best per indicator/params)
const byIndicator = {};
for (const e of allEntries) {
  if (!e || !e.indicator) continue;
  const key = String(e.indicator).toLowerCase();
  byIndicator[key] ??= [];
  byIndicator[key].push(e);
}

// pick best param set per indicator by scoreKey
const autoTune = [];
for (const [ind, entries] of Object.entries(byIndicator)) {
  // group by params JSON string
  const byParams = new Map();
  for (const e of entries) {
    const paramsKey = JSON.stringify(e.params || {});
    const arr = byParams.get(paramsKey) || [];
    arr.push(e);
    byParams.set(paramsKey, arr);
  }
  // compute aggregate score per params (mean)
  let best = null;
  for (const [paramsKey, arr] of byParams.entries()) {
    const scores = arr.map(a => Number(a[scoreKey] ?? a.score ?? 0)).filter(n => isFinite(n));
    const meanScore = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length) : Number.NEGATIVE_INFINITY;
    const entry = { indicator: ind, params: JSON.parse(paramsKey), meanScore, samples: arr.length, examples: arr.slice(0,3) };
    if (!best || entry.meanScore > best.meanScore) best = entry;
  }
  if (best) autoTune.push({ indicator: ind, bestParams: best.params, meanScore: best.meanScore, samples: best.samples, examples: best.examples });
}

if (!autoTune.length) { console.warn('autoTune: no valid entries'); process.exit(0); }

// write autoTune results atomically
const wrote = safeWriteJson(outPath, { generated_at: new Date().toISOString(), results: autoTune });
if (wrote) console.log('autoTune: wrote', outPath);
else console.error('autoTune: failed to write', outPath);

module.exports = { autoTune };
