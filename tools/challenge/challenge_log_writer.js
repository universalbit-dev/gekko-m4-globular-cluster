#!/usr/bin/env node
/**
 * tools/challenge/challenge_log_writer.js
 *
 * Robust, optimized challenge log writer (multi-timeframe)
 * - Reads prediction JSON files under tools/logs/json/ohlcv
 * - Reads model_winner.json to choose the winner label column per timeframe
 * - Writes challenge_{tf}.log (tab-separated) with:
 *     timestamp, prediction_<model>..., entry_price, next_price,
 *     <model>_result..., winner_label, <extra fields...>
 * - Atomic writes: write tmp file then rename
 * - Non-blocking (uses fs.promises), guarded interval (no overlap)
 * - Configurable via environment variables:
 *     CHLOG_INTERVAL_MS    (default: 15*60*1000)
 *     FUTURE_OFFSET        (default: 2)
 *     CHLOG_MODEL_LIST     (comma list, default: tf)
 *     CHLOG_TIMEFRAMES     (comma list, default: 1m,5m,15m,1h)
 *     CHLOG_MAX_ROWS       (limit rows read from prediction file, default: 10000)
 *     CHLOG_NEUTRAL_RESULT ('loss'|'pending', default: 'loss')
 *
 * Improvements:
 * - Normalizes prediction values including 'strong_bull'/'strong_bear' -> 'bull'/'bear'
 * - Consistent column order and atomic writes
 * - Non-overlapping scheduled runs
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const BASE = path.resolve(__dirname);
const LOGS_DIR = path.resolve(BASE, '../logs/json/ohlcv');
const CHALLENGE_LOG_DIR = BASE;
const MODEL_WINNER_FILE = path.resolve(BASE, './model_winner.json');

const CHLOG_INTERVAL_MS = parseInt(process.env.CHLOG_INTERVAL_MS, 10) || 15 * 60 * 1000;
const FUTURE_OFFSET = parseInt(process.env.FUTURE_OFFSET, 10) || 2;
const MODEL_LIST = (process.env.CHLOG_MODEL_LIST || 'convnet,tf')
  .split(',').map(s => s.trim()).filter(Boolean);
const TIMEFRAMES = (process.env.CHLOG_TIMEFRAMES || '1m,5m,15m,1h')
  .split(',').map(s => s.trim()).filter(Boolean);
const CHLOG_MAX_ROWS = parseInt(process.env.CHLOG_MAX_ROWS, 10) || 10000;
const CHLOG_NEUTRAL_RESULT = (process.env.CHLOG_NEUTRAL_RESULT || 'loss').toLowerCase(); // 'loss' or 'pending'

const EXTRA_KEYS = ['open','high','low','close','volume','volatility','priceChange','candleSize','priceChangePct','timestamp'];

// Internal guard to prevent overlapping runs
let _running = false;

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function safeParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

async function ensurePredictionFile(tf) {
  const filePath = path.join(LOGS_DIR, `ohlcv_ccxt_data_${tf}_prediction.json`);
  try {
    await fsp.access(filePath, fs.constants.R_OK);
    return filePath;
  } catch (_) {
    // create minimal file
    try {
      await fsp.mkdir(LOGS_DIR, { recursive: true });
      await fsp.writeFile(filePath, '[]', { encoding: 'utf8' });
      log(`[INFO] Created missing prediction file: ${filePath}`);
      return filePath;
    } catch (err) {
      log(`[ERROR] Failed creating prediction file ${filePath}:`, err && err.message);
      throw err;
    }
  }
}

async function readPredictionSignals(tf) {
  const p = await ensurePredictionFile(tf);
  try {
    const raw = await fsp.readFile(p, 'utf8');
    const arr = safeParseJSON(raw);
    if (!Array.isArray(arr)) return [];
    if (arr.length > CHLOG_MAX_ROWS) {
      // keep only the most recent rows
      return arr.slice(-CHLOG_MAX_ROWS);
    }
    return arr;
  } catch (err) {
    log(`[ERROR] Failed to read/parse prediction file for ${tf}:`, err && err.message);
    return [];
  }
}

async function readModelWinner() {
  try {
    const raw = await fsp.readFile(MODEL_WINNER_FILE, 'utf8');
    const obj = safeParseJSON(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch (err) {
    // missing model_winner.json is not fatal — return empty
    return {};
  }
}

function chooseWinnerLabelColumnForFrame(modelWinnerObj, tf) {
  try {
    const frame = modelWinnerObj && modelWinnerObj[tf];
    if (!frame) return 'ensemble_label';
    // support both enhanced and legacy shapes
    const summary = frame.summary || frame;
    const active = summary.active_model;
    if (active && MODEL_LIST.includes(active)) return `label_${active}`;
    // fall back to ensemble_label
    return 'ensemble_label';
  } catch (e) {
    return 'ensemble_label';
  }
}

function normalizePredictionValue(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).toLowerCase();
  // accept 'strong_bull', 'strong-bull', 'strongbull' -> bull
  if (s.includes('strong') && s.includes('bull')) return 'bull';
  if (s.includes('strong') && s.includes('bear')) return 'bear';
  if (s === 'bull' || s === 'buy' || s === 'long') return 'bull';
  if (s === 'bear' || s === 'sell' || s === 'short') return 'bear';
  if (s === 'idle' || s === 'neutral' || s === '') return 'idle';
  // numeric or other synonyms
  if (s === '1' || s === '0.5') return 'bull';
  if (s === '-1') return 'bear';
  return s;
}

function formatHeader() {
  const preds = MODEL_LIST.map(m => `prediction_${m}`);
  const results = MODEL_LIST.map(m => `${m}_result`);
  const extras = EXTRA_KEYS;
  const headerCols = ['timestamp', ...preds, 'entry_price', 'next_price', ...results, 'winner_label', ...extras];
  return headerCols.join('\t') + '\n';
}

function extractExtraFields(signal) {
  const extras = [];
  for (const key of EXTRA_KEYS) {
    if (Object.prototype.hasOwnProperty.call(signal, key)) {
      extras.push(String(signal[key]));
    } else {
      extras.push('');
    }
  }
  return extras;
}

function determineResultForPrediction(pred, entryPrice, futurePrice) {
  // pred normalized: 'bull'|'bear'|'idle'|null
  if (futurePrice === null || futurePrice === undefined || Number.isNaN(futurePrice)) return 'pending';
  if (pred === 'bull') return (futurePrice > entryPrice) ? 'win' : 'loss';
  if (pred === 'bear') return (futurePrice < entryPrice) ? 'win' : 'loss';
  // idle: treat according to CHLOG_NEUTRAL_RESULT
  if (CHLOG_NEUTRAL_RESULT === 'pending') return 'pending';
  return 'loss';
}

function buildLineFromSignal(signal, futureSignal, winnerLabelCol) {
  // timestamp: prefer signal.timestamp, otherwise timestamp_extra, otherwise ''
  const timestamp = (signal.timestamp ?? signal.timestamp_extra ?? '') + '';
  const entryPrice = Number(signal.close ?? signal.price ?? signal.entry_price ?? NaN);
  const futurePrice = futureSignal ? Number(futureSignal.close ?? futureSignal.price ?? futureSignal.next_price ?? NaN) : null;

  // normalize predictions for each model
  const preds = MODEL_LIST.map(m => normalizePredictionValue(signal[`prediction_${m}`] ?? signal[`prediction_${m}`]));
  const results = MODEL_LIST.map((m, idx) => determineResultForPrediction(preds[idx], entryPrice, futurePrice));

  const winnerLabelValue = signal[winnerLabelCol] ?? signal.ensemble_label ?? '';

  const extras = extractExtraFields(signal);

  // next_price: if futurePrice exists, use it; otherwise use entryPrice
  const nextPriceVal = (futurePrice !== null && !Number.isNaN(futurePrice)) ? futurePrice : (Number.isFinite(entryPrice) ? entryPrice : '');
  const entryPriceVal = Number.isFinite(entryPrice) ? entryPrice : '';

  const cols = [
    timestamp,
    ...preds.map(p => p === null ? '' : p),
    entryPriceVal,
    nextPriceVal,
    ...results,
    winnerLabelValue,
    ...extras
  ];

  return cols.join('\t') + '\n';
}

async function writeChallengeFileAtomic(tf, header, lines) {
  const dest = path.join(CHALLENGE_LOG_DIR, `challenge_${tf}.log`);
  const tmp = `${dest}.tmp`;
  try {
    await fsp.writeFile(tmp, header + lines.join(''), { encoding: 'utf8' });
    await fsp.rename(tmp, dest);
    log(`[LOG][${tf}] challenge_${tf}.log updated (${lines.length} rows)`);
  } catch (err) {
    log(`[ERROR] Failed to write challenge file ${dest}:`, err && err.message);
    try { await fsp.unlink(tmp).catch(() => {}); } catch (_) {}
  }
}

async function writeChallengeForFrame(tf, modelWinnerObj) {
  try {
    const signals = await readPredictionSignals(tf);
    const header = formatHeader();

    if (!signals || signals.length === 0) {
      // write header only
      await writeChallengeFileAtomic(tf, header, []);
      return;
    }

    const winnerLabelCol = chooseWinnerLabelColumnForFrame(modelWinnerObj, tf);

    // Build lines; use FUTURE_OFFSET to determine futurePrice
    const lines = [];
    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i] || {};
      const futureSignal = (i + FUTURE_OFFSET < signals.length) ? signals[i + FUTURE_OFFSET] : null;
      lines.push(buildLineFromSignal(signal, futureSignal, winnerLabelCol));
    }

    await writeChallengeFileAtomic(tf, header, lines);
  } catch (err) {
    log(`[ERROR] writeChallengeForFrame(${tf}) failed:`, err && err.message);
  }
}

async function runOnce() {
  if (_running) {
    log('[WARN] Previous run still in progress, skipping this iteration.');
    return;
  }
  _running = true;
  try {
    const modelWinnerObj = await readModelWinner();
    // parallel writing per timeframe (bounded)
    const tasks = TIMEFRAMES.map(tf => writeChallengeForFrame(tf, modelWinnerObj));
    await Promise.all(tasks);
  } catch (err) {
    log('[ERROR] runOnce failed:', err && err.message);
  } finally {
    _running = false;
  }
}

async function main() {
  // initial ensure files exist
  for (const tf of TIMEFRAMES) {
    try { await ensurePredictionFile(tf); } catch (_) {}
  }

  // initial run
  await runOnce();

  // schedule periodic runs (guard ensures no overlap)
  setInterval(() => {
    runOnce().catch(err => log('[ERROR] scheduled run error:', err && err.message));
  }, CHLOG_INTERVAL_MS);
}

main().catch(err => {
  log('[FATAL] challenge_log_writer_multiframe crashed:', err && err.stack ? err.stack : err && err.message);
  process.exit(1);
});
