/**
 * Average True Range (ATR) indicator.
   updated by universalbit-dev
 */

class ATR {
  constructor({ period = 14 } = {}) {
    if (typeof period !== 'number' || period < 1) {
      throw new Error('ATR: period must be a positive integer');
    }
    this.period = period;
    this.buffer = [];
    this.value = null;
  }

  // Accepts candle as array or object
  update(candle) {
    let high, low, close;
    if (Array.isArray(candle)) {
      // [open, high, low, close, volume]
      high = candle[1]; low = candle[2]; close = candle[3];
    } else if (typeof candle === 'object' && candle !== null) {
      high = candle.high; low = candle.low; close = candle.close;
    } else {
      throw new Error('ATR: candle must be an array or object');
    }
    if (![high, low, close].every(Number.isFinite)) {
      throw new Error('ATR: Candle must have numeric high, low, close');
    }

    this.buffer.push({ high, low, close });
    if (this.buffer.length > this.period + 1) {
      this.buffer.shift();
    }
    if (this.buffer.length < this.period + 1) {
      this.value = null;
      return;
    }

    // Calculate True Range for last period candles
    let trs = [];
    for (let i = 1; i < this.buffer.length; i++) {
      const prevClose = this.buffer[i - 1].close;
      const currHigh = this.buffer[i].high;
      const currLow = this.buffer[i].low;
      const tr = Math.max(
        currHigh - currLow,
        Math.abs(currHigh - prevClose),
        Math.abs(currLow - prevClose)
      );
      trs.push(tr);
    }
    this.value = trs.reduce((sum, tr) => sum + tr, 0) / this.period;
  }
}

module.exports = ATR;
