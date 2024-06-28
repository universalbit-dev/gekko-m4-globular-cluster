require('../core/tulind');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var async = require('async');
var _ = require('../core/lodash');
const fs = require('node:fs');

var settings = config.RSIBULLBEARADX;this.settings=settings;
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
   var files = ['SMA', 'RSI','ADX','StopLoss'];
   for (var file of files){
       var auxiliaryindicators = require('./' + directory + file + extension);
       log.debug('added', auxiliaryindicators);
   }
 }

var method = {
  /* INIT */
  init: function() {
    AuxiliaryIndicators();
    startTime=new Date();
    this.name = 'RSIBULLBEARADX';
    this.requiredHistory = config.tradingAdvisor.historySize;
    this.resetTrend();
    this.addIndicator('stoploss', 'StopLoss', {threshold:this.settings.STOPLOSS});
    // SMA
    this.addTulipIndicator('maSlow', 'sma', {optInTimePeriod: this.settings.SMA_long});
    this.addTulipIndicator('maFast', 'sma', {optInTimePeriod:this.settings.SMA_short});
    // RSI
    this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod: this.settings.RSI});
    this.addTulipIndicator('BULL_RSI', 'rsi', {optInTimePeriod: this.settings.BULL_RSI});
    this.addTulipIndicator('BEAR_RSI', 'rsi', {optInTimePeriod: this.settings.BEAR_RSI});
    // ADX
    this.addTulipIndicator('adx', 'adx', {optInTimePeriod:this.settings.ADX});
    // MOD (RSI modifiers)
    this.BULL_MOD_high = this.settings.BULL_MOD_high;
    this.BULL_MOD_low = this.settings.BULL_MOD_low;
    this.BEAR_MOD_high = this.settings.BEAR_MOD_high;
    this.BEAR_MOD_low = this.settings.BEAR_MOD_low;
    // debug stuff
    this.startTime = new Date();
    // add min/max if debug
    if (this.debug) {this.stat = {adx: {min: 1000,max: 0},bear: {min: 1000,max: 0},bull: {min: 1000,max: 0}};}

    /* MESSAGES */

    // message the user about required history
    log.info("====================================");
    log.info('Running', this.name);
    log.info('====================================');
    log.info("Make sure your warmup period matches SMA_long and that Gekko downloads data if needed");
    this.requiredHistory = config.tradingAdvisor.historySize;
    // warn users
    if (this.requiredHistory < this.settings.SMA_long) {
    log.warn("*** WARNING *** Your Warmup period is lower then SMA_long. If Gekko does not download data automatically when running LIVE the strategy will default to BEAR-mode until it has enough data.");
    }
  },

  /* RESET TREND */
  resetTrend: function() {
    var trend = {duration: 0,direction: 'none',longPos: false,};
    this.trend = trend;
  },

  /* get low/high for backtest-period */
  lowHigh: function(val, type) {
    let cur;
    if (type == 'bear') {
      cur = this.stat.bear;
      if (val < cur.min) this.stat.bear.min = val; // set new
      else if (val > cur.max) this.stat.bear.max = val;
    } else if (type == 'bull') {
      cur = this.stat.bull;
      if (val < cur.min) this.stat.bull.min = val; // set new
      else if (val > cur.max) this.stat.bull.max = val;
    } else {
      cur = this.stat.adx;
      if (val < cur.min) this.stat.adx.min = val; // set new
      else if (val > cur.max) this.stat.adx.max = val;
    }
  },

update : function(candle) {_.noop},

log : function(candle) {
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
    candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
    if (err) {return console.log(err);}
    });
},

  /* CHECK */
  check: function(candle) {
    // get all indicators
    let ind = this.tulipIndicators,
    maSlow =  this.tulipIndicators.maSlow.result.result,
    maFast =  this.tulipIndicators.maFast.result.result,
    adx =  this.tulipIndicators.adx.result.result,
    rsi =  this.tulipIndicators.rsi.result.result;
    if (maFast < maSlow)
    {
    //bear rsi
      rsi = this.tulipIndicators.BEAR_RSI.result.result;
      let rsi_hi = this.settings.BEAR_RSI_high,rsi_low = this.settings.BEAR_RSI_low;
      //ADX
      if (adx > this.settings.ADX_high) rsi_hi = rsi_hi + this.BEAR_MOD_high;else if (adx < this.settings.ADX_low) rsi_low = rsi_low + this.BEAR_MOD_low;
      if (rsi > rsi_hi) this.short();else if (rsi < rsi_low) this.long();
      if (this.debug) this.lowHigh(rsi, 'bear');
    }

    else
    {
    //bull rsi
      rsi = this.tulipIndicators.BULL_RSI.result.result;
      let rsi_hi = this.settings.BULL_RSI_high,rsi_low = this.settings.BULL_RSI_low;
      // ADX
      if (adx > this.settings.ADX_high) rsi_hi = rsi_hi + this.BULL_MOD_high;else if (adx < this.settings.ADX_low) rsi_low = rsi_low + this.BULL_MOD_low;
      if (rsi > rsi_hi) this.short();else if (rsi < rsi_low) this.long();
      if (this.debug) this.lowHigh(rsi, 'bull');
    }
    // add adx low/high if debug
    if (this.debug) this.lowHigh(adx, 'adx');sequence();
  },

  /* LONG  */
  long: function() {
    if (this.trend.direction !== 'up') // new trend? (only act on new trends)
    {
    this.resetTrend();this.trend.direction = 'up';this.advice('long');
    if (this.debug) log.info('Going long');
    }
    if (this.debug) {this.trend.duration++;log.info('Long since', this.trend.duration, 'candle(s)');}
  },

  /* SHORT  */
  short: function() {
    if (this.trend.direction !== 'down') {
      this.resetTrend();
      this.trend.direction = 'down';this.advice('short');
      if (this.debug) log.info('Going short');
    }

    if (this.debug) {this.trend.duration++;
      log.info('Short since', this.trend.duration, 'candle(s)');
    }
  },


  /* END backtest */
  end: function() {
    let seconds = ((new Date() - this.startTime) / 1000),
      minutes = seconds / 60,
      str;

    minutes < 1 ? str = seconds.toFixed(2) + ' seconds' : str = minutes.toFixed(2) + ' minutes';

    log.info('====================================');
    log.info('Finished in ' + str);
    log.info('====================================');

    // print stats and messages if debug
    if (this.debug) {
      let stat = this.stat;
      log.info('BEAR RSI low/high: ' + stat.bear.min + ' / ' + stat.bear.max);
      log.info('BULL RSI low/high: ' + stat.bull.min + ' / ' + stat.bull.max);
      log.info('ADX min/max: ' + stat.adx.min + ' / ' + stat.adx.max);
    }

  }

};

module.exports = method;

/*
	RSI Bull and Bear + ADX modifier
	1. Use different RSI-strategies depending on a longer trend
	2. But modify this slighly if shorter BULL/BEAR is detected
	-
	(CC-BY-SA 4.0) Tommie Hansen
	https://creativecommons.org/licenses/by-sa/4.0/
	-
	NOTE: Requires custom indicators:
	https://github.com/Gab0/Gekko-extra-indicators
	(c) Gabriel Araujo
	Howto: Download + add to gekko/strategies/indicators
*/
