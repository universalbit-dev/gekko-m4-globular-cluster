require('../core/tulind');
const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
const _ = require('../core/lodash');
const fs = require('node:fs');
var settings = config.INVERTER;this.settings=settings;

var async = require('async');

/* async fibonacci sequence */
var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
var sequence = ms => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * fibonacci_sequence.length)));
async function sequence() {console.log('keep calm and make something of amazing');;await sequence;};

/* async keep calm and make something of amazing */
var keepcalm = ms => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * fibonacci_sequence.length) / Math.floor(Math.random() * fibonacci_sequence.length - 1)));
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


//INIT
var method = {
 prevPrice : 0,
 prevAction : 'wait',
init:  function()
{
AuxiliaryIndicators();
this.name = 'INVERTER';
log.info('Start' , this.name);

//Init
this.resetTrend();
this.debug = false;
//optInTimePeriod : Fibonacci Sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 ,610 ,987
this.addTulipIndicator('dema', 'dema', {optInTimePeriod:this.settings.DEMA,optInFastPeriod:233,optInSlowPeriod:55});
this.addTulipIndicator('longema', 'ema', {optInTimePeriod: this.settings.long_EMA,optInFastPeriod:233,optInSlowPeriod:55});
this.addTulipIndicator('shortema', 'ema', {optInTimePeriod: this.settings.short_EMA,optInFastPeriod:233,optInSlowPeriod:55});
this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod: this.settings.RSI,optInFastPeriod:89,optInSlowPeriod:21});
this.addTulipIndicator('di', 'di', {optInTimePeriod : this.settings.DI});
this.addTulipIndicator('adx', 'adx',{optInTimePeriod: this.settings.ADX,optInFastPeriod:70,optInSlowPeriod:50});
this.addTulipIndicator('dx', 'dx', {optInTimePeriod: this.settings.DX});
//StopLoss as indicator
this.addIndicator('stoploss', 'StopLoss', {threshold:this.settings.STOPLOSS});

log.info('================================================');
log.info('keep calm and make somethig of amazing');
log.info('================================================');


//Date
startTime = new Date();
this.requiredHistory = this.settings.historySize;
log.info('Running', this.name);
},


//Trend

resetTrend: function()
{
trend = {duration:0,direction:'none',state:'none',bb:'none',longPos:false,
lastLongPrice:0.0,lastShortPrice:0.0};
this.trend = trend;
},

update : function(candle) {_.noop},

log : function(candle) {
//general purpose log data
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
    candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
    if (err) {return console.log(err);}
    });
},

makeoperators: function() {
var operator = ['==','===','!=','&&','<=','>=','>','<','||','='];
var result = Math.floor(Math.random() * operator.length);console.log("\t\t\t\tcourtesy of... "+ operator[result]);},

onTrade: function(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}
    this.prevAction = event.action;
    this.prevPrice = event.price;
  },

check: function(candle)
{
rsi=this.tulipIndicators.rsi.result.result;
adx=this.tulipIndicators.adx.result.result;
dx=this.tulipIndicators.dx.result.result;
longema = this.tulipIndicators.longema.result.result;
shortema = this.tulipIndicators.shortema.result.result;
di_plus = this.tulipIndicators.di.result.diPlus;
di_minus = this.tulipIndicators.di.result.diMinus;
dema = this.tulipIndicators.dema.result.result;
var adxstrength ='none';
this.adxstrength =adxstrength;
//RSI Indicator: Buy and Sell Signals
/* https://www.investopedia.com/articles/active-trading/042114/overbought-or-oversold-use-relative-strength-index-find-out.asp */
switch (true) {
	case (rsi > 68 && rsi < 72):this.advice('short');this.makeoperators();amazing();break;
	case (rsi > 28 && rsi < 32):this.advice('long');this.makeoperators();amazing();break;
	case (rsi > 40 && rsi < 60):this.pingPong();break;
	default:_.noop;
	}

/* ADX trend Strength: https://www.investopedia.com/articles/trading/07/adx-trend-indicator.asp */
	switch (true) {
		case ((dx > 0)&&(dx < 25)):adxstrength='weak';this.pingPong();break;
		case ((dx > 25)&&(dx < 50)):adxstrength='strong';break;
		case ((dx > 50)&&(dx < 75)):adxstrength='verystrong';break;
		case ((dx > 75)&&(dx < 100)):adxstrength='extremestrong';break;
		default:_.noop;this.trend.direction = 'none';adxstrength='weak';
	}
	
//https://www.investopedia.com/ask/answers/121714/what-are-differences-between-divergence-and-convergence.asp
	
	var diff = di_plus - di_minus;
	if(diff > 0){this.trend.state = 'long';} else if(diff < 0 ){this.trend.state = 'short';}

	switch (true)
	{
	case (adxstrength == 'weak'):this.trend.direction = 'weak';this.pingPong();break;
	case ((adxstrength == 'strong')&&(this.trend.state == 'long')):this.trend.direction = 'screw_up';this.trend.bb='long';this.short();break;
	case ((adxstrength == 'strong')&&(this.trend.state == 'short')):this.trend.direction = 'screw_down';this.trend.bb='short';this.long();break;
	case ((adxstrength == 'verystrong')&&(this.trend.state == 'long')):this.trend.direction = 'screw_up';this.trend.bb='long';this.short();break;
	case ((adxstrength == 'verystrong')&&(this.trend.state == 'short')):this.trend.direction = 'screw_down';this.trend.bb='short';this.long();break;
	case ((adxstrength == 'extremestrong')&&(this.trend.state == 'long')):this.trend.direction = 'screw_up';this.trend.bb='long';this.short();break;
	case ((adxstrength == 'extremestrong')&&(this.trend.state == 'short')):this.trend.direction = 'screw_down';this.trend.bb='short';this.long();break;
	default:_.noop;this.trend.direction = 'none';
	}
	    //trend moving down
        if ((longema < shortema)&&(di_plus != undefined)&&(di_minus != undefined)){this.trend.bb ='short';}
        //trend moving up
        else if ((longema > shortema)&&(di_plus != undefined)&&(di_minus != undefined)){this.trend.bb ='long';}
        else _.noop;
        if ('stoploss' === this.indicators.stoploss.action){this.pingPong();}
        sequence();
},

//LONG
long: function(){
  if ((this.trend.direction == 'screw_up')&&(this.trend.state !== 'long')&&(this.trend.bb !== 'long'))
  {
  this.resetTrend();this.trend.duration++;
  var buyprice = candle.high;
  var profit = ((candle.close - buyprice)/buyprice*100).toFixed(2);log.info('Calculated relative profit:',profit);
  if (profit > 0){this.advice('long');makeoperators();amazing();}
  }
},
//SHORT
short: function(){
  if ((this.trend.direction == 'screw_down')&&(this.trend.state  !== 'short')&&(this.trend.bb !== 'short'))
  {
  this.resetTrend();this.trend.duration++;
  var sellprice = candle.low;
  var profit = ((candle.close - sellprice)/sellprice*100).toFixed(2);log.info('Calculated relative profit:',profit);
  if (profit > 0){this.advice('short');makeoperators();amazing();}
  }
},

//PingPong
pingPong: function(){
	switch (true)
	{
	case ((this.trend.bb !== 'short')&&(this.trend.state !== 'short')&&(this.trend.direction != 'none')):
	this.trend.direction = 'screw_down';this.trend.lastLongPrice = this.candle;break;
	case ((this.trend.bb !== 'long')&&(this.trend.state !== 'long')&&(this.trend.direction != 'none')):
	this.trend.direction = 'screw_up';this.trend.lastShortPrice = this.candle;break;
	default:_.noop;this.trend.direction = 'none';
	}
},

end: function(){log.info('|The End|');}

};
module.exports = method;
/*

src: 
[Gab0](https://github.com/Gab0/) https://github.com/Gab0/gekko-adapted-strategies
Extra Indicators : https://github.com/Gab0/gekko-extra-indicators Gabriel Araujo (@Gab0)

Authors: _RSI _ADX (@TommieHansen)
PingPong Function for sideways market(@RafaelMart) 
(CC BY-SA 4.0:https://creativecommons.org/licenses/by-sa/4.0/)

universalBit-dev:
https://github.com/universalbit-dev/gekko-m4-globular-cluster/

INVERTER:
Switch Case
RSI Overbought/Oversold
ADX Trend Strength (DI+ DI-)
StopLoss

resources:
some copy and paste code from: https://github.com/xFFFFF/Gekko-Strategies

*/
