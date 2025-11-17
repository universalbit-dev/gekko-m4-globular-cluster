#!/usr/bin/env node
/**
 * explorer.js
 * Improved OHLCV fetcher with validation, atomic writes, and winston logging.
 *
 * - Validates/sanitizes each OHLCV row before storing.
 * - Atomic writes: write to tmp file then rename into place to avoid partial JSON files.
 * - JSONL fallback loader and corrupt-file backups (BAD_DIR).
 * - Uses winston logger (console + rolling file).
 *
 * Usage:
 *   node explorer.js
 *   node explorer.js clean
 */
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const ccxt = require('ccxt');
const os = require('os');
const winston = require('winston');

// --- Config ---
const DATA_DIR = path.resolve(__dirname, './logs/json/ohlcv');
const BAD_DIR = path.resolve(__dirname, './logs/json/ohlcv/bad');
const LOG_DIR = path.resolve(__dirname, './logs');
const EXCHANGE_NAME = process.env.EXCHANGE || 'kraken';
const PAIR = process.env.PAIR || 'BTC/EUR';
const TIMEFRAMES = (process.env.OHLCV_CANDLE_SIZE || '1m,5m,15m,1h').split(',').map(s => s.trim()).filter(Boolean);
const FETCH_LIMIT = parseInt(process.env.FETCH_LIMIT || '200', 10);
const MAX_FILE_ENTRIES = parseInt(process.env.MAX_OHLCV_FILE_ENTRIES || '50000', 10); // optional cap

// Ensure directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BAD_DIR, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

// --- Winston logger setup ---
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} [Explorer] ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console({ stderrLevels: ['error', 'warn'] }),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'explorer.log'), maxsize: 5 * 1024 * 1024 })
  ]
});

function info(...args) { logger.info(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')); }
function warn(...args) { logger.warn(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')); }
function error(...args) { logger.error(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')); }
function debug(...args) { if (process.env.DEBUG) logger.debug(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')); }

// --- Helpers: Validation & Sanitization ---
function sanitizeRow(rawRow) {
  if (!rawRow || typeof rawRow !== 'object') return null;
  // create shallow copy
  const r = Object.assign({}, rawRow);
  // coerce numeric strings to numbers
  ['timestamp','open','high','low','close','volume'].forEach(k=>{
    if (r[k] !== undefined && r[k] !== null && typeof r[k] === 'string' && r[k].trim() !== '') {
      const n = Number(r[k]);
      if (!Number.isNaN(n)) r[k] = n;
    }
  });
  // canonical keys
  r.symbol = r.symbol || PAIR;
  r.exchange = r.exchange || EXCHANGE_NAME;
  r.ohlcvCandleSize = r.ohlcvCandleSize || r.source_timeframe || r.timeframe || null;
  return r;
}

function validateOhlcvRow(row) {
  // Required fields: symbol, exchange, timestamp (number), open, high, low, close, volume (numbers)
  if (!row || typeof row !== 'object') return { ok: false, reason: 'missing_row' };
  const req = ['symbol','exchange','timestamp','open','high','low','close','volume','ohlcvCandleSize'];
  for (const k of req) {
    if (row[k] === undefined || row[k] === null) return { ok: false, reason: `missing_${k}` };
  }
  // numeric checks
  const nums = ['timestamp','open','high','low','close','volume'];
  for (const k of nums) {
    if (typeof row[k] !== 'number' || Number.isNaN(row[k])) return { ok: false, reason: `invalid_number_${k}` };
  }
  // timestamp sanity: not in the far past/future (allow some slack)
  const now = Date.now();
  if (row.timestamp < 1000000000000) {
    // If timestamp looks like seconds (10-digit), convert it to ms
    if (row.timestamp < 1e11) row.timestamp = row.timestamp * 1000;
  }
  if (row.timestamp < now - 1000 * 60 * 60 * 24 * 365 * 5) return { ok: false, reason: 'timestamp_too_old' };
  if (row.timestamp > now + 1000 * 60 * 60 * 24) return { ok: false, reason: 'timestamp_in_future' };
  // OHLC logical checks
  if (row.low > row.high) return { ok: false, reason: 'low_gt_high' };
  if (row.open > row.high || row.open < row.low) return { ok: false, reason: 'open_out_of_range' };
  if (row.close > row.high || row.close < row.low) return { ok: false, reason: 'close_out_of_range' };
  if (row.volume < 0) return { ok: false, reason: 'negative_volume' };
  if (!row.ohlcvCandleSize) return { ok: false, reason: 'missing_timeframe' };
  return { ok: true, reason: null, row };
}

// --- Robust JSON load/save utilities ---
function safeLoadJsonArray(fp) {
  try {
    if (!fs.existsSync(fp)) return [];
    const raw = fs.readFileSync(fp, 'utf8');
    if (!raw || !raw.trim()) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      // Try JSONL: each non-empty line is JSON
      const lines = raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
      if (lines.length) {
        const parsed = [];
        let allOk = true;
        for (const l of lines) {
          try { parsed.push(JSON.parse(l)); } catch (err) { allOk = false; break; }
        }
        if (allOk) {
          info(`safeLoadJsonArray parsed ${path.basename(fp)} as JSONL`);
          return parsed;
        }
      }
      // Attempt light cleaning
      let cleaned = raw.replace(/[^\x09\x0A\x0D\x20-\x7E]/g,'');
      try { return JSON.parse(cleaned); } catch (_) {}
      // Try to extract first {...} or [...] substring
      const m = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/m);
      if (m && m[1]) {
        try { return JSON.parse(m[1]); } catch (_) {}
      }
      // Could not parse: backup file to BAD_DIR and return []
      try {
        const bak = path.join(BAD_DIR, path.basename(fp) + '.corrupt.' + Date.now() + '.bak');
        fs.writeFileSync(bak, raw, 'utf8');
        warn(`safeLoadJsonArray: backed up corrupt file to ${bak}`);
      } catch (e) { warn('safeLoadJsonArray: failed to create backup of corrupt file', e && e.message); }
      return [];
    }
  } catch (e) {
    warn('safeLoadJsonArray unexpected error', e && e.message ? e.message : e);
    return [];
  }
}

function atomicWriteJson(fp, arr) {
  try {
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = fp + '.tmp.' + process.pid + '.' + Date.now();
    fs.writeFileSync(tmp, JSON.stringify(arr, null, 2), 'utf8');
    fs.renameSync(tmp, fp);
    debug(`atomicWriteJson wrote ${fp} entries=${arr.length}`);
  } catch (e) {
    error('atomicWriteJson failed for', fp, e && e.message ? e.message : e);
    // cleanup tmp if present
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    throw e;
  }
}

// dedupe helper (same semantics as original)
function dedup(arr) {
  const seen = new Set();
  return arr.filter(row => {
    const key = [row.symbol, row.exchange, row.ohlcvCandleSize, row.timestamp].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Main fetch/update routine ---
async function fetchAndUpdateOHLCV() {
  const MULTI_FILE = path.join(DATA_DIR, 'ohlcv_ccxt_data.json');

  // Load multi and per-TF arrays using tolerant loader
  let multi = safeLoadJsonArray(MULTI_FILE);

  let exchange;
  try {
    exchange = new ccxt[EXCHANGE_NAME]({ enableRateLimit: true });
    await exchange.loadMarkets();
  } catch (err) {
    error(`Exchange "${EXCHANGE_NAME}" error: ${err && err.message ? err.message : err}`);
    return;
  }

  await Promise.all(TIMEFRAMES.map(async (tf) => {
    const tfFile = path.join(DATA_DIR, `ohlcv_ccxt_data_${tf}.json`);
    let tfArr = safeLoadJsonArray(tfFile);

    // compute latest timestamps
    const lastTsMulti = multi.filter(row => row.symbol === PAIR && row.ohlcvCandleSize === tf && row.exchange === EXCHANGE_NAME)
      .map(r => r.timestamp).sort((a,b)=>b-a)[0] || 0;
    const lastTsTF = tfArr.filter(row => row.symbol === PAIR && row.ohlcvCandleSize === tf && row.exchange === EXCHANGE_NAME)
      .map(r => r.timestamp).sort((a,b)=>b-a)[0] || 0;
    const since = (Math.max(lastTsMulti, lastTsTF) || 0) ? Math.max(lastTsMulti, lastTsTF) + 1 : undefined;

    let newRows = [];
    try {
      const candles = await exchange.fetchOHLCV(PAIR, tf, since, FETCH_LIMIT);
      // Map CCXT candle to row objects
      newRows = candles.map(([timestamp, open, high, low, close, volume]) => ({
        symbol: PAIR,
        exchange: EXCHANGE_NAME,
        timestamp,
        open, high, low, close, volume,
        ohlcvCandleSize: tf,
        source_timeframe: tf
      }));

      // sanitize & validate rows; collect accepted rows and log rejected
      const accepted = [];
      for (let i = 0; i < newRows.length; i++) {
        const raw = newRows[i];
        const s = sanitizeRow(raw);
        const v = validateOhlcvRow(s);
        if (!v.ok) {
          warn(`[${tf}] rejected row ts=${raw.timestamp} reason=${v.reason}`);
          // optional: save rejected sample for later inspection
          try {
            const badFile = path.join(BAD_DIR, `rejected_${tf}_${raw.timestamp}_${Date.now()}.json`);
            fs.writeFileSync(badFile, JSON.stringify({ raw, reason: v.reason }, null, 2));
          } catch (e) {}
          continue;
        }
        accepted.push(v.row);
      }

      if (accepted.length > 0) {
        // merge into multi and tfArr
        multi.push(...accepted);
        tfArr.push(...accepted);

        // deduplicate and optionally trim to MAX_FILE_ENTRIES
        multi = dedup(multi);
        tfArr = dedup(tfArr);

        if (MAX_FILE_ENTRIES && multi.length > MAX_FILE_ENTRIES) {
          // keep most recent entries
          multi.sort((a,b)=>b.timestamp - a.timestamp);
          multi = multi.slice(0, MAX_FILE_ENTRIES).reverse();
        }
        if (MAX_FILE_ENTRIES && tfArr.length > MAX_FILE_ENTRIES) {
          tfArr.sort((a,b)=>b.timestamp - a.timestamp);
          tfArr = tfArr.slice(0, MAX_FILE_ENTRIES).reverse();
        }

        // atomic writes
        atomicWriteJson(MULTI_FILE, multi);
        atomicWriteJson(tfFile, tfArr);

        info(`Appended ${accepted.length} new rows for ${PAIR} [${tf}] to multi/single files (${EXCHANGE_NAME})`);
      } else {
        info(`No accepted new rows for ${PAIR} [${tf}] from ${EXCHANGE_NAME}`);
      }
    } catch (err) {
      if (err instanceof ccxt.NetworkError || err instanceof ccxt.ExchangeNotAvailable) {
        warn(`[${tf}] Network error, will retry next cycle: ${err.message}`);
      } else if (err instanceof ccxt.DDoSProtection) {
        warn(`[${tf}] DDoS Protection/Rate limit: ${err.message}`);
      } else {
        error(`[${tf}] Fetch error: ${err && err.message ? err.message : err}`);
      }
    }
  }));
}

// --- CLEAN MODE ---
if (process.argv[2] === 'clean') {
  const files = fs.readdirSync(DATA_DIR).filter(f => /^ohlcv_ccxt_data.*\.json$/.test(f)).map(f => path.join(DATA_DIR, f));
  if (files.length === 0) {
    info('No OHLCV data files found to clean.');
    process.exit(0);
  }
  for (const file of files) {
    try {
      atomicWriteJson(file, []);
      info(`Cleaned file: ${file}`);
    } catch (err) {
      error(`Error cleaning file: ${file} ${err && err.message ? err.message : err}`);
    }
  }
  info('All OHLCV files reset to empty arrays.');
  process.exit(0);
}

// --- Run fetch/update once and schedule ---
fetchAndUpdateOHLCV().catch(e => error('Initial fetchAndUpdateOHLCV failed', e && e.message ? e.message : e));
setInterval(() => {
  fetchAndUpdateOHLCV().catch(e => error('Scheduled fetchAndUpdateOHLCV failed', e && e.message ? e.message : e));
}, 120 * 1000);
