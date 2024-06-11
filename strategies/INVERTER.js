const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
const _ = require('../core/lodash');
const fs = require('node:fs');
var settings = config.INVERTER;this.settings=settings;
var stoploss = require('./indicators/StopLoss.js');

var async = require('async');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait() {console.log('keep calm and make something of amazing');await sleep(200000);};
//INIT
var method = {
 prevPrice : 0,
 prevAction : 'wait',
init: function()
{
this.name = 'INVERTER';
log.info('Start' , this.name);
//Init
this.resetTrend();
this.debug = true;
//optInTimePeriod : Fibonacci Sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 ,610 ,987

//indicator overview
this.addTulipIndicator('dema', 'dema', {optInTimePeriod: 1});
this.addTulipIndicator('longema', 'ema', {optInTimePeriod: 233});
this.addTulipIndicator('shortema', 'ema', {optInTimePeriod: 55});
this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod : 8});
this.addTulipIndicator('di', 'di', {optInTimePeriod : 13});
this.addTulipIndicator('adx', 'adx', {optInTimePeriod: 3});
this.addTulipIndicator('dx', 'dx', {optInTimePeriod: 3});

//StopLoss as indicator
this.addIndicator('stoploss', 'StopLoss', {threshold : 3});

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

//general purpose log  {data}
update: function(candle) {
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
    candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
    if (err) {return console.log(err);}
    });

},

makeoperators: function() {
var operator = ['==','===','!=','&&','<=','>=','>','<','||','='];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
},

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
	case (rsi > 68 && rsi < 72):this.advice('short');wait();break;
	case (rsi > 28 && rsi < 32):this.advice('long');wait();break;
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
	
	if(di_plus > di_minus < 21.5){this.trend.state = 'short';} else if(di_minus > di_plus < 21){this.trend.state = 'long';}

	switch (true)
	{
	case (adxstrength == 'weak'):this.trend.direction = 'weak';this.pingPong();break;
	case ((adxstrength == 'strong')&&(this.trend.state == 'long')):this.trend.direction = 'screw_down';this.trend.bb='short';this.short();break;
	case ((adxstrength == 'strong')&&(this.trend.state == 'short')):this.trend.direction = 'screw_up';this.trend.bb='long';this.long();break;
	case ((adxstrength == 'verystrong')&&(this.trend.state == 'long')):this.trend.direction = 'screw_down';this.trend.bb='short';this.short();break;
	case ((adxstrength == 'verystrong')&&(this.trend.state == 'short')):this.trend.direction = 'screw_up';this.trend.bb='long';this.long();break;
	case ((adxstrength == 'extremestrong')&&(this.trend.state == 'long')):this.trend.direction = 'screw_down';this.trend.bb='short';this.short();break;
	case ((adxstrength == 'extremestrong')&&(this.trend.state == 'short')):this.trend.direction = 'screw_up';this.trend.bb='long';this.long();break;
	default:_.noop;this.trend.direction = 'none';
	}
        if ((longema < shortema)&&(di_plus != undefined)&&(di_minus != undefined)){this.trend.bb ='short';}
        else if ((longema > shortema)&&(di_plus != undefined)&&(di_minus != undefined)){this.trend.bb ='long';}
        else _.noop;
        if ('stoploss' === this.indicators.stoploss.action){this.pingPong();}
},

//LONG
long: function(){
  if ((this.trend.direction == 'screw_up')&&(this.trend.state !== 'short')&&(this.trend.bb !== 'short'))
  {this.resetTrend();this.trend.duration++;this.advice('long');this.makeoperators();wait();}
},
//SHORT
short: function(){
  if ((this.trend.direction == 'screw_down')&&(this.trend.state  !== 'long')&&(this.trend.bb !== 'long'))
  {this.resetTrend();this.trend.duration++;this.advice('short');this.makeoperators();wait();}
},

//PingPong
pingPong: function(){
	switch (true)
	{
	case ((this.trend.bb !== 'short')&&(this.trend.state !== 'short')&&(this.trend.direction != 'none')):
	this.trend.direction = 'screw_up';this.trend.lastLongPrice = this.candle;break;
	case ((this.trend.bb !== 'long')&&(this.trend.state !== 'long')&&(this.trend.direction != 'none')):
	this.trend.direction = 'screw_down';this.trend.lastShortPrice = this.candle;break;
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
