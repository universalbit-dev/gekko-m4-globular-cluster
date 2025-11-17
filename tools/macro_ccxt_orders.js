#!/usr/bin/env node
/**
 * tools/macro_ccxt_orders.js
 *
 * Optimized macrostructure — DRY_RUN-first, index/backtest-aware, safer
 *
 * This variant uses winston for log management and limits log growth via file rotation
 * (maxsize + maxFiles). Environment variables control log path, max size and file count.
 *
 * New env variables:
 *  - MACRO_LOG_PATH        path to the rotating log file (default ./tools/logs/macro_ccxt_orders.log)
 *  - MACRO_LOG_MAXSIZE     max bytes per file before rotation (default 5*1024*1024)
 *  - MACRO_LOG_MAXFILES    number of rotated files to keep (default 5)
 *  - MACRO_LOG_LEVEL       log level (info/debug)
 *
 * Keep FORCE_DRY=1 and DRY_RUN=1 in .env for safe testing.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ---- Logging (winston rotating file) ----
let logger;
const DEFAULT_LOG_PATH = process.env.MACRO_LOG_PATH || path.resolve(__dirname, './logs/macro_ccxt_orders.log');
const LOG_MAXSIZE = Number(process.env.MACRO_LOG_MAXSIZE || String(5 * 1024 * 1024)); // bytes
const LOG_MAXFILES = Number(process.env.MACRO_LOG_MAXFILES || '5');
const LOG_LEVEL = process.env.MACRO_LOG_LEVEL || (process.env.DEBUG === '1' ? 'debug' : 'info');

try {
  const winston = require('winston');
  const { combine, timestamp, printf, colorize } = winston.format;
  const logFormat = printf(({ level, message, timestamp }) => `${timestamp} [macrostructure] ${level}: ${message}`);
  // Ensure log directory exists
  try { fs.mkdirSync(path.dirname(DEFAULT_LOG_PATH), { recursive: true }); } catch (e) {}
  const transports = [
    new winston.transports.File({
      filename: DEFAULT_LOG_PATH,
      level: LOG_LEVEL,
      maxsize: LOG_MAXSIZE,
      maxFiles: LOG_MAXFILES,
      tailable: true,
      format: combine(timestamp(), logFormat)
    }),
    new winston.transports.Console({
      level: LOG_LEVEL,
      format: combine(colorize(), timestamp(), logFormat)
    })
  ];
  logger = winston.createLogger({ level: LOG_LEVEL, transports, exitOnError: false });
} catch (e) {
  // fallback to console
  logger = {
    debug: (...a) => { if (LOG_LEVEL === 'debug') console.debug('[macrostructure][DEBUG]', ...a); },
    info:  (...a) => console.log('[macrostructure][INFO]', ...a),
    warn:  (...a) => console.warn('[macrostructure][WARN]', ...a),
    error: (...a) => console.error('[macrostructure][ERROR]', ...a)
  };
}

// ---- Config (env overrides) ----
const TIMEFRAMES = (process.env.MACRO_TIMEFRAMES || '1m,5m,15m,1h').split(',').map(s => s.trim()).filter(Boolean);
const PAIR = process.env.MACRO_PAIR || process.env.PAIR || 'BTC/EUR';
const ORDER_AMOUNT = Number(process.env.ORDER_AMOUNT || '0.0001');
const MIN_ALLOWED_ORDER_AMOUNT = Number(process.env.MIN_ALLOWED_ORDER_AMOUNT || '0.00005');
const MAX_ORDER_AMOUNT = Number(process.env.MAX_ORDER_AMOUNT || '0.01');

const INTERVAL_AFTER_TRADE = Number(process.env.INTERVAL_AFTER_TRADE || 30 * 1000);
const INTERVAL_AFTER_SKIP = Number(process.env.INTERVAL_AFTER_SKIP || 90 * 1000);
const INTERVAL_AFTER_HOLD = Number(process.env.INTERVAL_AFTER_HOLD || 180 * 1000);
const INTERVAL_AFTER_ERROR = Number(process.env.INTERVAL_AFTER_ERROR || 60 * 1000);

const EXCHANGE = process.env.MACRO_EXCHANGE || 'kraken';
const API_KEY = process.env.MACRO_KEY || '';
const API_SECRET = process.env.MACRO_SECRET || '';

const BACKTEST_RESULTS_PATH = process.env.MACRO_BACKTEST_JSON_PATH
  ? path.resolve(process.env.MACRO_BACKTEST_JSON_PATH)
  : path.resolve(__dirname, './backtest/backtest_results.json');

const MACRO_SIGNAL_LOG = path.resolve(__dirname, './logs/macro_signal.log');
const ORDER_LOG_PATH = path.resolve(__dirname, './logs/macro_ccxt_orders.log');
const ORDER_AUDIT_JSONL = path.resolve(__dirname, './logs/macro_ccxt_orders_audit.jsonl');
const DIAG_PATH = path.resolve(__dirname, './logs/macro_diagnostics.json');


const DEBUG = /^(1|true|yes)$/i.test(String(process.env.DEBUG || '0'));
const DRY_RUN = /^(1|true|yes)$/i.test(String(process.env.DRY_RUN || '1')); // default simulation
const FORCE_DRY = /^(1|true|yes)$/i.test(String(process.env.FORCE_DRY || '1'));
const ENABLE_LIVE = /^(1|true|yes)$/i.test(String(process.env.ENABLE_LIVE || '0'));

const SIM_PRICE = Number(process.env.SIM_PRICE || 30000);
const SIM_BASE_BALANCE = Number(process.env.SIM_BASE_BALANCE || 0.01);
const SIM_QUOTE_BALANCE = Number(process.env.SIM_QUOTE_BALANCE || 1000);

const MACRO_MIN_WIN_RATE = Number(process.env.MACRO_MIN_WIN_RATE || 0.2);
const HOLD_LOG_COOLDOWN_MS = Number(process.env.HOLD_LOG_COOLDOWN_MS || 5 * 60 * 1000);

const DRY_INTERVAL_MS = Number(process.env.DRY_INTERVAL_MS || 15 * 1000);
const NOMINAL_INTERVAL_MS = Number(process.env.MACRO_INTERVAL_MS || 180 * 1000);
const INTERVAL_MS = DRY_RUN ? DRY_INTERVAL_MS : NOMINAL_INTERVAL_MS;

// ---- Runtime state ----
let isRunning = false;
let positionOpen = false;
let lastTradeAt = 0;
let diagnostics = { cycles: 0, lastError: null, lastTrade: null, _lastLoggedAction: null, _lastHoldLoggedAt: 0 };

// ---- I/O helpers ----
function safeJsonRead(fp, fallback = null) {
  try {
    if (!fp || !fs.existsSync(fp)) return fallback;
    const txt = fs.readFileSync(fp, 'utf8');
    if (!txt || !txt.trim()) return fallback;
    return JSON.parse(txt);
  } catch (e) {
    if (DEBUG) logger.warn('safeJsonRead parse error', fp, e && e.message ? e.message : e);
    return fallback;
  }
}
function safeJsonWrite(fp, obj) {
  try {
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(obj, null, 2));
  } catch (e) {
    if (DEBUG) logger.warn('safeJsonWrite failed', fp, e && e.message ? e.message : e);
  }
}

// Append tab-separated legacy log
function appendOrderLog(parts) {
  try {
    fs.mkdirSync(path.dirname(ORDER_TAB_LOG), { recursive: true });
    fs.appendFileSync(ORDER_TAB_LOG, parts.join('\t') + '\n');
  } catch (e) { logger.warn('appendOrderLog failed', e && e.message ? e.message : e); }
}
// Append JSONL audit
function appendAuditJson(obj) {
  try {
    fs.mkdirSync(path.dirname(ORDER_AUDIT_JSONL), { recursive: true });
    fs.appendFileSync(ORDER_AUDIT_JSONL, JSON.stringify(obj) + '\n');
  } catch (e) { logger.warn('appendAuditJson failed', e && e.message ? e.message : e); }
}

function logOrder({ timestamp, action, result = null, reason = '', error = null, regime = '', stats = null, signal = null, dry = true }) {
  const line = [
    new Date().toISOString(),
    timestamp || '',
    action || '',
    error ? `ERROR: ${String(error)}` : (dry ? 'DRY' : 'LIVE'),
    error ? '' : JSON.stringify(result || {}),
    reason || '',
    regime || '',
    stats ? JSON.stringify(stats) : '',
    signal ? JSON.stringify(signal) : '',
    diagnostics ? JSON.stringify({ lastTrade: diagnostics.lastTrade, cycles: diagnostics.cycles }) : ''
  ];
  appendOrderLog(line);

  const audit = {
    iso: new Date().toISOString(),
    timestamp: timestamp || Date.now(),
    pair: PAIR,
    action,
    mode: dry ? 'DRY' : 'LIVE',
    reason,
    regime,
    stats,
    signal,
    result,
    diagnostics: { lastTrade: diagnostics.lastTrade, cycles: diagnostics.cycles }
  };
  appendAuditJson(audit);
  // also log a one-line to rotating logger for quick tailing
  logger.info(`${action} ${dry ? 'DRY' : 'LIVE'} ${reason} ${regime} ${JSON.stringify({ ts: timestamp || Date.now(), pair: PAIR })}`);
}

// ---- Signal + backtest helpers ----
function normalizeMissing(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === '' || s === 'n/a' || s === 'na' || s === 'none' || s === 'null') return null;
    return v.trim();
  }
  return v;
}
function normalizeKeys(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const p = Object.assign({}, raw);
  for (const key of Object.keys(raw)) {
    if (/prediction/i.test(key) && !['prediction','prediction_tf','prediction_convnet','prediction_tf_raw','prediction_convnet_raw'].includes(key)) {
      const low = key.toLowerCase();
      if (low.includes('convnet')) p.prediction_convnet = p.prediction_convnet ?? raw[key];
      else if (low.includes('tf')) p.prediction_tf = p.prediction_tf ?? raw[key];
      else p.prediction = p.prediction ?? raw[key];
    }
  }
  return p;
}
function sanitizeSignal(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  let p = normalizeKeys(raw);
  ['prediction_convnet','prediction_convnet_raw','prediction_tf','prediction_tf_raw','prediction'].forEach(k => {
    if (k in p) p[k] = normalizeMissing(p[k]);
  });
  if (!p.signal_timestamp && p.timestamp) p.signal_timestamp = p.timestamp;
  return p;
}
function normalizeLabel(raw) {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw)) {
    const mapped = raw.map(r => normalizeLabel(r)).filter(Boolean);
    if (!mapped.length) return null;
    const counts = mapped.reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc; }, {});
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
  }
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (/^(strong[_-]?bull|1|\+1)$/i.test(s)) return 'strong_bull';
    if (/^(strong[_-]?bear|-1|2)$/i.test(s)) return 'strong_bear';
    if (/^(bull|up|buy)$/i.test(s)) return 'bull';
    if (/^(bear|down|sell)$/i.test(s)) return 'bear';
    if (/^(flat|neutral|other|0|none)$/i.test(s)) return 'other';
    return 'other';
  }
  if (typeof raw === 'number') {
    if (raw === 1) return 'strong_bull';
    if (raw === 2) return 'strong_bear';
    if (raw === 0) return 'other';
    return raw < 0 ? 'strong_bear' : 'other';
  }
  return null;
}
function deriveEnsemble(point) {
  if (!point || typeof point !== 'object') return { label: null, confidence: 50 };
  if (point.ensemble_label) {
    const v = normalizeLabel(point.ensemble_label);
    if (v) return { label: v, confidence: Number(point.ensemble_confidence) || 100 };
  }
  const candidates = [];
  ['prediction_convnet','prediction_convnet_raw','prediction_tf','prediction_tf_raw','prediction'].forEach(k => {
    if (point[k] !== undefined && point[k] !== null) candidates.push(point[k]);
  });
  for (const k of Object.keys(point)) {
    if (/prediction/i.test(k) && !['prediction_convnet','prediction_tf','prediction'].includes(k)) {
      if (point[k] !== undefined && point[k] !== null) candidates.push(point[k]);
    }
  }
  const labels = candidates.map(c => normalizeLabel(c)).filter(Boolean);
  if (!labels.length) return { label: null, confidence: 50 };
  const counts = labels.reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc; }, {});
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
  const uniq = new Set(labels);
  const confidence = uniq.size === 1 ? 100 : (labels.some(l => typeof l === 'string' && l.startsWith('strong_')) ? 75 : 50);
  return { label: top, confidence };
}

function safeGetLatestMacroSignals() {
  if (!fs.existsSync(MACRO_SIGNAL_LOG)) return {};
  const lines = fs.readFileSync(MACRO_SIGNAL_LOG, 'utf8').split(/\r?\n/).filter(Boolean);
  const parsed = [];
  for (const line of lines) {
    try { parsed.push(JSON.parse(line)); } catch (e) { if (DEBUG) logger.warn('Malformed macro signal line'); }
  }
  const latestByTf = {};
  for (const tf of TIMEFRAMES) {
    const tfSignals = parsed.filter(s => String(s.timeframe) === tf);
    if (tfSignals.length) {
      tfSignals.sort((a,b)=> (Number(b.timestamp)||0) - (Number(a.timestamp)||0));
      const raw = tfSignals[0];
      const sanitized = sanitizeSignal(raw);
      const derived = deriveEnsemble(sanitized);
      if (!sanitized.ensemble_label && derived.label) sanitized.ensemble_label = derived.label;
      if (!sanitized.ensemble_confidence) sanitized.ensemble_confidence = derived.confidence;
      latestByTf[tf] = sanitized;
    }
  }
  return latestByTf;
}

function safeGetBacktestStats(tf, strategy = process.env.MACRO_STRATEGY || 'Balanced+', variant = process.env.MACRO_VARIANT || '') {
  const results = safeJsonRead(BACKTEST_RESULTS_PATH, []);
  if (!Array.isArray(results) || results.length === 0) {
    if (DEBUG) logger.warn('Backtest results missing or empty at', BACKTEST_RESULTS_PATH);
    return null;
  }
  const tfResult = results.find(r => r.source && String(r.source).includes(tf) && (!variant || r.variant === variant));
  if (!tfResult) { if (DEBUG) logger.warn('No backtest entry for', tf); return null; }
  const stratResult = (tfResult.results || []).find(x => x.params && x.params.name === strategy);
  if (!stratResult) { if (DEBUG) logger.warn('Strategy', strategy, 'not found for', tf); return null; }
  return stratResult.stats || null;
}
function regimeFromStats(stats) {
  if (!stats) return "Unknown";
  if ((stats.totalPNL || 0) > 0 && (stats.winRate || 0) > 0.45) return "Bull";
  if ((stats.totalPNL || 0) < 0 && (stats.winRate || 0) < 0.45) return "Bear";
  return "Flat";
}
function canTradeNow(timestamp, throttleMs = Number(process.env.MACRO_ORDER_THROTTLE_MS || 12 * 60 * 1000)) {
  const ts = Number(timestamp) || Date.now();
  return !lastTradeAt || (ts - lastTradeAt > throttleMs);
}

// ---- Simulation helpers ----
function simulateOrderResult(action, price, amount) {
  return {
    id: `sim-${Date.now()}`,
    timestamp: Date.now(),
    datetime: new Date().toISOString(),
    symbol: PAIR,
    type: 'market',
    side: action === 'BUY' ? 'buy' : 'sell',
    price,
    amount,
    info: { simulated: true }
  };
}
function simulatedBalance() {
  const [base, quote] = String(PAIR).split('/').map(s => s.toUpperCase());
  const free = {};
  free[base] = Number(process.env.SIM_BASE_BALANCE || SIM_BASE_BALANCE);
  free[quote] = Number(process.env.SIM_QUOTE_BALANCE || SIM_QUOTE_BALANCE);
  return { free, total: { ...free } };
}

// Diagnostics snapshot writer
function printDiagnostics() {
  try {
    const now = new Date().toISOString();
    const snapshot = {
      cycles: diagnostics?.cycles ?? null,
      lastError: diagnostics?.lastError ?? null,
      lastTrade: diagnostics?.lastTrade ?? null,
      positionOpen: !!positionOpen,
      lastTradeAt: lastTradeAt || null,
      DRY_RUN: !!DRY_RUN,
      FORCE_DRY: !!FORCE_DRY,
      ENABLE_LIVE: !!ENABLE_LIVE,
      ts: now
    };
    logger.info('[DIAGNOSTICS] ' + JSON.stringify(snapshot));
    safeJsonWrite(DIAG_PATH, { ...snapshot, writtenAt: now });
  } catch (e) {
    if (DEBUG) logger.warn('printDiagnostics error', e && e.message ? e.message : e);
  }
}

// ---- Exchange helper (live only) ----
let ccxtInstance = null;
async function getExchange() {
  if (DRY_RUN) return null;
  if (ccxtInstance) return ccxtInstance;
  try {
    const ccxt = require('ccxt');
    const ExchangeClass = ccxt[EXCHANGE];
    if (!ExchangeClass) throw new Error(`Exchange '${EXCHANGE}' not found in ccxt`);
    ccxtInstance = new ExchangeClass({ apiKey: API_KEY, secret: API_SECRET, enableRateLimit: true });
    if (typeof ccxtInstance.loadMarkets === 'function') await ccxtInstance.loadMarkets();
    return ccxtInstance;
  } catch (e) {
    throw e;
  }
}

// ---- Scheduler helper ----
function scheduleNext(ms, reason = '') {
  try {
    if (reason) logger.info(`[SCHEDULE] next run in ${Math.round(ms/1000)}s. Reason: ${reason}`);
    else logger.debug('[SCHEDULE] next run in ' + Math.round(ms/1000) + 's.');
    setTimeout(() => {
      main().catch(err => {
        diagnostics.lastError = { stage: 'main_scheduled', message: err && err.message ? err.message : String(err) };
        printDiagnostics();
        logger.error('Scheduled main() rejected:', err && err.stack ? err.stack : err);
        setTimeout(() => { main().catch(e => logger.error('Retry main() failed', e && e.message ? e.message : e)); }, INTERVAL_AFTER_ERROR);
      });
    }, Number(ms) || 0);
  } catch (e) {
    diagnostics.lastError = { stage: 'scheduleNext', message: e && e.message ? e.message : String(e) };
    printDiagnostics();
    logger.error('scheduleNext failed', e && e.stack ? e.stack : e);
    setTimeout(() => { main().catch(err => logger.error('Fallback main() failed', err && err.message ? err.message : err)); }, INTERVAL_AFTER_ERROR);
  }
}

// ---- Main loop (single clear flow) ----
async function main() {
  diagnostics.cycles++;
  if (isRunning) { logger.warn('Previous cycle still running, skipping'); return; }
  isRunning = true;
  try {
    if (DRY_RUN && DEBUG) logger.debug('Running in DRY_RUN mode. SIM_PRICE=', SIM_PRICE);

    const latestSignals = safeGetLatestMacroSignals();
    let best = null;

    for (const tf of TIMEFRAMES) {
      const signal = latestSignals[tf];
      const stats = safeGetBacktestStats(tf);
      const regime = regimeFromStats(stats);
      logger.debug('tf=', tf, 'label=', signal ? `${signal.ensemble_label}` : 'none', 'regime=', regime);
      if (!stats || !signal) continue;
      if (regime === 'Bull' && String(signal.ensemble_label) === 'strong_bull') {
        if (!best || ((best.stats && (stats.totalPNL || 0)) > (best.stats.totalPNL || 0))) best = { tf, stats, signal };
      }
    }

    if (!best) {
      diagnostics.lastError = { stage: 'regime_select', message: 'No Bull regime or no valid signal' };
      printDiagnostics();
      scheduleNext(INTERVAL_MS, 'No positive macro regime');
      return;
    }

    const { tf: bestTf, stats: bestStats, signal: bestSignal } = best;
    logger.debug('Selected', bestTf, bestSignal.ensemble_label);

    // BUY path
    if (!positionOpen && String(bestSignal.ensemble_label) === 'strong_bull' && canTradeNow(bestSignal.signal_timestamp || bestSignal.timestamp)) {
      const price = Number(bestSignal.price || SIM_PRICE);
      const balance = simulatedBalance();
      const quote = String(PAIR).split('/')[1].toUpperCase();
      const required = ORDER_AMOUNT * price;
      if ((balance.free[quote] || 0) < required) {
        logOrder({ timestamp: bestSignal.signal_timestamp || bestSignal.timestamp, action: 'SKIP', reason: 'Insufficient simulated quote for BUY', regime: 'Bull', stats: bestStats, signal: bestSignal, dry: true });
        scheduleNext(INTERVAL_AFTER_SKIP, 'Insufficient simulated quote for BUY');
        return;
      }

      if (DRY_RUN || FORCE_DRY || !ENABLE_LIVE) {
        const result = simulateOrderResult('BUY', price, ORDER_AMOUNT);
        positionOpen = true;
        lastTradeAt = Number(bestSignal.signal_timestamp || bestSignal.timestamp) || Date.now();
        diagnostics.lastTrade = { action: 'BUY', timestamp: lastTradeAt, tf: bestTf, simulated: true };
        logOrder({ timestamp: bestSignal.signal_timestamp || bestSignal.timestamp, action: 'BUY', result, reason: `DRY strong_bull on ${bestTf}`, regime: 'Bull', stats: bestStats, signal: bestSignal, dry: true });
        logger.debug('Simulated BUY', result);
        scheduleNext(INTERVAL_AFTER_TRADE, 'Simulated BUY executed');
        return;
      }

      // LIVE buy
      try {
        const ex = await getExchange();
        const res = await ex.createMarketBuyOrder(PAIR, ORDER_AMOUNT);
        positionOpen = true;
        lastTradeAt = Date.now();
        diagnostics.lastTrade = { action: 'BUY', timestamp: lastTradeAt, tf: bestTf, simulated: false };
        logOrder({ timestamp: Date.now(), action: 'BUY', result: res, reason: `LIVE strong_bull on ${bestTf}`, regime: 'Bull', stats: bestStats, signal: bestSignal, dry: false });
        scheduleNext(INTERVAL_AFTER_TRADE, 'Live BUY executed');
        return;
      } catch (e) {
        diagnostics.lastError = { stage: 'buy_live', message: e && e.message ? e.message : String(e) };
        logOrder({ timestamp: Date.now(), action: 'BUY', result: null, reason: 'Live BUY failed', error: e && e.message ? e.message : String(e), regime: 'Bull', stats: bestStats, signal: bestSignal, dry: false });
        scheduleNext(INTERVAL_AFTER_ERROR, 'Live buy failed');
        return;
      }
    }

    // SELL path
    if (positionOpen && ((bestStats && ((bestStats.totalPNL || 0) <= 0 || (bestStats.winRate || 0) < MACRO_MIN_WIN_RATE)) || String(bestSignal.ensemble_label) === 'strong_bear')) {
      const price = Number(bestSignal.price || SIM_PRICE);
      const balance = simulatedBalance();
      const base = String(PAIR).split('/')[0].toUpperCase();
      if ((balance.free[base] || 0) < ORDER_AMOUNT) {
        logOrder({ timestamp: bestSignal.signal_timestamp || bestSignal.timestamp, action: 'SKIP', reason: 'Insufficient simulated base for SELL', regime: regimeFromStats(bestStats), stats: bestStats, signal: bestSignal, dry: true });
        scheduleNext(INTERVAL_AFTER_SKIP, 'Insufficient simulated base for SELL');
        return;
      }

      if (DRY_RUN || FORCE_DRY || !ENABLE_LIVE) {
        const result = simulateOrderResult('SELL', price, ORDER_AMOUNT);
        positionOpen = false;
        lastTradeAt = Number(bestSignal.signal_timestamp || bestSignal.timestamp) || Date.now();
        diagnostics.lastTrade = { action: 'SELL', timestamp: lastTradeAt, tf: bestTf, simulated: true };
        logOrder({ timestamp: bestSignal.signal_timestamp || bestSignal.timestamp, action: 'SELL', result, reason: `DRY regime negative or bear on ${bestTf}`, regime: regimeFromStats(bestStats), stats: bestStats, signal: bestSignal, dry: true });
        logger.debug('Simulated SELL', result);
        scheduleNext(INTERVAL_AFTER_TRADE, 'Simulated SELL executed');
        return;
      }

      // LIVE sell
      try {
        const ex = await getExchange();
        const res = await ex.createMarketSellOrder(PAIR, ORDER_AMOUNT);
        positionOpen = false;
        lastTradeAt = Date.now();
        diagnostics.lastTrade = { action: 'SELL', timestamp: lastTradeAt, tf: bestTf, simulated: false };
        logOrder({ timestamp: Date.now(), action: 'SELL', result: res, reason: `LIVE regime negative on ${bestTf}`, regime: regimeFromStats(bestStats), stats: bestStats, signal: bestSignal, dry: false });
        scheduleNext(INTERVAL_AFTER_TRADE, 'Live SELL executed');
        return;
      } catch (e) {
        diagnostics.lastError = { stage: 'sell_live', message: e && e.message ? e.message : String(e) };
        logOrder({ timestamp: Date.now(), action: 'SELL', result: null, reason: 'Live SELL failed', error: e && e.message ? e.message : String(e), regime: regimeFromStats(bestStats), stats: bestStats, signal: bestSignal, dry: false });
        scheduleNext(INTERVAL_AFTER_ERROR, 'Live sell failed');
        return;
      }
    }

    // Hold: suppress duplicates with cooldown
    const now = Date.now();
    const shouldLogHold = diagnostics._lastLoggedAction !== 'HOLD' || (now - diagnostics._lastHoldLoggedAt) > HOLD_LOG_COOLDOWN_MS;
    if (shouldLogHold) {
      logOrder({
        timestamp: (bestSignal && (bestSignal.signal_timestamp || bestSignal.timestamp)) || Date.now(),
        action: 'HOLD',
        result: null,
        reason: `No trade condition met on ${bestTf}`,
        regime: regimeFromStats(bestStats),
        stats: bestStats,
        signal: bestSignal,
        dry: DRY_RUN || FORCE_DRY || !ENABLE_LIVE
      });
      diagnostics._lastLoggedAction = 'HOLD';
      diagnostics._lastHoldLoggedAt = now;
    } else {
      logger.debug('HOLD suppressed (duplicate) until cooldown expires');
    }
    scheduleNext(INTERVAL_AFTER_HOLD, `No trade condition met on ${bestTf}`);
  } catch (err) {
    diagnostics.lastError = { stage: 'main', message: err && err.message ? err.message : String(err) };
    printDiagnostics();
    logger.error('Uncaught main error', err && err.stack ? err.stack : err);
    scheduleNext(INTERVAL_AFTER_ERROR, 'Unhandled exception');
  } finally {
    isRunning = false;
  }
}

// Boot
logger.info('Macrostructure bot starting', { DRY_RUN, FORCE_DRY, ENABLE_LIVE, DEBUG, BACKTEST_RESULTS_PATH });
main();

// Graceful handlers
process.on('SIGINT', () => { logger.info('Exiting (SIGINT)'); printDiagnostics(); process.exit(0); });
process.on('SIGTERM', () => { logger.info('Exiting (SIGTERM)'); printDiagnostics(); process.exit(0); });
process.on('uncaughtException', (e) => { diagnostics.lastError = { stage: 'uncaughtException', message: e && e.message ? e.message : String(e) }; printDiagnostics(); logger.error('uncaughtException', e); process.exit(1); });
process.on('unhandledRejection', (reason) => { diagnostics.lastError = { stage: 'unhandledRejection', message: reason && reason.message ? reason.message : reason }; printDiagnostics(); logger.error('unhandledRejection', reason); process.exit(1); });

// Export for interactive testing
module.exports = { main, safeGetLatestMacroSignals, simulateOrderResult, safeGetBacktestStats, printDiagnostics, logger };
