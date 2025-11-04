#!/usr/bin/env node
/**
 * tools/indicators/ATR.js
 *
 * Optimized Average True Range (ATR) with Wilder smoothing.
 * - Usage:
 *     const a = new ATR(14);
 *     a.update({ high, low, close });
 *     a.next(h,l,c) -> value
 *     a.warmup(arrayOfOHLC) where array entries are objects {high,low,close}
 */

class ATR {
  constructor(period = 14) {
    this.period = Math.max(1, Math.floor(period));
    this.prevClose = null;
    this.trSMA = 0; // smoothed TR (Wilder)
    this._count = 0;
    this.value = null;
  }

  get ready() { return this._count >= this.period; }

  reset() {
    this.prevClose = null;
    this.trSMA = 0;
    this._count = 0;
    this.value = null;
  }

  warmup(ohlcArray) {
    if (!Array.isArray(ohlcArray)) return;
    this.reset();
    for (const o of ohlcArray) {
      const h = Number(o.high), l = Number(o.low), c = Number(o.close);
      if (!isFinite(h) || !isFinite(l) || !isFinite(c)) continue;
      this.update({ high: h, low: l, close: c });
    }
  }

  // accept either (h,l,c) or object {high,low,close}
  update(h, l, c) {
    let high, low, close;
    if (h && typeof h === 'object') {
      high = Number(h.high); low = Number(h.low); close = Number(h.close);
    } else {
      high = Number(h); low = Number(l); close = Number(c);
    }
    if (![high, low, close].every(v => isFinite(v))) return this.value;

    const tr = Math.max(
      high - low,
      this.prevClose !== null ? Math.abs(high - this.prevClose) : 0,
      this.prevClose !== null ? Math.abs(low - this.prevClose) : 0
    );

    this.prevClose = close;

    if (this._count < this.period) {
      // accumulate simple average until warm
      this.trSMA = (this.trSMA * this._count + tr) / (this._count + 1);
      this._count++;
      this.value = this.trSMA;
      return this.value;
    }

    // Wilder smoothing
    this.trSMA = (this.trSMA * (this.period - 1) + tr) / this.period;
    this.value = this.trSMA;
    return this.value;
  }

  next(h, l, c) { return this.update(h, l, c); }
}

module.exports = ATR;
