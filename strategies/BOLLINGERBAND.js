/* BB strategy - okibcn 2018-01-03 */

// helpers
var log = require('../core/log.js');
var Wrapper = require('../strategyWrapperRules.js');
var BBANDS = require('./indicators/BBANDS.js');
const StopLoss = require('./indicators/StopLoss');
// let's create our own method
var method = Wrapper;

method.init = function() {
  this.name = '';
  this.nsamples = 0;
  this.trend = {zone: 'none',duration: 0,persisted: false};
  this.requiredHistory = this.tradingAdvisor.historySize;
  this.stopLoss = new StopLoss(5); // 5% stop loss threshold
  
  this.addIndicator('bbands', 'BBANDS', this.settings.bbands);
}
method.update = function(candle) { this.stopLoss.update(candle);}
method.log = function(candle) {
  var BBANDS = this.indicators.bbands;
  log.debug('______________________________________');
  log.debug('calculated BB properties for candle ',this.nsamples);

  if (BBANDS.upper > candle.close) log.debug('\t', 'Upper BB:', BBANDS.upper);
  if (BBANDS.middle > candle.close) log.debug('\t', 'Mid   BB:', BBANDS.middle);
  if (BBANDS.lower >= candle.close) log.debug('\t', 'Lower BB:', BBANDS.lower + '\t' + 'price:' + candle.close);
  if (BBANDS.upper <= candle.close) log.debug('\t', 'Upper BB:', BBANDS.upper);
  if (BBANDS.middle <= candle.close) log.debug('\t', 'Mid   BB:', BBANDS.middle);
  if (BBANDS.lower < candle.close) log.debug('\t', 'Lower BB:', BBANDS.lower + '\t' + 'Band gap: ' + (BBANDS.upper - BBANDS.lower));
}

method.check = function(candle) {
  var BBANDS = this.indicators.bbands;
  var price = candle.close;
  this.nsamples++;
  var zone = 'none';

  if (price >= BBANDS.upper) zone = 'top';
  if ((price < BBANDS.upper) && (price >= BBANDS.middle)) zone = 'high';
  if ((price > BBANDS.lower) && (price < BBANDS.middle)) zone = 'low';
  if (price <= BBANDS.lower) zone = 'bottom';
  log.debug('current zone:  ',zone);

  if (this.trend.zone == zone){
    log.debug('persisted');
	this.trend = {zone: zone,duration: this.trend.duration+1,persisted: true}
	this.advice();
  }
  else {
    log.debug('Leaving zone: ',this.trend.zone)
  	if (this.trend.zone == 'top') this.advice('short');
  	if (this.trend.zone == 'bottom') this.advice('long');
 	if (this.trend.zone == 'high') this.advice();
  	if (this.trend.zone == 'low') this.advice();
   	this.trend = {zone: zone,duration: 0,persisted: false}
  }
  //stoploss
    if (this.stopLoss.update(candle) == 'stoploss') {this.advice('short');}  
    else {this.advice('long');}
}

module.exports = method;
