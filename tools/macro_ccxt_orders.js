/**
 * Macrostructure trading bot: ultra-resilient, multi-timeframe, robust error handling.
 * Now reads signals from macro_signal.log for each timeframe.
 * Enhanced for: detailed logging, regime fallback, adaptive error recovery, and runtime diagnostics.
 */

const fs = require('fs');
const path = require('path');
const ccxt = require('ccxt');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const LOG_PREFIX = '[macrostructure]';
const MACRO_SIGNAL_LOG = path.resolve(__dirname, './logs/macro_signal.log');
const BACKTEST_RESULTS_PATH = path.resolve(__dirname, './backtest/backtest_results.json');
const ORDER_LOG_PATH = path.resolve(__dirname, './logs/ccxt_order.log');
const TIMEFRAMES = (process.env.MACRO_TIMEFRAMES || '1m,5m,15m,1h').split(',').map(x=>x.trim());
const STRATEGY = process.env.MACRO_STRATEGY || 'Balanced+';
const VARIANT = process.env.MACRO_VARIANT || 'RAW';

const EXCHANGE = process.env.EXCHANGE || 'kraken';
const API_KEY = process.env.KEY || '';
const API_SECRET = process.env.SECRET || '';
const PAIR = process.env.PAIR || 'BTC/EUR';
const ORDER_AMOUNT = parseFloat(process.env.ORDER_AMOUNT) || 0.001;

let isRunning = false;
let positionOpen = false;
let lastTradeAt = 0;
let diagnostics = { cycles: 0, lastError: null, lastTrade: null };

// --- Utility Functions ---

function safeJsonRead(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const text = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(text);
  } catch (err) {
    console.warn(`${LOG_PREFIX} [WARN] Failed to read/parse ${filePath}:`, err);
    return fallback;
  }
}

function safeGetBacktestStats(tf, strategy = STRATEGY, variant = VARIANT) {
  const results = safeJsonRead(BACKTEST_RESULTS_PATH, []);
  const tfResult = results.find(r =>
    r.source && r.source.includes(tf) && (!r.variant || r.variant === variant)
  );
  if (!tfResult) return null;
  const stratResult = tfResult.results.find(x => x.params.name === strategy);
  return stratResult ? stratResult.stats : null;
}

// --- NEW: Load latest macro signals (one per TF, most recent per tf) ---
function safeGetLatestMacroSignals() {
  if (!fs.existsSync(MACRO_SIGNAL_LOG)) return {};
  const lines = fs.readFileSync(MACRO_SIGNAL_LOG, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
  // For each timeframe, pick the signal with the highest (latest) timestamp
  const latestByTf = {};
  for (const tf of TIMEFRAMES) {
    const tfSignals = lines.filter(s => s.timeframe === tf);
    if (tfSignals.length) {
      tfSignals.sort((a, b) => b.timestamp - a.timestamp); // Descending
      latestByTf[tf] = tfSignals[0];
    }
  }
  return latestByTf;
}

function logOrder({ timestamp, action, result, reason, error = null, regime, stats, signal, diagnosticsExtra }) {
  try {
    const logLine = [
      new Date().toISOString(),
      timestamp, action,
      error ? `ERROR: ${error}` : 'SUCCESS',
      error ? '' : JSON.stringify(result || {}),
      reason || '', regime || '',
      stats ? JSON.stringify(stats) : '',
      signal ? JSON.stringify(signal) : '',
      diagnosticsExtra ? JSON.stringify(diagnosticsExtra) : ''
    ].join('\t') + '\n';
    fs.appendFileSync(ORDER_LOG_PATH, logLine);
  } catch (err) {
    console.error(`${LOG_PREFIX} [ERROR] Failed to log order:`, err);
  }
}

function regimeFromStats(stats) {
  if (!stats) return "Unknown";
  if (stats.totalPNL > 0 && stats.winRate > 0.45) return "Bull";
  if (stats.totalPNL < 0 && stats.winRate < 0.45) return "Bear";
  return "Flat";
}

function canTradeNow(timestamp, throttleMs = 12 * 60 * 1000) {
  return !lastTradeAt || (Number(timestamp) - lastTradeAt > throttleMs);
}

function scheduleNext(ms, reason = "") {
  if (reason) console.log(`${LOG_PREFIX} [INFO] Next run in ${ms / 1000}s. Reason: ${reason}`);
  setTimeout(main, ms);
}

function printDiagnostics() {
  console.log(`${LOG_PREFIX} [DIAGNOSTICS]`, {
    cycles: diagnostics.cycles,
    lastError: diagnostics.lastError,
    lastTrade: diagnostics.lastTrade,
    timestamp: new Date().toISOString()
  });
}

// --- Main Trading Logic ---
async function main() {
  diagnostics.cycles++;
  if (isRunning) {
    console.warn(`${LOG_PREFIX} [WARN] Previous cycle still running, skipping.`);
    return;
  }
  isRunning = true;
  try {
    // --- Exchange Init (catch errors but never crash loop) ---
    let exchange;
    try {
      const ExchangeClass = ccxt[EXCHANGE];
      if (!ExchangeClass) throw new Error(`Exchange '${EXCHANGE}' not found in ccxt.`);
      exchange = new ExchangeClass({
        apiKey: API_KEY,
        secret: API_SECRET,
        enableRateLimit: true,
      });
    } catch (err) {
      diagnostics.lastError = {stage: 'exchange_init', message: err.message || err};
      console.error(`${LOG_PREFIX} [ERROR] Exchange init failed:`, err);
      scheduleNext(60000, "Exchange init failed.");
      return;
    }

    // --- NEW: Read latest macro signals for each timeframe ---
    const latestSignals = safeGetLatestMacroSignals();
    let best = null;
    for (const tf of TIMEFRAMES) {
      const signal = latestSignals[tf];
      const stats = safeGetBacktestStats(tf);
      const regime = regimeFromStats(stats);
      console.log(`${LOG_PREFIX} [DEBUG] MacroSignal for ${tf}:`, signal, `Stats:`, stats, `Regime: ${regime}`);
      if (!stats || !signal) continue;
      if (regime === "Bull" && signal.ensemble_label === 'strong_bull' && (!best || stats.totalPNL > best.stats.totalPNL)) {
        best = {tf, stats, signal};
      }
    }

    if (!best) {
      diagnostics.lastError = {stage: 'regime_select', message: 'No Bull regime'};
      printDiagnostics();
      console.log(`${LOG_PREFIX} [INFO] No valid Bull regime for any macro timeframe.`);
      scheduleNext(180000, "No positive macro regime.");
      return;
    }
    const {tf: bestTf, stats: bestStats, signal: bestSignal} = best;

    // --- Decision logic: BUY/SELL/HOLD with full error catching ---
    // --- BUY ---
    if (!positionOpen &&
        bestSignal.ensemble_label === 'strong_bull' &&
        canTradeNow(bestSignal.timestamp)) {
      try {
        const [ticker, balance] = await Promise.all([
          exchange.fetchTicker(PAIR),
          exchange.fetchBalance()
        ]);
        const currentPrice = ticker.last;
        const quote = PAIR.split('/')[1].toUpperCase();
        const quoteFree = balance.free[quote] || 0;
        if (quoteFree < ORDER_AMOUNT * currentPrice) {
          logOrder({ timestamp: bestSignal.timestamp, action: 'SKIP', result: null,
            reason: 'Insufficient balance for BUY', regime: 'Bull', stats: bestStats, signal: bestSignal, diagnosticsExtra: diagnostics });
          scheduleNext(90000, "Insufficient balance for BUY.");
          return;
        }
        const result = await exchange.createMarketBuyOrder(PAIR, ORDER_AMOUNT);
        positionOpen = true;
        lastTradeAt = Number(bestSignal.timestamp);
        diagnostics.lastTrade = {action: 'BUY', timestamp: bestSignal.timestamp, tf: bestTf};
        logOrder({ timestamp: bestSignal.timestamp, action: 'BUY', result,
          reason: `strong_bull on ${bestTf}`, regime: 'Bull', stats: bestStats, signal: bestSignal, diagnosticsExtra: diagnostics });
        console.log(`${LOG_PREFIX} [INFO][${bestSignal.timestamp}] BUY order submitted on ${bestTf}`);
        printDiagnostics();
        scheduleNext(30000, "BUY order submitted.");
        return;
      } catch (err) {
        diagnostics.lastError = {stage: 'buy', message: err.message || err};
        logOrder({ timestamp: bestSignal.timestamp, action: 'BUY', result: null,
          error: err.message || err, reason: 'Failed to submit BUY', regime: 'Bull', stats: bestStats, signal: bestSignal, diagnosticsExtra: diagnostics });
        printDiagnostics();
        scheduleNext(60000, "Failed to submit BUY.");
        return;
      }
    }

    // --- SELL logic: close position if regime turns negative ---
    if (positionOpen && (
      bestStats.totalPNL <= 0 ||
      bestStats.winRate < 0.45 ||
      bestSignal.ensemble_label === 'strong_bear'
    )) {
      try {
        const [ticker, balance] = await Promise.all([
          exchange.fetchTicker(PAIR),
          exchange.fetchBalance()
        ]);
        const base = PAIR.split('/')[0].toUpperCase();
        const baseFree = balance.free[base] || 0;
        if (baseFree < ORDER_AMOUNT) {
          logOrder({ timestamp: bestSignal.timestamp, action: 'SKIP', result: null,
            reason: 'Insufficient balance for SELL', regime: regimeFromStats(bestStats), stats: bestStats, signal: bestSignal, diagnosticsExtra: diagnostics });
          scheduleNext(90000, "Insufficient balance for SELL.");
          return;
        }
        const result = await exchange.createMarketSellOrder(PAIR, ORDER_AMOUNT);
        positionOpen = false;
        lastTradeAt = Number(bestSignal.timestamp);
        diagnostics.lastTrade = {action: 'SELL', timestamp: bestSignal.timestamp, tf: bestTf};
        logOrder({ timestamp: bestSignal.timestamp, action: 'SELL', result,
          reason: `Regime negative or bear signal on ${bestTf}`, regime: regimeFromStats(bestStats), stats: bestStats, signal: bestSignal, diagnosticsExtra: diagnostics });
        console.log(`${LOG_PREFIX} [INFO][${bestSignal.timestamp}] SELL order submitted on ${bestTf}`);
        printDiagnostics();
        scheduleNext(30000, "SELL order submitted.");
        return;
      } catch (err) {
        diagnostics.lastError = {stage: 'sell', message: err.message || err};
        logOrder({ timestamp: bestSignal.timestamp, action: 'SELL', result: null,
          error: err.message || err, reason: 'Failed to submit SELL', regime: regimeFromStats(bestStats), stats: bestStats, signal: bestSignal, diagnosticsExtra: diagnostics });
        printDiagnostics();
        scheduleNext(60000, "Failed to submit SELL.");
        return;
      }
    }

    // --- Default: HOLD ---
    logOrder({ timestamp: bestSignal.timestamp, action: 'HOLD', result: null,
      reason: `No trade condition met on ${bestTf}`, regime: regimeFromStats(bestStats), stats: bestStats, signal: bestSignal, diagnosticsExtra: diagnostics });
    printDiagnostics();
    scheduleNext(180000, `No trade condition met on ${bestTf}.`);
  } catch (e) {
    diagnostics.lastError = {stage: 'main', message: e.message || e};
    printDiagnostics();
    console.error(`${LOG_PREFIX} [UNCAUGHT EXCEPTION]:`, e);
    scheduleNext(60000, "Uncaught exception.");
  } finally {
    isRunning = false; // <-- always reset running flag!
  }
}

// --- Startup ---
console.log(`${LOG_PREFIX} [INFO] Macrostructure bot starting up...`);
main();

process.on('uncaughtException', (err) => {
  diagnostics.lastError = {stage: 'uncaughtException', message: err.message || err};
  printDiagnostics();
  console.error(`${LOG_PREFIX} [UNCAUGHT EXCEPTION]:`, err);
});
process.on('unhandledRejection', (reason) => {
  diagnostics.lastError = {stage: 'unhandledRejection', message: reason && reason.message ? reason.message : reason};
  printDiagnostics();
  console.error(`${LOG_PREFIX} [UNHANDLED REJECTION]:`, reason);
});
