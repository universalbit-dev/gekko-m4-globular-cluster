require('../core/tulind');
const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');var _ =require('../core/lodash');
var async = require('async');
const fs = require('node:fs');
var config = require('../core/util.js').getConfig();
var settings = config.SUPERTREND;this.settings=settings;var rl=[];

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

/* async check */
var check = ms => new Promise(resolve => setTimeout(resolve,seqms));
async function seqcheck() {console.log('keep calm and make something of amazing');await check;
};

function AuxiliaryIndicators(){
   var directory = 'indicators/';
   var extension = '.js';
   var files = ['ATR','StopLoss'];
   for (var file of files){
       var auxiliaryindicators = require('./' + directory + file + extension);
       log.debug('added', auxiliaryindicators);
   }
 }

function makecomparison() {
var operator = ['==','===','!=','&&','<=','>=','>','<','||','=','??','%',';',':'];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
}

function onTrade(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);log.debug('stoploss:',event.price);}
    this.prevAction = event.action;this.prevPrice = event.price;
}

var method = {
init : function() {
  AuxiliaryIndicators();
  startTime= new Date();
  this.name = 'SUPERTREND';

  log.info("====================================");
  log.info('Running', this.name);
  log.info('====================================');
  this.requiredHistory = this.tradingAdvisor.historySize;
  this.addTulipIndicator('atr', 'atr', {optInTimePeriod: this.settings.ATR});
  this.addIndicator('stoploss', 'StopLoss', {threshold:this.settings.STOPLOSS});
  this.bought = 0;

  this.supertrend = {upperBandBasic : 0,lowerBandBasic : 0,upperBand : 0,lowerBand : 0,supertrend : 0,};
  this.lastSupertrend = {upperBandBasic : 0,lowerBandBasic : 0,upperBand : 0,lowerBand : 0,supertrend : 0,};
  this.lastCandleClose = 0;
},

update : function(candle) {_.noop;seqcheck();},

log : function(candle) {
//general purpose log data
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
    candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
    if (err) {return console.log(err);}
    });
},

check : async function(candle) {
  var atrResult =  this.tulipIndicators.atr.result.result;
  this.supertrend.upperBandBasic = ((candle.high + candle.low) / 2) + (this.settings.bandFactor * atrResult);
  this.supertrend.lowerBandBasic = ((candle.high + candle.low) / 2) - (this.settings.bandFactor * atrResult);

  if(this.supertrend.upperBandBasic < this.lastSupertrend.upperBand || this.lastCandleClose > this.lastSupertrend.upperBand)
    this.supertrend.upperBand = this.supertrend.upperBandBasic; 
  else
    this.supertrend.upperBand = this.lastSupertrend.upperBand;
  if(this.supertrend.lowerBandBasic > this.lastSupertrend.lowerBand || this.lastCandleClose < this.lastSupertrend.lowerBand)
    this.supertrend.lowerBand = this.supertrend.lowerBandBasic; 
  else
    this.supertrend.lowerBand = this.lastSupertrend.lowerBand;

  switch (true){
  case(this.lastSupertrend.supertrend == this.lastSupertrend.upperBand && candle.close <= this.supertrend.upperBand):
    this.supertrend.supertrend = this.supertrend.upperBand;break
  case(this.lastSupertrend.supertrend == this.lastSupertrend.upperBand && candle.close >= this.supertrend.upperBand):
    this.supertrend.supertrend = this.supertrend.lowerBand;break;
  case(this.lastSupertrend.supertrend == this.lastSupertrend.lowerBand && candle.close >= this.supertrend.lowerBand):
    this.supertrend.supertrend = this.supertrend.lowerBand;break;
  case(this.lastSupertrend.supertrend == this.lastSupertrend.lowerBand && candle.close <= this.supertrend.lowerBand):
    this.supertrend.supertrend = this.supertrend.upperBand;break;
  default:this.supertrend.supertrend = 0
  }

  if(candle.close > this.supertrend.supertrend && this.bought == 0){
    var buyprice = this.candle.high;
    rl.push(((this.candle.close - buyprice)/buyprice*100).toFixed(2));
	_.sumBy(rl, Number).toFixed(2);
	log.info('Calculated relative profit:');rl=[];
    if (_.sumBy(rl, Number) > this.settings.rl){
    this.advice('long');makecomparison();amazing();
    this.bought = 1;
    log.debug("Buy at: ", candle.close);}
  else if(candle.close < this.supertrend.supertrend && this.bought == 1){
  var sellprice = this.candle.low;rl.push(((this.candle.close - sellprice)/sellprice*100).toFixed(2));
  log.info('Calculated relative profit:',_.sumBy(rl, Number).toFixed(2));rl=[];
    if (_.sumBy(rl, Number) > this.settings.rl){
    this.advice('short');makecomparison();amazing();
    this.bought = 0;
    log.debug("Sell at: ", candle.close);
    }
  }
  }
  else rl=[];

  this.lastCandleClose = candle.close;
  this.lastSupertrend = {
    upperBandBasic : this.supertrend.upperBandBasic,
    lowerBandBasic : this.supertrend.lowerBandBasic,
    upperBand : this.supertrend.upperBand,
    lowerBand : this.supertrend.lowerBand,
    supertrend : this.supertrend.supertrend,
  };
  sequence();
},

end : function() {log.info('THE END');}

};

module.exports = method;

// switch case universalbit-dev:https://github.com/universalbit-dev/gekko-m4-globular-cluster
//
// Downloaded from: https://github.com/xFFFFF/Gekko-Strategies
// Source: https://github.com/Gab0/gekko-adapted-strategies

