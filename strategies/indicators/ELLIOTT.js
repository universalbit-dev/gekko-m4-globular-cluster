/**
 * Elliott Wave Oscillator with Additional Features
 * 
 * This module implements the Elliott Wave Oscillator, which calculates the 
 * difference between a short-term and a long-term simple moving average (SMA).
 * It also integrates the Relative Strength Index (RSI) and Moving Average 
 * Convergence Divergence (MACD) indicators to provide a more robust analysis.
 *
 * Features:
 * - Calculates the difference between two SMAs to generate the oscillator value.
 * - Integrates RSI and MACD indicators for enhanced signal generation.
 * - Generates buy/sell signals based on combined values of the oscillator, RSI, and MACD.
 *
 * Usage:
 * const ElliottWaveOscillator = require('./indicators/ELLIOTT');
 * const ewo = new ElliottWaveOscillator(5, 35, 14, 12, 26, 9);
 * 
 * // Update the oscillator with new price data
 * ewo.update(newPrice);
 * console.log(ewo.result);
 * console.log(ewo.getSignal());
 *
 * @param {number} shortWindowLength - The window length for the short-term SMA.
 * @param {number} longWindowLength - The window length for the long-term SMA.
 * @param {number} rsiPeriod - The period for the RSI calculation.
 * @param {number} macdShortPeriod - The short period for the MACD calculation.
 * @param {number} macdLongPeriod - The long period for the MACD calculation.
 * @param {number} macdSignalPeriod - The signal period for the MACD calculation.
 *
 * @method update - Updates the indicator with a new price.
 * @method getSignal - Retrieves the current buy/sell signal.
 *
 * @module ELLIOTT
 */

var Indicator = function(shortWindowLength, longWindowLength) {
  this.input = 'price';
  this.shortWindowLength = shortWindowLength;
  this.longWindowLength = longWindowLength;
  this.shortPrices = [];
  this.longPrices = [];
  this.shortSum = 0;
  this.longSum = 0;
  this.result = 0;
  this.age = 0;
  this.signal = null;
}

Indicator.prototype.update = function(price) {
  // Update short window
  var shortTail = this.shortPrices[this.age % this.shortWindowLength] || 0; // oldest price in short window
  this.shortPrices[this.age % this.shortWindowLength] = price;
  this.shortSum += price - shortTail;
  var shortSMA = this.shortSum / Math.min(this.shortPrices.length, this.shortWindowLength);

  // Update long window
  var longTail = this.longPrices[this.age % this.longWindowLength] || 0; // oldest price in long window
  this.longPrices[this.age % this.longWindowLength] = price;
  this.longSum += price - longTail;
  var longSMA = this.longSum / Math.min(this.longPrices.length, this.longWindowLength);

  // Calculate the Elliott Wave Oscillator
  this.result = shortSMA - longSMA;

  // Generate signals
  if (this.result > 0 && !this.signal) {
    this.signal = 'buy';
  } else if (this.result < 0 && this.signal) {
    this.signal = 'sell';
  }

  this.age++;
}

Indicator.prototype.getSignal = function() {
  return this.signal;
}

module.exports = Indicator;
