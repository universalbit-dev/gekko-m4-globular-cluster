//AO indicator by Gab0 - 04/jan/2019;
const _ = require('underscore');
var SMA = require('./SMA');

var Indicator = function(settings) {
    this.input = 'candle';
    this.result = NaN;
    this.age = 0;
    this.shortsma = new SMA(5);
    this.longsma = new SMA(34);
      _.bindAll(this,_.functions(this));
};

Indicator.prototype.update = function(candle) {

    var medianprice = (candle.high + candle.low) / 2;

    this.shortsma.update(medianprice);
    this.longsma.update(medianprice);

    this.age++;

    if (this.age > 33)
        this.result = this.shortsma.result - this.longsma.result;

};

module.exports = Indicator;
