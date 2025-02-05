const Indicator = function(threshold) {
  this.input = 'candle';
  this.threshold = threshold;
  this.highestPrice = 0;
};

Indicator.prototype.update = function(candle) {
  const closePrice = candle.close;

  // Update the highest price seen so far
  if (closePrice > this.highestPrice) {
    this.highestPrice = closePrice;
  }

  // Calculate the stop loss price
  this.stopLossPrice = this.highestPrice * (1 - this.threshold / 100);
};

Indicator.prototype.shouldSell = function(candle) {
  const closePrice = candle.close;
  return closePrice <= this.stopLossPrice;
};

module.exports = Indicator;
