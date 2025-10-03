/**
 * Directional Movement Index (DX) Indicator
 * Ported from Tulip Indicators: https://tulipindicators.org/dx
 * Author: gab0, updated by universalbit-dev
 */
const ATR = require('./ATR.js');

class DX {
  constructor(params = 14) {
    // Accept DX(period) or DX({period: ...})
    let period = typeof params === 'object' ? params.period : params;
    if (!Number.isInteger(period) || period <= 0) {
      throw new Error(`DX: period must be a positive integer (got '${period}')`);
    }
    this.period = period;
    this.atr = new ATR({ period });
    this.lastCandle = null;
    this.age = 0;

    this.dmUp = 0;
    this.dmDown = 0;
    this.diUp = 0;
    this.diDown = 0;
    this.result = null;
    this.value = null;
    this._weight = (period - 1) / period;
  }

  update(candle) {
    this.atr.update(candle);
    if (this.lastCandle) {
      const upMove = candle.high - this.lastCandle.high;
      const downMove = this.lastCandle.low - candle.low;

      let up = 0, down = 0;
      if (upMove > 0 && upMove > downMove) up = upMove;
      if (downMove > 0 && downMove > upMove) down = downMove;

      this.dmUp = this._weight * this.dmUp + up;
      this.dmDown = this._weight * this.dmDown + down;

      if (this.atr.value) {
        this.diUp = this.dmUp / this.atr.value;
        this.diDown = this.dmDown / this.atr.value;

        const dmDiff = Math.abs(this.diUp - this.diDown);
        const dmSum = this.diUp + this.diDown;

        if (this.age >= this.period && dmSum !== 0) {
          this.result = 100 * dmDiff / dmSum;
          this.value = this.result;
        } else {
          this.result = null;
          this.value = null;
        }
      } else {
        this.result = null;
        this.value = null;
      }
    }
    this.lastCandle = candle;
    this.age++;
  }
}

module.exports = DX;
