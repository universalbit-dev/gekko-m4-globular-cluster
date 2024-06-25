require('../core/tulind');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();

var async = require('async');

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

function onTrade(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}
    this.prevAction = event.action;
    this.prevPrice = event.price;
}
 
var method = {
init : function() {
  AuxiliaryIndicators();
  this.name = 'DEMA';
  this.currentTrend;
  this.requiredHistory = config.tradingAdvisor.historySize;
  this.addIndicator('stoploss', 'StopLoss', {threshold:this.settings.STOPLOSS});
  this.addTulipIndicator('dema', 'dema', {optInTimePeriod: this.settings.DEMA});
  this.addTulipIndicator('sma', 'sma', {optInTimePeriod: this.settings.SMA});
},

update : function(candle) {
  var dema = this.tulipIndicators.dema.result.result;
  var sma = this.tulipIndicators.sma.result.result;
  var diff= dema-sma;this.diff=diff.toFixed(6);
  var price = this.candle.close;this.price=price;
  log.debug('Calculated DEMA and SMA properties for candle:');
  log.debug('\t DEMA:', dema);
  log.debug('\t SMA:', sma);
  log.debug('\t PRICE:', this.price);log.debug('\t DIFF:', this.diff);
  },

log : function() {},

check : function(candle) {
  dema =  this.tulipIndicators.dema.result.result;
  sma = this.tulipIndicators.sma.result.result;
  switch (true){
  case(this.diff  > this.settings.thresholds.up)&&(this.currentTrend !== 'up'): log.debug('we are currently in uptrend');this.advice('short');amazing();makeoperators();break;
  case(this.diff < this.settings.thresholds.down)&&(this.currentTrend !== 'down'): log.debug('we are currently in a downtrend');this.advice('long');amazing();makeoperators();break;
  default: log.debug('we are currently not in an up or down trend');
  } 
  sequence();
}

};

module.exports = method;
