require('../core/tulind');
const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
const _ = require('../core/lodash');
const fs = require('node:fs');
var settings = config.STOCHRSI;this.settings=settings;var rl=[];
var async = require('async');

/* async fibonacci sequence */
var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
var seqms = fibonacci_sequence[Math.floor(Math.random() * fibonacci_sequence.length)];

var sequence = ms => new Promise(resolve => setTimeout(resolve, seqms));
async function sequence() {await sequence;
};

/* async keep calm and make something of amazing */
var keepcalm = ms => new Promise(resolve => setTimeout(resolve,seqms));
async function amazing() {console.log('keep calm and make something of amazing');await keepcalm;
};

function AuxiliaryIndicators(){
   var directory = 'indicators/';
   var extension = '.js';
   var files = ['ATR','StopLoss','STOCH'];  
   for (var file of files){ 
       var auxiliaryindicators = require('./' + directory + file + extension);
       log.debug('added', auxiliaryindicators);
   }
 }
 
 function onTrade(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}
    this.prevAction = event.action;
    this.prevPrice = event.price;
}
 
 
var method = {};
method.init = function() {
  AuxiliaryIndicators();
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
  this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod: this.settings.RSI,optInFastPeriod:89,optInSlowPeriod:21});
  this.addTulipIndicator('stoch', 'stoch', {optInFastKPeriod: 89,optInSlowKPeriod:21,optInSlowDPeriod:this.settings.STOCH});
  this.addIndicator('stoploss', 'StopLoss', {threshold : this.settings.STOPLOSS});

  RSIhistory=[];
  this.RSIhistory = RSIhistory;

  log.info('================================================');
  log.info('keep calm and make somethig of amazing');
  log.info('================================================');
//Date
startTime = new Date();
}

method.update = function(candle) {_.noop;}

method.log = function(candle) {
//general purpose log data
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
    candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
    if (err) {return console.log(err);}
    });
}

method.makeoperator= function() {
var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>'];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
},

method.onTrade = function(event) {if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}this.prevAction = event.action;this.prevPrice = event.price;}

method.check = async function(candle)
{
    rsi=this.tulipIndicators.rsi.result.result;this.rsi=rsi;
    stoch=this.tulipIndicators.stoch.result.result;
    this.RSIhistory.push(this.rsi);

    if(_.size(this.RSIhistory) > this.interval)
    this.RSIhistory.shift();
    this.lowestRSI = _.min(this.RSIhistory);
    this.highestRSI = _.max(this.RSIhistory);
    this.stochRSI = ((this.rsi - this.lowestRSI) / (this.highestRSI - this.lowestRSI)) * 100;

	if((this.stochRSI > 70)&&(this.trend.direction !== 'high'))
	{
	this.trend = {duration: 0,persisted: false,direction: 'high',adviced: false}
	this.trend.duration++;
	log.debug('In high since' ,this.trend.duration, 'candle(s)');
	}
	if(this.trend.duration >= this.settings.persisted)
	{
	this.trend.persisted = true;
	}
	if(this.trend.persisted && this.trend.adviced != false && this.stochRSI !=100)
	{
	this.trend.adviced = true;
	var buyprice = this.candle.low;
    var profit = rl.push(((candle.close - buyprice)/buyprice*100).toFixed(2));
    log.info('Calculated relative profit:',_.sumBy(rl, Number).toFixed(2));
    }
    if (_.sumBy(rl, Number) > this.settings.rl){return this.advice();rl=[];} /* */
	
	if((this.stochRSI < 30)&&(this.trend.direction !== 'low'))
	{
	this.trend = {duration: 0,persisted: false,direction: 'low',adviced: false};
    this.trend.duration++;
    log.debug('In low since', this.trend.duration, 'candle(s)');
	if(this.trend.duration >= this.settings.persisted){this.trend.persisted = true;}
	if(this.trend.persisted && this.trend.adviced != false && this.stochRSI != 0)
	{
	this.trend.adviced = true;
	var sellprice = this.candle.high;
	var profit = rl.push(((candle.close - sellprice)/sellprice*100).toFixed(2));
	log.info('Calculated relative profit:',_.sumBy(rl, Number).toFixed(2));
	}
    if (_.sumBy(rl, Number) > this.settings.rl){return this.advice();rl=[];} /* */
	else {this.trend.duration = 0;log.debug('In no trend');_.noop;}
	}
	
	
    log.debug('calculated StochRSI properties:');
    log.debug('\t', 'rsi:', rsi);
    log.debug("StochRSI min:\t\t" + this.lowestRSI);
    log.debug("StochRSI max:\t\t" + this.highestRSI);
    log.debug("StochRSI value:\t\t" + this.stochRSI);
	sequence();
},
method.end = function() {log.info('THE END');}

module.exports = method;
