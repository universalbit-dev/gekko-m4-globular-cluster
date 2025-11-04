#!/usr/bin/env node
/**
 * tools/evaluation/indicator/ADX.js
 *
 * Efficient ADX implementation (Average Directional Index).
 * - Inputs per candle: high, low, close
 * - Internally computes DM+, DM-, TR, applies Wilder smoothing, computes +DI, -DI, DX,
 *   and then ADX as Wilder-smoothed DX over the period.
 * - O(1) per update, minimal allocations.
 *
 * Usage:
 *   const adx = new ADX(14);
 *   adx.update({high, low, close});
 *   adx.value -> current ADX (null until warmed)
 *   adx.plusDI, adx.minusDI, adx.dx available
 *   adx.reset(); adx.warmup(arrayOfOHLC)
 */

const ATR = require('./ATR');
const DX = require('./DX');

class ADX {
  constructor(period = 14) {
    this.period = Math.max(1, Math.floor(period));
    this._prev = null; // {high,low,close}
    // smoothed accumulators
    this._smPlus = 0;
    this._smMinus = 0;
    this._smTR = 0; // tracked same as ATR.trSMA
    this._adxSMA = 0; // Wilder smoothing for DX -> ADX
    this._dx = new DX();
    this.atr = new ATR(this.period);
    this._count = 0;
    this.value = null;
    this.plusDI = null;
    this.minusDI = null;
    this.dx = null;
  }

  get ready() { return this._count >= this.period; }

  reset() {
    this._prev = null;
    this._smPlus = 0;
    this._smMinus = 0;
    this._smTR = 0;
    this._adxSMA = 0;
    this._dx.reset();
    this.atr.reset();
    this._count = 0;
    this.value = null;
    this.plusDI = null;
    this.minusDI = null;
    this.dx = null;
  }

  warmup(ohlcArray) {
    if (!Array.isArray(ohlcArray)) return;
    this.reset();
    for (const o of ohlcArray) this.update(o);
  }

  update(o) {
    const high = Number(o.high), low = Number(o.low), close = Number(o.close);
    if (![high, low, close].every(v => isFinite(v))) return this.value;

    // compute True Range via ATR helper (which also does smoothing)
    const atrVal = this.atr.update({ high, low, close }); // returns null until warmed
    // compute raw directional movements
    if (this._prev === null) {
      this._prev = { high, low, close };
      return this.value;
    }
    const upMove = high - this._prev.high;
    const downMove = this._prev.low - low;
    const plusDM = (upMove > 0 && upMove > downMove) ? upMove : 0;
    const minusDM = (downMove > 0 && downMove > upMove) ? downMove : 0;

    // smooth DM and TR in Wilder style using same period as ATR
    if (this._count < this.period) {
      // accumulate simple average until warm
      this._smPlus = (this._smPlus * this._count + plusDM) / (this._count + 1);
      this._smMinus = (this._smMinus * this._count + minusDM) / (this._count + 1);
      // ATR already provides trSMA-like value in atr.atr.trSMA internal; but we only have atrVal
      // use atrVal as smoothed TR estimate for DI calculation when available
      this._count++;
    } else {
      // Wilder smoothing: new = (old*(n-1) + current)/n
      this._smPlus = (this._smPlus * (this.period - 1) + plusDM) / this.period;
      this._smMinus = (this._smMinus * (this.period - 1) + minusDM) / this.period;
    }

    // when atrVal is present use it as smoothed TR; otherwise fallback to estimate
    const smTR = atrVal || this._smTR || (this._smPlus + this._smMinus) || 0;
    this._smTR = smTR;

    // compute +DI and -DI and DX when smTR available
    if (smTR > 0) {
      this.plusDI = (this._smPlus / smTR) * 100;
      this.minusDI = (this._smMinus / smTR) * 100;
      const dxVal = this._dx.update(this._smPlus, this._smMinus, smTR);
      this.dx = dxVal;
    } else {
      this.plusDI = 0;
      this.minusDI = 0;
      this.dx = 0;
    }

    // ADX smoothing: Wilder smoothing of DX over period
    if (this._count < this.period) {
      // accumulate simple average
      this._adxSMA = (this._adxSMA * (this._count - 1 >= 0 ? this._count - 1 : 0) + (this.dx || 0)) / Math.max(1, this._count);
    } else if (this._count === this.period) {
      // initialize adxSMA as average of first period's DX: approximate by using current value
      this._adxSMA = this.dx || 0;
    } else {
      // Wilder smooth
      this._adxSMA = ((this._adxSMA * (this.period - 1)) + (this.dx || 0)) / this.period;
    }

    if (this._count >= this.period) {
      this.value = this._adxSMA;
    }

    this._prev = { high, low, close };
    return this.value;
  }

  next(o) { return this.update(o); }
}

module.exports = ADX;
