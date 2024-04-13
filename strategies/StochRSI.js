/*

  StochRSI - SamThomp 11/06/2014
  (updated by askmike) @ 30/07/2016

*/
const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var tulind = require('../core/tulind');
const _ = require('../core/lodash3');require('lodash-migrate');
const fs = require('node:fs');
var settings = config.StochRSI;this.settings=settings;
var stoploss= require('./indicators/StopLoss.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
var sleeptime = 900000;

var method = {};
method.init = function() {

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

  this.requiredHistory = config.tradingAdvisor.candleSize * config.tradingAdvisor.historySize;
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
},

// for debugging purposes log the last
// calculated parameters.
method.log = function() {var digits = 8;
  log.debug('calculated StochRSI properties for candle:');
  log.debug('\t', 'rsi:', rsi);
  log.debug("StochRSI min:\t\t" + this.lowestRSI);
  log.debug("StochRSI max:\t\t" + this.highestRSI);
  log.debug("StochRSI Value:\t\t" + this.stochRSI);
}

method.check = function() {
    rsi=this.tulipIndicators.rsi.result.result;
	this.rsi=rsi;
	if(this.stochRSI > this.settings.thresholds.high) {
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

		if(this.trend.duration >= this.settings.thresholds.persistence)
			this.trend.persisted = true;

		if(this.trend.persisted && !this.trend.adviced && this.stochRSI !=100) {this.trend.adviced = true;
    this.advice('short');sleep(sleeptime);log.info('...make something of amazing');
    }

		else{this.advice();}

	} else if(this.stochRSI < this.settings.thresholds.low) {

		// new trend detected
		if(this.trend.direction !== 'low')
		this.trend = {duration: 0,persisted: false,direction: 'low',adviced: false};
		this.trend.duration++;

		log.debug('In low since', this.trend.duration, 'candle(s)');
		if(this.trend.duration >= this.settings.thresholds.persistence){this.trend.persisted = true;}
		if(this.trend.persisted && !this.trend.adviced && this.stochRSI != 0) {this.trend.adviced = true;
    this.advice('long');sleep(sleeptime);log.info('...make something of amazing');}

    else {this.advice();}

	} else {
		// trends must be on consecutive candles
		this.trend.duration = 0;
		log.debug('In no trend');this.advice();
	}
}

module.exports = method;
