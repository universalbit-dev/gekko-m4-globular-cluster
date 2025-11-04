#!/usr/bin/env node
/**
 * tools/indicators/SMA.js
 *
 * Optimized Simple Moving Average (SMA)
 * - O(1) per update using circular buffer + running sum
 * - Safe: ignores invalid inputs, supports warmup/reset
 * - API:
 *     const s = new SMA(14);
 *     s.update(price);        // push one price
 *     s.next(price) -> value; // update and return current SMA (or null)
 *     s.warmup(arrayOfPrices);
 *     s.reset();
 *     s.value, s.ready, s.period
 */

class SMA {
  constructor(opt) {
    if (typeof opt === 'number') this.period = Math.max(1, Math.floor(opt));
    else if (opt && typeof opt === 'object') this.period = Math.max(1, Math.floor(opt.windowLength || opt.period || opt.interval || 1));
    else this.period = 1;

    this._buf = new Array(this.period).fill(0);
    this._idx = 0;
    this._count = 0;
    this._sum = 0;
    this.value = null;
  }

  get result() { return this.value; }
  get ready() { return this._count >= this.period; }

  reset() {
    this._buf.fill(0);
    this._idx = 0;
    this._count = 0;
    this._sum = 0;
    this.value = null;
  }

  // bulk warmup from an array of prices (fast)
  warmup(arr) {
    if (!Array.isArray(arr)) return;
    this.reset();
    const start = Math.max(0, arr.length - this.period);
    for (let i = start; i < arr.length; i++) {
      const v = Number(arr[i]);
      if (!isFinite(v)) continue;
      this._sum += v;
      this._buf[this._idx] = v;
      this._idx = (this._idx + 1) % this.period;
      if (this._count < this.period) this._count++;
    }
    if (this._count > 0) this.value = this._sum / this._count;
  }

  // update with single price (ignores invalid)
  update(price) {
    const v = Number(price);
    if (!isFinite(v)) return this.value;
    if (this._count < this.period) {
      this._sum += v;
      this._buf[this._idx] = v;
      this._idx = (this._idx + 1) % this.period;
      this._count++;
      this.value = this._sum / this._count;
      return this.value;
    }
    // full window: subtract oldest, add new
    const oldest = this._buf[this._idx];
    this._sum = this._sum - oldest + v;
    this._buf[this._idx] = v;
    this._idx = (this._idx + 1) % this.period;
    this.value = this._sum / this.period;
    return this.value;
  }

  // alias
  next(price) { return this.update(price); }
}

module.exports = SMA;
