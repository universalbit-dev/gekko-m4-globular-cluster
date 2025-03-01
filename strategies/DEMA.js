// helpers
var _ = require('lodash');
var log = require('../core/log.js');
var Wrapper = require('../strategyWrapperRules.js');
// let's create our own method
var method = {Wrapper};
const StopLoss = require('./indicators/StopLoss');
// prepare everything our method needs
method.init = function() {
  this.name = 'DEMA';

  this.currentTrend='up';
  this.requiredHistory = this.tradingAdvisor.historySize;
  this.stopLoss = new StopLoss(5); // 5% stop loss threshold
  // define the indicators we need
  this.addIndicator('DEMA', 'DEMA', this.settings);
  this.addIndicator('SMA', 'SMA', this.settings.weight);
}

// what happens on every new candle?
method.update = function(candle) { this.stopLoss.update(candle);}

// for debugging purposes: log the last calculated
// EMAs and diff.
method.log = function() {
  let DEMA = this.indicators.DEMA;
  let SMA = this.indicators.SMA.result;
  
  console.debug('Indicators:');
  console.debug('Inner EMA:', DEMA.inner.result);
  console.debug('Outer EMA:', DEMA.outer.result);
  console.debug('DEMA:', DEMA.result);
  console.debug('SMA:', SMA);
  console.debug('DEMA age:', DEMA.inner.age, 'candles');
  console.debug('Stoploss:',StopLoss);
}

method.check = function() {
  let DEMA = this.indicators.DEMA;
  let SMA = this.indicators.SMA;
  
  let resDEMA = DEMA.result;
  let resSMA = SMA.result;
  let price = this.candle.close;
  let diff = resSMA - resDEMA;
  
  switch(diff){
  case(diff > this.settings.thresholds.up):this.currentTrend = 'up';break;
  case(diff < this.settings.thresholds.down):this.currentTrend = 'down';break;
  default:log.debug('--------------------------------------------');
  }
  
  let message = diff;
  console.debug('Spread:',diff);

  switch(diff > this.settings.thresholds.up){
  case(this.currentTrend !== 'up'): this.currentTrend = 'up';this.advice('long');break;
  default: log.debug('We are currently in Up trend');
  }
  
  switch(diff < this.settings.thresholds.down){
  case(this.currentTrend !== 'down'): this.currentTrend = 'down';this.advice('short');break; 
  default: log.debug('We are currently in Down trend');
  }
  
}

module.exports = method;
