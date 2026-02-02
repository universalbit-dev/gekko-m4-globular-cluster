const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');
const { labelCandles, EPSILON: DEFAULT_EPSILON } = require('./label_ohlcv.js');

const RAW_OHLCV_JSON_DIR = process.env.TRAIN_OHLCV_JSON_DIR || '../logs/json/ohlcv';
const OHLCV_JSON_DIR = path.resolve(__dirname, RAW_OHLCV_JSON_DIR);
const TIMEFRAMES = (process.env.TRAIN_OHLCV_TIMEFRAMES || '1m,5m,15m,1h')
  .split(',').map(s => s.trim()).filter(Boolean);

const MULTI_INTERVAL_MS = parseInt(process.env.MULTI_INTERVAL_MS, 10) || 60000;
const PAIR = (process.env.PAIR || process.env.MARKET || '').trim(); // e.g. "LTC_BTC" or "LTC/EUR"

// Build pair suffix candidates (try several common variants)
const pairSuffixCandidates = [];
if (PAIR) {
  pairSuffixCandidates.push(`_${PAIR}`);
  pairSuffixCandidates.push(`_${PAIR.replace('/', '_')}`);
  pairSuffixCandidates.push(`_${PAIR.replace('/', '').toUpperCase()}`);
  pairSuffixCandidates.push(`_${PAIR.replace('/', '').toLowerCase()}`);
}
pairSuffixCandidates.push(''); // fallback to no-pair filename

function resolveEpsilonForPair(pair) {
  // precedence: LABEL_EPSILON_<PAIR_UP> -> LABEL_EPSILON -> DEFAULT_EPSILON (from label_ohlcv.js)
  if (!pair) return undefined; // let labelCandles use its default EPSILON
  const key = `LABEL_EPSILON_${pair.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`;
  const valPair = process.env[key];
  if (valPair !== undefined && valPair !== null && String(valPair).trim() !== '') {
    const n = Number(valPair);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const valGlobal = process.env.LABEL_EPSILON;
  if (valGlobal !== undefined && valGlobal !== null && String(valGlobal).trim() !== '') {
    const n = Number(valGlobal);
    if (Number.isFinite(n) && n > 0) return n;
  }
  // return undefined to signal "use module default" (DEFAULT_EPSILON)
  return undefined;
}

function findFileForTf(tf) {
  for (const ps of pairSuffixCandidates) {
    const candidate1 = path.join(OHLCV_JSON_DIR, `ohlcv_ccxt_data${ps}_${tf}.json`);
    if (fs.existsSync(candidate1)) return { path: candidate1, usedPairSuffix: ps };
    const candidate2 = path.join(OHLCV_JSON_DIR, `ohlcv_ccxt_data${ps}.json`);
    if (fs.existsSync(candidate2)) return { path: candidate2, usedPairSuffix: ps };
  }
  // fallback: explicit per-tf and aggregate
  const perTf = path.join(OHLCV_JSON_DIR, `ohlcv_ccxt_data_${tf}.json`);
  if (fs.existsSync(perTf)) return { path: perTf, usedPairSuffix: '' };
  const agg = path.join(OHLCV_JSON_DIR, `ohlcv_ccxt_data.json`);
  if (fs.existsSync(agg)) return { path: agg, usedPairSuffix: '' };
  return null;
}

function atomicWriteJson(filePath, arr) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(arr, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
    return true;
  } catch (e) {
    console.error(`[ERROR] atomicWriteJson failed for ${filePath}:`, e && e.message ? e.message : e);
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    return false;
  }
}

function summarizeLabels(arr) {
  const counts = { bull: 0, bear: 0, idle: 0, invalid: 0 };
  for (const c of arr) {
    const lbl = c && (typeof c.label === 'number' ? c.label : c.label);
    if (lbl === 0) counts.bull++;
    else if (lbl === 1) counts.bear++;
    else if (lbl === 2) counts.idle++;
    else counts.invalid++;
  }
  return counts;
}

function processAllTimeframes() {
  for (const tf of TIMEFRAMES) {
    const found = findFileForTf(tf);
    if (!found) {
      console.warn(`[${tf}] OHLCV file not found in ${OHLCV_JSON_DIR} (tried pair=${PAIR || '<none>'})`);
      continue;
    }
    const filePath = found.path;
    let data;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      data = JSON.parse(raw);
    } catch (e) {
      console.error(`[${tf}] Failed to read or parse ${filePath}:`, e && e.message ? e.message : e);
      continue;
    }
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`[${tf}] No data in file: ${filePath}`);
      continue;
    }

    // Determine epsilon to use for labeling (per-pair override or global)
    const epsilonOverride = resolveEpsilonForPair(PAIR);
    const epsilonReport = epsilonOverride !== undefined ? epsilonOverride : '(module default)';
    console.log(`[${tf}] Labeling ${data.length} candles from ${path.basename(filePath)} (pair=${PAIR || '<none>'}, epsilon=${epsilonReport})`);

    // Label (note: labelCandles returns new array; original items may be returned with .label set)
    const labeled = labelCandles(data, epsilonOverride);

    // Summarize
    const summary = summarizeLabels(labeled);
    console.log(`[${tf}] Label summary: total=${labeled.length} bull=${summary.bull} bear=${summary.bear} idle=${summary.idle} invalid=${summary.invalid}`);

    // Atomic write-back (overwrites original JSON with labeled version)
    const ok = atomicWriteJson(filePath, labeled);
    if (!ok) {
      console.error(`[${tf}] Failed to write labeled file: ${filePath}`);
      continue;
    }
    console.log(`[${tf}] Labeled and saved ${labeled.length} candles to ${filePath}`);
  }
}

// Run once immediately
processAllTimeframes();

// Run at regular intervals
setInterval(processAllTimeframes, MULTI_INTERVAL_MS);
