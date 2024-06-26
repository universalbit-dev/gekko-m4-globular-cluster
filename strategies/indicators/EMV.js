//EMV indicator by Gab0 - 06/jan/2019;
// Settings: NONE;
require('../../core/tulind');
const util=require('../../core/util');
var Indicator = function(settings) {
    this.input = 'candle';

    this.result = NaN;
    this.age = 0;

    this.last = 0;
};
util.makeEventEmitter(Indicator);

Indicator.prototype.update = function(candle) {


    if (this.age == 0)
    {
        this.last = (candle.high + candle.low) * 0.5;
    }
    else
    {
        var current = (candle.high + candle.low) * 0.5;
        var divisor = candle.volume / 10000.0 / (candle.high - candle.low);

        this.result = (current - this.last) / divisor;
        this.last = current;
    }

    this.age++;
};

module.exports = Indicator;
