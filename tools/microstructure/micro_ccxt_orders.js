#!/usr/bin/env node
/**
 * micro_ccxt_order.js (enhanced)
 *
 * Microstructure trading bot: modular, auto-tuned, multi-timeframe.
 * - DRY_RUN=1 to simulate (no live orders). DEBUG=1 for verbose logs.
 * - Uses autoTune_results.json for indicator params.
 * - Reads prediction files from logs/json/ohlcv and sanitizes them.
 * - Consults backtest results for regime alignment before trading.
 * - Robust: defensive parsing, graceful failures, diagnostics history.
 *
 * Environment overrides:
 * - DRY_RUN, DEBUG
 * - BACKTEST_JSON_PATH
 * - AUTO_TUNE_PATH
 * - MICRO_PRIMARY_TF (prefer this timeframe for micro decisions)
 * - MICRO_TIMEFRAMES, MICRO_PAIR, MICRO_EXCHANGE, MICRO_ORDER_AMOUNT, MICRO_INTERVAL_MS
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const ccxt = require('ccxt');
const { scoreTrade } = require('../tradeQualityScore');

// Configurable paths (env overrides allowed)
const AUTO_TUNE_PATH = process.env.AUTO_TUNE_PATH || path.resolve(__dirname, '../evaluation/autoTune_results.json');
const OHLCV_DIR = process.env.OHLCV_DIR || path.resolve(__dirname, '../logs/json/ohlcv');
const ORDER_LOG_PATH = process.env.MICRO_ORDER_LOG || path.resolve(__dirname, '../logs/micro_ccxt_orders.log');
const BACKTEST_JSON_PATH = process.env.BACKTEST_JSON_PATH || path.resolve(__dirname, '../backtest/backtest_results.json');

// Micro config
const MICRO_TIMEFRAMES = (process.env.MICRO_TIMEFRAMES || '1m,5m,15m,1h').split(',').map(s => s.trim()).filter(Boolean);
const MICRO_PRIMARY_TF = (process.env.MICRO_PRIMARY_TF || MICRO_TIMEFRAMES[0] || '1m').trim();
const MICRO_PAIR = (process.env.MICRO_PAIR || process.env.PAIR || 'BTC/EUR').toUpperCase();
const MICRO_EXCHANGE = process.env.MICRO_EXCHANGE || process.env.EXCHANGE || 'kraken';
const ORDER_AMOUNT = parseFloat(process.env.MICRO_ORDER_AMOUNT || process.env.ORDER_AMOUNT || '0.001');
const MICRO_INTERVAL = parseInt(process.env.MICRO_INTERVAL_MS || process.env.MICRO_INTERVAL || '300000', 10);

// API keys
const API_KEY    = process.env.KEY    || '';
const API_SECRET = process.env.SECRET || '';

// Strategy / metric
const STRATEGY = process.env.MICRO_STRATEGY || 'Balanced+';
const VARIANT  = process.env.MICRO_VARIANT  || 'PREDICTION';
const METRIC   = process.env.MICRO_METRIC   || 'abs';

// Intervals
const INTERVAL_AFTER_TRADE = parseInt(process.env.INTERVAL_AFTER_TRADE || '30000', 10);
const INTERVAL_AFTER_SKIP  = parseInt(process.env.INTERVAL_AFTER_SKIP || '60000', 10);
const INTERVAL_AFTER_ERROR = parseInt(process.env.INTERVAL_AFTER_ERROR || '60000', 10);

// DRY_RUN & DEBUG from environment
const DRY_RUN = /^(1|true|yes)$/i.test(String(process.env.DRY_RUN || '0'));
const DEBUG = /^(1|true|yes)$/i.test(String(process.env.DEBUG || '0'));

// Simulation defaults (used only when DRY_RUN=true)
const SIM_PRICE = parseFloat(process.env.SIM_PRICE || '30000');
const SIM_BASE_BALANCE = parseFloat(process.env.SIM_BASE_BALANCE || '0.01');
const SIM_QUOTE_BALANCE = parseFloat(process.env.SIM_QUOTE_BALANCE || '1000');

// State & diagnostics
let isRunning = false;
let positionOpen = false;
let entryPrice = null;
let lastTradeTimestamp = 0;
let autoTuneCache = null;
let autoTuneCacheMTime = 0;
let diagnostics = { cycles: 0, lastError: null, lastTrade: null, history: [] };

// Helpers
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function safeJsonRead(fp, fallback = null) {
  try {
    if (!fp || !fs.existsSync(fp)) return fallback;
    const txt = fs.readFileSync(fp, 'utf8');
    if (!txt || !txt.trim()) return fallback;
    return JSON.parse(txt);
  } catch (e) {
    if (DEBUG) console.warn('[MICRO][WARN] safeJsonRead parse error', fp, e && e.message ? e.message : e);
    return fallback;
  }
}

// Auto-tune cache reload
function loadAutoTuneCache() {
  try {
    const stat = fs.existsSync(AUTO_TUNE_PATH) ? fs.statSync(AUTO_TUNE_PATH) : null;
    if (!autoTuneCache || (stat && stat.mtimeMs !== autoTuneCacheMTime)) {
      autoTuneCache = safeJsonRead(AUTO_TUNE_PATH, []);
      autoTuneCacheMTime = stat ? stat.mtimeMs : 0;
      if (DEBUG) console.log('[MICRO][INFO] autoTune cache reloaded', AUTO_TUNE_PATH);
    }
    return autoTuneCache || [];
  } catch (e) {
    if (DEBUG) console.warn('[MICRO][WARN] loadAutoTuneCache error', e && e.message ? e.message : e);
    return [];
  }
}
try { fs.watchFile(AUTO_TUNE_PATH, { interval: 60000 }, () => { autoTuneCache = null; }); } catch(e){}

// Build indicator params mapping (safe)
function getIndicatorParams(metric = METRIC) {
  const IND = [
    { key: 'rsi', param: 'interval', def: 14 },
    { key: 'adx', param: 'period', def: 14 },
    { key: 'dx',  param: 'period', def: 14 },
    { key: 'atr', param: 'period', def: 14 },
    { key: 'sma', param: 'interval', def: 14 },
  ];
  const stats = loadAutoTuneCache();
  const params = {};
  for (const i of IND) {
    const res = (stats || []).find(r => r.indicator === i.key && r.scoring === metric);
    params[i.key.toUpperCase()] = { [i.param]: res ? res.bestParam : i.def };
  }
  return params;
}

// sanitize a raw signal record (maps noisy keys and normalizes "N/A" -> null)
function normalizeMissing(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (!s || s === 'n/a' || s === 'na' || s === 'none' || s === 'null') return null;
    return v.trim();
  }
  return v;
}
function normalizeKeys(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const out = Object.assign({}, raw);
  for (const k of Object.keys(raw)) {
    if (/prediction/i.test(k) && !['prediction','prediction_tf','prediction_convnet','prediction_tf_raw','prediction_convnet_raw'].includes(k)) {
      const low = k.toLowerCase();
      if (low.includes('convnet')) out.prediction_convnet = out.prediction_convnet ?? raw[k];
      else if (low.includes('tf')) out.prediction_tf = out.prediction_tf ?? raw[k];
      else out.prediction = out.prediction ?? raw[k];
    }
  }
  return out;
}
function sanitizeSignal(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  let p = normalizeKeys(raw);
  ['prediction_convnet','prediction_convnet_raw','prediction_tf','prediction_tf_raw','prediction'].forEach(k => {
    if (k in p) p[k] = normalizeMissing(p[k]);
  });
  if (!p.signal_timestamp && p.timestamp) p.signal_timestamp = p.timestamp;
  // derive ensemble_label if not present
  if (!p.ensemble_label) {
    const cand = [];
    ['prediction_convnet','prediction_tf','prediction'].forEach(k => { if (p[k]) cand.push(p[k]); });
    if (cand.length === 1) p.ensemble_label = cand[0];
    else if (cand.length > 1) {
      // simple majority / prefer strong
      const mapped = cand.map(v => {
        if (v === null) return null;
        const s = String(v).trim().toLowerCase();
        if (s.includes('strong') || s === '1' || s === '+1') return 'strong_bull';
        if (s.includes('bear') || s === '-1' || s === '2') return 'strong_bear';
        if (s.includes('bull') || s === 'buy' || s === 'up') return 'bull';
        return 'other';
      }).filter(Boolean);
      const counts = mapped.reduce((acc, x) => { acc[x] = (acc[x]||0)+1; return acc; }, {});
      const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
      if (top) p.ensemble_label = top[0];
    }
  }
  // ensemble_confidence if missing
  if (!p.ensemble_confidence) {
    p.ensemble_confidence = (() => {
      const cand = [];
      ['prediction_convnet','prediction_tf','prediction'].forEach(k => { if (p[k]) cand.push(String(p[k])); });
      if (!cand.length) return 50;
      const uniq = new Set(cand.map(c=>c.toLowerCase()));
      if (uniq.size === 1) return 100;
      if (cand.some(c => /strong/i.test(c))) return 75;
      return 50;
    })();
  }
  return p;
}

// Load latest prediction per timeframe from OHLCV_DIR
function loadLatestSignals(timeframes, dir) {
  const out = [];
  for (const tf of timeframes) {
    const fp = path.join(dir, `ohlcv_ccxt_data_${tf}_prediction.json`);
    const arr = safeJsonRead(fp, []);
    if (Array.isArray(arr) && arr.length) {
      const raw = arr[arr.length - 1];
      raw.timeframe = tf;
      out.push(sanitizeSignal(raw));
    }
  }
  return out;
}

// Backtest stats lookup with diagnostics
function getLatestBacktestStats(tf, strategyName = STRATEGY, variant = VARIANT, diagnosticsRef = null) {
  const results = safeJsonRead(BACKTEST_JSON_PATH, []);
  if (!Array.isArray(results) || !results.length) {
    if (diagnosticsRef) diagnosticsRef.lastError = { stage: 'backtest', message: 'Backtest results file missing or empty.' };
    return null;
  }
  const tfResult = results.find(r => r.source && String(r.source).includes(tf) && (!r.variant || r.variant === variant));
  if (!tfResult) {
    if (diagnosticsRef) diagnosticsRef.lastError = { stage: 'backtest', message: `No entry for timeframe [${tf}] variant [${variant}].` };
    return null;
  }
  const stratResult = (tfResult.results || []).find(x => x.params && x.params.name === strategyName);
  if (!stratResult) {
    if (diagnosticsRef) diagnosticsRef.lastError = { stage: 'backtest', message: `No strategy ${strategyName} found for ${tf}.` };
    return null;
  }
  if (!stratResult.stats || stratResult.stats.numTrades === 0) {
    if (diagnosticsRef) diagnosticsRef.lastError = { stage: 'backtest', message: `Stats present for ${tf}/${strategyName} but no trades executed.` };
    return null;
  }
  return stratResult.stats;
}

// Fetch ticker and balance (DRY_RUN-safe)
async function fetchTickerAndBalance(exchange) {
  if (DRY_RUN) return { ticker: { last: Number(process.env.SIM_PRICE || SIM_PRICE) }, balance: simulatedBalance() };
  try {
    const [ticker, balance] = await Promise.all([exchange.fetchTicker(MICRO_PAIR), exchange.fetchBalance()]);
    return { ticker, balance };
  } catch (err) {
    throw new Error('Failed to fetch ticker/balance: ' + (err && err.message ? err.message : String(err)));
  }
}
function simulatedBalance() {
  const [base, quote] = MICRO_PAIR.split('/').map(s => s.toUpperCase());
  const free = {};
  free[base] = Number(process.env.SIM_BASE_BALANCE || SIM_BASE_BALANCE);
  free[quote] = Number(process.env.SIM_QUOTE_BALANCE || SIM_QUOTE_BALANCE);
  return { free, total: { ...free } };
}
function hasEnoughBalance(balance, action, orderSize, currentPrice) {
  const [base, quote] = MICRO_PAIR.split('/').map(s => s.toUpperCase());
  if (action === 'BUY')  return (balance?.free?.[quote] || 0) >= orderSize * currentPrice;
  if (action === 'SELL') return (balance?.free?.[base]  || 0) >= orderSize;
  return false;
}

// Structured order logging
function logOrder({
  timestamp, model, prediction, label, action, result, reason, error = null, fullSignal,
  indicatorParams = {}, tradeQualityScore = null, tradeQualityBreakdown = null, backtestStats = null, diagnosticsExtra = null, dry = false
}) {
  const lineParts = [
    new Date().toISOString(),
    timestamp || '',
    model || '',
    prediction || '',
    label || '',
    action || '',
    error ? `ERROR: ${error}` : (dry ? 'DRY' : 'SUCCESS'),
    error ? '' : JSON.stringify(result || {}),
    reason || '',
    fullSignal ? JSON.stringify(fullSignal) : '',
    JSON.stringify(indicatorParams),
    tradeQualityScore !== null ? tradeQualityScore : '',
    tradeQualityBreakdown !== null ? JSON.stringify(tradeQualityBreakdown) : '',
    backtestStats !== null ? JSON.stringify(backtestStats) : '',
    diagnosticsExtra !== null ? JSON.stringify(diagnosticsExtra) : ''
  ];
  try {
    fs.mkdirSync(path.dirname(ORDER_LOG_PATH), { recursive: true });
    fs.appendFileSync(ORDER_LOG_PATH, lineParts.join('\t') + '\n');
  } catch (e) {
    console.error('[MICRO][ERROR] Unable to write order log:', e && e.message ? e.message : e);
  }
}

// Throttle & scheduling helpers
function canTradeNow(ts) {
  const t = Number(ts) || Date.now();
  return !lastTradeTimestamp || (t - lastTradeTimestamp) > MICRO_INTERVAL;
}
function scheduleNext(ms, reason) {
  if (DEBUG) console.log(`[MICRO][INFO] Next run in ${ms/1000}s. Reason: ${reason}`);
  setTimeout(main, ms);
}
function printDiagnostics() {
  diagnostics.history = diagnostics.history || [];
  diagnostics.history.push({ cycle: diagnostics.cycles, error: diagnostics.lastError, lastTrade: diagnostics.lastTrade, ts: new Date().toISOString() });
  if (diagnostics.history.length > 20) diagnostics.history = diagnostics.history.slice(-20);
  console.log('[MICRO][DIAGNOSTICS]', {
    cycles: diagnostics.cycles, lastError: diagnostics.lastError, lastTrade: diagnostics.lastTrade, DRY_RUN, DEBUG
  });
}

// Simulated order result
function simulateOrderResult(action, price, amount) {
  return { id: `sim-${Date.now()}`, timestamp: Date.now(), datetime: new Date().toISOString(), symbol: MICRO_PAIR, type: 'market', side: action === 'BUY' ? 'buy' : 'sell', price, amount, info: { simulated: true } };
}

// --- Main trading loop ---
async function main() {
  diagnostics.cycles++;
  if (isRunning) { if (DEBUG) console.warn('[MICRO][WARN] Cycle still running; skipping.'); return; }
  isRunning = true;

  let exchange = null;
  try {
    if (!DRY_RUN) {
      const ExchangeClass = ccxt[MICRO_EXCHANGE];
      if (!ExchangeClass) throw new Error(`Exchange ${MICRO_EXCHANGE} not available in ccxt`);
      exchange = new ExchangeClass({ apiKey: API_KEY, secret: API_SECRET, enableRateLimit: true });
      if (DEBUG && exchange) console.log('[MICRO][INFO] Exchange initialized');
    } else if (DEBUG) {
      console.log('[MICRO][DRY] Running in DRY_RUN mode (no live orders)');
    }
  } catch (e) {
    diagnostics.lastError = { stage: 'exchange_init', message: e && e.message ? e.message : String(e) };
    printDiagnostics();
    scheduleNext(INTERVAL_AFTER_ERROR, 'Exchange init failed');
    isRunning = false; return;
  }

  try {
    // load latest signals (sanitized)
    const signals = loadLatestSignals(MICRO_TIMEFRAMES, OHLCV_DIR);
    if (!signals.length) {
      diagnostics.lastError = { stage: 'signal', message: 'No prediction signals found' };
      printDiagnostics();
      scheduleNext(MICRO_INTERVAL, 'No prediction signals');
      isRunning = false; return;
    }

    // prefer primary timeframe signal if available
    let lastSignal = signals.find(s => s.timeframe === MICRO_PRIMARY_TF) || signals[0];
    if (!lastSignal || !lastSignal.timestamp) {
      diagnostics.lastError = { stage: 'signal', message: 'No valid lastSignal' };
      printDiagnostics();
      scheduleNext(MICRO_INTERVAL, 'Invalid lastSignal');
      isRunning = false; return;
    }

    // indicator params & backtest stats
    const indicatorParams = getIndicatorParams(METRIC);
    const backtestStats = getLatestBacktestStats(lastSignal.timeframe || MICRO_PRIMARY_TF, STRATEGY, VARIANT, diagnostics);
    if (!backtestStats) {
      printDiagnostics();
      scheduleNext(MICRO_INTERVAL, 'Missing backtest stats');
      isRunning = false; return;
    }
    if (DEBUG) console.log('[MICRO][DEBUG] backtestStats:', backtestStats);

    // pre-trade trade quality
    const signalStrength = (String(lastSignal.ensemble_label || lastSignal.prediction || '').toLowerCase().includes('bull') ? 90 : (String(lastSignal.ensemble_label || lastSignal.prediction || '').toLowerCase().includes('bear') ? 90 : 50));
    const tradeQuality = scoreTrade({
      signalStrength,
      modelWinRate: backtestStats.winRate || 0.5,
      riskReward: 2,
      executionQuality: 90,
      volatility: Number(lastSignal.volatility) || 1,
      tradeOutcome: null,
      ensembleConfidence: Number(lastSignal.ensemble_confidence) || 50,
      signalAge: Number(lastSignal.signal_timestamp ? (Date.now() - Number(lastSignal.signal_timestamp))/1000 : 0),
      regimeAlign: 50,
      ...Object.fromEntries(Object.entries(indicatorParams).map(([k,v]) => [`${k.toLowerCase()}Param`, v]))
    });
    if (DEBUG) console.log('[MICRO][DEBUG] tradeQuality.totalScore=', tradeQuality.totalScore);

    // enforce regime: skip if backtest poor
    if ((backtestStats.totalPNL || 0) <= 0 || (backtestStats.winRate || 0) < 0.5) {
      logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model || '', prediction: lastSignal.prediction, label: lastSignal.label,
        action: 'SKIP', result: null, reason: `Backtest regime not favorable (PNL=${backtestStats.totalPNL}, winRate=${backtestStats.winRate})`,
        fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics, dry: DRY_RUN
      });
      printDiagnostics();
      scheduleNext(INTERVAL_AFTER_SKIP, 'Regime skip');
      isRunning = false; return;
    }

    if ((tradeQuality.totalScore || 0) < 65) {
      logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model || '', prediction: lastSignal.prediction, label: lastSignal.label,
        action: 'SKIP', result: null, reason: `Trade quality too low (${tradeQuality.totalScore})`,
        fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics, dry: DRY_RUN
      });
      printDiagnostics();
      scheduleNext(INTERVAL_AFTER_SKIP, 'Low trade quality');
      isRunning = false; return;
    }

    const { ticker, balance } = await fetchTickerAndBalance(exchange);
    const currentPrice = Number(ticker?.last) || Number(process.env.SIM_PRICE || SIM_PRICE);
    const orderSize = clamp(ORDER_AMOUNT, 0.00001, 0.1);

    // ENTRY: buy on strong_bull
    if (!positionOpen && (String(lastSignal.ensemble_label || lastSignal.prediction).toLowerCase().includes('strong_bull') || String(lastSignal.ensemble_label || lastSignal.prediction).toLowerCase() === 'strong_bull') && canTradeNow(lastSignal.signal_timestamp || lastSignal.timestamp)) {
      if (!hasEnoughBalance(balance, 'BUY', orderSize, currentPrice)) {
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model || '', prediction: lastSignal.prediction, label: lastSignal.label,
          action: 'SKIP', result: null, reason: 'Insufficient balance', fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics, dry: DRY_RUN
        });
        printDiagnostics();
        scheduleNext(INTERVAL_AFTER_SKIP, 'Insufficient balance');
        isRunning = false; return;
      }

      if (DRY_RUN) {
        const res = simulateOrderResult('BUY', currentPrice, orderSize);
        positionOpen = true; entryPrice = res.price; diagnostics.lastTrade = { action: 'BUY', timestamp: lastSignal.timestamp, tf: lastSignal.timeframe, simulated: true };
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model || '', prediction: lastSignal.prediction, label: lastSignal.label, action: 'BUY', result: res, reason: `DRY strong_bull ${lastSignal.timeframe}`, fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics, dry: true });
        lastTradeTimestamp = Number(lastSignal.signal_timestamp || lastSignal.timestamp) || Date.now();
        printDiagnostics();
        scheduleNext(INTERVAL_AFTER_TRADE, 'DRY buy');
        isRunning = false; return;
      }

      // live
      try {
        const res = await exchange.createMarketBuyOrder(MICRO_PAIR, orderSize);
        positionOpen = true; entryPrice = res.price || res.average || currentPrice; diagnostics.lastTrade = { action: 'BUY', timestamp: lastSignal.timestamp, tf: lastSignal.timeframe };
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model || '', prediction: lastSignal.prediction, label: lastSignal.label, action: 'BUY', result: res, reason: `LIVE strong_bull ${lastSignal.timeframe}`, fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics, dry: false });
        lastTradeTimestamp = Number(lastSignal.signal_timestamp || lastSignal.timestamp) || Date.now();
        printDiagnostics();
        scheduleNext(INTERVAL_AFTER_TRADE, 'Live buy submitted');
        isRunning = false; return;
      } catch (e) {
        diagnostics.lastError = { stage: 'buy', message: e && e.message ? e.message : String(e) };
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model || '', prediction: lastSignal.prediction, label: lastSignal.label, action: 'BUY', result: null, reason: 'Failed to submit BUY', error: e && e.message ? e.message : String(e), fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics, dry: false });
        printDiagnostics();
        scheduleNext(INTERVAL_AFTER_ERROR, 'Buy failed');
        isRunning = false; return;
      }
    }

    // EXIT: sell if position open and regime negative or signal bear
    if (positionOpen && ((backtestStats.totalPNL || 0) <= 0 || (backtestStats.winRate || 0) < 0.5 || String(lastSignal.ensemble_label || lastSignal.prediction).toLowerCase().includes('bear'))) {
      if (!hasEnoughBalance(balance, 'SELL', orderSize, currentPrice)) {
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model || '', prediction: lastSignal.prediction, label: lastSignal.label, action: 'SKIP', result: null, reason: 'Insufficient balance to SELL', fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics, dry: DRY_RUN });
        printDiagnostics();
        scheduleNext(INTERVAL_AFTER_SKIP, 'Insufficient balance sell');
        isRunning = false; return;
      }

      if (DRY_RUN) {
        const res = simulateOrderResult('SELL', currentPrice, orderSize);
        positionOpen = false; entryPrice = null; diagnostics.lastTrade = { action: 'SELL', timestamp: lastSignal.timestamp, tf: lastSignal.timeframe, simulated: true };
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model || '', prediction: lastSignal.prediction, label: lastSignal.label, action: 'SELL', result: res, reason: `DRY regime negative or bear ${lastSignal.timeframe}`, fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics, dry: true });
        lastTradeTimestamp = Number(lastSignal.signal_timestamp || lastSignal.timestamp) || Date.now();
        printDiagnostics();
        scheduleNext(INTERVAL_AFTER_TRADE, 'DRY sell');
        isRunning = false; return;
      }

      try {
        const res = await exchange.createMarketSellOrder(MICRO_PAIR, orderSize);
        positionOpen = false; entryPrice = null; diagnostics.lastTrade = { action: 'SELL', timestamp: lastSignal.timestamp, tf: lastSignal.timeframe };
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model || '', prediction: lastSignal.prediction, label: lastSignal.label, action: 'SELL', result: res, reason: `LIVE regime negative/bear ${lastSignal.timeframe}`, fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics, dry: false });
        lastTradeTimestamp = Number(lastSignal.signal_timestamp || lastSignal.timestamp) || Date.now();
        printDiagnostics();
        scheduleNext(INTERVAL_AFTER_TRADE, 'Live sell executed');
        isRunning = false; return;
      } catch (e) {
        diagnostics.lastError = { stage: 'sell', message: e && e.message ? e.message : String(e) };
        logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model || '', prediction: lastSignal.prediction, label: lastSignal.label, action: 'SELL', result: null, reason: 'Failed to submit SELL', error: e && e.message ? e.message : String(e), fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics, dry: false });
        printDiagnostics();
        scheduleNext(INTERVAL_AFTER_ERROR, 'Sell failed');
        isRunning = false; return;
      }
    }

    // No-op: log HOLD
    logOrder({ timestamp: lastSignal.timestamp, model: lastSignal.model || '', prediction: lastSignal.prediction, label: lastSignal.label, action: 'HOLD', result: null, reason: `No trade condition met on ${lastSignal.timeframe}`, fullSignal: lastSignal, indicatorParams, tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown, backtestStats, diagnosticsExtra: diagnostics, dry: DRY_RUN });
    printDiagnostics();
    scheduleNext(MICRO_INTERVAL, 'No trade');
  } catch (errMain) {
    diagnostics.lastError = { stage: 'main', message: errMain && errMain.message ? errMain.message : String(errMain) };
    printDiagnostics();
    console.error('[MICRO][UNCAUGHT]', errMain && errMain.stack ? errMain.stack : errMain);
    scheduleNext(INTERVAL_AFTER_ERROR, 'Unhandled exception');
  } finally {
    isRunning = false;
  }
}

// Start
console.log(`[MICRO][INFO] starting micro bot: TFs=${MICRO_TIMEFRAMES.join(',')} primary=${MICRO_PRIMARY_TF} pair=${MICRO_PAIR} exchange=${MICRO_EXCHANGE} DRY_RUN=${DRY_RUN} DEBUG=${DEBUG}`);
main();

// Global handlers
process.on('uncaughtException', (e) => {
  diagnostics.lastError = { stage: 'uncaughtException', message: e && e.message ? e.message : String(e) };
  printDiagnostics();
  console.error('[MICRO][FATAL]', e);
});
process.on('unhandledRejection', (r) => {
  diagnostics.lastError = { stage: 'unhandledRejection', message: r && r.message ? r.message : String(r) };
  printDiagnostics();
  console.error('[MICRO][FATAL] unhandledRejection', r);
});
