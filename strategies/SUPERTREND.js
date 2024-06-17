require('../core/tulind');
var log = require('../core/log.js');
var async = require('async');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait() {console.log('keep calm and make something of amazing');await sleep(60000);};

function AuxiliaryIndicators(){
   var directory = 'indicators/';
   var extension = '.js';
   var files = ['ATR'];  
   for (var file of files){ 
       var auxiliaryindicators = require('./' + directory + file + extension);
       log.debug('added', auxiliaryindicators);
   }
 }

var method = {

init : function() {
  AuxiliaryIndicators();
  this.name = 'SUPERTREND';
  /* MESSAGES */

  // message the user about required history
  log.info("====================================");
  log.info('Running', this.name);
  log.info('====================================');
  this.requiredHistory = this.tradingAdvisor.historySize;
  this.addTulipIndicator('atr', 'atr', {optInTimePeriod: this.settings.atr});
  this.bought = 0;

  this.supertrend = {upperBandBasic : 0,lowerBandBasic : 0,upperBand : 0,lowerBand : 0,supertrend : 0,};
  this.lastSupertrend = {upperBandBasic : 0,lowerBandBasic : 0,upperBand : 0,lowerBand : 0,supertrend : 0,};
  this.lastCandleClose = 0;
},

update : function(candle) {},

check : function(candle) {

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
    this.advice("long");
    this.bought = 1;
    log.debug("Buy at: ", candle.close);
  }

  if(candle.close < this.supertrend.supertrend && this.bought == 1){
    this.advice("short")
    this.bought = 0;
    log.debug("Sell at: ", candle.close);
  }

  this.lastCandleClose = candle.close;
  this.lastSupertrend = {
    upperBandBasic : this.supertrend.upperBandBasic,
    lowerBandBasic : this.supertrend.lowerBandBasic,
    upperBand : this.supertrend.upperBand,
    lowerBand : this.supertrend.lowerBand,
    supertrend : this.supertrend.supertrend,
  };
}

};

module.exports = method;

// switch case universalbit-dev:https://github.com/universalbit-dev/gekko-m4-globular-cluster
//
// Downloaded from: https://github.com/xFFFFF/Gekko-Strategies
// Source: https://github.com/Gab0/gekko-adapted-strategies

