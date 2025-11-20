#!/usr/bin/env node
/**
 * tools/microstructure/micro_ccxt_orders.js
 *
 * Microstructure trading bot — index-driven, simulation-first
 *
 * Enhancements:
 * - Loads .env early and uses centralized runtime_flags parser for consistent boolean semantics.
 * - Single submitOrder(action, pair, price, amount, fullSignal) handler that cleanly separates DRY vs LIVE paths and writes structured audit JSONL.
 * - Improved scheduling (single timer, safer retries) and duplicate-suppression for rapid successive orders.
 * - Persisted position state and a concise position history array for easier reconciliation.
 * - Better debug/startup logs that show parsed flags (DRY_RUN, FORCE_DRY, ENABLE_LIVE, IS_LIVE).
 *
 * Safety:
 * - Live orders will not be placed unless flags.IS_LIVE === true (ENABLE_LIVE && !FORCE_DRY && !DRY_RUN).
 * - Keep FORCE_DRY=1 and DRY_RUN=1 for safe testing.
 *
 * Additional enhancements in this version:
 * - Consistent fee parsing and startup sanity checks for MICRO_FEE_RATE / MICRO_FEE_IS_PERCENT.
 * - Simulated orders include a computed `fee` field and a stable simulated `id`.
 * - Diagnostics.history now persists per-trade `price` and `fee` for accurate FIFO P&L computation.
 * - Live fills are recorded using best-effort extraction of fill price and fee from ccxt results (defensive).
 * - Diagnostics.history is trimmed to a configurable max length before persisting.
 */

const fs = require('fs');
const path = require('path');

// Load .env as early as possible
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Centralized runtime flags (robust parsing)
const flags = require(path.resolve(__dirname, '../lib/runtime_flags'));

const { computePositionAndPnl } = require(path.resolve(__dirname, './micro_pnl'));

const LOG_PREFIX = '[microstructure]';
const INDEX_MODULE = path.resolve(__dirname, './index.js'); // micro-structure orchestrator
const OHLCV_DIR = process.env.OHLCV_DIR || path.resolve(__dirname, '../logs/json/ohlcv');
const ORDER_LOG_PATH = process.env.MICRO_ORDER_LOG || path.resolve(__dirname, '../logs/micro_ccxt_orders.log');
const ORDER_AUDIT_JSONL = process.env.MICRO_ORDER_AUDIT || path.resolve(__dirname, '../logs/micro_ccxt_order_audit.jsonl');
const POSITION_STATE_PATH = path.resolve(__dirname, '../logs/micro_position_state.json');

const MICRO_PAIR = (process.env.MICRO_PAIR || process.env.PAIR || 'BTC/EUR').toUpperCase();
const MICRO_TIMEFRAMES = (process.env.MICRO_TIMEFRAMES || '1m,5m,15m,1h').split(',').map(s => s.trim()).filter(Boolean);
const MICRO_PRIMARY_TF = process.env.MICRO_PRIMARY_TF || MICRO_TIMEFRAMES[0];
const MICRO_ORDER_AMOUNT = Number(process.env.MICRO_ORDER_AMOUNT || process.env.ORDER_AMOUNT || 0.0001);
const MICRO_INTERVAL_MS = Number(process.env.MICRO_INTERVAL_MS || 300000);

const DEBUG = !!flags.DEBUG;
const DRY_RUN = !!flags.DRY_RUN;
const FORCE_DRY = !!flags.FORCE_DRY;
const ENABLE_LIVE = !!flags.ENABLE_LIVE;
const IS_LIVE = !!flags.IS_LIVE;

const ONCE = process.argv.includes('--once');

const SIM_PRICE = Number(process.env.SIM_PRICE || 30000);
const SIM_BASE_BALANCE = Number(process.env.SIM_BASE_BALANCE || 0.01);
const SIM_QUOTE_BALANCE = Number(process.env.SIM_QUOTE_BALANCE || 1000);

// Fee configuration and validation
const FEE_RAW = (process.env.MICRO_FEE_RATE ?? process.env.FEE_RATE ?? '0.001');
const FEE_RATE = Number(FEE_RAW);
const FEE_IS_PERCENT = (process.env.MICRO_FEE_IS_PERCENT ?? process.env.FEE_IS_PERCENT ?? '1') === '0' ? false : true;
const MAX_HISTORY = Number(process.env.MICRO_HISTORY_MAX || 2000);

// internal state
let running = false;
let diagnostics = { cycles: 0, lastError: null, lastTrade: null, history: [], _lastLoggedAction: null, _lastHoldLoggedAt: 0 };
let position = { open: false, side: null, entryPrice: null, amount: 0, openedAt: 0 };
let lastTradeAt = 0;
let timerId = null;
let lastOrderFingerprint = null; // used to avoid immediate duplicate submissions

// ---- helpers ----
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

// append legacy tab log line
function appendOrderLog(parts) {
  try {
    fs.mkdirSync(path.dirname(ORDER_LOG_PATH), { recursive: true });
    fs.appendFileSync(ORDER_LOG_PATH, parts.join('\t') + '\n');
  } catch (e) {
    logWarn('appendOrderLog failed', e && e.message ? e.message : e);
  }
}
// append structured audit JSONL
function appendAuditJson(obj) {
  try {
    fs.mkdirSync(path.dirname(ORDER_AUDIT_JSONL), { recursive: true });
    fs.appendFileSync(ORDER_AUDIT_JSONL, JSON.stringify(obj) + '\n');
  } catch (e) {
    logWarn('appendAuditJson failed', e && e.message ? e.message : e);
  }
}

function logOrder({ ts, action, result = null, reason = '', fullSignal = null, dry = true, error = null }) {
  const parts = [
    new Date().toISOString(),
    ts || '',
    action || '',
    dry ? 'DRY' : 'LIVE',
    error ? `ERROR: ${String(error)}` : (result ? JSON.stringify(result) : ''),
    reason || '',
    fullSignal ? JSON.stringify({ tf: fullSignal.tf, ensemble_label: fullSignal.ensemble_label, price: fullSignal.price }) : ''
  ];
  appendOrderLog(parts);

  const audit = {
    iso: new Date().toISOString(),
    timestamp: ts || Date.now(),
    pair: MICRO_PAIR,
    action,
    mode: dry ? 'DRY' : 'LIVE',
    reason,
    signal: fullSignal,
    result,
    diagnostics: { lastTrade: diagnostics.lastTrade, cycles: diagnostics.cycles }
  };
  appendAuditJson(audit);
}

// normalize incoming index signals
function normalizeIndexEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const out = Object.assign({}, entry);
  // Make sure summary object exists before trying to map
  if (!out.summary && (out.win_rate !== undefined || out.winRate !== undefined || out.summary === undefined)) {
    out.summary = out.summary || {};
  }
  if (out.summary && out.summary.win_rate !== undefined) out.summary.winRate = out.summary.win_rate;
  // also accept top-level win_rate -> summary.winRate if present
  if (out.win_rate !== undefined && (!out.summary || out.summary.winRate === undefined)) {
    out.summary = out.summary || {};
    out.summary.winRate = out.win_rate;
  }
  return out;
}

// attempt to load index.js data structure
function loadIndexData() {
  try {
    if (!fs.existsSync(INDEX_MODULE)) return null;
    delete require.cache[require.resolve(INDEX_MODULE)];
    const idx = require(INDEX_MODULE);
    const data = (typeof idx === 'function') ? (() => { try { return idx(); } catch(e) { return idx; } })() : idx;
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
  // Defensive: allow null/undefined entry
  const sig = {};
  sig.tf = tf;
  const e = entry || {};
  sig.timestamp = e.timestamp || e.signal_timestamp || Date.now();

  // signal/label extraction - tolerate multiple naming conventions
  sig.signal = e.signal ?? e.ensemble_label ?? e.prediction ?? null;
  sig.ensemble_label = e.ensemble_label ?? e.signal ?? e.prediction ?? null;

  // ensemble_confidence: prefer normalized summary.winRate, then summary.win_rate, then ensemble_confidence field, fallbacks to 0
  let ensembleConfidence = null;
  if (e.summary && typeof e.summary === 'object') {
    const s = e.summary;
    const wr = (s.winRate !== undefined && s.winRate !== null) ? s.winRate : (s.win_rate !== undefined && s.win_rate !== null ? s.win_rate : (s.winrate !== undefined ? s.winrate : null));
    if (wr !== null) ensembleConfidence = Number(wr) * 100;
  }
  if (ensembleConfidence === null) {
    // try top-level ensemble_confidence or confidence (already percentage or 0-1)
    const top = e.ensemble_confidence ?? e.confidence ?? e.ensembleConfidence ?? null;
    if (top !== null && top !== undefined) {
      const n = Number(top);
      // if value looks like 0..1 convert to percent; if already >1 assume percent
      ensembleConfidence = (n > 0 && n <= 1) ? n * 100 : n;
    }
  }
  sig.ensemble_confidence = Number.isFinite(ensembleConfidence) ? ensembleConfidence : 0;

  // price extraction robustly
  sig.price = Number(e.price || e.close || (e.recent_win && e.recent_win.close) || SIM_PRICE);

  // volatility fallback
  sig.volatility = Number((e.recent_win && e.recent_win.volatility) ?? e.volatility ?? 0);

  sig.raw = e;
  return sig;
}

function simulatedBalance() {
  const [base, quote] = MICRO_PAIR.split('/').map(s => s.toUpperCase());
  const free = {};
  free[base] = Number(process.env.SIM_BASE_BALANCE || SIM_BASE_BALANCE);
  free[quote] = Number(process.env.SIM_QUOTE_BALANCE || SIM_QUOTE_BALANCE);
  return { free, total: { ...free } };
}

// Replace the existing simulateOrderResult with this version (adds 'fee' field and stable id)
function simulateOrderResult(action, price, amount) {
  const feeRate = Number.isFinite(FEE_RATE) ? FEE_RATE : 0.001;
  const feeIsPercent = !!FEE_IS_PERCENT;
  let fee = 0;
  if (feeIsPercent && price && amount) {
    fee = feeRate * price * amount; // fee in quote currency
  } else if (!feeIsPercent && typeof feeRate === 'number') {
    fee = feeRate; // absolute fee fallback
  }
  const now = Date.now();
  return {
    id: `sim-${now}-${Math.floor(Math.random() * 100000)}`,
    timestamp: now,
    datetime: new Date(now).toISOString(),
    symbol: MICRO_PAIR,
    type: 'market',
    side: action.toLowerCase(),
    price,
    amount,
    fee,              // added: quote-currency fee estimate
    info: { simulated: true }
  };
}

// persist/load position state
function loadPositionState() {
  try {
    const st = safeJsonRead(POSITION_STATE_PATH, null);
    if (st && st.position) {
      position = st.position;
      lastTradeAt = st.lastTradeAt || 0;
      diagnostics.history = st.history || [];
      logDebug('Restored position state', position);
    }
  } catch (e) { /* ignore */ }
}
function savePositionState() {
  try {
    // Trim diagnostics.history to last MAX_HISTORY entries to avoid uncontrolled growth
    if (Array.isArray(diagnostics.history) && diagnostics.history.length > MAX_HISTORY) {
      diagnostics.history = diagnostics.history.slice(-MAX_HISTORY);
    }
    safeJsonWrite(POSITION_STATE_PATH, { position, lastTradeAt, history: diagnostics.history, ts: Date.now() });
  } catch (e) { logWarn('savePositionState failed', e && e.message ? e.message : e); }
}

// Exchange loader (only when live)
let ccxtInstance = null;
async function getExchange() {
  if (!IS_LIVE) throw new Error('Exchange access disabled: not running in live mode (IS_LIVE=false)');
  if (ccxtInstance) return ccxtInstance;
  try {
    const ccxt = require('ccxt');
    const EXCHANGE = process.env.MICRO_EXCHANGE || process.env.MACRO_EXCHANGE || 'kraken';
    const API_KEY = process.env.MICRO_KEY || process.env.MACRO_KEY || '';
    const API_SECRET = process.env.MICRO_SECRET || process.env.MACRO_SECRET || '';
    const ExchangeClass = ccxt[EXCHANGE];
    if (!ExchangeClass) throw new Error(`Exchange '${EXCHANGE}' not found in ccxt`);
    ccxtInstance = new ExchangeClass({ apiKey: API_KEY, secret: API_SECRET, enableRateLimit: true });
    if (typeof ccxtInstance.loadMarkets === 'function') await ccxtInstance.loadMarkets();
    return ccxtInstance;
  } catch (e) {
    ccxtInstance = null;
    throw e;
  }
}

// defensive helpers to extract price/fee from exchange result
function extractFillPrice(result, fallbackPrice) {
  if (!result) return fallbackPrice;
  // ccxt unified fields to check (in order of preference)
  if (result.average) return Number(result.average);
  if (result.filled && result.filled > 0 && result.cost && result.filled) return Number(result.cost) / Number(result.filled);
  if (result.price) return Number(result.price);
  if (result.info) {
    // vendor-specific: check common fields
    const info = result.info;
    if (info.executed_price) return Number(info.executed_price);
    if (info.avg) return Number(info.avg);
    if (info.avgPrice) return Number(info.avgPrice);
    if (info.fillPrice) return Number(info.fillPrice);
  }
  return fallbackPrice;
}
function extractFee(result) {
  if (!result) return null;
  if (result.fee) {
    // ccxt might provide fee object or numeric
    if (typeof result.fee === 'object' && result.fee.cost !== undefined) return Number(result.fee.cost);
    if (typeof result.fee === 'number') return Number(result.fee);
  }
  if (result.info) {
    const info = result.info;
    if (info.fee) {
      if (typeof info.fee === 'object' && info.fee.cost !== undefined) return Number(info.fee.cost);
      if (typeof info.fee === 'number') return Number(info.fee);
      if (typeof info.fee === 'string' && !isNaN(Number(info.fee))) return Number(info.fee);
    }
    // some exchanges return fees array or fills with fees
    if (Array.isArray(info.fills) && info.fills.length) {
      let acc = 0;
      for (const f of info.fills) {
        if (f.fee && f.fee.cost) acc += Number(f.fee.cost);
        else if (f.fee) acc += Number(f.fee);
      }
      if (acc > 0) return acc;
    }
  }
  return null;
}

// single submitter that handles DRY/LIVE and audit logging
async function submitOrder(action, pair, price, amount, fullSignal = null) {
  // support legacy call-signature submitOrder(action, price, amount, fullSignal)
  if (arguments.length === 4 && typeof pair === 'number') {
    // called as (action, price, amount, fullSignal)
    fullSignal = amount;
    amount = price;
    price = pair;
    pair = MICRO_PAIR;
  }
  pair = (pair || MICRO_PAIR).toUpperCase();

  const fingerprint = `${pair}|${String(action).toUpperCase()}|${Math.round(price)}|${Math.round(amount * 1e8)}`;
  // avoid immediate duplicate submissions
  if (lastOrderFingerprint === fingerprint && Date.now() - (lastTradeAt || 0) < 5000) {
    logWarn('Skipping duplicate order fingerprint', fingerprint);
    return { status: 'duplicate' };
  }

  // decide live vs simulated using IS_LIVE (strict) to avoid accidental live orders
  const liveAllowed = !!IS_LIVE && !DRY_RUN && !FORCE_DRY && !!ENABLE_LIVE;

  if (!liveAllowed) {
    const res = simulateOrderResult(action, price, amount);
    diagnostics.lastTrade = { action, id: res.id, timestamp: res.timestamp, simulated: true, pair };
    diagnostics.history = diagnostics.history || [];
    // Persist explicit price/fee/orderId so P&L math is accurate
    diagnostics.history.push({
      when: Date.now(),
      action,
      pair,
      price: res.price,
      amount: res.amount,
      simulated: true,
      orderId: res.id,
      fee: res.fee !== undefined ? res.fee : null
    });
    lastTradeAt = Date.now();
    lastOrderFingerprint = fingerprint;
    logOrder({ ts: Date.now(), action, result: res, reason: 'SIMULATED by submitOrder', fullSignal, dry: true });
    savePositionState();
    return { status: 'simulated', result: res };
  }

  // LIVE path
  try {
    const ex = await getExchange();
    let result = null;
    const pairToUse = pair || MICRO_PAIR;
    if (String(action).toLowerCase() === 'buy') {
      // ccxt unified: createMarketBuyOrder may not be available on all wrappers; use createOrder fallback
      if (typeof ex.createMarketBuyOrder === 'function') {
        result = await ex.createMarketBuyOrder(pairToUse, amount);
      } else {
        result = await ex.createOrder(pairToUse, 'market', 'buy', amount, undefined);
      }
    } else {
      if (typeof ex.createMarketSellOrder === 'function') {
        result = await ex.createMarketSellOrder(pairToUse, amount);
      } else {
        result = await ex.createOrder(pairToUse, 'market', 'sell', amount, undefined);
      }
    }

    // Record best-effort fill price and fee
    const fillPrice = extractFillPrice(result, price);
    const fillFee = extractFee(result);
    diagnostics.lastTrade = { action, id: result && result.id ? result.id : null, timestamp: Date.now(), simulated: false, pair: pairToUse };
    diagnostics.history = diagnostics.history || [];
    diagnostics.history.push({
      when: Date.now(),
      action,
      pair: pairToUse,
      price: fillPrice !== undefined && fillPrice !== null ? fillPrice : price,
      amount,
      simulated: false,
      orderId: result && result.id ? result.id : null,
      fee: fillFee !== null ? fillFee : undefined
    });
    lastTradeAt = Date.now();
    lastOrderFingerprint = fingerprint;
    logOrder({ ts: Date.now(), action, result, reason: 'LIVE executed by submitOrder', fullSignal, dry: false });
    savePositionState();
    return { status: 'submitted', result };
  } catch (e) {
    diagnostics.lastError = { stage: 'submitOrder_live', message: e && e.message ? e.message : String(e) };
    logOrder({ ts: Date.now(), action, result: null, reason: 'LIVE submit failed', fullSignal, dry: false, error: e && e.message ? e.message : String(e) });
    throw e;
  }
}

// gating rules
function shouldOpenPosition(signal, stats) {
  const lbl = String(signal.ensemble_label || '').toLowerCase();
  if (lbl.includes('strong_bull') || lbl === 'strong_bull' || String(signal.signal).toLowerCase().includes('buy')) return true;
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

// ---- core decideAndAct (replaced old implementation) ----
async function decideAndAct() {
  diagnostics.cycles++;
  if (running) {
    logDebug('Previous cycle still running, skipping');
    return;
  }
  running = true;

  try {
    // 1) load index or fallback to OHLCV predictions
    const idx = loadIndexData();
    let chosenSignal = null;
    let chosenTf = null;
    let backtestStats = null;

    // pick from index
    if (idx) {
      // pickIndexSignal inline: prefer primary TF, then any tf in MICRO_TIMEFRAMES
      const tryGet = (key) => {
        if (Object.prototype.hasOwnProperty.call(idx, key)) return idx[key];
        for (const k of Object.keys(idx)) if (String(k).toLowerCase() === String(key).toLowerCase()) return idx[k];
        for (const k of Object.keys(idx)) if (String(k).toLowerCase().includes(String(key).toLowerCase())) return idx[k];
        return null;
      };
      let entry = tryGet(MICRO_PRIMARY_TF);
      if (!entry) {
        for (const tf of MICRO_TIMEFRAMES) { entry = tryGet(tf); if (entry) { chosenTf = tf; break; } }
      } else chosenTf = MICRO_PRIMARY_TF;
      if (entry) {
        const formatted = formatSignalForDecision(chosenTf || MICRO_PRIMARY_TF, normalizeIndexEntry(entry));
        if (formatted) {
          chosenSignal = formatted;
        }
      }
    }

    // fallback to OHLCV preds
    if (!chosenSignal) {
      const preds = loadLatestSignalsFromOHLCV(MICRO_TIMEFRAMES, OHLCV_DIR);
      if (preds && preds.length) {
        // prefer primary tf
        let pick = preds.find(p => String(p.timeframe || p.tf) === String(MICRO_PRIMARY_TF)) || preds[0];
        const formatted = formatSignalForDecision(pick.timeframe || pick.tf || 'unknown', normalizeIndexEntry(pick));
        if (formatted) {
          chosenSignal = formatted;
          chosenTf = pick.timeframe || pick.tf || 'unknown';
        }
      }
    }

    if (!chosenSignal) {
      logDebug('No signal available from index or OHLCV files');
      scheduleNext(MICRO_INTERVAL_MS, 'no signal');
      running = false;
      return;
    }

    logDebug('Decision candidate', { tf: chosenTf, label: chosenSignal.ensemble_label, price: chosenSignal.price });

    // optional lightweight stats from summary
    if (chosenSignal.raw && chosenSignal.raw.summary) {
      const s = chosenSignal.raw.summary;
      backtestStats = {
        totalPNL: Number(s.totalPNL ?? s.pnl ?? 0),
        winRate: Number(s.winRate ?? s.win_rate ?? 0),
        avgTradeQuality: Number(s.avgTradeQuality ?? s.avg_trade_quality ?? 0),
        totalTrades: Number(s.totalTrades ?? s.numTrades ?? 0)
      };
    } else backtestStats = null;

    // throttle
    if (!canThrottle()) {
      logDebug('Throttled by lastTradeAt', lastTradeAt);
      scheduleNext(MICRO_INTERVAL_MS, 'throttled');
      running = false;
      return;
    }

    // compact decision
    const lbl = String(chosenSignal.ensemble_label || '').toLowerCase();
    let decision = { type: 'hold', reason: 'no-clear-signal' };
    if (lbl.includes('strong_bull') || (chosenSignal.raw && String(chosenSignal.raw.recent_win?.winner_label || '').toLowerCase().includes('strong_bull'))) {
      decision = { type: 'open', reason: 'strong_bull' };
    } else if (lbl.includes('strong_bear') || (chosenSignal.raw && String(chosenSignal.raw.recent_win?.winner_label || '').toLowerCase().includes('strong_bear'))) {
      decision = { type: 'close', reason: 'strong_bear' };
    } else {
      const score = Number(chosenSignal.raw?.score ?? 0);
      const winRate = Number(backtestStats?.winRate ?? 0);
      if (score >= Number(process.env.MIN_SCORE_FOR_OPEN || 60) || winRate >= Number(process.env.MIN_WINRATE_FOR_OPEN || 0.45)) {
        if (!lbl.includes('bear')) decision = { type: 'open', reason: 'score_or_winrate_pass' };
      } else if (lbl.includes('bear') || score < (Number(process.env.MIN_SCORE_FOR_OPEN || 60) * 0.4)) {
        decision = { type: 'close', reason: 'bear_or_low_score' };
      }
    }

    // execute
    const now = Date.now();
    if (decision.type === 'open' && !position.open) {
      // simulated balance check
      const freeQuote = Number(process.env.SIM_QUOTE_BALANCE || SIM_QUOTE_BALANCE);
      const required = MICRO_ORDER_AMOUNT * chosenSignal.price;
      if (freeQuote < required) {
        logInfo('Insufficient simulated quote to open position', { required, freeQuote });
        logOrder({ ts: chosenSignal.timestamp, action: 'SKIP', reason: 'insufficient simulated quote', fullSignal: chosenSignal, dry: !IS_LIVE });
        scheduleNext(MICRO_INTERVAL_MS, 'skip-insufficient');
        running = false;
        return;
      }

      // PnL preview before BUY (informational)
      try {
        const feeRate = Number.isFinite(FEE_RATE) ? FEE_RATE : 0.001;
        const baseSnapshot = computePositionAndPnl(diagnostics.history || [], chosenSignal.price, { feeRate });
        const hypotTrades = (diagnostics.history || []).concat([{ when: Date.now(), action: 'BUY', price: chosenSignal.price, amount: MICRO_ORDER_AMOUNT, fee: (FEE_IS_PERCENT ? feeRate * chosenSignal.price * MICRO_ORDER_AMOUNT : feeRate) }]);
        const afterBuy = computePositionAndPnl(hypotTrades, chosenSignal.price, { feeRate });
        logInfo('PNL preview before BUY', { before: baseSnapshot, afterBuy });
      } catch (e) {
        logWarn('PNL preview failed', e && e.message ? e.message : e);
      }

      const submitRes = await submitOrder('BUY', MICRO_PAIR, chosenSignal.price, MICRO_ORDER_AMOUNT, chosenSignal);
      if (submitRes && (submitRes.status === 'simulated' || submitRes.status === 'submitted')) {
        position = { open: true, side: 'long', entryPrice: chosenSignal.price, amount: MICRO_ORDER_AMOUNT, openedAt: now };
        diagnostics.lastTrade = { action: 'BUY', id: submitRes.result && submitRes.result.id ? submitRes.result.id : null, ts: Date.now(), simulated: !IS_LIVE };
        logInfo('Position opened', { position });
      }
      scheduleNext(MICRO_INTERVAL_MS, 'post-open');
      running = false;
      return;
    }

    if (decision.type === 'close' && position.open) {
      const available = position.amount || MICRO_ORDER_AMOUNT;
      if (available <= 0) {
        logInfo('Insufficient simulated base to close', { available, needed: position.amount || MICRO_ORDER_AMOUNT });
        logOrder({ ts: chosenSignal.timestamp, action: 'SKIP', reason: 'insufficient simulated base', fullSignal: chosenSignal, dry: !IS_LIVE });
        scheduleNext(MICRO_INTERVAL_MS, 'skip-insufficient-base');
        running = false;
        return;
      }

      // PnL preview before SELL (realization preview)
      try {
        const feeRate = Number.isFinite(FEE_RATE) ? FEE_RATE : 0.001;
        const baseSnapshot = computePositionAndPnl(diagnostics.history || [], chosenSignal.price, { feeRate });
        const hypotTrades = (diagnostics.history || []).concat([{ when: Date.now(), action: 'SELL', price: chosenSignal.price, amount: available, fee: (FEE_IS_PERCENT ? feeRate * chosenSignal.price * available : feeRate) }]);
        const afterSell = computePositionAndPnl(hypotTrades, chosenSignal.price, { feeRate });
        logInfo('PNL preview before SELL', { before: baseSnapshot, afterSell });
      } catch (e) {
        logWarn('PNL preview failed', e && e.message ? e.message : e);
      }

      const submitRes = await submitOrder('SELL', MICRO_PAIR, chosenSignal.price, available, chosenSignal);
      if (submitRes && (submitRes.status === 'simulated' || submitRes.status === 'submitted')) {
        position = { open: false, side: null, entryPrice: null, amount: 0, openedAt: 0 };
        diagnostics.lastTrade = { action: 'SELL', id: submitRes.result && submitRes.result.id ? submitRes.result.id : null, ts: Date.now(), simulated: !IS_LIVE };
        logInfo('Position closed', { position });
      }
      scheduleNext(MICRO_INTERVAL_MS, 'post-close');
      running = false;
      return;
    }

    // hold path with cooldown
    const HOLD_LOG_COOLDOWN_MS = Number(process.env.HOLD_LOG_COOLDOWN_MS || 5 * 60 * 1000);
    const nowTs = Date.now();
    diagnostics._lastLoggedAction = diagnostics._lastLoggedAction || null;
    diagnostics._lastHoldLoggedAt = diagnostics._lastHoldLoggedAt || 0;
    const shouldLogHold = diagnostics._lastLoggedAction !== 'HOLD' || (nowTs - diagnostics._lastHoldLoggedAt) > HOLD_LOG_COOLDOWN_MS;
    if (shouldLogHold) {
      logDebug('HOLD — no conditions met for trade', { reason: decision.reason });
      logOrder({ ts: chosenSignal.timestamp, action: 'HOLD', reason: decision.reason || 'no-op', fullSignal: chosenSignal, dry: !IS_LIVE });
      diagnostics._lastLoggedAction = 'HOLD';
      diagnostics._lastHoldLoggedAt = nowTs;
    } else {
      logDebug('HOLD suppressed (duplicate) until cooldown expires');
    }
    scheduleNext(MICRO_INTERVAL_MS, 'hold');
    running = false;
    return;

  } catch (err) {
    diagnostics.lastError = { stage: 'decideAndAct', message: err && err.message ? err.message : String(err) };
    logError('Main loop error', err && err.stack ? err.stack : err);
    scheduleNext(MICRO_INTERVAL_MS, 'error');
    running = false;
  }
}

// scheduling with single timer guard
function scheduleNext(ms, reason) {
  try {
    if (timerId) clearTimeout(timerId);
    logDebug('Scheduling next run in', ms, 'ms. Reason:', reason);
    timerId = setTimeout(() => {
      timerId = null;
      decideAndAct();
    }, Number(ms) || MICRO_INTERVAL_MS);
  } catch (e) {
    logWarn('scheduleNext failed', e && e.message ? e.message : e);
    // best-effort fallback
    setTimeout(() => decideAndAct(), MICRO_INTERVAL_MS);
  }
}

// startup
loadPositionState();

// Fee-rate sanity logging
if (Number.isFinite(FEE_RATE)) {
  logInfo('Using fee rate', { MICRO_FEE_RATE: FEE_RAW, interpreted_as: FEE_RATE, percent_mode: FEE_IS_PERCENT });
  if (FEE_IS_PERCENT && FEE_RATE > 0.01) logWarn('MICRO_FEE_RATE is > 1% — ensure this is intended and expressed as decimal fraction (e.g. 0.001 for 0.1%)');
} else {
  logWarn('MICRO_FEE_RATE not parseable, defaulting to 0.001 (0.1%)');
}

logInfo('micro_ccxt_orders (index-driven) starting', {
  MICRO_PAIR, MICRO_PRIMARY_TF, DRY_RUN, FORCE_DRY, ENABLE_LIVE, IS_LIVE, DEBUG
});

// show parsed flags explicitly once
logDebug('Parsed flags', { DRY_RUN, FORCE_DRY, ENABLE_LIVE, IS_LIVE });

decideAndAct();
if (!ONCE) {
  // use interval as watchdog to ensure periodic running even if scheduleNext fails
  setInterval(() => { if (!running) decideAndAct(); }, MICRO_INTERVAL_MS).unref();
}

// graceful shutdown
process.on('SIGINT', () => { savePositionState(); logInfo('exiting (SIGINT)'); process.exit(0); });
process.on('SIGTERM', () => { savePositionState(); logInfo('exiting (SIGTERM)'); process.exit(0); });
process.on('uncaughtException', (err) => { diagnostics.lastError = { stage: 'uncaughtException', message: err && err.message ? err.message : String(err) }; logError('uncaughtException', err); savePositionState(); process.exit(1); });
process.on('unhandledRejection', (r) => { diagnostics.lastError = { stage: 'unhandledRejection', message: r && r.message ? r.message : r }; logError('unhandledRejection', r); savePositionState(); process.exit(1); });

// export for testing
module.exports = {
  decideAndAct,
  submitOrder,
  loadPositionState,
  savePositionState,
  formatSignalForDecision
};
