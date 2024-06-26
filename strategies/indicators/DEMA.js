// 引用上面的EMA代码
require('../../core/tulind');
const util=require('../../core/util');
var EMA = require('./EMA.js');
var Indicator = function(config) {
  this.input = 'price'  
  this.result = false;
  this.short = new EMA(config.short);
  this.long = new EMA(config.long);
};
util.makeEventEmitter(Indicator);

// 分别向快线与慢线中灌入当前价格，计算当前EMA
Indicator.prototype.update = function(price) {
  this.short.update(price);
  this.long.update(price);
  this.calculateEMAdiff();
}

// 该方法来自GoxTradingBot 
// https://github.com/virtimus/GoxTradingBot/blob/85a67d27b856949cf27440ae77a56d4a83e0bfbe/background.js#L145
Indicator.prototype.calculateEMAdiff = function() {
  var shortEMA = this.short.result;
  var longEMA = this.long.result;

  this.result = 100 * (shortEMA - longEMA) / ((shortEMA + longEMA) / 2);
}

module.exports = Indicator;


