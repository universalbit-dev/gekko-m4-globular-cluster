/* BB strategy - okibcn 2018-01-03 */
const { addon: ov } = require('openvino-node');
var Promise = require("bluebird");const _ = require("underscore");
var log = require('../core/log.js');
var fs = require("fs-extra");fs.createReadStream('/dev/null');
var method = {};
const StopLoss = require('./indicators/StopLoss');
method.makeoperator = function() {
var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>'];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
}

method.init = function() {
  this.name = 'BOLLINGERBAND';
  this.nsamples = 0;
  this.trend = {zone: 'none',duration: 0,persisted: false};
  this.requiredHistory = this.tradingAdvisor.historySize;
  this.stopLoss = new StopLoss(5); // 5% stop loss threshold
  this.addTulipIndicator('BB', 'bbands', {optInTimePeriod:this.settings.period,optInNbStdDevs:this.settings.nbstddevs});
}

method.update = function(candle) {
  var digits = 8;BB=this.tulipIndicators.bbands;
  log.debug('______________________________________');log.debug('calculated BB properties for candle ',this.nsamples);
  if (BB.bbands_upper>candle.close)  log.debug('\t', 'Upper BB:', BB.bbands_upper.toFixed(digits));
  if (BB.bbands_middle>candle.close) log.debug('\t', 'Mid   BB:', BB.bbands_middle.toFixed(digits));
  if (BB.bbands_lower>=candle.close) log.debug('\t', 'Lower BB:', BB.bbands_lower.toFixed(digits));log.debug('\t', 'price:', candle.close.toFixed(digits));
  if (BB.bbands_upper<=candle.close)  log.debug('\t', 'Upper BB:', BB.bbands_upper.toFixed(digits));
  if (BB.bbands_middle<=candle.close) log.debug('\t', 'Mid   BB:', BB.bbands_middle.toFixed(digits));
  if (BB.bbands_lower<candle.close)   log.debug('\t', 'Lower BB:', BB.bbands_lower.toFixed(digits));log.debug('\t', 'Band gap: ', BB.bbands_upper.toFixed(digits) - BB.bbands_lower.toFixed(digits));
  this.stopLoss.update(candle);
}

method.check = function(candle) {bbands=this.tulipIndicators.bbands;var price = this.candle.close;this.nsamples++;
  var zone = 'none';
  if (price >= bbands.bbands_upper) zone = 'top';
  if ((price < bbands.bbands_upper) && (price >= bbands.bbands_middle)) zone = 'high';
  if ((price > bbands.bbands_lower) && (price < bbands.bbands_middle)) zone = 'low';
  if (price <= bbands.bbands_lower) zone = 'bottom';log.debug('current zone:  ',zone);
  if (this.trend.zone == zone){log.debug('persisted');
  this.trend = {zone: zone,duration: this.trend.duration+1,persisted: true},this.advice();}
  else {
  log.debug('Leaving zone: ',this.trend.zone)
  if (this.trend.zone == 'top')  this.advice('short'); /* */
  if (this.trend.zone == 'bottom') this.advice('long'); /* */
  if (this.trend.zone == 'high') this.advice();
  if (this.trend.zone == 'low') this.advice();
  //if (this.trend.zone == 'top') log.debug('>>> SIGNALING ADVICE SELL <<<');
  //if (this.trend.zone == 'bottom') log.debug('>>> SIGNALING ADVICE BUY  <<<');
  this.trend = {zone: zone,duration: 0,persisted: false}
  }
  //stoploss
    if (this.stopLoss.shouldSell(candle)) {this.advice('short');} 
    else {this.advice('long');}
}

module.exports = method;
