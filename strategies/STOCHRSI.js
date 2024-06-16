require('../core/tulind');
const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
const _ = require('../core/lodash');
const fs = require('node:fs');
var settings = config.STOCHRSI;this.settings=settings;
var stoploss= require('./indicators/StopLoss.js');

var async = require('async');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait() {console.log('keep calm and make something of amazing');await sleep(60000);};

var method = {};
method.init = function() {

  this.name = 'STOCHRSI';
  log.info('Start' ,this.name);
  this.trend = {
    direction: 'none',
    duration: 0,
    persisted: false,
    adviced: false
  };
//optInTimePeriod : Fibonacci Sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 ,610 ,987
  this.requiredHistory = this.settings.historySize;
  this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod: 13});
  this.addIndicator('stoploss', 'StopLoss', {threshold : 3});

  this.RSIhistory = [];
  log.info('================================================');
  log.info('keep calm and make somethig of amazing');
  log.info('================================================');
//Date
startTime = new Date();
}

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
method.makeoperators=function() {
var operator = ['==','===','!=','&&','<=','>=','>','<','||','='];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
}

// for debugging purposes log the last
// calculated parameters.
method.log = function() {var digits = 8;
  log.debug('calculated StochRSI properties:');
  log.debug('\t', 'rsi:', rsi);
  log.debug("StochRSI min:\t\t" + this.lowestRSI);
  log.debug("StochRSI max:\t\t" + this.highestRSI);
  log.debug("StochRSI Value:\t\t" + this.stochRSI);
}

method.check = function(candle) {
    rsi=this.tulipIndicators.rsi.result.result;
	this.rsi=rsi;
	if(this.stochRSI > 70) {
		// new trend detected
		if(this.trend.direction != 'high')
			this.trend = {
				duration: 0,
				persisted: false,
				direction: 'high',
				adviced: false
			};

		this.trend.duration++;

		log.debug('In high since', this.trend.duration, 'candle(s)');

		if(this.trend.duration >= 1)
	   {this.trend.persisted = true;}

		if(this.trend.persisted && !this.trend.adviced && this.stochRSI !=100)
		{this.trend.adviced = true;this.advice('short');this.makeoperators();wait();}

		else {_.noop;}
	}

	else if(this.stochRSI < 30)
	{
		if(this.trend.direction != 'low')
		{
		this.trend = {duration: 0,persisted: false,direction: 'low',adviced: false};
		this.trend.duration++;
		log.debug('In low since', this.trend.duration, 'candle(s)');
		}
		if(this.trend.duration >= 1)
		{this.trend.persisted = true;}
		if(this.trend.persisted && !this.trend.adviced && this.stochRSI != 0)
		{this.trend.adviced = true;this.advice('long');this.makeoperators();wait();}

    else {_.noop;}
	}

	else {this.trend.duration = 0;log.debug('In no trend');_.noop;}
}

module.exports = method;
