#!/usr/bin/env node
/**
 * RSI.js
 *
 * Optimized, incremental Relative Strength Index (RSI) indicator.
 * - Preserves original API: constructor({ interval, buyLevel, sellLevel })
 * - Provides update(price) per tick/candle (numeric close price)
 * - Exposes .value (null until warmed), .result (alias), .ready boolean
 * - Adds reset() and warmup(arrayOfPrices) helpers for fast initialization
 * - Uses Wilder's smoothing (exponential-style) for avgGain/avgLoss (O(1) per update)
 * - Avoids per-update heavy allocations and throwing in hot loops
 *
 * Usage:
 *   const rsi = new RSI({ interval: 14 });
 *   rsi.warmup([p1, p2, p3, ...]); // optional fast warmup
 *   rsi.update(price);
 *   console.log(rsi.value); // null until enough data collected, then RSI number
 */

class RSI {
  constructor({ interval = 14, buyLevel = 30, sellLevel = 70 } = {}) {
    this.interval = Math.max(1, Math.floor(interval));
    this.buyLevel = buyLevel;
    this.sellLevel = sellLevel;

    // internal state
    this._prevPrice = null;     // previous price for diff calculation
    this._avgGain = 0;          // Wilder smoothed average gain
    this._avgLoss = 0;          // Wilder smoothed average loss
    this._count = 0;            // number of price updates seen
    this._initializing = true;  // still collecting initial window
    this._accGain = 0;          // accumulator during initial window
    this._accLoss = 0;          // accumulator during initial window

    // public value
    this.value = null;
  }

  // alias for compatibility
  get result() {
    return this.value;
  }

  get ready() {
    return this.value !== null;
  }

  // reset internal state
  reset() {
    this._prevPrice = null;
    this._avgGain = 0;
    this._avgLoss = 0;
    this._count = 0;
    this._initializing = true;
    this._accGain = 0;
    this._accLoss = 0;
    this.value = null;
  }

  // Warm up from an array of numeric prices (fast)
  warmup(prices) {
    if (!Array.isArray(prices) || prices.length === 0) return;
    this.reset();
    for (let i = 0; i < prices.length; i++) {
      const p = Number(prices[i]);
      if (!Number.isFinite(p)) continue;
      this.update(p);
    }
  }

  // update with a new price (number). Safe: returns silently on invalid input.
  update(price) {
    const p = Number(price);
    if (!Number.isFinite(p)) return;

    if (this._prevPrice === null) {
      this._prevPrice = p;
      this._count = 1;
      return;
    }

    const change = p - this._prevPrice;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    // initial accumulation until we have interval samples (we need interval changes)
    if (this._initializing) {
      this._accGain += gain;
      this._accLoss += loss;
      this._count++;

      if (this._count > this.interval) {
        // compute initial smoothed averages as simple average of accumulated gains/losses
        this._avgGain = this._accGain / this.interval;
        this._avgLoss = this._accLoss / this.interval;
        this._initializing = false;
        // compute RSI
        this._computeValue();
      }
      this._prevPrice = p;
      return;
    }

    // Wilder smoothing update: avg = (prev_avg*(n-1) + current) / n
    this._avgGain = ((this._avgGain * (this.interval - 1)) + gain) / this.interval;
    this._avgLoss = ((this._avgLoss * (this.interval - 1)) + loss) / this.interval;

    this._computeValue();

    this._prevPrice = p;
    this._count++;
  }

  // internal compute RSI value from _avgGain/_avgLoss (in percent 0..100)
  _computeValue() {
    if (this._avgLoss === 0 && this._avgGain === 0) {
      this.value = 50;
      return;
    }
    if (this._avgLoss === 0) {
      this.value = 100;
      return;
    }
    const rs = this._avgGain / this._avgLoss;
    this.value = 100 - (100 / (1 + rs));
  }
}

module.exports = RSI;
