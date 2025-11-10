#!/usr/bin/env node
/**
 * tools/microstructure/micro_ccxt_orders.js
 *
 * Microstructure:
 * - Uses winston with file rotation to limit log growth.
 * - Respects DRY_RUN / FORCE_DRY / ENABLE_LIVE / FORCE_SUBMIT / PERMISSIVE_SIZING.
 * - Computes safe order size with exchange market limits and permissive sizing option.
 * - Emits JSONL audit and CSV audit rows to tools/logs for offline analysis.
 *
 * Usage:
 *   node tools/microstructure/micro_ccxt_orders.js --once
 *
 * Environment:
 *   DRY_RUN, FORCE_DRY, ENABLE_LIVE, FORCE_SUBMIT, PERMISSIVE_SIZING
 */

const fs = require('fs');
const path = require('path');
const ccxt = require('ccxt');
const os = require('os');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// --------- helpers to pick env keys ---------
function pickKey(...names) {
  for (const n of names) {
    if (process.env[n]) return process.env[n];
  }
  return '';
}

// --------- Configuration ---------
const CONFIG = {
  EXCHANGE_NAME: process.env.MICRO_EXCHANGE || process.env.EXCHANGE || 'kraken',
  API_KEY: pickKey('KEY', 'API_KEY', 'MACRO_KEY', 'MICRO_API_KEY'),
  API_SECRET: pickKey('SECRET', 'API_SECRET', 'MACRO_SECRET', 'MICRO_API_SECRET'),
  PAIR: process.env.MICRO_PAIR || 'BTC/EUR',
  FIXED_ORDER_SIZE: Number(process.env.MICRO_FIXED_ORDER_SIZE || process.env.FIXED_ORDER_SIZE || '0.0001'),
  DRY_RUN: /^(1|true|yes)$/i.test(String(process.env.DRY_RUN || process.argv.includes('--dry') || process.env.FORCE_DRY === '1')),
  FORCE_DRY: /^(1|true|yes)$/i.test(String(process.env.FORCE_DRY || '0')),
  ENABLE_LIVE: /^(1|true|yes)$/i.test(String(process.env.ENABLE_LIVE || '0')),
  FORCE_SUBMIT: /^(1|true|yes)$/i.test(String(process.env.FORCE_SUBMIT || process.argv.includes('--force'))),
  PERMISSIVE_SIZING: /^(1|true|yes)$/i.test(String(process.env.PERMISSIVE_SIZING || '0')),
  ORDER_AUDIT_JSONL: path.resolve(__dirname, '../../tools/logs/micro_ccxt_orders.jsonl'),
  ORDER_AUDIT_CSV: path.resolve(__dirname, '../../tools/logs/micro_ccxt_orders.csv'),
  LOG_PATH: path.resolve(__dirname, '../../tools/logs/micro_ccxt_orders.log'),
  LOG_MAXSIZE: Number(process.env.MICRO_LOG_MAXSIZE || 5 * 1024 * 1024),
  LOG_MAXFILES: Number(process.env.MICRO_LOG_MAXFILES || 5),
  ORDER_FILL_TIMEOUT_MS: Number(process.env.MICRO_ORDER_FILL_TIMEOUT_MS || 15000),
  ORDER_MANAGER_POLL_MS: Number(process.env.MICRO_ORDER_MANAGER_POLL_MS || 5000),
  DEBUG: /^(1|true|yes)$/i.test(String(process.env.DEBUG || process.argv.includes('--debug')))
};

// Create logs directory
fs.mkdirSync(path.dirname(CONFIG.ORDER_AUDIT_JSONL), { recursive: true });

// ---------- Logger (winston) ----------
let logger;
try {
  const winston = require('winston');
  const { combine, timestamp, printf } = winston.format;
  const fmt = printf(({ level, message, timestamp }) => `${timestamp} [micro-ccxt] ${level}: ${message}`);
  const transports = [
    new winston.transports.File({
      filename: CONFIG.LOG_PATH,
      maxsize: CONFIG.LOG_MAXSIZE,
      maxFiles: CONFIG.LOG_MAXFILES,
      tailable: true,
      format: combine(timestamp(), fmt),
    }),
    new winston.transports.Console({
      level: CONFIG.DEBUG ? 'debug' : 'info',
      format: combine(timestamp(), fmt),
    })
  ];
  logger = winston.createLogger({ level: CONFIG.DEBUG ? 'debug' : 'info', transports });
} catch (e) {
  // fallback to console if winston not available
  logger = {
    debug: (...a) => CONFIG.DEBUG && console.debug(...a),
    info:  (...a) => console.info(...a),
    warn:  (...a) => console.warn(...a),
    error: (...a) => console.error(...a)
  };
}

// ---------- Audit buffering ----------
let auditBuffer = [];
let csvBuffer = [];
function appendAuditJsonBuffered(r) { auditBuffer.push(r); }
function appendCsvRowBuffered(row) { csvBuffer.push(row); }
function flushAuditBuffers() {
  if (auditBuffer.length) {
    try {
      fs.appendFileSync(CONFIG.ORDER_AUDIT_JSONL, auditBuffer.map(x => JSON.stringify(x)).join('\n') + '\n');
      auditBuffer = [];
    } catch (e) { logger.error('flushAuditBuffers jsonl failed: ' + (e && e.message)); }
  }
  if (csvBuffer.length) {
    try {
      if (!fs.existsSync(CONFIG.ORDER_AUDIT_CSV)) {
        fs.mkdirSync(path.dirname(CONFIG.ORDER_AUDIT_CSV), { recursive: true });
        fs.appendFileSync(CONFIG.ORDER_AUDIT_CSV, 'iso,action,mode,tf,strategy,entryPrice,exitPrice,amount,estimatedPnlQuote,pctReturn,orderId,reason\n');
      }
      fs.appendFileSync(CONFIG.ORDER_AUDIT_CSV, csvBuffer.join('\n') + '\n');
      csvBuffer = [];
    } catch (e) { logger.error('flushAuditBuffers csv failed: ' + (e && e.message)); }
  }
}
setInterval(flushAuditBuffers, 3000);
process.on('exit', () => { flushAuditBuffers(); });

// ---------- Exchange / CCXT ----------
let exchange = null;
async function getExchange() {
  if (exchange) return exchange;
  const exClass = ccxt[CONFIG.EXCHANGE_NAME];
  if (!exClass) {
    throw new Error(`Exchange ${CONFIG.EXCHANGE_NAME} not found in ccxt`);
  }
  exchange = new exClass({
    apiKey: CONFIG.API_KEY,
    secret: CONFIG.API_SECRET,
    enableRateLimit: true,
    timeout: 30000
  });
  try {
    await exchange.loadMarkets();
    logger.debug(`Loaded markets: ${Object.keys(exchange.markets || {}).length}`);
  } catch (e) {
    logger.warn('loadMarkets failed (non-fatal): ' + (e && e.message));
  }
  return exchange;
}

// ---------- Sizing logic ----------
function computeOrderSizeForMarket(market, configuredSize) {
  let precision = 8;
  let minAmount = 0;
  let marketMax = 0;
  if (market) {
    const pRaw = (typeof market.precision === 'object' && market.precision !== null) ? market.precision.amount : market.precision;
    if (typeof pRaw === 'number' && isFinite(pRaw)) precision = Math.max(0, Math.min(8, pRaw));
    minAmount = Number(market.limits?.amount?.min ?? 0) || 0;
    marketMax = Number(market.limits?.amount?.max ?? 0) || 0;
  }

  let orderSize = Number(configuredSize || 0);
  if (!isFinite(orderSize) || orderSize <= 0) {
    if (minAmount > 0) orderSize = minAmount;
    else {
      const fallback = 1 / Math.pow(10, Math.max(2, precision));
      orderSize = Number(fallback.toFixed(Math.max(0, Math.min(8, precision))));
    }
  }

  const cfgMin = Number(process.env.MIN_ALLOWED_ORDER_AMOUNT || process.env.MIN_ORDER_AMOUNT || 0) || 0;
  const envMax = Number(process.env.MAX_ORDER_AMOUNT || 0) || 0;
  const cfgMax = envMax > 0 ? envMax : (marketMax > 0 ? marketMax : 0);

  if (cfgMin > 0 && orderSize < cfgMin) orderSize = cfgMin;
  if (cfgMax > 0 && orderSize > cfgMax) orderSize = cfgMax;

  const factor = Math.pow(10, precision);
  let intSize = Math.ceil(orderSize * factor);
  if (intSize <= 0) intSize = 1;
  const maxInt = cfgMax > 0 ? Math.floor(cfgMax * factor) : Infinity;

  if (cfgMax > 0 && intSize > maxInt) intSize = maxInt;

  if (minAmount > 0) {
    const minInt = Math.ceil(minAmount * factor);
    if (intSize < minInt) {
      if (cfgMax > 0 && minInt > maxInt) {
        if (CONFIG.PERMISSIVE_SIZING) {
          logger.debug('PERMISSIVE_SIZING: accepting market min despite cfgMax', { precision, minAmount, cfgMax });
          intSize = minInt;
        } else {
          return { orderSize: 0, precision, minAmount, error: new Error(`cannot satisfy market min ${minAmount} within configured max ${cfgMax}`) };
        }
      } else {
        intSize = minInt;
      }
    }
  }

  if (intSize <= 0) return { orderSize: 0, precision, minAmount, error: new Error('computed orderSize <= 0 after rounding') };
  const roundedSize = intSize / factor;

  if (cfgMin > 0 && roundedSize < cfgMin) return { orderSize: roundedSize, precision, minAmount, error: new Error(`orderSize ${roundedSize} below configured min ${cfgMin}`) };
  if (cfgMax > 0 && roundedSize > cfgMax) return { orderSize: roundedSize, precision, minAmount, error: new Error(`orderSize ${roundedSize} above configured max ${cfgMax}`) };
  if (minAmount > 0 && roundedSize < minAmount) return { orderSize: roundedSize, precision, minAmount, error: new Error(`orderSize ${roundedSize} below exchange min ${minAmount}`) };
  return { orderSize: roundedSize, precision, minAmount, error: null };
}

// ---------- Estimate PnL ----------
function estimatePnl(entryPrice, exitPrice, amount) {
  const entry = Number(entryPrice || 0);
  const exit = Number(exitPrice || 0);
  const amt = Number(amount || 0);
  if (!isFinite(entry) || !isFinite(exit) || !isFinite(amt)) return { pnl: 0, pct: 0 };
  const pnl = (exit - entry) * amt;
  const pct = entry ? ((exit - entry) / entry) * 100 : 0;
  return { pnl, pct };
}

// ---------- Submit Order (DRY or LIVE) ----------
/**
 * submitOrder(action, opts)
 * action: 'open' | 'close'
 * opts: { tf, strategy, price, force (bool) }
 */
async function submitOrder(action, opts = {}) {
  const tf = opts.tf || 'micro';
  const strategy = opts.strategy || 'micro';
  const force = Boolean(opts.force) || CONFIG.FORCE_SUBMIT || false;

  // respect global FORCE_DRY
  const forceDry = CONFIG.FORCE_DRY;
  if (forceDry) {
    logger.info('GLOBAL FORCE_DRY is set -> forcing DRY operation');
  }

  const canLive = Boolean(CONFIG.ENABLE_LIVE && CONFIG.API_KEY && CONFIG.API_SECRET && !CONFIG.DRY_RUN && !forceDry);
  logger.debug('canLive eval', { ENABLE_LIVE: CONFIG.ENABLE_LIVE, hasKey: !!CONFIG.API_KEY, hasSecret: !!CONFIG.API_SECRET, DRY_RUN: CONFIG.DRY_RUN, FORCE_DRY: CONFIG.FORCE_DRY, canLive });

  // prepare exchange/ticker/balance
  let ex = null;
  try { ex = await getExchange(); } catch (e) { logger.warn('getExchange failed', e && e.message); }
  let market = ex && ex.markets ? ex.markets[CONFIG.PAIR] : null;
  let ticker = null;
  try { if (ex) ticker = await ex.fetchTicker(CONFIG.PAIR); } catch (e) { logger.debug('fetchTicker failed (non-fatal) ' + (e && e.message)); }

  // compute order size
  const sizing = computeOrderSizeForMarket(market, CONFIG.FIXED_ORDER_SIZE);
  if (!sizing || sizing.error) {
    logger.warn('Sizing failed', sizing && sizing.error ? sizing.error.message : 'no sizing');
    return { error: sizing && sizing.error ? sizing.error : new Error('sizing_failed') };
  }
  const prec = Number(sizing.precision || 8);
  const factor = Math.pow(10, prec);
  let orderSize = sizing.orderSize || CONFIG.FIXED_ORDER_SIZE || 0;
  if (!isFinite(orderSize) || orderSize <= 0) orderSize = CONFIG.FIXED_ORDER_SIZE || 0;
  orderSize = Math.floor(orderSize * factor) / factor;
  if (!isFinite(orderSize) || orderSize <= 0) {
    const minInt = sizing.minAmount && sizing.minAmount > 0 ? Math.ceil(Number(sizing.minAmount) * factor) : 1;
    orderSize = minInt / factor;
  }
  if (!isFinite(orderSize) || orderSize <= 0) {
    const err = new Error(`computed orderSize invalid after rounding: ${orderSize}`);
    logger.error(err.message);
    return { error: err };
  }

  const currentPrice = (ticker && ticker.last) || Number(opts.price || 0) || 0;

  const buildAudit = (res, mode, reason, extra = {}) => {
    const audit = {
      iso: new Date().toISOString(),
      tf, strategy, action, mode, reason, pair: CONFIG.PAIR,
      price: currentPrice || (opts.price || 0),
      orderSize, result: res || null,
      ts: Date.now(), extra
    };
    appendAuditJsonBuffered(audit);
    appendCsvRowBuffered([audit.iso, action.toUpperCase(), mode, tf, strategy, (mode==='DRY' && action==='open') ? audit.price : (extra.entryPrice || ''), (action==='close' ? audit.price : ''), orderSize, extra.estimatedPnlQuote || '', extra.pctReturn || '', (res && res.id) || (res && res.orderId) || '', reason].join(','));
    return audit;
  };

  // DRY or cannot go live
  if (!canLive) {
    const fakeOrder = {
      id: `sim-${Date.now()}`,
      timestamp: Date.now(),
      datetime: new Date().toISOString(),
      symbol: CONFIG.PAIR,
      type: 'market',
      side: action === 'open' ? 'buy' : 'sell',
      price: currentPrice || Number(opts.price || 0),
      amount: orderSize,
      info: { simulated: true },
      mode: 'DRY'
    };

    if (action === 'open') {
      // For micro script we may want to track openings without changing global position state here.
      logger.info(`[DRY OPEN] ${tf} ${strategy} size=${orderSize} price=${fakeOrder.price} id=${fakeOrder.id}`);
      // ensure orderManager gets amount
      try { if (module.exports.orderManager) module.exports.orderManager.trackOrder(Object.assign({}, fakeOrder, { amount: orderSize }), { stopLossPct: Number(process.env.MICRO_STOP_LOSS_PCT || 0.003), takeProfitPct: Number(process.env.MICRO_TAKE_PROFIT_PCT || 0.006) }); } catch (e) { logger.debug('orderManager.trackOrder dry failed: ' + (e && e.message)); }
      buildAudit(fakeOrder, 'DRY', `simulated open ${tf}:${strategy}`);
      return { dry: true, result: fakeOrder };
    } else if (action === 'close') {
      const entryPrice = opts.entryPrice || 0;
      const est = estimatePnl(entryPrice, fakeOrder.price, orderSize);
      logger.info(`[DRY CLOSE] ${tf} ${strategy} size=${orderSize} price=${fakeOrder.price} estPnl=${est.pnl}`);
      try { if (module.exports.orderManager) {
        module.exports.orderManager.trackOrder(Object.assign({}, fakeOrder, { amount: orderSize }), { stopLossPct: Number(process.env.MICRO_STOP_LOSS_PCT || 0.003), takeProfitPct: Number(process.env.MICRO_TAKE_PROFIT_PCT || 0.006) });
        module.exports.orderManager.closeOrder(fakeOrder.id, { exitPrice: fakeOrder.price, reason: 'simulated_close' }).catch(() => {});
      } } catch (e) { logger.debug('orderManager.close dry failed: ' + (e && e.message)); }
      buildAudit(fakeOrder, 'DRY', `simulated close ${tf}:${strategy}`, { estimatedPnlQuote: est.pnl, pctReturn: est.pct, entryPrice });
      return { dry: true, result: fakeOrder, estimatedPnl: est };
    } else {
      return { error: new Error('unknown-action') };
    }
  }

  // LIVE path
  try {
    let res;
    if (action === 'open') {
      // quick balance check
      let balance = null;
      try { balance = await ex.fetchBalance(); } catch (e) { logger.debug('fetchBalance fail ' + (e && e.message)); }
      const quoteSym = (CONFIG.PAIR.split('/')[1] || '').toUpperCase();
      const quoteFree = balance?.free?.[quoteSym] || 0;
      const required = orderSize * (currentPrice || 0);
      if (!force && quoteFree < required) {
        const err = new Error('insufficient-quote');
        logger.error('insufficient quote', { quoteFree, required });
        return { error: err };
      }

      res = await ex.createMarketBuyOrder(CONFIG.PAIR, orderSize);
      // attempt to poll until filled (within timeout)
      let filled = false;
      let finalStatus = res;
      const start = Date.now();
      while (!filled && (Date.now() - start) < CONFIG.ORDER_FILL_TIMEOUT_MS) {
        try {
          const st = await ex.fetchOrder(res.id);
          finalStatus = st;
          const filledAmt = Number(st.filled || 0);
          const amount = Number(st.amount || orderSize);
          if (filledAmt >= amount || ['closed','filled'].includes(String(st.status || '').toLowerCase())) {
            filled = true;
            break;
          }
        } catch (e) {
          logger.debug('fetchOrder poll error (non-fatal): ' + (e && e.message));
        }
        await new Promise(r => setTimeout(r, 500));
      }

      // record audit and track
      buildAudit(finalStatus, 'LIVE', `live open ${tf}:${strategy}`);
      try {
        if (module.exports.orderManager) {
          module.exports.orderManager.trackOrder(Object.assign({}, {
            id: finalStatus.id || `live-${Date.now()}`,
            symbol: CONFIG.PAIR,
            side: 'buy',
            amount: orderSize,
            price: Number(finalStatus.average || finalStatus.price || currentPrice),
            timestamp: Date.now(),
            info: finalStatus,
            mode: 'LIVE'
          }), { stopLossPct: Number(process.env.MICRO_STOP_LOSS_PCT || 0.003), takeProfitPct: Number(process.env.MICRO_TAKE_PROFIT_PCT || 0.006) });
        }
      } catch (e) { logger.debug('orderManager.trackOrder live failed: ' + (e && e.message)); }

      logger.info(`LIVE OPEN executed id=${finalStatus.id || res.id} price=${finalStatus.average || finalStatus.price || currentPrice}`);
      return { result: finalStatus || res };
    } else if (action === 'close') {
      // try to close by market sell
      let balance = null;
      try { balance = await ex.fetchBalance(); } catch (e) { logger.debug('fetchBalance fail ' + (e && e.message)); }
      const baseSym = (CONFIG.PAIR.split('/')[0] || '').toUpperCase();
      const baseFree = balance?.free?.[baseSym] || 0;
      if (!force && baseFree < orderSize) {
        const err = new Error('insufficient-base');
        logger.error('insufficient base', { baseFree, orderSize });
        return { error: err };
      }

      res = await ex.createMarketSellOrder(CONFIG.PAIR, orderSize);
      const est = estimatePnl(opts.entryPrice || 0, Number(res.price || res.average || currentPrice), orderSize);
      buildAudit(res, 'LIVE', `live close ${tf}:${strategy}`, { estimatedPnlQuote: est.pnl, pctReturn: est.pct });
      try {
        if (module.exports.orderManager) {
          module.exports.orderManager.trackOrder(Object.assign({}, {
            id: res.id || `live-${Date.now()}`,
            symbol: CONFIG.PAIR,
            side: 'sell',
            amount: orderSize,
            price: Number(res.price || res.average || currentPrice),
            timestamp: Date.now(),
            info: res,
            mode: 'LIVE'
          }), { stopLossPct: Number(process.env.MICRO_STOP_LOSS_PCT || 0.003), takeProfitPct: Number(process.env.MICRO_TAKE_PROFIT_PCT || 0.006) });
          // instruct orderManager to close if it has such method
          try { module.exports.orderManager.closeOrder(res.id || null, { exitPrice: res.price || currentPrice, reason: 'live_close' }).catch(() => {}); } catch (e) {}
        }
      } catch (e) { logger.debug('orderManager.trackOrder live-close failed: ' + (e && e.message)); }

      logger.info(`LIVE CLOSE executed id=${res.id} price=${res.price || currentPrice} estPnl=${est.pnl}`);
      return { result: res, estimatedPnl: est };
    } else {
      return { error: new Error('unknown-action') };
    }
  } catch (err) {
    logger.error('Live order error: ' + (err && err.message));
    return { error: err };
  }
}

// ---------- CLI / Exports ----------
module.exports = { submitOrder, getExchange, CONFIG, logger, appendAuditJsonBuffered, appendCsvRowBuffered };

// If run as script, support a simple CLI to test open/close in dry/live modes
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const once = args.includes('--once') || args.includes('--test');
    const doOpen = args.includes('--open');
    const doClose = args.includes('--close');
    const force = args.includes('--force') || CONFIG.FORCE_SUBMIT;
    // default test: create a DRY open then a DRY close
    try {
      if (doOpen || (!doOpen && !doClose)) {
        logger.info('Submitting test OPEN');
        const r = await submitOrder('open', { tf: 'micro', strategy: 'microtest', force });
        logger.info('OPEN result: ' + JSON.stringify(r, null, 2));
      }
      if (doClose || (!doOpen && !doClose)) {
        logger.info('Submitting test CLOSE');
        const r2 = await submitOrder('close', { tf: 'micro', strategy: 'microtest', entryPrice: 0, force });
        logger.info('CLOSE result: ' + JSON.stringify(r2, null, 2));
      }
    } catch (e) {
      logger.error('Test script failed: ' + (e && e.message));
    } finally {
      // ensure audit buffers flushed
      flushAuditBuffers();
      if (once) process.exit(0);
    }
  })();
}
