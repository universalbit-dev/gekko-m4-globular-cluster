#!/usr/bin/env node
/**
 * tools/evaluation/indicator/RSI.js
 *
 * Optimized Wilder-style RSI (smoothed) for per-candle updates.
 * - O(1) per update using rolling averages of gains/losses (exponential smoothing).
 * - API:
 *     const r = new RSI(14);
 *     r.update(price);
 *     r.next(price) -> value or null
 *     r.warmup(arrayOfPrices);
 *     r.reset();
 */

class RSI {
  constructor(period = 14) {
    this.period = Math.max(1, Math.floor(period));
    this.avgGain = 0;
    this.avgLoss = 0;
    this.prev = null;
    this.value = null;
    this._count = 0;
  }

  get ready() { return this._count >= this.period; }

  reset() {
    this.avgGain = 0;
    this.avgLoss = 0;
    this.prev = null;
    this.value = null;
    this._count = 0;
  }

  warmup(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return;
    this.reset();
    for (const p of arr) {
      this.update(p);
    }
  }

  update(price) {
    const v = Number(price);
    if (!isFinite(v)) return this.value;
    if (this.prev === null) {
      this.prev = v;
      return this.value;
    }
    const change = v - this.prev;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    this.prev = v;

    if (this._count < this.period) {
      // accumulate during warmup
      this.avgGain = (this.avgGain * this._count + gain) / (this._count + 1);
      this.avgLoss = (this.avgLoss * this._count + loss) / (this._count + 1);
      this._count++;
    } else {
      // Wilder smoothing
      this.avgGain = (this.avgGain * (this.period - 1) + gain) / this.period;
      this.avgLoss = (this.avgLoss * (this.period - 1) + loss) / this.period;
    }

    if (this._count >= this.period) {
      if (this.avgLoss === 0) this.value = 100;
      else {
        const rs = this.avgGain / this.avgLoss;
        this.value = 100 - (100 / (1 + rs));
      }
    }
    return this.value;
  }

  next(price) { return this.update(price); }
}

module.exports = RSI;
