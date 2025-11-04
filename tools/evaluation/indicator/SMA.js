#!/usr/bin/env node
/**
 * SMA.js
 *
 * Optimized, robust Simple Moving Average (SMA) indicator.
 * - Preserves original flexible constructor: SMA(windowLength) or SMA({ windowLength }) or SMA({ interval })
 * - O(1) per update: uses circular buffer and running sum (no full-window re-sum)
 * - Exposes:
 *     - .value (null until warmed)
 *     - .result (alias)
 *     - .ready (boolean)
 *     - .reset() to clear state
 *     - .warmup(arrayOfPrices) to initialize quickly
 * - Safe behavior in hot loops: does not throw for bad input (silently ignores invalid values)
 *
 * Usage:
 *   const s = new SMA(14);
 *   s.update(123.45);
 *   console.log(s.value);
 *   s.warmup([p1, p2, ...]);
 */

class SMA {
  constructor(params = 14) {
    // support SMA(14) or SMA({ windowLength: 14 }) or SMA({ interval: 14 })
    let windowLength;
    if (typeof params === 'object' && params !== null) {
      windowLength = params.windowLength ?? params.interval ?? params.window ?? 14;
    } else {
      windowLength = params;
    }

    windowLength = Number(windowLength);
    if (!Number.isInteger(windowLength) || windowLength <= 0) {
      throw new Error(`SMA: windowLength must be a positive integer (got '${windowLength}')`);
    }

    this.windowLength = windowLength;

    // circular buffer storage - use Float64Array for numeric efficiency
    // fallback to regular Array if not supported
    try {
      this._buf = new Float64Array(windowLength);
    } catch (e) {
      this._buf = new Array(windowLength).fill(0);
    }

    this._sum = 0;
    this._pos = 0;    // next write position in circular buffer
    this._count = 0;  // number of valid samples seen (capped at windowLength)

    // public-facing value (null until enough samples)
    this.value = null;
  }

  // alias for compatibility
  get result() {
    return this.value;
  }

  // ready flag
  get ready() {
    return this.value !== null;
  }

  // reset internal state
  reset() {
    // zero the buffer efficiently
    if (this._buf.fill) {
      this._buf.fill(0);
    } else {
      for (let i = 0; i < this._buf.length; i++) this._buf[i] = 0;
    }
    this._sum = 0;
    this._pos = 0;
    this._count = 0;
    this.value = null;
  }

  // fast warmup from an array of numeric prices
  warmup(prices) {
    if (!Array.isArray(prices) || prices.length === 0) return;
    this.reset();
    // feed prices until buffer is filled or array exhausted
    const n = Math.min(prices.length, this.windowLength);
    for (let i = prices.length - n; i < prices.length; i++) {
      const p = Number(prices[i]);
      if (!Number.isFinite(p)) continue;
      this._buf[this._pos] = p;
      this._sum += p;
      this._pos = (this._pos + 1) % this.windowLength;
      this._count++;
    }
    if (this._count === this.windowLength) {
      this.value = this._sum / this.windowLength;
    } else {
      this.value = null;
    }
  }

  // update with a single new price (number). Silently ignore invalid input.
  update(price) {
    const p = Number(price);
    if (!Number.isFinite(p)) return;

    const tail = this._buf[this._pos] || 0;
    this._sum += p - tail;
    this._buf[this._pos] = p;
    this._pos = (this._pos + 1) % this.windowLength;
    if (this._count < this.windowLength) this._count++;
    this.value = this._count === this.windowLength ? (this._sum / this.windowLength) : null;
  }
}

module.exports = SMA;
