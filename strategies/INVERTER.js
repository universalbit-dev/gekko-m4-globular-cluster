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
const _ = require('../core/lodash');
const fs = require('node:fs');
var settings = config.INVERTER;this.settings=settings;

var stoploss = require('./indicators/StopLoss.js');
var async = require('async');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wait() {
  console.log('keep calm...');await sleep(200000);
  console.log('...make something of amazing');this.init();
  for (let i = 0; i < 5; i++)
  {if (i === 4) await sleep(2000);}
};

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

//optInTimePeriod : Fibonacci Sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 ,610 ,987

//Indicators overview
/* Double Exponential Moving Average */
/* Type: overlay */
/* Input arrays: 1    Options: 1    Output arrays: 1 */
/* Inputs: real */
/* Options: period */
/* Outputs: dema */
this.addTulipIndicator('dema', 'dema', {optInTimePeriod: 1});

/* Exponential Moving Average */
/* Type: overlay */
/* Input arrays: 1    Options: 1    Output arrays: 1 */
/* Inputs: real */
/* Options: period */
/* Outputs: ema */
this.addTulipIndicator('longema', 'ema', {optInTimePeriod: 26});
this.addTulipIndicator('shortema', 'ema', {optInTimePeriod: 12});

/* Relative Strength Index */
/* Type: indicator */
/* Input arrays: 1    Options: 1    Output arrays: 1 */
/* Inputs: real */
/* Options: period */
/* Outputs: rsi */
this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod : 13});

//DI+ DI -
/* Directional Indicator */
/* Type: indicator */
/* Input arrays: 3    Options: 1    Output arrays: 2 */
/* Inputs: high, low, close */
/* Options: period */
/* Outputs: plus_di, minus_di */
this.addTulipIndicator('di', 'di', {optInTimePeriod : 13});

//ADX
/* Average Directional Movement Index */
/* Type: indicator */
/* Input arrays: 3    Options: 1    Output arrays: 1 */
/* Inputs: high, low, close */
/* Options: period */
/* Outputs: dx */
this.addTulipIndicator('adx', 'adx', {optInTimePeriod: 14});

//DX
/* Directional Movement Index */
/* Type: indicator */
/* Input arrays: 3    Options: 1    Output arrays: 1 */
/* Inputs: high, low, close */
/* Options: period */
/* Outputs: dx */
this.addTulipIndicator('dx', 'dx', {optInTimePeriod: 13});

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

//CSV
update: function(candle) {
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
    candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
    if (err) {return console.log(err);}
    });
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


log.info('|Indicators:|');
log.info('|Rsi|',rsi);
log.info('|Dx|',dx);
log.info('|Ema_long|',longema);
log.info('|Ema_short|',shortema);
log.info('|Dema||',dema);

//RSI Indicator: Buy and Sell Signals
/* https://www.investopedia.com/articles/active-trading/042114/overbought-or-oversold-use-relative-strength-index-find-out.asp */
switch (true) {
	//rsi high - sell above '70'
	case (rsi > 68 && rsi < 72):
	log.info('|Nut|Rsi|Overbought|Sell|');
	this.advice('short');
	break;
	//rsi low  - buy above '30'
	case (rsi > 28 && rsi < 32):
	log.info('|Nut|Rsi|Oversold|Buy|');
	this.advice('long');
	break;
    //weak
	case (rsi > 40 && rsi < 60):
	log.info('|Nut|Rsi|..wait data');
	this.pingPong();
	break;
	default:
	log.info('|Nut|Rsi||',rsi);
	}

/*

ADX trend Strength: https://www.investopedia.com/articles/trading/07/adx-trend-indicator.asp

ADX Value 	Trend Strength
0-25 	Absent or Weak Trend
25-50 	Strong Trend
50-75 	Very Strong Trend
75-100 	Extremely Strong Trend

*/
	switch (true) {
		case ((dx > 0)&&(dx < 25)):
		log.info('');adxstrength='weak';this.pingPong();
		break;

		case ((dx > 25)&&(dx < 50)):
		log.info('');adxstrength='strong';
		break;

		case ((dx > 50)&&(dx < 75)):
		log.info('');adxstrength='verystrong';break;

		case ((dx > 75)&&(dx < 100)):
		log.info('');adxstrength='extremestrong';break;

		default:
		log.info('|Nut|Dx|',dx);
	}

/*
When the +DMI is above the -DMI, prices are moving up, and ADX measures the strength of the uptrend.
When the -DMI is above the +DMI, prices are moving down, and ADX measures the strength of the downtrend.
*/
	if(di_plus > di_minus < 21.5)
	{this.trend.state = 'short';
	log.info('|Nut|Dm|Price Down:',di_plus,di_minus);
	}

	if(di_minus > di_plus < 21)
	{this.trend.state = 'long';
	log.info('|Nut|Dm|Price Up:',di_plus,di_minus);
	}

	switch (true)
	{
	case (adxstrength == 'nut_weak'):
	this.trend.direction = 'weak';this.pingPong();
	log.info('|Nut|Di|:',this.trend.direction);break;

	case ((adxstrength == 'strong')&&(this.trend.state == 'long')):
	this.trend.direction = 'screw_down';this.trend.bb='bear';this.short();
	log.info('|Nut|Di|:',this.trend.direction);break;

	case ((adxstrength == 'strong')&&(this.trend.state == 'short')):
	this.trend.direction = 'screw_up';this.trend.bb='bull';this.long();
	log.info('|Nut|Di|:',this.trend.direction);break;

	case ((adxstrength == 'verystrong')&&(this.trend.state == 'long')):
	this.trend.direction = 'screw_down';this.trend.bb='bear';this.long();
	log.info('|Nut|Di|:',this.trend.direction);break;

	case ((adxstrength == 'verystrong')&&(this.trend.state == 'short')):
	this.trend.direction = 'screw_up';this.trend.bb='bull';this.short();
	log.info('|Nut|Di|:',this.trend.direction);break;

	case ((adxstrength == 'extremestrong')&&(this.trend.state == 'long')):
	this.trend.direction = 'screw_down';this.trend.bb='bear';this.long();
	log.info('|Nut|Di|:',this.trend.direction);break;

	case ((adxstrength == 'extremestrong')&&(this.trend.state == 'short')):
	this.trend.direction = 'screw_up';this.trend.bb='bull';this.short();
	log.info('|Nut|Di|:',this.trend.direction);break;
	default:
	log.info('|Nut|Di|...wait data');
	}

        //BEAR TREND
        if (longema < shortema)
        {
        this.trend.bb ='bear';
        log.info('|Bear-Trend|');
        }
        //BULL TREND
        else if (longema > shortema)
        {
        this.trend.bb ='bull';
        log.info('|Bull-Trend|');
        }
        else log.info('|Trend|...WAIT DATA');

        //Stoploss
        if ('stoploss' === this.indicators.stoploss.action){this.pingPong();}
},

//Screw & Bolt
//LONG
long: function(){
  if ((this.trend.direction == 'screw_up')&&(this.trend.state !== 'long')&&(this.trend.bb == 'bull'))
  {this.resetTrend();this.trend.duration++;this.advice('long');wait();}
  if (this.debug) {log.info('|Bolt Up|');}

},
//SHORT
short: function(){
  if ((this.trend.direction == 'screw_down')&&(this.trend.state  !== 'short')&&(this.trend.bb == 'bear'))
  {this.resetTrend();this.trend.duration++;this.advice('short');wait();}
  if (this.debug) {log.info('|Bolt Down|');}
},

//PingPong
pingPong: function(){
	switch (true)
	{
	case (this.trend.bb == 'bull'):
	this.trend.direction = 'screw_up';this.trend.lastLongPrice = this.candle;break;
	case (this.trend.bb == 'bear'):
	this.trend.direction = 'screw_down';this.trend.lastShortPrice = this.candle;break;
	default:log.info('|PingPong|');
	}
},

end: function(){log.info('|The End|');}

};
module.exports = method;
