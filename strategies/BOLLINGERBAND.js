/**
 * BOLLINGERBAND Strategy
 * 
 * This strategy uses Bollinger Bands combined with GANN indicators and a Stop Loss mechanism.
 * 
 * Author: okibcn
 * Date: 2018-01-03
 * 
 * Indicators:
 * - BBANDS: Bollinger Bands
 * - GANN: GANN indicators
 * - StopLoss: Stop Loss mechanism
 * 
 * Methods:
 * - init: Initializes the strategy with indicators and settings.
 * - update: Updates the indicators with the latest candle data.
 * - log: Logs the calculated Bollinger Bands and GANN signal for each candle.
 * - check: Checks the current market conditions and provides trading advice.
 * 
 * Stop Loss:
 * - Automatically advises 'short' if the Stop Loss threshold is reached.
 */

var log = require('../core/log.js');
var Wrapper = require('../strategyWrapperRules.js');
var BBANDS = require('./indicators/BBANDS.js');
const StopLoss = require('./indicators/StopLoss');
var GANN = require('./indicators/GANN.js'); 

// let's create our own method
var method = Wrapper;

method.init = function() {
  this.name = '';
  this.nsamples = 0;
  this.trend = {zone: 'none', duration: 0, persisted: false};
  this.requiredHistory = this.tradingAdvisor.historySize;
  this.stopLoss = new StopLoss(5); // 5% stop loss threshold
  
  // Initialize indicators
  this.addIndicator('bbands', 'BBANDS', this.settings.bbands);
  this.gann = new GANN({
    gannAngleRatios: this.settings.gannAngleRatios,
    DEMA: this.settings.DEMA,
    SMA: this.settings.SMA
  });
};

method.update = function(candle) {
  this.stopLoss.update(candle);
  this.gann.update(candle); 
};

method.log = function(candle) {
  var BBANDS = this.indicators.bbands;
  var gannSignal = this.gann.getSignal();
  console.log('calculated BB properties for candle ', this.nsamples);

  if (BBANDS.upper > candle.close) console.log('\t', 'Upper BB:', BBANDS.upper);
  if (BBANDS.middle > candle.close) console.log('\t', 'Mid   BB:', BBANDS.middle);
  if (BBANDS.lower >= candle.close) console.log('\t', 'Lower BB:', BBANDS.lower + '\t' + 'price:' + candle.close);
  if (BBANDS.upper <= candle.close) console.log('\t', 'Upper BB:', BBANDS.upper);
  if (BBANDS.middle <= candle.close) console.log('\t', 'Mid   BB:', BBANDS.middle);
  if (BBANDS.lower < candle.close) console.log('\t', 'Lower BB:', BBANDS.lower + '\t' + 'Band gap: ' + (BBANDS.upper - BBANDS.lower));

  // Log Gann Signal
  console.log('Gann Signal:', gannSignal);
};

method.check = function(candle) {
  var BBANDS = this.indicators.bbands;
  var price = candle.close;
  this.nsamples++;
  var zone = 'none';

  if (price >= BBANDS.upper) zone = 'top';
  if ((price < BBANDS.upper) && (price >= BBANDS.middle)) zone = 'high';
  if ((price > BBANDS.lower) && (price < BBANDS.middle)) zone = 'low';
  if (price <= BBANDS.lower) zone = 'bottom';
  console.log('current zone:  ', zone);

  if (this.trend.zone == zone) {
    console.log('persisted');
    this.trend = {zone: zone, duration: this.trend.duration + 1, persisted: true};
  } else {
    console.log('Leaving zone: ', this.trend.zone);
    this.trend = {zone: zone, duration: 0, persisted: false};
  }

  // GANN Indicator signal
  var gannSignal = this.gann.getSignal();
  
  // Combining BBANDS and GANN signals
  if (gannSignal !== null) {
  if (zone === 'top' && gannSignal === 'sell') {
    this.advice('short');
  } else if (zone === 'bottom' && gannSignal === 'buy') {
    this.advice('long');
  } else if (zone === 'high' && gannSignal === 'sell') {
    this.advice('short');
  } else if (zone === 'low' && gannSignal === 'buy') {
    this.advice('long');
  }
}

  // Stoploss
  if (this.stopLoss.update(candle) == 'stoploss') {
    this.advice('short');
  } else {
    this.advice('long');
  }
};

module.exports = method;
