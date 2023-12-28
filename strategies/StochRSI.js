/*

  StochRSI - SamThomp 11/06/2014

  (updated by askmike) @ 30/07/2016

 */
// helpers
var log = require('../core/log.js');
var fs = require('fs-extra');
var config = require('../core/util.js').getConfig();
var settings = config.StochRSI;
this.settings=settings;
var _ =require('../core/lodash3');
var stoploss= require('./indicators/StopLoss.js');


// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function() {
  this.interval = settings.interval;
  this.name = 'StochRSI';
  log.info('============================================');
  log.info('Start StochRSI');
  log.info('============================================');
  this.trend = {
    direction: 'none',
    duration: 0,
    persisted: false,
    adviced: false
  };

  this.requiredHistory = config.tradingAdvisor.historySize;
  this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod: this.settings.interval});
  this.addIndicator('stoploss', 'StopLoss', {threshold : this.settings.threshold});

  this.RSIhistory = [];
  log.info('================================================');
  log.info('keep calm and make somethig of amazing');
  log.info('================================================');
//Date
startTime = new Date();
}

// what happens on every new candle?
method.update = function(candle) {
rsi=this.tulipIndicators.rsi.result.result;
	this.rsi=rsi;
this.RSIhistory.push(this.rsi);
if(_.size(this.RSIhistory) > this.interval)
// remove oldest RSI value
this.RSIhistory.shift();
this.lowestRSI = _.min(this.RSIhistory);
this.highestRSI = _.max(this.RSIhistory);
this.stochRSI = ((this.rsi - this.lowestRSI) / (this.highestRSI - this.lowestRSI)) * 100;

	fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
	candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
    if (err) {return console.log(err);}
    });
}

method.onTrade= function(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}
    this.prevAction = event.action;
    this.prevPrice = event.price;
 }
// for debugging purposes log the last
// calculated parameters.
method.log = function() {
  var digits = 8;

  log.debug('calculated StochRSI properties for candle:');
  log.debug('\t', 'rsi:', this.rsi.toFixed(digits));
	log.debug("StochRSI min:\t\t" + this.lowestRSI.toFixed(digits));
	log.debug("StochRSI max:\t\t" + this.highestRSI.toFixed(digits));
	log.debug("StochRSI Value:\t\t" + this.stochRSI.toFixed(2));
}

method.check = function() {
        rsi=this.tulipIndicators.rsi.result.result;
	this.rsi=rsi;
	if(this.stochRSI > settings.thresholds.high) {
		// new trend detected
		if(this.trend.direction !== 'high')
			this.trend = {
				duration: 0,
				persisted: false,
				direction: 'high',
				adviced: false
			};

		this.trend.duration++;

		log.debug('In high since', this.trend.duration, 'candle(s)');

		if(this.trend.duration >= settings.thresholds.persistence)
			this.trend.persisted = true;

		if(this.trend.persisted && !this.trend.adviced && this.stochRSI !=100) {this.trend.adviced = true;this.advice('short');}
		else{this.advice();}

	} else if(this.stochRSI < settings.thresholds.low) {

		// new trend detected
		if(this.trend.direction !== 'low')
		this.trend = {duration: 0,persisted: false,direction: 'low',adviced: false};
		this.trend.duration++;

		log.debug('In low since', this.trend.duration, 'candle(s)');
		if(this.trend.duration >= settings.thresholds.persistence){this.trend.persisted = true;}
		if(this.trend.persisted && !this.trend.adviced && this.stochRSI != 0) {this.trend.adviced = true;this.advice('long');}
		else {this.advice();}

	} else {
		// trends must be on consecutive candles
		this.trend.duration = 0;
		log.debug('In no trend');
		this.advice();
	}
}

module.exports = method;
