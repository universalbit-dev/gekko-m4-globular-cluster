#!/usr/bin/env node
'use strict';
/**
 * tools/explorer.js
 *
 * OHLCV fetcher — multi-timeframe, atomic writes, validation, winston logging.
 *
 * Fixes vs previous version:
 *  1. `tmp` declared with `let` before try{} — no ReferenceError in catch
 *  2. Sequential per-TF loop (not Promise.all) — no concurrent mutation of `multi`
 *  3. `JSON.stringify(arr)` compact — ~40% smaller files, faster writes/reads
 *  4. PAIR fallback chain: PAIR → MACRO_PAIR → SYMBOL → fail fast
 *  5. Exchange reused across TFs (one loadMarkets() per cycle)
 *  6. `multi` written once after all TFs processed (not once per TF)
 *  7. setInterval with no .unref() — keeps Node alive in PM2 fork mode
 *  8. SIGINT/SIGTERM handlers for clean shutdown
 *  9. Stale .tmp files cleaned on startup
 * 10. Rejected-row file writes are rate-limited (max 1/ts to avoid BAD_DIR flood)
 *
 * Usage:
 *   node explorer.js          — run continuously (120s interval)
 *   node explorer.js clean    — reset all OHLCV files to []
 */

// ─── Process guards ────────────────────────────────────────────────────────
process.on('uncaughtException',  e => console.error('[explorer] uncaughtException',  e?.stack ?? e));
process.on('unhandledRejection', r => console.error('[explorer] unhandledRejection', r?.stack ?? r));

const path    = require('path');
const fs      = require('fs');
const ccxt    = require('ccxt');
const winston = require('winston');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ─── Paths ─────────────────────────────────────────────────────────────────
const DATA_DIR = path.resolve(__dirname, 'logs/json/ohlcv');
const BAD_DIR  = path.resolve(__dirname, 'logs/json/ohlcv/bad');
const LOG_DIR  = path.resolve(__dirname, 'logs');

for (const d of [DATA_DIR, BAD_DIR, LOG_DIR]) fs.mkdirSync(d, { recursive: true });

// ─── Configuration ─────────────────────────────────────────────────────────
const EXCHANGE_NAME    = process.env.EXCHANGE         || 'kraken';
const TIMEFRAMES       = (process.env.OHLCV_CANDLE_SIZE || '1m,5m,15m,1h').split(',').map(s => s.trim()).filter(Boolean);
const FETCH_LIMIT      = parseInt(process.env.FETCH_LIMIT              || '200',   10);
const MAX_FILE_ENTRIES = parseInt(process.env.MAX_OHLCV_FILE_ENTRIES   || '50000', 10);
const FETCH_INTERVAL   = parseInt(process.env.EXPLORER_INTERVAL_MS     || '120000', 10);
const MULTI_FILE       = path.join(DATA_DIR, 'ohlcv_ccxt_data.json');

const PAIR = process.env.PAIR || process.env.MACRO_PAIR || process.env.SYMBOL || null;
if (!PAIR) {
  console.error('[explorer] FATAL: PAIR / MACRO_PAIR / SYMBOL env var is required. Set it in .env');
  process.exit(1);
}

// ─── Logger ────────────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) =>
      `${timestamp} [Explorer] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [
    new winston.transports.Console({ stderrLevels: ['error', 'warn'] }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'explorer.log'),
      maxsize:  5 * 1024 * 1024,
      maxFiles: 3,
      tailable: true,
    }),
  ],
});

const fmt  = (...a) => a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ');
const info  = (...a) => logger.info(fmt(...a));
const warn  = (...a) => logger.warn(fmt(...a));
const loge  = (...a) => logger.error(fmt(...a));
const debug = (...a) => { if (process.env.DEBUG) logger.debug(fmt(...a)); };

// ─── Stale tmp cleanup ─────────────────────────────────────────────────────
// Remove any .tmp.* files left by a previous crashed run
try {
  fs.readdirSync(DATA_DIR)
    .filter(f => f.includes('.tmp.'))
    .forEach(f => { try { fs.unlinkSync(path.join(DATA_DIR, f)); } catch (_) {} });
} catch (_) {}

// ─── Sanitize & validate ───────────────────────────────────────────────────
function sanitizeRow(raw, tf) {
  if (!raw || typeof raw !== 'object') return null;
  const r = { ...raw };
  for (const k of ['timestamp','open','high','low','close','volume']) {
    if (typeof r[k] === 'string' && r[k].trim() !== '') {
      const n = Number(r[k]);
      if (!Number.isNaN(n)) r[k] = n;
    }
  }
  r.symbol          = r.symbol   || PAIR;
  r.exchange        = r.exchange || EXCHANGE_NAME;
  r.ohlcvCandleSize = r.ohlcvCandleSize || r.source_timeframe || r.timeframe || tf || null;
  return r;
}

function validateRow(row) {
  if (!row || typeof row !== 'object') return 'missing_row';
  for (const k of ['symbol','exchange','timestamp','open','high','low','close','volume','ohlcvCandleSize']) {
    if (row[k] == null) return `missing_${k}`;
  }
  for (const k of ['timestamp','open','high','low','close','volume']) {
    if (typeof row[k] !== 'number' || !Number.isFinite(row[k])) return `invalid_${k}`;
  }
  // Convert seconds → ms if needed
  if (row.timestamp < 1e11) row.timestamp *= 1000;
  const now = Date.now();
  if (row.timestamp < now - 5 * 365 * 24 * 3_600_000) return 'timestamp_too_old';
  if (row.timestamp > now +       24 * 3_600_000)      return 'timestamp_in_future';
  if (row.low  > row.high)                             return 'low_gt_high';
  if (row.open  > row.high || row.open  < row.low)     return 'open_out_of_range';
  if (row.close > row.high || row.close < row.low)     return 'close_out_of_range';
  if (row.volume < 0)                                  return 'negative_volume';
  return null; // ok
}

// ─── File helpers ──────────────────────────────────────────────────────────
function safeLoadJsonArray(fp) {
  try {
    if (!fs.existsSync(fp)) return [];
    const raw = fs.readFileSync(fp, 'utf8');
    if (!raw?.trim()) return [];

    // Fast path: valid JSON array
    try { return JSON.parse(raw); } catch (_) {}

    // JSONL fallback
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length) {
      const parsed = [];
      let ok = true;
      for (const l of lines) {
        try { parsed.push(JSON.parse(l)); }
        catch (_) { ok = false; break; }
      }
      if (ok && parsed.length) {
        info(`safeLoadJsonArray: parsed ${path.basename(fp)} as JSONL (${parsed.length} lines)`);
        return parsed;
      }
    }

    // Light ASCII cleaning
    const cleaned = raw.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
    try { return JSON.parse(cleaned); } catch (_) {}

    // Extract first array/object substring
    const m = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/m);
    if (m?.[1]) { try { return JSON.parse(m[1]); } catch (_) {} }

    // Backup corrupt file
    const bak = path.join(BAD_DIR, `${path.basename(fp)}.corrupt.${Date.now()}.bak`);
    try { fs.writeFileSync(bak, raw, 'utf8'); warn(`Backed up corrupt file → ${bak}`); } catch (_) {}
    return [];

  } catch (e) { warn('safeLoadJsonArray error:', e?.message); return []; }
}

function atomicWriteJson(fp, arr) {
  let tmp;
  try {
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    tmp = `${fp}.tmp.${process.pid}.${Date.now()}`;
    // FIX 3 — compact JSON (no pretty-print)
    fs.writeFileSync(tmp, JSON.stringify(arr), 'utf8');
    fs.renameSync(tmp, fp);
    debug(`wrote ${path.relative(DATA_DIR, fp)} entries=${arr.length}`);
  } catch (e) {
    loge('atomicWriteJson failed:', fp, e?.message);
    try { if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    throw e;
  }
}

function dedup(arr) {
  const seen = new Set();
  return arr.filter(r => {
    const k = `${r.symbol}|${r.exchange}|${r.ohlcvCandleSize}|${r.timestamp}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function trimToMax(arr) {
  if (!MAX_FILE_ENTRIES || arr.length <= MAX_FILE_ENTRIES) return arr;
  arr.sort((a, b) => a.timestamp - b.timestamp);
  return arr.slice(-MAX_FILE_ENTRIES);
}

// ─── Rejected-row writer (rate-limited: one file per unique ts+tf) ─────────
const _badWritten = new Set();
function writeBadRow(tf, raw, reason) {
  const key = `${tf}_${raw.timestamp}`;
  if (_badWritten.has(key)) return;
  _badWritten.add(key);
  // Evict oldest entries to prevent unbounded growth
  if (_badWritten.size > 1000) {
    const first = _badWritten.values().next().value;
    _badWritten.delete(first);
  }
  try {
    const fp = path.join(BAD_DIR, `rejected_${key}_${Date.now()}.json`);
    fs.writeFileSync(fp, JSON.stringify({ raw, reason }, null, 2));
  } catch (_) {}
}

// ─── Main fetch/update ───────────────────
let _exchange = null;

async function getExchange() {
  if (_exchange?.markets && Object.keys(_exchange.markets).length > 0) return _exchange;
  try {
    _exchange = new ccxt[EXCHANGE_NAME]({ enableRateLimit: true });
    await _exchange.loadMarkets();
    info(`Markets loaded (${EXCHANGE_NAME}, ${Object.keys(_exchange.markets).length} pairs)`);
    return _exchange;
  } catch (e) {
    loge(`Exchange init failed (${EXCHANGE_NAME}):`, e?.message);
    _exchange = null;
    return null;
  }
}

async function fetchAndUpdateOHLCV() {
  const exchange = await getExchange();
  if (!exchange) return;

  // Load multi once at start of cycle
  let multi      = safeLoadJsonArray(MULTI_FILE);
  let multiDirty = false;

  for (const tf of TIMEFRAMES) {
    const tfFile = path.join(DATA_DIR, `ohlcv_ccxt_data_${tf}.json`);
    let   tfArr  = safeLoadJsonArray(tfFile);

    // Latest known timestamp per TF (check both multi and per-TF file)
    const lastTs = Math.max(
      tfArr .filter(r => r.ohlcvCandleSize === tf).reduce((m, r) => Math.max(m, r.timestamp), 0),
      multi .filter(r => r.ohlcvCandleSize === tf).reduce((m, r) => Math.max(m, r.timestamp), 0),
    );
    const since = lastTs > 0 ? lastTs + 1 : undefined;

    try {
      const candles = await exchange.fetchOHLCV(PAIR, tf, since, FETCH_LIMIT);
      const accepted = [];

      for (const [timestamp, open, high, low, close, volume] of candles) {
        const raw    = { symbol: PAIR, exchange: EXCHANGE_NAME, timestamp, open, high, low, close, volume,
                         ohlcvCandleSize: tf, source_timeframe: tf };
        const clean  = sanitizeRow(raw, tf);
        const reason = validateRow(clean);
        if (reason) {
          warn(`[${tf}] rejected ts=${timestamp} reason=${reason}`);
          writeBadRow(tf, raw, reason);
          continue;
        }
        accepted.push(clean);
      }

      if (accepted.length > 0) {
        tfArr = trimToMax(dedup([...tfArr, ...accepted]));
        atomicWriteJson(tfFile, tfArr);

        multi.push(...accepted);
        multiDirty = true;
        info(`[${tf}] +${accepted.length} rows → ${tfArr.length} total`);
      } else {
        debug(`[${tf}] no new rows`);
      }

    } catch (e) {
      if (e instanceof ccxt.NetworkError || e instanceof ccxt.ExchangeNotAvailable)
        warn(`[${tf}] network error (retry next cycle): ${e.message}`);
      else if (e instanceof ccxt.DDoSProtection)
        warn(`[${tf}] rate limit: ${e.message}`);
      else if (e instanceof ccxt.AuthenticationError)
        loge(`[${tf}] auth error — check API keys: ${e.message}`);
      else
        loge(`[${tf}] fetch error: ${e?.message ?? e}`);
    }
  }

  if (multiDirty) {
    multi = trimToMax(dedup(multi));
    atomicWriteJson(MULTI_FILE, multi);
    info(`multi updated → ${multi.length} total rows`);
  }
}

// ─── Clean mode ────────────────────────────────────────────────────────────
if (process.argv[2] === 'clean') {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => /^ohlcv_ccxt_data.*\.json$/.test(f) && !f.includes('.tmp.'))
    .map(f => path.join(DATA_DIR, f));

  if (!files.length) { info('No OHLCV files to clean.'); process.exit(0); }
  for (const fp of files) {
    try { atomicWriteJson(fp, []); info(`Cleaned: ${path.relative(DATA_DIR, fp)}`); }
    catch (e) { loge(`Clean failed: ${fp}`, e?.message); }
  }
  info('All OHLCV files reset to [].'); process.exit(0);
}

// ─── Run loop ──────────────────────────────────────────────────────────────
info(`Starting explorer — exchange=${EXCHANGE_NAME} pair=${PAIR} TFs=${TIMEFRAMES.join(',')} interval=${FETCH_INTERVAL}ms`);

// Initial run immediately, then on interval
fetchAndUpdateOHLCV().catch(e => loge('Initial fetch failed:', e?.message ?? e));
const _timer = setInterval(
  () => fetchAndUpdateOHLCV().catch(e => loge('Scheduled fetch failed:', e?.message ?? e)),
  FETCH_INTERVAL
);

function shutdown(sig) {
  info(`${sig} received — shutting down`);
  clearInterval(_timer);
  logger.end(() => process.exit(0));
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
