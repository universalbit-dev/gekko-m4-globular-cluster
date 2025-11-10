/**
 * tools/order_manager/index.js
 *
 * Lightweight OrderManager
 * - Tracks orders (simulated and live), ensures `amount` is recorded.
 * - Computes realizedPnl on close = (exitPrice - entryPrice) * amount (sign depends on side).
 * - Polls exchange tickers (if exchange is attached) to enforce stop-loss / take-profit.
 * - Persists tracked state to disk (order_manager_state.json) for durability.
 * - Emits events via EventEmitter for integrations (order_opened, order_closed, order_updated).
 *
 * Usage:
 *   const { OrderManager } = require('./order_manager');
 *   const om = new OrderManager({ dryRun: true, statePath: './tools/logs/order_manager_state.json' });
 *   om.start();
 *   om.trackOrder(orderObj, { stopLossPct: 0.003, takeProfitPct: 0.006 });
 *   om.closeOrder(orderId, { exitPrice: 12345.6, reason: 'manual' });
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

function safeLoadJson(fp, fallback = {}) {
  try {
    if (!fs.existsSync(fp)) return fallback;
    const txt = fs.readFileSync(fp, 'utf8');
    if (!txt || !txt.trim()) return fallback;
    return JSON.parse(txt);
  } catch (e) {
    // swallow, return fallback
    return fallback;
  }
}
function safeWriteJson(fp, obj) {
  try {
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(obj, null, 2));
  } catch (e) {
    // best-effort
    console.error('[order_manager] safeWriteJson failed', e && e.message ? e.message : e);
  }
}

class OrderManager extends EventEmitter {
  constructor(opts = {}) {
    super();
    this._running = false;
    this.dryRun = Boolean(opts.dryRun);
    this.pollMs = Number(opts.pollMs || 5000);
    this.statePath = opts.statePath || path.resolve(__dirname, '../../tools/logs/order_manager_state.json');
    this._tracked = safeLoadJson(this.statePath, {}).tracked || {};
    // normalize loaded tracked map to ensure structure
    for (const id of Object.keys(this._tracked)) {
      const o = this._tracked[id] || {};
      // Ensure minimum fields exist
      o.id = o.id || id;
      o.open = Boolean(o.open);
      o.amount = Number(o.amount || 0);
      o.entryPrice = o.entryPrice !== undefined ? Number(o.entryPrice) : (o.price || 0);
      o.closedReason = o.closedReason || null;
      this._tracked[id] = o;
    }

    this.exchange = opts.exchange || null; // caller may attach ccxt exchange object
    this._timer = null;
    this._lastSavedAt = 0;
    this._saveThrottleMs = Number(opts.saveThrottleMs || 2000);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._tickLoop();
  }

  stop() {
    this._running = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._persist();
  }

  _persist() {
    const payload = { tracked: this._tracked, updatedAt: Date.now() };
    safeWriteJson(this.statePath, payload);
    this._lastSavedAt = Date.now();
  }

  _schedulePersist() {
    const now = Date.now();
    if ((now - this._lastSavedAt) > this._saveThrottleMs) {
      this._persist();
    } else {
      // defer a bit
      setTimeout(() => this._persist(), this._saveThrottleMs);
    }
  }

  _tickLoop() {
    if (!this._running) return;
    this._pollOnce().catch((e) => {
      // log but continue
      console.error('[order_manager] poll error', e && e.message ? e.message : e);
    }).finally(() => {
      if (this._running) this._timer = setTimeout(() => this._tickLoop(), this.pollMs);
    });
  }

  async _pollOnce() {
    // Poll each open tracked order: update lastPrice (via exchange) and check stop/tp
    if (!this.exchange) return;
    const openOrders = Object.values(this._tracked).filter(o => o.open);
    if (!openOrders.length) return;
    // attempt to fetch tickers in sequence (some exchanges don't support batch)
    for (const o of openOrders) {
      try {
        const pair = o.symbol || o.pair || o.pair || o.pair;
        const marketPair = pair || o.symbol || o.pair;
        if (!marketPair) continue;
        // fetchTicker may throw; ignore non-fatal
        const t = await this.exchange.fetchTicker(marketPair);
        const last = Number(t && t.last) || Number(o.lastPrice || 0);
        o.lastPrice = last;
        o.lastUpdated = Date.now();

        // evaluate stop loss / take profit only if amounts present and entryPrice known
        const entry = Number(o.entryPrice || o.price || 0);
        const amt = Number(o.amount || 0);
        if (amt > 0 && entry > 0) {
          const side = (o.side || 'buy').toLowerCase();
          const slPct = Number(o.stopLossPct || o.stopLoss || 0) || 0;
          const tpPct = Number(o.takeProfitPct || o.takeProfit || 0) || 0;

          if (slPct > 0) {
            const slThreshold = side === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct);
            if ((side === 'buy' && last <= slThreshold) || (side !== 'buy' && last >= slThreshold)) {
              // trigger stop loss
              this.closeOrder(o.id, { exitPrice: last, reason: 'stop_loss' }).catch(() => {});
              continue;
            }
          }
          if (tpPct > 0) {
            const tpThreshold = side === 'buy' ? entry * (1 + tpPct) : entry * (1 - tpPct);
            if ((side === 'buy' && last >= tpThreshold) || (side !== 'buy' && last <= tpThreshold)) {
              this.closeOrder(o.id, { exitPrice: last, reason: 'take_profit' }).catch(() => {});
              continue;
            }
          }
        }

        // update tracked order
        this._tracked[o.id] = o;
      } catch (e) {
        // ignore individual ticker errors
        // but log debug
        // console.debug('[order_manager] fetchTicker failed for', o.symbol || o.pair, e && e.message ? e.message : e);
      }
    }
    this._schedulePersist();
  }

  /**
   * trackOrder(orderObj, opts)
   * - orderObj is the exchange/order object; must contain id, symbol/pair, side, price/average, amount
   * - opts may include stopLossPct, takeProfitPct, trailingPct, meta...
   */
  async trackOrder(orderObj = {}, opts = {}) {
    if (!orderObj || !orderObj.id) {
      throw new Error('trackOrder requires an order-like object with id');
    }
    const id = orderObj.id;
    const existing = this._tracked[id] || {};
    // canonicalize fields
    const symbol = orderObj.symbol || orderObj.pair || orderObj.market || existing.symbol || null;
    const side = (orderObj.side || existing.side || 'buy').toLowerCase();
    // determine amount: prefer explicit amount on order, then opts.amount, then existing.amount
    let amount = Number(orderObj.amount ?? orderObj.filled ?? opts.amount ?? existing.amount ?? 0);
    // ensure not NaN
    if (!isFinite(amount) || amount < 0) amount = 0;

    const entryPrice = Number(orderObj.price ?? orderObj.average ?? existing.entryPrice ?? 0);

    const tracked = Object.assign({}, existing, {
      id,
      symbol,
      pair: symbol, // legacy
      side,
      amount,
      entryPrice,
      price: orderObj.price ?? orderObj.average ?? existing.price ?? 0,
      timestamp: orderObj.timestamp || Date.now(),
      info: orderObj.info || orderObj,
      mode: orderObj.mode || existing.mode || (this.dryRun ? 'DRY' : 'LIVE'),
      open: existing.open === false ? false : true,
      stopLossPct: Number(opts.stopLossPct ?? orderObj.stopLossPct ?? orderObj.stopLoss ?? existing.stopLossPct ?? 0),
      takeProfitPct: Number(opts.takeProfitPct ?? orderObj.takeProfitPct ?? orderObj.takeProfit ?? existing.takeProfitPct ?? 0),
      trailingPct: Number(opts.trailingPct ?? orderObj.trailingPct ?? existing.trailingPct ?? 0),
      meta: Object.assign({}, existing.meta || {}, opts.meta || {})
    });

    // If this is a fresh open, mark openedAt and open true
    if (!existing.id || !existing.open) {
      tracked.open = true;
      tracked.openedAt = tracked.openedAt || Date.now();
    }

    this._tracked[id] = tracked;
    this._schedulePersist();
    // emit event
    this.emit('order_tracked', tracked);
    return tracked;
  }

  /**
   * closeOrder(orderId, opts)
   * opts: { exitPrice, reason }
   */
  async closeOrder(orderId, opts = {}) {
    const o = this._tracked[orderId];
    if (!o) {
      // try to find by alternative id fields
      const byField = Object.values(this._tracked).find(x => (x.info && (x.info.id === orderId || x.info.orderId === orderId)) || x.id === orderId);
      if (byField) return this.closeOrder(byField.id, opts);
      throw new Error('order not found: ' + orderId);
    }
    if (!o.open) {
      // already closed, update meta maybe
      o.closedReason = o.closedReason || opts.reason || 'already_closed';
      o.exitPrice = o.exitPrice || opts.exitPrice || o.exitPrice || o.lastPrice || 0;
      o.exitTs = o.exitTs || Date.now();
      this._tracked[o.id] = o;
      this._schedulePersist();
      return o;
    }

    const exitPrice = Number(opts.exitPrice ?? opts.price ?? o.lastPrice ?? o.exitPrice ?? 0);
    const reason = opts.reason || 'closed_by_call';
    o.open = false;
    o.exitPrice = exitPrice;
    o.exitTs = Date.now();
    o.closedReason = reason;

    // compute realizedPnl
    const amt = Number(o.amount || 0);
    const entry = Number(o.entryPrice || o.price || 0);
    let pnl = 0;
    if (amt > 0 && isFinite(entry) && isFinite(exitPrice)) {
      // side sensitive: buy -> profit = (exit - entry) * amount
      if ((o.side || 'buy').toLowerCase() === 'buy') {
        pnl = (exitPrice - entry) * amt;
      } else {
        // sell/short: profit = (entry - exit) * amount
        pnl = (entry - exitPrice) * amt;
      }
    } else {
      pnl = 0;
    }
    o.realizedPnl = pnl;
    this._tracked[o.id] = o;
    this._schedulePersist();

    // emit event
    this.emit('order_closed', o);
    return o;
  }

  getTracked() {
    return Object.values(this._tracked);
  }

  getOrder(id) {
    return this._tracked[id] || null;
  }
}

module.exports = { OrderManager };
