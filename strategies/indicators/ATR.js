// @link http://www.stockcharts.com/school/doku.php?id=chart_school:technical_indicators:average_true_range_atr
// formula http://www.fmlabs.com/reference/default.htm?url=ATR.htm
// Gab0 - 01/24/2018
const _ = require('underscore');
var TRANGE = require('./TRANGE.js');
var SMMA = require('./SMMA.js');

var Indicator = function(period) {
    this.input = 'candle';
    this.indicates = 'volatility';
    this.result = false;
    this.age = 0;
    this.trange = new TRANGE();
    this.smooth = new SMMA(period);
      _.bindAll(this,_.functions(this));
};

Indicator.prototype.update = function(candle) {
    this.trange.update(candle);
    this.smooth.update(this.trange.result);
    this.result = this.smooth.result;
    this.age++;
    return this.result;
}

module.exports = Indicator;
