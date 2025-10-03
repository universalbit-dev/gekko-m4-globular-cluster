// Average Directional Movement Index (ADX) Indicator
// Usable with the Gekko trading bot. Same license as Gekko.
// Ported from Tulip Indicators: https://tulipindicators.org/adx
// Author: gab0 - 2018

const DX = require('./DX.js');

class ADXIndicator {
  constructor(period) {
    if (period <= 0) {
      throw new Error("Period must be a positive integer.");
    }

    this.input = 'candle';
    this.indicates = 'trend_strength';

    this.dx = new DX(period); // DX indicator instance

    this.result = 0; // Current ADX result
    this.periodRatio = (period - 1) / period;
    this.initSumDX = 0; // Sum of DX values for initialization
    this.initializedCount = 0; // Counter for initialization phase
    this.period = period; // ADX calculation period
  }

  update(candle) {
    if (!candle) {
      throw new Error("Invalid candle data provided.");
    }

    // Update the DX indicator with the new candle
    this.dx.update(candle);

    // Initialization phase: Aggregate DX values
    if (this.initializedCount < this.period) {
      if (this.dx.result) {
        this.initSumDX += this.dx.result;
        this.initializedCount++;
      }

      // Once initialized, calculate the initial ADX value
      if (this.initializedCount === this.period) {
        this.result = this.initSumDX / this.period;
      }
    } else {
      // Main ADX calculation phase
      this.result = this.periodRatio * this.result + this.dx.result / this.period;
    }
  }
}

module.exports = ADXIndicator;
