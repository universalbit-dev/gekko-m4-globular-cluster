/*

-Source Code: [Gab0](https://github.com/Gab0/)
https://github.com/Gab0/gekko-adapted-strategies
-Extra Indicators : https://github.com/Gab0/gekko-extra-indicators
Gabriel Araujo (@Gab0)

Authors:
RSI_BULL_BEAR & RSI_BULL_BEAR_ADX (@TommieHansen)
PingPong Function for sideways market(@RafaelMart)
(CC BY-SA 4.0:https://creativecommons.org/licenses/by-sa/4.0/)

UniversalBit-dev
https://github.com/universalbit-dev/gekko-m4/

INVERTER:
-Switch Case

RSI Overbought/Oversold
ADX Trend Strength (DI+ DI-)
StopLoss

some copy and paste code from: https://github.com/xFFFFF/Gekko-Strategies

*/
const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
const fs = require('node:fs');
var settings = config.INVERTER;this.settings=settings;
var async = require('async');
var stoploss = require('./indicators/StopLoss.js');
var waitdata=false;
/*
Method INVERTER:
Process Exchange Data and make indicators data overview:|RSI| |SMA| |ADX| |DI| |DX| |DEMA| |StopLoss|
*/

// INIT
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

//optInTimePeriod : Fibonacci Sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 , 610 , 987 , 1597 , 2584 , 4181

//Indicators overview
/* Double Exponential Moving Average */
/* Type: overlay */
/* Input arrays: 1    Options: 1    Output arrays: 1 */
/* Inputs: real */
/* Options: period */
/* Outputs: dema */
this.addTulipIndicator('dema', 'dema', {optInTimePeriod: this.settings.dema});
this.addTulipIndicator('ema', 'ema', {optInTimePeriod: this.settings.dema});

/* Exponential Moving Average */
/* Type: overlay */
/* Input arrays: 1    Options: 1    Output arrays: 1 */
/* Inputs: real */
/* Options: period */
/* Outputs: ema */
this.addTulipIndicator('longema', 'ema', {optInTimePeriod: this.settings.ema});
this.addTulipIndicator('shortema', 'ema', {optInTimePeriod: this.settings.ema});

/* Relative Strength Index */
/* Type: indicator */
/* Input arrays: 1    Options: 1    Output arrays: 1 */
/* Inputs: real */
/* Options: period */
/* Outputs: rsi */
this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod :this.settings.rsi});

//DI+ DI -
/* Directional Indicator */
/* Type: indicator */
/* Input arrays: 3    Options: 1    Output arrays: 2 */
/* Inputs: high, low, close */
/* Options: period */
/* Outputs: plus_di, minus_di */
this.addTulipIndicator('di', 'di', {optInTimePeriod : this.settings.di});

//ADX
/* Average Directional Movement Index */
/* Type: indicator */
/* Input arrays: 3    Options: 1    Output arrays: 1 */
/* Inputs: high, low, close */
/* Options: period */
/* Outputs: dx */
this.addTulipIndicator('adx', 'adx', {optInTimePeriod: this.settings.adx});

//DX
/* Directional Movement Index */
/* Type: indicator */
/* Input arrays: 3    Options: 1    Output arrays: 1 */
/* Inputs: high, low, close */
/* Options: period */
/* Outputs: dx */
this.addTulipIndicator('dx', 'dx', {optInTimePeriod: this.settings.dx});

//StopLoss as indicator
this.addIndicator('stoploss', 'StopLoss', {threshold : this.settings.stoploss});

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
lastLongPrice:0.0,lastShortPrice:0.0};this.trend = trend;
},


update: function(candle) {
//log book
fs.appendFile('logs/csv/'
+ config.watch.asset + ':'
+ config.watch.currency + '_' + this.name + '_'
+ startTime + '.csv',candle.start
+ "," + candle.open + "," + candle.high + "," + candle.low + ","
+ candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades
+ "\n",
function(err) {if (err) {return console.log(err);}}
);
},

onTrade: function(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}
    this.prevAction = event.action;
    this.prevPrice = event.price;
  },

wait :async function() {
  console.log('keep calm...');await new Promise(r => setTimeout(r, 1800000));//30'minutes'
  console.log('...make something of amazing');
  for (let i = 0; i < 3; i++)
  {if (i === 3) await new Promise(r => setTimeout(r, 600000));}
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
ema= this.tulipIndicators.ema.result.result;

var adxstrength ='none';
this.adxstrength =adxstrength;

log.info('calculated INVERTER properties for candle:');
log.info('Nut && Screw && Bolt');
log.info("Direction:" + this.trend.direction);
log.info('Price:', this.candle);
log.info('RSI:', rsi);
log.info('ADX:', adx);
log.info('EMA long:', longema);
log.info('EMA short:', shortema);
log.info('===========================================');

//RSI Indicator: Buy and Sell Signals
/* https://www.investopedia.com/articles/active-trading/042114/overbought-or-oversold-use-relative-strength-index-find-out.asp */
switch (true) {
	//rsi high - sell above '70'
	case (rsi > 68 && rsi < 72):
	log.info('RSI OVERBOUGHT sell');
	this.advice('sell');
	break;
	//rsi low  - buy above '30'
	case (rsi > 28 && rsi < 32):
	log.info('RSI OVERSOLD buy');
	this.advice('buy');
	break;
  //weak
	case (rsi > 40 && rsi < 60):
	log.info('nut RSI weak');this.pingPong();
	break;
	default:
  log.info('... wait data');
	}

/*

ADX trend Strength: https://www.investopedia.com/articles/trading/07/adx-trend-indicator.asp

ADX Value 	Trend Strength
0-25 	Absent or Weak Trend
25-50 	Strong Trend
50-75 	Very Strong Trend
75-100 	Extremely Strong Trend

*/
	switch (adx != undefined) {
		case ((adx > 0)&&(adx < 25)):adxstrength='weak';this.pingPong();break;
		case ((adx > 25)&&(adx < 50)):adxstrength='strong';break;
		case ((adx > 50)&&(adx < 75)):adxstrength='verystrong';break;
		case ((adx > 75)&&(adx < 100)):adxstrength='extremestrong';break;
		default:log.info('...wait data',adx);
	}

  /*
  When the +diPlus is above the -diMinus, prices are moving up, and ADX measures the strength of the uptrend.
  When the -diMinus above the +diPlus, prices are moving down, and ADX measures the strength of the downtrend.
  */	if((di_plus > di_minus > this.settings.diplus)&&(this.trend.bb == 'bull'))
	{
    this.trend.state = 'long';log.info('price moving up:',this.candle);
	}
	if((di_minus < di_plus < this.settings.diminus)&&(this.trend.bb == 'bear'))
	{
    this.trend.state = 'short';log.info('price moving down:',this.candle);
	}

	switch (adx != undefined)
	{
	case (adxstrength === 'weak'):
	this.trend.direction = 'weak';this.trend.bb='weak';this.pingPong();
  log.info('strength: ',adxstrength,this.trend.direction);break;

	case ((adxstrength === 'strong')&&(this.trend.state == 'long')):
	this.trend.direction = 'screw_up';this.trend.bb='bull';this.long();
  log.info('strength: ',adxstrength,this.trend.direction);break;

	case ((adxstrength === 'strong')&&(this.trend.state == 'short')):
	this.trend.direction = 'screw_down';this.trend.bb='bear';this.short();
  log.info('strength: ',adxstrength,this.trend.direction);break;

	case ((adxstrength === 'verystrong')&&(this.trend.state == 'long')):
	this.trend.direction = 'screw_up';this.trend.bb='bear';this.advice('buy');
  log.info('strength: ',adxstrength,this.trend.direction);break;

	case ((adxstrength === 'verystrong')&&(this.trend.state == 'short')):
	this.trend.direction = 'screw_down';this.trend.bb='bull';this.advice('sell');
  log.info('strength: ',adxstrength,this.trend.direction);break;

	case ((adxstrength === 'extremestrong')&&(this.trend.state == 'long')):
	this.trend.direction = 'screw_up';this.trend.bb='bull';this.advice('buy');
  log.info('strength: ',adxstrength,this.trend.direction);break;

	case ((adxstrength === 'extremestrong')&&(this.trend.state == 'short')):
	this.trend.direction = 'screw_down';this.trend.bb='bear';this.advice('sell');
  log.info('strength: ',adxstrength,this.trend.direction);break;
	default:
	log.info('...wait data',adxstrength,this.trend.direction);
	}
  //stoploss as pingPong function
	if ('stoploss' === this.indicators.stoploss.action){this.pingPong();}
},

//Screw & Bolt
long: function(){
  if ((this.trend.direction !== 'screw_up')&&(this.trend.state !== 'long')&&(this.trend.bb !== 'bull'))
  {this.advice('long');log.info('|Bolt Up|');this.wait();}
},
short: function(){
  if ((this.trend.direction !== 'screw_down')&&(this.trend.state  !== 'short')&&(this.trend.bb !== 'bear'))
  {this.advice('short');log.info('|Bolt Down|');this.wait();}
},

//PingPong Function
pingPong: function(){
	switch (this.trend.bb !== 'weak')
	{
	case (this.trend.bb !== 'bull'):this.trend.direction = 'screw_up';
  this.trend.lastLongPrice = this.candle;this.trend.longPos = true;break;
	case (this.trend.bb !== 'bear'):this.trend.direction = 'screw_down';
  this.trend.lastShortPrice = this.candle;this.trend.longPos = false;break;
	default:
	log.info('...wait data',this.trend.direction);
	}
},

end: function(){log.info('|The End|');}

};
module.exports = method;
