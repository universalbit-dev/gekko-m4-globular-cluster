require('../core/tulind');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var async = require('async');
var _ = require ('../core/lodash');
const fs = require('node:fs');
var settings = config.DEMA;this.settings=settings;

/* async fibonacci sequence */
var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
var sequence = ms => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * fibonacci_sequence.length)));
async function sequence() {console.log('');await sequence;};

/* async keep calm and make something of amazing */ 
var keepcalm = ms => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * fibonacci_sequence.length)));
async function amazing() {console.log('keep calm and make something of amazing');await keepcalm;};

function AuxiliaryIndicators(){
   var directory = 'indicators/';
   var extension = '.js';
   var files = ['DEMA','EMA','RSI','ADX','DX','StopLoss'];  
   for (var file of files){ 
       var auxiliaryindicators = require('./' + directory + file + extension);
       log.debug('added', auxiliaryindicators);
   }
 }

function makeoperators() {
var operator = ['==','===','!=','&&','<=','>=','>','<','||','='];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
}

function onTrade(event) {if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}this.prevAction = event.action;this.prevPrice = event.price;}
 
var method = {
init : function() {
  AuxiliaryIndicators();
  startTime = new Date();
  this.name = 'DEMA';
  this.currentTrend;
  this.requiredHistory = config.tradingAdvisor.historySize;
  this.addIndicator('stoploss', 'StopLoss', {threshold:this.settings.STOPLOSS});
  this.addTulipIndicator('dema', 'dema', {optInTimePeriod: this.settings.DEMA});
  this.addTulipIndicator('sma', 'sma', {optInTimePeriod: this.settings.SMA});
},

update : function(candle) {_.noop},

log : function(candle) {
//general purpose log data
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
    candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
    if (err) {return console.log(err);}
    });
},

check : function(candle) {
  dema =  this.tulipIndicators.dema.result.result;sma = this.tulipIndicators.sma.result.result;
  var diff= dema-sma;this.diff=diff.toFixed(6);var price = this.candle.close;this.price=price;
  var profit=0;
  
  switch (true){
  case(this.diff  > this.settings.thresholds.up)&&(this.currentTrend !== 'up'):
  var buyprice = candle.high;
  var profit = ((candle.close - buyprice)/buyprice*100).toFixed(2);log.info('calculated relative profit:',profit);
  checkstring='uptrend';break;
  case(this.diff < this.settings.thresholds.down)&&(this.currentTrend !== 'down'):
  var sellprice = candle.low;
  var profit = ((candle.close - sellprice)/sellprice*100).toFixed(2);log.info('calculated relative profit:',profit);
  checkstring='downtrend';break;
  default: checkstring='weaktrend';
  }
  if ((checkstring === 'uptrend')&&(profit > 0)){this.advice('long');makeoperators();amazing();}
  if ((checkstring === 'downtrend')&& (profit > 0)){this.advice('short');makeoperators();amazing();}
  
  log.debug('Calculated DEMA and SMA properties for candle:');
  log.debug('\t DEMA:', dema);
  log.debug('\t SMA:', sma);
  log.debug('\t PRICE:', this.price);log.debug('\t DIFF:', this.diff);
  sequence();
}

};

module.exports = method;
