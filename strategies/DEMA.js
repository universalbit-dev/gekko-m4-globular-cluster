require('../core/tulind');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();

var async = require('async');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait() {console.log('keep calm and make something of amazing');await sleep(60000);};


var method = {
init : function() {
  this.name = 'DEMA';
  this.currentTrend;
  this.requiredHistory = config.tradingAdvisor.historySize;

  this.addTulipIndicator('dema', 'dema', {optInTimePeriod: this.settings.DEMA});
  this.addTulipIndicator('sma', 'sma', {optInTimePeriod: this.settings.SMA});
},

update : function(candle) {  
  var dema =  this.tulipIndicators.dema.result.result;
  var sma =  this.tulipIndicators.sma.result.result;
  var diff= dema-sma;this.diff=diff.toFixed(6);
  var price = this.candle.close;this.price=price;
  log.debug('Calculated DEMA and SMA properties for candle:');
  log.debug('\t DEMA:', dema);
  log.debug('\t SMA:', sma);
  log.debug('\t PRICE:', this.price);log.debug('\t DIFF:', this.diff);
  },

log : function() {},

check : function() {
  dema =  this.tulipIndicators.dema.result.result;sma = this.tulipIndicators.sma.result.result;
  
  switch (true){
  case(this.diff  > this.settings.thresholds.up)&&(this.currentTrend !== 'up'): log.debug('we are currently in uptrend');this.advice('short');break;
  case(this.diff < this.settings.thresholds.down)&&(this.currentTrend !== 'down'): log.debug('we are currently in a downtrend');this.advice('long');break;
  default: log.debug('we are currently not in an up or down trend');
  } 
}

};

module.exports = method;
