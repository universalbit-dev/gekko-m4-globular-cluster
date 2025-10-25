#!/usr/bin/env node
/**
 * Macrostructure trading bot — DRY_RUN-optimized version
 * - Safe DRY_RUN mode simulates exchange, balances and orders
 * - DEBUG mode prints per-decision diagnostics
 * - Config via env:
 *     DRY_RUN (1|true|yes)         -> simulate orders (default: true)
 *     DEBUG (1|true|yes)           -> verbose decision logs (default: true)
 *     SIM_PRICE                    -> simulated market price when DRY_RUN
 *     SIM_BASE_BALANCE             -> simulated base asset free balance (when DRY_RUN)
 *     SIM_QUOTE_BALANCE            -> simulated quote asset free balance (when DRY_RUN)
 *     DRY_INTERVAL_MS              -> scan interval during DRY_RUN (ms)
 *     ORDER_AMOUNT                 -> order amount (float)
 *
 * Usage:
 *   DRY_RUN=1 DEBUG=1 SIM_PRICE=35000 node tools/macro_ccxt_orders.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const LOG_PREFIX = '[macrostructure design]';
const MACRO_SIGNAL_LOG = path.resolve(__dirname, './logs/macro_signal.log');
const BACKTEST_RESULTS_PATH = path.resolve(__dirname, './backtest/backtest_results.json');
const ORDER_LOG_PATH = path.resolve(__dirname, './logs/ccxt_order.log');

// env/config
const TIMEFRAMES = (process.env.MACRO_TIMEFRAMES || '1m,5m,15m,1h').split(',').map(x => x.trim());
const STRATEGY = process.env.MACRO_STRATEGY || 'Balanced+';
const VARIANT = process.env.MACRO_VARIANT || 'RAW';
const EXCHANGE = process.env.EXCHANGE || 'kraken';
const API_KEY = process.env.KEY || '';
const API_SECRET = process.env.SECRET || '';
const PAIR = process.env.PAIR || 'BTC/EUR';
const ORDER_AMOUNT = parseFloat(process.env.ORDER_AMOUNT || process.env.ORDER_AMOUNT || '0.001');

const DRY_RUN = /^(1|true|yes)$/i.test('true');
const DEBUG = /^(1|true|yes)$/i.test(String(process.env.DEBUG || '0'));
const DRY_INTERVAL_MS = parseInt(process.env.DRY_INTERVAL_MS || '15000', 10); // quicker in dry-run
const NOMINAL_INTERVAL_MS = parseInt(process.env.MACRO_INTERVAL_MS || '180000', 10); // normal interval
const INTERVAL_MS = DRY_RUN ? DRY_INTERVAL_MS : NOMINAL_INTERVAL_MS;

// simulation params (used only in DRY_RUN)
const SIM_PRICE = parseFloat(process.env.SIM_PRICE || '30000'); // default simulated price
const SIM_BASE_BALANCE = parseFloat(process.env.SIM_BASE_BALANCE || '0.01'); // base asset (e.g., BTC)
const SIM_QUOTE_BALANCE = parseFloat(process.env.SIM_QUOTE_BALANCE || '1000'); // quote asset (e.g., EUR)

let isRunning = false;
let positionOpen = false;
let lastTradeAt = 0;
let diagnostics = { cycles: 0, lastError: null, lastTrade: null };

// small helper to write a structured order log line (tab separated)
function logOrder({ timestamp, action, result, reason, error = null, regime, stats, signal, diagnosticsExtra, dry = false }) {
  try {
    const logLine = [
      new Date().toISOString(),
      timestamp, action,
      error ? `ERROR: ${error}` : (dry ? 'DRY' : 'SUCCESS'),
      error ? '' : JSON.stringify(result || {}),
      reason || '',
      regime || '',
      stats ? JSON.stringify(stats) : '',
      signal ? JSON.stringify(signal) : '',
      diagnosticsExtra ? JSON.stringify(diagnosticsExtra) : ''
    ].join('\t') + '\n';
    fs.appendFileSync(ORDER_LOG_PATH, logLine);
  } catch (err) {
    console.error(`${LOG_PREFIX} [ERROR] Failed to write order log:`, err);
  }
}

function safeJsonRead(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const text = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(text);
  } catch (err) {
    console.warn(`${LOG_PREFIX} [WARN] Failed to read/parse ${filePath}:`, err && err.message ? err.message : err);
    return fallback;
  }
}

function safeGetBacktestStats(tf, strategy = STRATEGY, variant = VARIANT) {
  const results = safeJsonRead(BACKTEST_RESULTS_PATH, []);
  if (!Array.isArray(results)) return null;
  const tfResult = results.find(r => r.source && String(r.source).includes(tf) && (!r.variant || r.variant === variant));
  if (!tfResult) return null;
  const stratResult = (tfResult.results || []).find(x => x.params && x.params.name === strategy);
  return stratResult ? stratResult.stats : null;
}

function safeGetLatestMacroSignals() {
  if (!fs.existsSync(MACRO_SIGNAL_LOG)) return {};
  const lines = fs.readFileSync(MACRO_SIGNAL_LOG, 'utf8').split(/\r?\n/).filter(Boolean);
  const parsed = [];
  for (const line of lines) {
    try { parsed.push(JSON.parse(line)); } catch { /* ignore */ }
  }
  const latestByTf = {};
  for (const tf of TIMEFRAMES) {
    const tfSignals = parsed.filter(s => String(s.timeframe) === tf);
    if (tfSignals.length) {
      tfSignals.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
      latestByTf[tf] = tfSignals[0];
    }
  }
  return latestByTf;
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
    timestamp: new Date().toISOString(),
    DRY_RUN, DEBUG
  });
}

// --- Exchange wrapper that supports DRY_RUN simulation ---
let ccxtInstance = null;
async function getExchange() {
  if (DRY_RUN) return null; // caller must handle DRY_RUN path separately
  if (ccxtInstance) return ccxtInstance;
  try {
    const ccxt = require('ccxt');
    const ExchangeClass = ccxt[EXCHANGE];
    if (!ExchangeClass) throw new Error(`Exchange '${EXCHANGE}' not found in ccxt`);
    ccxtInstance = new ExchangeClass({
      apiKey: API_KEY,
      secret: API_SECRET,
      enableRateLimit: true
    });
    if (typeof ccxtInstance.loadMarkets === 'function') await ccxtInstance.loadMarkets();
    return ccxtInstance;
  } catch (err) {
    throw err;
  }
}

// simulate order result (for DRY_RUN)
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

// simulate balance object similar enough for our checks
function simulatedBalance() {
  // derive base/quote from PAIR
  const parts = String(PAIR).split('/');
  const base = (parts[0] || 'BASE').toUpperCase();
  const quote = (parts[1] || 'QUOTE').toUpperCase();
  const free = {};
  free[base] = Number(process.env.SIM_BASE_BALANCE || SIM_BASE_BALANCE);
  free[quote] = Number(process.env.SIM_QUOTE_BALANCE || SIM_QUOTE_BALANCE);
  return { free, total: { ...free } };
}

// --- Main logic with DRY_RUN branches ---
async function main() {
  diagnostics.cycles++;
  if (isRunning) {
    console.warn(`${LOG_PREFIX} [WARN] Previous cycle still running, skipping.`);
    return;
  }
  isRunning = true;
  try {
    // prepare exchange or simulation
    let exchange = null;
    if (!DRY_RUN) {
      try {
        exchange = await getExchange();
      } catch (err) {
        diagnostics.lastError = { stage: 'exchange_init', message: err && err.message ? err.message : err };
        console.error(`${LOG_PREFIX} [ERROR] Exchange init failed:`, err && err.message ? err.message : err);
        scheduleNext(60000, "Exchange init failed");
        return;
      }
    } else if (DEBUG) {
      console.log(`${LOG_PREFIX} [DRY] Running in dry-run mode. Simulated price=${SIM_PRICE}`);
    }

    const latestSignals = safeGetLatestMacroSignals();
    let best = null;
    for (const tf of TIMEFRAMES) {
      const signal = latestSignals[tf];
      const stats = safeGetBacktestStats(tf);
      const regime = regimeFromStats(stats);
      if (DEBUG) console.log(`${LOG_PREFIX} [DEBUG] tf=${tf} signal=${signal ? JSON.stringify(signal) : 'none'} regime=${regime}`);
      if (!stats || !signal) continue;
      if (regime === "Bull" && signal.ensemble_label === 'strong_bull' && (!best || stats.totalPNL > best.stats.totalPNL)) {
        best = { tf, stats, signal };
      }
    }

    if (!best) {
      diagnostics.lastError = { stage: 'regime_select', message: 'No Bull regime' };
      printDiagnostics();
      scheduleNext(INTERVAL_MS, "No positive macro regime");
      return;
    }

    const { tf: bestTf, stats: bestStats, signal: bestSignal } = best;

    // action: BUY if not positionOpen and strong_bull and throttle ok
    if (!positionOpen && bestSignal.ensemble_label === 'strong_bull' && canTradeNow(bestSignal.timestamp)) {
      if (DRY_RUN) {
        // simulate fetchTicker and balance checks
        const price = Number(process.env.SIM_PRICE || SIM_PRICE);
        const balance = simulatedBalance();
        const quote = String(PAIR).split('/')[1].toUpperCase();
        const required = ORDER_AMOUNT * price;
        if ((balance.free[quote] || 0) < required) {
          logOrder({
            timestamp: bestSignal.timestamp,
            action: 'SKIP',
            result: null,
            reason: 'Insufficient simulated quote balance for BUY',
            regime: 'Bull',
            stats: bestStats,
            signal: bestSignal,
            diagnosticsExtra: diagnostics,
            dry: true
          });
          scheduleNext(INTERVAL_MS, "Insufficient simulated quote for BUY");
          return;
        }
        const result = simulateOrderResult('BUY', price, ORDER_AMOUNT);
        positionOpen = true;
        lastTradeAt = Number(bestSignal.timestamp) || Date.now();
        diagnostics.lastTrade = { action: 'BUY', timestamp: bestSignal.timestamp, tf: bestTf, simulated: true };
        logOrder({
          timestamp: bestSignal.timestamp,
          action: 'BUY',
          result,
          reason: `DRY strong_bull on ${bestTf}`,
          regime: 'Bull',
          stats: bestStats,
          signal: bestSignal,
          diagnosticsExtra: diagnostics,
          dry: true
        });
        if (DEBUG) console.log(`${LOG_PREFIX} [DRY] Simulated BUY at ${price} size ${ORDER_AMOUNT} id=${result.id}`);
        scheduleNext(INTERVAL_MS, "Simulated BUY executed");
        return;
      } else {
        // live path: real exchange
        try {
          const [ticker, balance] = await Promise.all([exchange.fetchTicker(PAIR), exchange.fetchBalance()]);
          const currentPrice = ticker.last;
          const quote = String(PAIR).split('/')[1].toUpperCase();
          const quoteFree = (balance.free && balance.free[quote]) || 0;
          const required = ORDER_AMOUNT * currentPrice;
          if (quoteFree < required) {
            logOrder({
              timestamp: bestSignal.timestamp,
              action: 'SKIP',
              result: null,
              reason: 'Insufficient balance for BUY',
              regime: 'Bull',
              stats: bestStats,
              signal: bestSignal,
              diagnosticsExtra: diagnostics,
              dry: false
            });
            scheduleNext(INTERVAL_MS, "Insufficient balance for BUY");
            return;
          }
          const result = await exchange.createMarketBuyOrder(PAIR, ORDER_AMOUNT);
          positionOpen = true;
          lastTradeAt = Number(bestSignal.timestamp) || Date.now();
          diagnostics.lastTrade = { action: 'BUY', timestamp: bestSignal.timestamp, tf: bestTf };
          logOrder({
            timestamp: bestSignal.timestamp,
            action: 'BUY',
            result,
            reason: `strong_bull on ${bestTf}`,
            regime: 'Bull',
            stats: bestStats,
            signal: bestSignal,
            diagnosticsExtra: diagnostics,
            dry: false
          });
          console.log(`${LOG_PREFIX} [INFO] BUY submitted on ${bestTf}`);
          scheduleNext(INTERVAL_MS, "BUY submitted");
          return;
        } catch (err) {
          diagnostics.lastError = { stage: 'buy', message: err && err.message ? err.message : err };
          logOrder({
            timestamp: bestSignal.timestamp,
            action: 'BUY',
            result: null,
            error: err && err.message ? err.message : err,
            reason: 'Failed to submit BUY',
            regime: 'Bull',
            stats: bestStats,
            signal: bestSignal,
            diagnosticsExtra: diagnostics,
            dry: false
          });
          printDiagnostics();
          scheduleNext(60000, "Failed to submit BUY");
          return;
        }
      }
    }

    // SELL path: close if open and regime negative or signal bear
    if (positionOpen && (bestStats.totalPNL <= 0 || bestStats.winRate < 0.45 || bestSignal.ensemble_label === 'strong_bear')) {
      if (DRY_RUN) {
        const price = Number(process.env.SIM_PRICE || SIM_PRICE);
        const balance = simulatedBalance();
        const base = String(PAIR).split('/')[0].toUpperCase();
        if ((balance.free[base] || 0) < ORDER_AMOUNT) {
          logOrder({
            timestamp: bestSignal.timestamp,
            action: 'SKIP',
            result: null,
            reason: 'Insufficient simulated base for SELL',
            regime: regimeFromStats(bestStats),
            stats: bestStats,
            signal: bestSignal,
            diagnosticsExtra: diagnostics,
            dry: true
          });
          scheduleNext(INTERVAL_MS, "Insufficient simulated base for SELL");
          return;
        }
        const result = simulateOrderResult('SELL', price, ORDER_AMOUNT);
        positionOpen = false;
        lastTradeAt = Number(bestSignal.timestamp) || Date.now();
        diagnostics.lastTrade = { action: 'SELL', timestamp: bestSignal.timestamp, tf: bestTf, simulated: true };
        logOrder({
          timestamp: bestSignal.timestamp,
          action: 'SELL',
          result,
          reason: `DRY regime negative or bear on ${bestTf}`,
          regime: regimeFromStats(bestStats),
          stats: bestStats,
          signal: bestSignal,
          diagnosticsExtra: diagnostics,
          dry: true
        });
        if (DEBUG) console.log(`${LOG_PREFIX} [DRY] Simulated SELL at ${price} size ${ORDER_AMOUNT} id=${result.id}`);
        scheduleNext(INTERVAL_MS, "Simulated SELL executed");
        return;
      } else {
        try {
          const [ticker, balance] = await Promise.all([exchange.fetchTicker(PAIR), exchange.fetchBalance()]);
          const base = String(PAIR).split('/')[0].toUpperCase();
          const baseFree = (balance.free && balance.free[base]) || 0;
          if (baseFree < ORDER_AMOUNT) {
            logOrder({
              timestamp: bestSignal.timestamp,
              action: 'SKIP',
              result: null,
              reason: 'Insufficient balance for SELL',
              regime: regimeFromStats(bestStats),
              stats: bestStats,
              signal: bestSignal,
              diagnosticsExtra: diagnostics,
              dry: false
            });
            scheduleNext(INTERVAL_MS, "Insufficient balance for SELL");
            return;
          }
          const result = await exchange.createMarketSellOrder(PAIR, ORDER_AMOUNT);
          positionOpen = false;
          lastTradeAt = Number(bestSignal.timestamp) || Date.now();
          diagnostics.lastTrade = { action: 'SELL', timestamp: bestSignal.timestamp, tf: bestTf };
          logOrder({
            timestamp: bestSignal.timestamp,
            action: 'SELL',
            result,
            reason: `Regime negative or bear signal on ${bestTf}`,
            regime: regimeFromStats(bestStats),
            stats: bestStats,
            signal: bestSignal,
            diagnosticsExtra: diagnostics,
            dry: false
          });
          console.log(`${LOG_PREFIX} [INFO] SELL submitted on ${bestTf}`);
          scheduleNext(INTERVAL_MS, "SELL submitted");
          return;
        } catch (err) {
          diagnostics.lastError = { stage: 'sell', message: err && err.message ? err.message : err };
          logOrder({
            timestamp: bestSignal.timestamp,
            action: 'SELL',
            result: null,
            error: err && err.message ? err.message : err,
            reason: 'Failed to submit SELL',
            regime: regimeFromStats(bestStats),
            stats: bestStats,
            signal: bestSignal,
            diagnosticsExtra: diagnostics,
            dry: false
          });
          printDiagnostics();
          scheduleNext(60000, "Failed to submit SELL");
          return;
        }
      }
    }

    // HOLD/default
    logOrder({
      timestamp: (bestSignal && bestSignal.timestamp) || Date.now(),
      action: 'HOLD',
      result: null,
      reason: `No trade condition met on ${bestTf}`,
      regime: regimeFromStats(bestStats),
      stats: bestStats,
      signal: bestSignal,
      diagnosticsExtra: diagnostics,
      dry: DRY_RUN
    });
    if (DEBUG) console.log(`${LOG_PREFIX} [DEBUG] HOLD for ${bestTf}`);
    scheduleNext(INTERVAL_MS, `No trade condition met on ${bestTf}`);
  } catch (err) {
    diagnostics.lastError = { stage: 'main', message: err && err.message ? err.message : err };
    printDiagnostics();
    console.error(`${LOG_PREFIX} [UNCAUGHT EXCEPTION]:`, err && err.stack ? err.stack : err);
    scheduleNext(60000, "Uncaught exception");
  } finally {
    isRunning = false;
  }
}

// startup
console.log(`${LOG_PREFIX} [INFO] Macrostructure bot starting. DRY_RUN=${DRY_RUN} DEBUG=${DEBUG}`);
main();

// global error handlers
process.on('uncaughtException', (err) => {
  diagnostics.lastError = { stage: 'uncaughtException', message: err && err.message ? err.message : err };
  printDiagnostics();
  console.error(`${LOG_PREFIX} [UNCAUGHT EXCEPTION]:`, err);
});
process.on('unhandledRejection', (reason) => {
  diagnostics.lastError = { stage: 'unhandledRejection', message: reason && reason.message ? reason.message : reason };
  printDiagnostics();
  console.error(`${LOG_PREFIX} [UNHANDLED REJECTION]:`, reason);
});
