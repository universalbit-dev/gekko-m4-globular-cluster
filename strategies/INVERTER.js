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
StopLoss Fixed 3%

some copy and paste code from: https://github.com/xFFFFF/Gekko-Strategies

*/

var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var _ = require('../core/lodash');
var ws = require('reconnecting-websocket');
var fs = require('fs-extra');
/* https://tulipindicators.org/ */
var tulind = require('../core/tulind');

/*

Method INVERTER:
Process Exchange Data and make indicators data overview:
|RSI| |SMA| |ADX| |DI| |DX| |DEMA| |StopLoss|

*/


var method = {
// INIT
init: function()
{
//Strategy Name
this.name = 'INVERTER';
log.info('============================================');
log.info('Start INVERTER');
log.info('============================================');

//Init
this.resetTrend();
this.debug = true;

//Indicators overview

/* Simple Moving Average */
/* Type: overlay */
/* Input arrays: 1    Options: 1    Output arrays: 1 */
/* Inputs: real */
/* Options: period */
/* Outputs: sma */
this.addTulipIndicator('maFast', 'sma', {optInTimePeriod: this.settings.maFast});
this.addTulipIndicator('maSlow', 'sma', {optInTimePeriod: this.settings.maSlow});
/* Double Exponential Moving Average */
/* Type: overlay */
/* Input arrays: 1    Options: 1    Output arrays: 1 */
/* Inputs: real */
/* Options: period */
/* Outputs: dema */
this.addTulipIndicator('dema', 'dema', {optInTimePeriod: this.settings.dema});

/* Relative Strength Index */
/* Type: indicator */
/* Input arrays: 1    Options: 1    Output arrays: 1 */
/* Inputs: real */
/* Options: period */
/* Outputs: rsi */
this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod : this.settings.RSI});

//DI+ DI -
/* Directional Indicator */
/* Type: indicator */
/* Input arrays: 3    Options: 1    Output arrays: 2 */
/* Inputs: high, low, close */
/* Options: period */
/* Outputs: plus_di, minus_di */
this.addTulipIndicator('di', 'di', {optInTimePeriod : this.settings.ADX});

//ADX
/* Average Directional Movement Index */
/* Type: indicator */
/* Input arrays: 3    Options: 1    Output arrays: 1 */
/* Inputs: high, low, close */
/* Options: period */
/* Outputs: dx */
this.addTulipIndicator('adx', 'adx', {optInTimePeriod: this.settings.ADX});

//DX
/* Directional Movement Index */
/* Type: indicator */
/* Input arrays: 3    Options: 1    Output arrays: 1 */
/* Inputs: high, low, close */
/* Options: period */
/* Outputs: dx */
this.addTulipIndicator('dx', 'dx', {optInTimePeriod: this.settings.ADX});

this.addIndicator('stoploss', 'StopLoss', {threshold : this.settings.threshold});

log.info('================================================');
log.info('keep calm and make somethig of amazing');
log.info('================================================');

//Date
startTime = new Date();
//Info Messages
		log.info("=====================================");
		log.info('Running', this.name);
		log.info('=====================================');
	},

//Trend
resetTrend: function()
{
trend = {duration:0,direction:'none',state:'none',bb:'none',longPos:false,lastLongPrice:0.0,lastShortPrice:0.0};
this.trend = trend;
},

onTrade: function(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}
    // store the previous action (buy/sell)
    this.prevAction = event.action;
    // store the price of the previous trade
    this.prevPrice = event.price;
  },

update: function(candle) {
	fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
	candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
	if (err) {return console.log(err);}
	});
},
check: function(candle)
{
	log.info('=======');
	log.info('|CHECK|');
	log.info('=======');

rsi=this.tulipIndicators.rsi.result.result;
adx=this.tulipIndicators.adx.result.result;
dx=this.tulipIndicators.dx.result.result;
di_plus = this.tulipIndicators.di.result.diPlus;
di_minus = this.tulipIndicators.di.result.diMinus;
maFast = this.tulipIndicators.maFast.result.result;
maSlow = this.tulipIndicators.maSlow.result.result;
dema = this.tulipIndicators.dema.result.result;
this.adxstrength='none';

log.info('=============');
log.info('|INDICATORS:|');
log.info('==============================');
log.info('|RSI:|',rsi);
log.info('|ADX:|',adx);
log.info('|DX|',dx);
log.info('|DI+|',di_plus);
log.info('|DI-|',di_minus);
log.info('|SMA +|',maFast);
log.info('|SMA -|',maSlow);
log.info('|DEMA||',dema);
log.info('==============================');

//RSI Indicator: Buy and Sell Signals
/* https://www.investopedia.com/articles/active-trading/042114/overbought-or-oversold-use-relative-strength-index-find-out.asp */
switch (true) {
	//rsi high - sell   '70'
	case (rsi > 65 && rsi < 85):
	log.info('=========================');
	log.info('|NUT|RSI|Overbought|SELL|');
	log.info('=========================');
	this.short();
	break;
	//rsi low  - buy    '30'
	case (rsi > 15 && rsi < 35):
	log.info('======================');
	log.info('|NUT|RSI|Oversold|BUY|');
	log.info('======================');
  this.long();
	break;
  //weak
	case (rsi > 40 && rsi < 60):
	log.info('==============');
	log.info('|NUT|RSI|WEAK|');
	log.info('==============');
	this.pingPong();
	break;
	default:
	log.info('========================');
	log.info('|NUT|RSI||',rsi);
	log.info('========================');
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

		case (adx > 0 && adx < 25):
		log.info('====================');
		log.info('|NUT|ADX|WEAK TREND|');
		log.info('====================');
		log.info('nut_weak');this.adxstrength='weak';break;

		case (adx > 25 && adx < 50):
		log.info('======================');
		log.info('|NUT|ADX|STRONG|TREND|');
		log.info('======================');
		log.info('nut_strong');this.adxstrength='strong';break;

		case (adx > 50 && adx < 75):
		log.info('===========================');
		log.info('|NUT|ADX|VERY STRONG|TREND|');
		log.info('===========================');
		log.info('nut_very_strong');this.adxstrength='verystrong';break;

		case (adx > 75 && adx < 100):
		log.info('================================');
		log.info('|NUT|ADX|Extremely|Strong|TREND|');
		log.info('================================');
		log.info('nut_extreme_strong');this.adxstrength='extremestrong';break;

		default:
		log.info('=======================');
		log.info('|NUT|ADX|Trend Strength|');
		log.info('=======================');
	}

	//DI going red (short)
	if(di_minus > di_plus && di_minus > this.settings.diminus) {this.trend.state = 'short';}
	//DI going green (long)
	if(di_plus > di_minus && di_plus > this.settings.diplus) {this.trend.state = 'long';}

	switch (true)
	{
	/*
	When the +DMI is above the -DMI, prices are moving up, and ADX measures the strength of the uptrend.
	When the -DMI is above the +DMI, prices are moving down, and ADX measures the strength of the downtrend.
	*/
	    case (this.adxstrength == 'nut_weak')&&((this.trend.state == 'screw_up')||(this.trend.state == 'screw_down')):
		//Absent or Weak Trend
		this.trend.direction = 'nut_weak';this.pingPong();
		break;

		case (this.adxstrength == 'nut_strong')&&(this.trend.state == 'screw_up')&&(rsi > 15 && rsi < 35):
		//prices moving up adx strength 25-50
		this.trend.direction = 'screw_up';this.long();
		break;

		case (this.adxstrength == 'nut_strong')&&(this.trend.state == 'screw_down')&&(rsi > 65 && rsi < 85):
		//prices moving down adx strength 25-50
		this.trend.direction = 'screw_down';this.short();
	    break;

	    case (this.adxstrength == 'nut_verystrong')&&(this.trend.state == 'screw_up')&&(rsi > 15 && rsi < 35):
	    //prices moving up adx strength 50-75
	    this.trend.direction = 'screw_up';
	    this.long();
	    break;

		case (this.adxstrength == 'nut_verystrong')&&(this.trend.state == 'screw_down')&&(rsi > 65 && rsi < 85):
		//price moving down adx strength 50-75
		this.trend.direction = 'screw_down';this.short();
		break;

		case (this.adxstrength == 'nut_extremestrong')&&(this.trend.state == 'screw_up')&&(rsi > 15 && rsi < 35):
		//price moving down adx strength 75-100
		this.trend.direction = 'screw_up';this.long();
		break;

		case (this.adxstrength == 'nut_extremestrong')&&(this.trend.state == 'screw_down')&&(rsi > 65 && rsi < 85):
		//price moving down adx strength 75-100
		this.trend.direction = 'screw_down';this.short();
		break;

		default:
		log.info('=================================================');
		log.info('|DM+|DM-|:',di_plus,di_minus);
		log.info('=================================================');
	}
    //BEAR TREND
		if ((maFast < maSlow)&&(this.adxstrength != 'nut_weak')){this.trend.bb='bear';log.info('|BEAR-TREND|');}
		//BULL TREND
		else if ((maFast > maSlow)&&(this.adxstrength != 'nut_weak')){this.trend.bb='bull';log.info('|BULL-TREND|');}

		if ('stoploss' === this.indicators.stoploss.action){this.resetTrend();}
},

//Nut & Screw & Bolt

//LONG
long: function(){
  if ((this.trend.direction !== 'screw_up')&&(this.trend.state  !== 'screw_up')&&(this.trend.bb !== 'bull')&&(rsi > 28 && rsi < 32))
  {this.resetTrend();this.trend.direction = 'screw_up';this.advice('long');
  if (this.debug)log.info('|Bolt Up|');}
  if (this.debug) {this.trend.duration++;log.info('Bolt Up since', this.trend.duration, 'Bolt(s)');}
},

//SHORT
short: function(){
  if ((this.trend.direction !== 'screw_down')&&(this.trend.state  !== 'screw_down')&&(this.trend.bb !== 'bear')&&(rsi > 68 && rsi < 72))
  {this.resetTrend();this.trend.direction = 'screw_down';this.advice('short');
  if (this.debug)log.info('|Bolt Down|');}
  if (this.debug) {this.trend.duration++;log.info('Bolt Down since', this.trend.duration, 'Bolt(s)');}
},

//PingPong
/*
|WEAK RSI| or |WEAK ADX| call the PingPong function
*/
pingPong: function(){

	switch (true)
	{
	case ((this.trend.direction !== 'screw_up')&&(this.trend.bb !== 'bull')&&(this.trend.state  !== 'screw_up')):
	this.trend.lastLongPrice = this.candle;
	this.trend.longPos = true;
	break;

	case ((this.trend.direction !== 'screw_down')&&(this.trend.bb !== 'bear')&&(this.trend.state  !== 'screw_down')):
	this.trend.lastShortPrice = this.candle;
	this.trend.longPos = false;
	break;

	default:
	log.info('==========');
	log.info('|PINGPONG|');
	log.info('==========');
	}
},

end: function(){log.info('|THE END|');}

};
module.exports = method;
