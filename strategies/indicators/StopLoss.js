var Indicator = function(settings) {
  this.input = 'candle';
  this.candle = null;
  this.price = 0;
  this.action = 'continue'; // continue
  this.threshold = settings.threshold;
}

Indicator.prototype.update = function(candle) {
  this.candle = candle;

  // If price is zero, set it to the current candle close price
  if (this.price === 0) {
    this.price = candle.close;
  }

  const stoploss = this.price * (1 - this.threshold / 100); // calculate stop-loss price

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
