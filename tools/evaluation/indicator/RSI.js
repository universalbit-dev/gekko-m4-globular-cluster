/**
 * Relative Strength Index (RSI) indicator.
 * Usage:
 *   const rsi = new RSI({ interval: 14, buyLevel: 30, sellLevel: 70 });
 *   rsi.update(price); // price: numeric close value
 *   console.log(rsi.value); // null until enough prices collected, then RSI number
 */
class RSI {
  constructor({ interval = 14, buyLevel = 30, sellLevel = 70 } = {}) {
    this.interval = interval;
    this.buyLevel = buyLevel;
    this.sellLevel = sellLevel;
    this.buffer = [];
    this.value = null;
  }

  // Update with the latest close price (number)
  update(price) {
    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new Error('RSI: price must be a finite number');
    }
    this.buffer.push(price);
    if (this.buffer.length > this.interval + 1) {
      this.buffer.shift();
    }
    if (this.buffer.length < this.interval + 1) {
      this.value = null;
      return;
    }
    // Calculate RSI
    let gains = 0, losses = 0;
    for (let i = 1; i < this.buffer.length; i++) {
      const change = this.buffer[i] - this.buffer[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / this.interval;
    const avgLoss = losses / this.interval;
    if (avgLoss === 0) {
      this.value = 100;
    } else {
      const rs = avgGain / avgLoss;
      this.value = 100 - (100 / (1 + rs));
    }
  }
}

module.exports = RSI;
