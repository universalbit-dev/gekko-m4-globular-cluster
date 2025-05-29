/**
 * StopLoss Indicator for Gekko Trading Bot
 * ----------------------------------------
 * Implements a stop-loss mechanism with optional trailing capability.
 * 
 * Features:
 * - Monitors candle data to trigger stop-loss or freefall actions.
 * - Supports configurable threshold (percentage below entry price).
 * - Optional trailing stop-loss: raises stop price if market price increases.
 *
 * Constructor Parameters:
 * @param {Object} settings
 * @param {number} settings.threshold - Stop-loss threshold as a percentage (e.g., 5 for 5% below entry).
 * @param {boolean} [settings.trailing=true] - Enable trailing stop-loss (default: true).
 *
 * Methods:
 * - update(candle): Updates internal state with new candle data, checks stop-loss conditions.
 * - updatePrice(): Updates the stop-loss base price to the latest candle close.
 * - long(price): Initializes indicator for a new long position at the given price.
 * - getStoploss(): Returns the current stop-loss price.
 *
 * Usage:
 *   const Indicator = require('./StopLoss.js');
 *   const stopLoss = new Indicator({ threshold: 5, trailing: true });
 *   stopLoss.long(100); // Entry at price 100
 *   stopLoss.update(candle); // On each new candle, call update
 *   const sl = stopLoss.getStoploss(); // Get current stop-loss price
 *
 */

var Indicator = function(settings) {
  this.input = 'candle';
  this.candle = null;
  this.price = 0;
  this.action = 'continue';
  this.threshold = settings.threshold;
  this.trailing = settings.trailing !== undefined ? settings.trailing : true; // new setting
};

Indicator.prototype.update = function(candle) {
  this.candle = candle;

  if (this.price === 0) {
    this.price = candle.close;
  }

  const stoploss = this.price * (1 - this.threshold / 100);

  if (candle.close < stoploss) {
    if (!['stoploss', 'freefall'].includes(this.action)) {
      this.action = 'stoploss';
      // Optionally: emit event or callback
    } else {
      this.updatePrice();
      this.action = 'freefall';
    }
  } else {
    if (this.trailing && this.price < candle.close) this.updatePrice();
    this.action = 'continue';
  }
};

Indicator.prototype.updatePrice = function() {
  this.price = this.candle.close;
};

Indicator.prototype.long = function(price) {
  this.price = price;
  this.action = 'continue';
};

Indicator.prototype.getStoploss = function() {
  // Expose current stoploss price
  return this.price * (1 - this.threshold / 100);
};

module.exports = Indicator;
