/**
 * INVERTER Strategy Plugin for Gekko Trading Bot
 *
 * This strategy is designed to invert trading signals, effectively executing
 * the opposite of what a standard strategy recommends. It incorporates key features like
 * RSI Overbought/Oversold detection, ADX Trend Strength analysis, and StopLoss strategies.
 *
 * Key Features:
 * - Inverts trading signals, switching between 'long' and 'short' recommendations.
 * - Implements RSI for identifying overbought/oversold conditions.
 * - Utilizes ADX for measuring trend strength.
 * - Includes StopLoss mechanisms for risk management.
 *
 * Resources:
 * - Some code sourced from: https://github.com/xFFFFF/Gekko-Strategies
 *
 * Authors:
 * - _RSI and _ADX by (@TommieHansen) (CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/)
 * - Additional contributions by Gabriel Araujo (@Gab0)
 * - universalBit-dev: https://github.com/universalbit-dev/gekko-m4-globular-cluster/
 *
 * License:
 * The MIT License (MIT)
 * (c) 2025 universalBit-dev
 *
 * References:
 * - [Gab0's Gekko Adapted Strategies](https://github.com/Gab0/gekko-adapted-strategies)
 * - [Extra Indicators by Gabriel Araujo](https://github.com/Gab0/gekko-extra-indicators)
 */

const { addon: ov } = require('openvino-node');
const _ =require("underscore");
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var Wrapper = require('../strategyWrapperRules.js');
var fs = require("fs-extra");fs.createReadStream('/dev/null');
var settings = config.INVERTER;this.settings=settings;

const RSI=require('./indicators/RSI');
const DEMA=require('./indicators/DEMA');
const ADX=require('./indicators/ADX');
const DX=require('./indicators/DX');
const SMA=require('./indicators/SMA');
const StopLoss = require('./indicators/StopLoss');

const { Chess } = require('chess.js');
const sequence = async function() {
    try {
    fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181','6765'];
    var fibonacci_number = Math.floor(Math.random() * fibonacci_sequence.length);fibonacci_number = fibonacci_sequence[fibonacci_number];
    await console.log ('Fibonacci Sequence -- Wohoo! -- Number: ',fibonacci_number);
    }
    catch (e) {
    console.log (exchange.iso8601 (Date.now ()), e.constructor.name, e.message);
    console.log ('Fibonacci Sequence -- Error -- ');
    }
};

const keepcalm = async function() {
    try {
    await console.log('Keep Calm and Make Something of Amazing -- Wohoo! --');
    }
    catch (e) {
    console.log (exchange.iso8601 (Date.now ()), e.constructor.name, e.message);
    console.log ('Keep Calm and Make Something of Amazing  -- Error -- ');
    }
};
var method = Wrapper;

//INIT
method = {
prevPrice : 0,prevAction :'none',
init:  function()
{
this.interval = this.settings.interval;
this.RSIhistory = [];
this.name = 'INVERTER';
log.info('Start' , this.name);
this.trend = {direction: 'none',duration: 0,state:'none',ls:'none'};

this.debug = true;
//optInTimePeriod : Fibonacci Sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 ,610 ,987
this.addIndicator('dema', 'DEMA', {optInTimePeriod:1,optInFastPeriod:233,optInSlowPeriod:55});
this.addIndicator('maFast', 'SMA', {optInTimePeriod:987,optInFastPeriod:233,optInSlowPeriod:55});
this.addIndicator('maSlow', 'SMA', {optInTimePeriod:55,optInFastPeriod:233,optInSlowPeriod:55});
this.addIndicator('rsi', 'RSI', {optInTimePeriod:14,optInFastPeriod:89,optInSlowPeriod:21});
this.addIndicator('adx', 'ADX',{optInTimePeriod:3,optInFastPeriod:70,optInSlowPeriod:50});
this.addIndicator('dx', 'DX', {optInTimePeriod: this.settings.DX});
this.stopLoss = new StopLoss(5); // 5% stop loss threshold

log.info('================================================');
log.info('keep calm and make somethig of amazing');
log.info('================================================');

//Date
startTime = new Date();
this.requiredHistory = this.settings.historySize;
log.info('Running', this.name);
},

update : function(candle) {this.stopLoss.update(candle);
_.noop;},

log : function(candle) {
//general purpose log data
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
    candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
    if (err) {return console.log(err);}
    });
},

makeoperator : function() {
var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>'];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
},

/* */
 fxchess : function(){
  const chess = new Chess()
  while (!chess.isGameOver()) {
  const moves = chess.moves()
  const move = moves[Math.floor(Math.random() * moves.length)]
  chess.move(move)
}
return console.log(chess.pgn())
},

check: function(candle)
{
log.debug("Random game of Chess");this.fxchess();
  var rsi = this.indicators.rsi;
var adx=this.indicators.adx;var dx=this.indicators.dx;
var maFast = this.indicators.maFast;var maSlow = this.indicators.maSlow;
var dema = this.indicators.dema;
var adxstrength ='none';
this.adxstrength =adxstrength;
//RSI Indicator: Buy and Sell Signals
/* https://www.investopedia.com/articles/active-trading/042114/overbought-or-oversold-use-relative-strength-index-find-out.asp */
switch (true) {
	case (rsi > 70 && rsi < 80):this.advice('short');this.makeoperator();break;
	case (rsi > 20 && rsi < 30):this.advice('long');this.makeoperator();break;
	case (rsi > 40 && rsi < 60):return _.noop;break;
	default:_.noop;
}

/* ADX trend Strength: https://www.investopedia.com/articles/trading/07/adx-trend-indicator.asp */
switch (true) {
		case ((dx > 0)&&(dx < 25)):adxstrength='weak';break;
		case ((dx > 25)&&(dx < 50)):adxstrength='strong';break;
		case ((dx > 50)&&(dx < 75)):adxstrength='verystrong';break;
		case ((dx > 75)&&(dx < 100)):adxstrength='extremestrong';break;
		default:_.noop;this.trend.direction ='none';adxstrength='weak';
}

	switch (true)
	{
	case (adxstrength == 'weak'):this.trend.direction = 'weak';break;
	case ((adxstrength == 'strong')&&(this.trend.state !== 'long')):this.trend.direction = 'buy';this.trend.ls='short';this.advice('long');break;
	case ((adxstrength == 'strong')&&(this.trend.state !== 'short')):this.trend.direction = 'sell';this.trend.ls='long';this.advice('short');break;
	case ((adxstrength == 'verystrong')&&(this.trend.state !== 'long')):this.trend.direction = 'buy';this.trend.ls='short';this.advice('long');break;
	case ((adxstrength == 'verystrong')&&(this.trend.state !== 'short')):this.trend.direction = 'sell';this.trend.ls='long';this.advice('short');break;
	case ((adxstrength == 'extremestrong')&&(this.trend.state !== 'long')):this.trend.direction = 'buy';this.trend.ls='short';this.advice('long');break;
	case ((adxstrength == 'extremestrong')&&(this.trend.state !== 'short')):this.trend.direction = 'sell';this.trend.ls='long';this.advice('short');break;
	default: _.noop;
	}
	//trend moving down
    if (maFast < maSlow){this.trend.ls ='short';}
    //trend moving up
    else if (maFast > maSlow){this.trend.ls ='long';}
    else _.noop;

    //stoploss
    if (this.stopLoss.update(candle) == 'stoploss') {this.advice('short');} 
    else {this.advice('long');}
},

/* LONG  */
  long: function() {
    if (this.trend.direction.length != 0 && this.trend.direction !==  'buy')
    {
    this.trend.ls='long';
    this.trend.direction = 'screw_up';this.advice('long');
	}
  },

/* SHORT  */
  short: function() {
    if (this.trend.direction.length != 0 && this.trend.direction !== 'sell')
    {
    this.trend.ls='short';
    this.trend.direction = 'screw_down';this.advice('short');
    }
  },

end: function(){log.info('|The End|');}

};
module.exports = method;
/*

[Gab0](https://github.com/Gab0/) https://github.com/Gab0/gekko-adapted-strategies
Extra Indicators : https://github.com/Gab0/gekko-extra-indicators Gabriel Araujo (@Gab0)

Authors: _RSI _ADX (@TommieHansen)
(CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/)

universalBit-dev: https://github.com/universalbit-dev/gekko-m4-globular-cluster/

INVERTER:
Switch Case
RSI Overbought/Oversold
ADX Trend Strength 
StopLoss

resources:
some copy and paste code from: https://github.com/xFFFFF/Gekko-Strategies

*/
