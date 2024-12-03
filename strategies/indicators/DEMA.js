const _ = require('underscore');
var EMA = require('./EMA.js');
var Indicator = function(config) {
  this.input = 'price'  
  this.result = false;
  this.short = new EMA(config.short);
  this.long = new EMA(config.long);
    _.bindAll(this,_.functions(this));
};


Indicator.prototype.update = function(price) {
  this.short.update(price);
  this.long.update(price);
  this.calculateEMAdiff();
}

Indicator.prototype.calculateEMAdiff = function() {
  var shortEMA = this.short.result;
  var longEMA = this.long.result;

  this.result = 100 * (shortEMA - longEMA) / ((shortEMA + longEMA) / 2);
}

module.exports = Indicator;


