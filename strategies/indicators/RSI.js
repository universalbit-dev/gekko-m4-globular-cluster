// Required indicators
const SMMA = require('./SMMA.js');

class RSIIndicator {
  constructor(settings) {
    if (!settings || !settings.interval || settings.interval <= 0) {
      throw new Error("Invalid settings: 'interval' must be a positive integer.");
    }

    this.input = 'candle'; // Input type
    this.lastClose = null; // Last closing price
    this.interval = settings.interval; // RSI interval
    this.averageUp = new SMMA(this.interval); // Average upward movement
    this.averageDown = new SMMA(this.interval); // Average downward movement
    this.upMove = 0; // Current upward movement
    this.downMove = 0; // Current downward movement
    this.relativeStrength = 0; // Relative Strength (RS)
    this.result = 0; // RSI result
    this.age = 0; // Age of the indicator (number of updates)
  }

  update(candle) {
    if (!candle || typeof candle.close !== 'number') {
      throw new Error("Invalid candle data: 'close' price is required.");
    }

    const currentClose = candle.close;

    // Handle the first update case
    if (this.lastClose === null) {
      this.lastClose = currentClose;
      this.age++;
      return; // Skip RSI calculation for the first candle
    }

    // Calculate upward and downward movements
    if (currentClose > this.lastClose) {
      this.upMove = currentClose - this.lastClose;
      this.downMove = 0;
    } else {
      this.upMove = 0;
      this.downMove = this.lastClose - currentClose;
    }

    // Update SMMA values
    this.averageUp.update(this.upMove);
    this.averageDown.update(this.downMove);

    // Calculate Relative Strength (RS) and RSI
    if (this.averageDown.result === 0) {
      this.result = this.averageUp.result === 0 ? 0 : 100; // Handle edge cases
    } else {
      this.relativeStrength = this.averageUp.result / this.averageDown.result;
      this.result = 100 - (100 / (1 + this.relativeStrength));
    }

    // Update last close price and age
    this.lastClose = currentClose;
    this.age++;
  }
}

module.exports = RSIIndicator;
