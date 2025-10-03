/**
 * Simple Moving Average (SMA) Indicator - Modular Implementation
 * Accepts either SMA(windowLength) or SMA({windowLength}) or SMA({interval}).
 */
class SMA {
  constructor(params = 14) {
    // Support SMA(14), SMA({windowLength: 14}), SMA({interval: 14})
    let windowLength = typeof params === 'object'
      ? params.windowLength || params.interval
      : params;

    if (!Number.isInteger(windowLength) || windowLength <= 0) {
      throw new Error(`SMA: windowLength must be a positive integer (got '${windowLength}')`);
    }
    this.windowLength = windowLength;
    this.prices = new Array(windowLength).fill(0);
    this.sum = 0;
    this.age = 0;
    this.count = 0;
    this.value = null;
  }

  update(price) {
    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new Error('SMA: price must be a finite number');
    }
    const tail = this.prices[this.age];
    this.sum += price - tail;
    this.prices[this.age] = price;
    this.age = (this.age + 1) % this.windowLength;
    if (this.count < this.windowLength) this.count++;
    this.value = this.count === this.windowLength ? this.sum / this.windowLength : null;
  }
}

module.exports = SMA;
