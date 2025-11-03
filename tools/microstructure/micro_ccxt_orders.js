#!/usr/bin/env node
/**
 * tools/microstructure/micro_ccxt_orders.js
 *
 * Microstructure — index-driven, simulation-first
 *
 * - Uses in-process microstructure/index.js (if present) as decision maker.
 * - Falls back to OHLCV prediction files only if index data not available.
 * - FORCE_DRY default true so no live orders are submitted during testing.
 * - Persists simulated position state to ./logs/position_state_micro.json.
 *
 * Usage:
 *   DEBUG=1 FORCE_DRY=1 node tools/microstructure/micro_ccxt_orders.js
 *   To run once: DEBUG=1 FORCE_DRY=1 node tools/microstructure/micro_ccxt_orders.js --once
 *
 * Safety:
 * - Live orders will not be placed unless you explicitly set FORCE_DRY=0 and DRY_RUN=0
 *   and supply valid API keys. Keep FORCE_DRY=1 for tests.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const LOG_PREFIX = '[microstructure]';
const INDEX_MODULE = path.resolve(__dirname, './index.js'); //micro-structure orchestrator
const OHLCV_DIR = process.env.OHLCV_DIR || path.resolve(__dirname, '../logs/json/ohlcv');
const ORDER_LOG_PATH = process.env.MICRO_ORDER_LOG || path.resolve(__dirname, './logs/micro_ccxt_orders.log');
const POSITION_STATE_PATH = path.resolve(__dirname, './logs/position_state_micro.json');

// Basic config (env overrides)
const MICRO_PAIR = (process.env.MICRO_PAIR || process.env.PAIR || 'BTC/EUR').toUpperCase();
const MICRO_TIMEFRAMES = (process.env.MICRO_TIMEFRAMES || '1m,5m,15m,1h').split(',').map(s => s.trim()).filter(Boolean);
const MICRO_PRIMARY_TF = process.env.MICRO_PRIMARY_TF || MICRO_TIMEFRAMES[0];
const MICRO_ORDER_AMOUNT = Number(process.env.MICRO_ORDER_AMOUNT || process.env.ORDER_AMOUNT || 0.0001);
const MICRO_INTERVAL_MS = Number(process.env.MICRO_INTERVAL_MS || 300000);

const DEBUG = /^(1|true|yes)$/i.test(String(process.env.DEBUG || '0'));
const FORCE_DRY = !((process.env.FORCE_DRY === '0' || process.env.FORCE_DRY === 'false') === true) || /^(1|true|yes)$/i.test(String(process.env.FORCE_DRY || '1'));
const DRY_RUN = /^(1|true|yes)$/i.test(String(process.env.DRY_RUN || '1'));
const ONCE = process.argv.includes('--once');

const SIM_PRICE = Number(process.env.SIM_PRICE || 30000);
const SIM_BASE_BALANCE = Number(process.env.SIM_BASE_BALANCE || 0.01);
const SIM_QUOTE_BALANCE = Number(process.env.SIM_QUOTE_BALANCE || 1000);

// state
let running = false;
let diagnostics = { cycles: 0, lastError: null, lastTrade: null, history: [] };
let position = { open: false, side: null, entryPrice: null, amount: 0, openedAt: 0 };
let lastTradeAt = 0;

// helpers
function logDebug(...args) { if (DEBUG) console.log(LOG_PREFIX, '[DEBUG]', ...args); }
function logInfo(...args) { console.log(LOG_PREFIX, '[INFO]', ...args); }
function logWarn(...args) { console.warn(LOG_PREFIX, '[WARN]', ...args); }
function logError(...args) { console.error(LOG_PREFIX, '[ERROR]', ...args); }

function safeJsonRead(fp, fallback = null) {
  try {
    if (!fp || !fs.existsSync(fp)) return fallback;
    const txt = fs.readFileSync(fp, 'utf8');
    if (!txt || !txt.trim()) return fallback;
    return JSON.parse(txt);
  } catch (e) {
    if (DEBUG) logWarn('safeJsonRead parse error', fp, e && e.message ? e.message : e);
    return fallback;
  }
}
function safeJsonWrite(fp, obj) {
  try {
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(obj, null, 2));
  } catch (e) {
    logError('safeJsonWrite error', fp, e && e.message ? e.message : e);
  }
}
function loadPositionState() {
  try {
    const st = safeJsonRead(POSITION_STATE_PATH, null);
    if (st && st.position) {
      position = st.position;
      lastTradeAt = st.lastTradeAt || 0;
      logDebug('Restored position state', position);
    }
  } catch (e) { /* ignore */ }
}
function savePositionState() {
  try { safeJsonWrite(POSITION_STATE_PATH, { position, lastTradeAt, ts: Date.now() }); } catch (e) {}
}

// normalize incoming index signals
function normalizeIndexEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  // expected: { timestamp, signal, score, price, prediction, summary, recent_win, ... }
  const out = Object.assign({}, entry);
  // map summary.win_rate -> winRate for compatibility
  if (out.summary && out.summary.win_rate !== undefined) out.summary.winRate = out.summary.win_rate;
  return out;
}

// attempt to load index.js data structure
function loadIndexData() {
  try {
    if (!fs.existsSync(INDEX_MODULE)) return null;
    // require fresh copy to pick up updates
    delete require.cache[require.resolve(INDEX_MODULE)];
    const idx = require(INDEX_MODULE);
    // index may export a function or an object. If function, prefer result if sync.
    const data = (typeof idx === 'function') ? (() => { try { return idx(); } catch(e){ return idx; } })() : idx;
    return data || null;
  } catch (e) {
    if (DEBUG) logWarn('loadIndexData error', e && e.message ? e.message : e);
    return null;
  }
}

// fallback: load latest signals from OHLCV dir prediction files
function loadLatestSignalsFromOHLCV(timeframes, dir) {
  const out = [];
  for (const tf of timeframes) {
    const candidates = [
      path.join(dir, `ohlcv_ccxt_data_${tf}_prediction.json`),
      path.join(dir, `ohlcv_ccxt_data_prediction_${tf}.json`),
      path.join(dir, `ohlcv_ccxt_data_prediction.json`),
      path.join(dir, `ohlcv_ccxt_data_${tf}.json`),
      path.join(dir, `ohlcv_ccxt_data.json`)
    ];
    let arr = null;
    for (const fp of candidates) {
      const v = safeJsonRead(fp, null);
      if (Array.isArray(v) && v.length) { arr = v; break; }
      if (v && typeof v === 'object' && Array.isArray(v.data) && v.data.length) { arr = v.data; break; }
    }
    if (Array.isArray(arr) && arr.length) {
      const raw = arr[arr.length - 1];
      raw.timeframe = tf;
      out.push(raw);
    }
  }
  return out;
}

function formatSignalForDecision(tf, entry) {
  // unify keys used by decision code
  const sig = {};
  sig.tf = tf;
  sig.timestamp = entry.timestamp || entry.signal_timestamp || Date.now();
  sig.signal = entry.signal || entry.ensemble_label || entry.prediction || null;
  sig.ensemble_label = entry.ensemble_label || entry.signal || entry.prediction || null;
  sig.ensemble_confidence = (entry.summary && entry.summary.winRate !== undefined) ? entry.summary.winRate * 100 : (entry.ensemble_confidence || entry.summary && entry.summary.win_rate ? entry.summary.win_rate * 100 : (entry.ensemble_confidence || 50));
  sig.price = Number(entry.price || entry.close || entry.recent_win && entry.recent_win.close || SIM_PRICE);
  sig.volatility = (entry.recent_win && entry.recent_win.volatility) || (entry.volatility) || 0;
  sig.raw = entry;
  return sig;
}

// simulated order result & logging
function simulateOrderResult(action, price, amount) {
  return { id: `sim-${Date.now()}`, timestamp: Date.now(), datetime: new Date().toISOString(), symbol: MICRO_PAIR, type: 'market', side: action.toLowerCase(), price, amount, info: { simulated: true } };
}
function logOrder({ ts, action, result, reason, fullSignal, dry = true }) {
  const parts = [
    new Date().toISOString(),
    ts || '',
    action || '',
    dry ? 'DRY' : 'LIVE',
    result ? JSON.stringify(result) : '',
    reason || '',
    fullSignal ? JSON.stringify({ tf: fullSignal.tf, ensemble_label: fullSignal.ensemble_label, price: fullSignal.price }) : ''
  ];
  try {
    fs.mkdirSync(path.dirname(ORDER_LOG_PATH), { recursive: true });
    fs.appendFileSync(ORDER_LOG_PATH, parts.join('\t') + '\n');
  } catch (e) {
    logError('Unable to write order log:', e && e.message ? e.message : e);
  }
}

// simple gating rules (adjust as needed)
function shouldOpenPosition(signal, stats) {
  // require strong_bull in ensemble_label or prediction, and not already open
  const lbl = String(signal.ensemble_label || '').toLowerCase();
  if (lbl.includes('strong_bull') || lbl === 'strong_bull' || String(signal.signal).toLowerCase().includes('buy')) return true;
  // allow less strict if score or summary suggests positive regime
  if ((signal.raw && signal.raw.score && Number(signal.raw.score) > 60) || (stats && stats.winRate > 0.45)) return true;
  return false;
}
function shouldClosePosition(signal, stats) {
  const lbl = String(signal.ensemble_label || '').toLowerCase();
  if (lbl.includes('strong_bear') || lbl === 'strong_bear' || String(signal.signal).toLowerCase().includes('sell')) return true;
  if (stats && stats.winRate < 0.35) return true;
  return false;
}

function canThrottle() {
  const throttleMs = Number(process.env.ORDER_THROTTLE_MS || 300000);
  return !lastTradeAt || (Date.now() - lastTradeAt) > throttleMs;
}

// Replacement for decideAndAct - clearer, modular, and easy to maintain.
// Drop this function into micro_ccxt_orders.js replacing the old decideAndAct implementation.

async function decideAndAct() {
  diagnostics.cycles++;
  if (running) {
    logDebug('Previous cycle still running, skipping');
    return;
  }
  running = true;

  // Small helpers local to this function to keep flow readable
  const pickIndexSignal = (idx) => {
    if (!idx || typeof idx !== 'object') return null;
    // prefer primary timeframe, else first available from MICRO_TIMEFRAMES
    const tryGet = (key) => {
      if (Object.prototype.hasOwnProperty.call(idx, key)) return idx[key];
      // case-insensitive
      for (const k of Object.keys(idx)) if (String(k).toLowerCase() === String(key).toLowerCase()) return idx[k];
      // loose contains match
      for (const k of Object.keys(idx)) if (String(k).toLowerCase().includes(String(key).toLowerCase())) return idx[k];
      return null;
    };

    // prefer primary TF
    let entry = tryGet(MICRO_PRIMARY_TF);
    if (entry) return { tf: MICRO_PRIMARY_TF, entry };

    for (const tf of MICRO_TIMEFRAMES) {
      entry = tryGet(tf);
      if (entry) return { tf, entry };
    }
    return null;
  };

  const pickOHLCVSignal = (preds) => {
    if (!Array.isArray(preds) || !preds.length) return null;
    // prefer primary TF if present
    let sig = preds.find(p => String(p.timeframe || p.tf) === String(MICRO_PRIMARY_TF));
    if (sig) return { tf: MICRO_PRIMARY_TF, entry: sig };
    // else return first
    const first = preds[0];
    return { tf: first.timeframe || first.tf || 'unknown', entry: first };
  };

  const safeFormat = (tf, rawEntry) => {
    try { return formatSignalForDecision(tf, normalizeIndexEntry(rawEntry)); } catch (e) { return null; }
  };

  try {
    // 1) Try in-memory index.js
    const idx = loadIndexData();
    let chosenSignal = null;
    let chosenTf = null;
    let backtestStats = null;

    if (idx) {
      const pick = pickIndexSignal(idx);
      if (pick) {
        const formatted = safeFormat(pick.tf, pick.entry);
        if (formatted) {
          chosenSignal = formatted;
          chosenTf = pick.tf;
        }
      }
    }

    // 2) fallback to OHLCV prediction files if no index-driven signal
    if (!chosenSignal) {
      const preds = loadLatestSignalsFromOHLCV(MICRO_TIMEFRAMES, OHLCV_DIR);
      const picked = pickOHLCVSignal(preds);
      if (picked) {
        const formatted = safeFormat(picked.tf, picked.entry);
        if (formatted) {
          chosenSignal = formatted;
          chosenTf = picked.tf;
        }
      }
    }

    // 3) No signal -> schedule and exit
    if (!chosenSignal) {
      logDebug('No signal available from index or OHLCV files');
      scheduleNext(MICRO_INTERVAL_MS, 'no signal');
      running = false;
      return;
    }

    logDebug('Selected decision:', chosenTf, chosenSignal.ensemble_label, 'price', chosenSignal.price);

    // 4) Optional lightweight stats extracted from index summary (if present)
    if (chosenSignal.raw && chosenSignal.raw.summary) {
      const s = chosenSignal.raw.summary;
      backtestStats = {
        totalPNL: Number(s.totalPNL ?? s.pnl ?? 0),
        winRate: Number(s.winRate ?? s.win_rate ?? 0),
        avgTradeQuality: Number(s.avgTradeQuality ?? s.avg_trade_quality ?? 0),
        totalTrades: Number(s.totalTrades ?? s.numTrades ?? 0)
      };
    } else {
      backtestStats = null;
    }

    // 5) Throttle early to avoid rapid repeated actions
    if (!canThrottle()) {
      logDebug('Throttled by lastTradeAt', lastTradeAt);
      scheduleNext(MICRO_INTERVAL_MS, 'throttled');
      running = false;
      return;
    }

    // 6) Decision logic (single, explicit place where open/close decisions happen)
    // Keep this section compact so it's easy to tune: primary checks first, fallbacks next.
    const decision = (() => {
      // strong immediate signals
      const lbl = String(chosenSignal.ensemble_label || '').toLowerCase();
      if (lbl.includes('strong_bull') || (chosenSignal.raw && String(chosenSignal.raw.recent_win?.winner_label || '').toLowerCase().includes('strong_bull'))) {
        return { type: 'open', reason: 'strong_bull' };
      }
      if (lbl.includes('strong_bear') || (chosenSignal.raw && String(chosenSignal.raw.recent_win?.winner_label || '').toLowerCase().includes('strong_bear'))) {
        return { type: 'close', reason: 'strong_bear' };
      }

      // score / winRate gating
      const score = Number(chosenSignal.raw?.score ?? 0);
      const winRate = Number(backtestStats?.winRate ?? 0);
      if (score >= Number(process.env.MIN_SCORE_FOR_OPEN || 60) || winRate >= Number(process.env.MIN_WINRATE_FOR_OPEN || 0.45)) {
        // prefer open when not clearly bear
        if (!lbl.includes('bear')) return { type: 'open', reason: 'score_or_winrate_pass' };
      }
      if (lbl.includes('bear') || score < (Number(process.env.MIN_SCORE_FOR_OPEN || 60) * 0.4)) {
        return { type: 'close', reason: 'bear_or_low_score' };
      }

      return { type: 'hold', reason: 'no_clear_signal' };
    })();

    // 7) Execute decision: open, close, or hold (simulation-first)
    const now = Date.now();
    if (decision.type === 'open' && !position.open) {
      // balance check (simulated)
      const [base, quote] = MICRO_PAIR.split('/').map(s => s.toUpperCase());
      const freeQuote = Number(process.env.SIM_QUOTE_BALANCE || SIM_QUOTE_BALANCE);
      const required = MICRO_ORDER_AMOUNT * chosenSignal.price;
      if (freeQuote < required) {
        logInfo('Insufficient simulated quote to open position', { required, freeQuote });
        logOrder({ ts: chosenSignal.timestamp, action: 'SKIP', reason: 'insufficient simulated quote', fullSignal: chosenSignal, dry: true });
        scheduleNext(MICRO_INTERVAL_MS, 'skip-insufficient');
        running = false;
        return;
      }

      const res = simulateOrderResult('BUY', chosenSignal.price, MICRO_ORDER_AMOUNT);
      position = { open: true, side: 'long', entryPrice: res.price, amount: MICRO_ORDER_AMOUNT, openedAt: now };
      lastTradeAt = now;
      diagnostics.lastTrade = { action: 'BUY', id: res.id, ts: now, simulated: true };
      logInfo('Simulated BUY', { id: res.id, price: res.price, amount: res.amount });
      logOrder({ ts: chosenSignal.timestamp, action: 'BUY', result: res, reason: `simulated open (${decision.reason})`, fullSignal: chosenSignal, dry: true });
      savePositionState();
      scheduleNext(MICRO_INTERVAL_MS, 'post-open');
      running = false;
      return;
    }

    if (decision.type === 'close' && position.open) {
      const [base] = MICRO_PAIR.split('/').map(s => s.toUpperCase());
      const freeBase = position.amount || 0;
      if (freeBase < (position.amount || MICRO_ORDER_AMOUNT)) {
        logInfo('Insufficient simulated base to close', { available: freeBase, needed: position.amount || MICRO_ORDER_AMOUNT });
        logOrder({ ts: chosenSignal.timestamp, action: 'SKIP', reason: 'insufficient simulated base', fullSignal: chosenSignal, dry: true });
        scheduleNext(MICRO_INTERVAL_MS, 'skip-insufficient-base');
        running = false;
        return;
      }

      const res = simulateOrderResult('SELL', chosenSignal.price, position.amount || MICRO_ORDER_AMOUNT);
      position = { open: false, side: null, entryPrice: null, amount: 0, openedAt: 0 };
      lastTradeAt = now;
      diagnostics.lastTrade = { action: 'SELL', id: res.id, ts: now, simulated: true };
      logInfo('Simulated SELL', { id: res.id, price: res.price, amount: res.amount });
      logOrder({ ts: chosenSignal.timestamp, action: 'SELL', result: res, reason: `simulated close (${decision.reason})`, fullSignal: chosenSignal, dry: true });
      savePositionState();
      scheduleNext(MICRO_INTERVAL_MS, 'post-close');
      running = false;
      return;
    }

    // 8) Hold path: avoid noisy repeated HOLD logs by using cooldown
    {
      const HOLD_LOG_COOLDOWN_MS = Number(process.env.HOLD_LOG_COOLDOWN_MS || 5 * 60 * 1000);
      const nowTs = Date.now();
      // initialize holder variables on first run (attached to diagnostics to persist across restarts)
      diagnostics._lastLoggedAction = diagnostics._lastLoggedAction || null;
      diagnostics._lastHoldLoggedAt = diagnostics._lastHoldLoggedAt || 0;

      const shouldLogHold = diagnostics._lastLoggedAction !== 'HOLD' || (nowTs - diagnostics._lastHoldLoggedAt) > HOLD_LOG_COOLDOWN_MS;
      if (shouldLogHold) {
        logDebug('HOLD — no conditions met for trade', { reason: decision.reason });
        logOrder({ ts: chosenSignal.timestamp, action: 'HOLD', reason: decision.reason || 'no-op', fullSignal: chosenSignal, dry: true });
        diagnostics._lastLoggedAction = 'HOLD';
        diagnostics._lastHoldLoggedAt = nowTs;
      } else {
        logDebug('HOLD suppressed (duplicate) until cooldown expires');
      }
      scheduleNext(MICRO_INTERVAL_MS, 'hold');
      running = false;
      return;
    }
  } catch (err) {
    diagnostics.lastError = { stage: 'main', message: err && err.message ? err.message : String(err) };
    logError('Main loop error', err && err.stack ? err.stack : err);
    scheduleNext(MICRO_INTERVAL_MS, 'error');
    running = false;
  }
}

// scheduling
function scheduleNext(ms, reason) {
  logDebug('Next run in ms=', ms, 'reason=', reason);
  setTimeout(decideAndAct, ms);
}

// startup
loadPositionState();
logInfo('micro_ccxt_orders (index-driven) starting', { MICRO_PAIR, MICRO_PRIMARY_TF, FORCE_DRY: FORCE_DRY, DRY_RUN: DRY_RUN, DEBUG });
decideAndAct();
if (!ONCE) {
  setInterval(() => {
    if (!running) decideAndAct();
  }, MICRO_INTERVAL_MS).unref();
}

// graceful shutdown
process.on('SIGINT', () => { savePositionState(); logInfo('exiting'); process.exit(0); });
process.on('SIGTERM', () => { savePositionState(); logInfo('exiting'); process.exit(0); });
process.on('uncaughtException', (err) => { diagnostics.lastError = { stage: 'uncaughtException', message: err && err.message ? err.message : err }; logError(err); savePositionState(); process.exit(1); });
process.on('unhandledRejection', (r) => { diagnostics.lastError = { stage: 'unhandledRejection', message: r && r.message ? r.message : r }; logError(r); savePositionState(); process.exit(1); });
