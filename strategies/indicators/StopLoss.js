// stop loss as an indicator
// originally created by scraqz. Thanks!
let _ = require('../../core/lodash');
let util = require('../../core/util');
let config = util.getConfig();
let log = require('../../core/log.js');

var Indicator = function(settings) {
  this.input = 'candle';
  this.candle = null;
  this.price = 0;
  this.action = 'continue'; // continue
  this.threshold = 0.85;
}

Indicator.prototype.update = function(candle) {
  this.candle = candle;
  const stoploss = this.price * this.threshold;
  if (candle.close < stoploss) {
    if (!['stoploss', 'freefall'].includes(this.action)) { // new trend
      this.action = 'stoploss'; // sell
    } else {
      this.updatePrice(); // lower our standards
      this.action = 'freefall'; // strategy should do nothing
    }
  } else {
    if (this.price < candle.close) this.updatePrice(); // trailing
    this.action = 'continue'; // safe to continue with rest of strategy
  }
}
Indicator.prototype.updatePrice = function() {
  this.price = this.candle.close;
}
Indicator.prototype.long = function(price) {
  this.price = price;
  this.action = 'continue'; // reset in case we are in freefall before a buy
}

module.exports = Indicator;
