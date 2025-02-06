const { addon: ov } = require('openvino-node');
const _ =require("underscore");
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var fs = require("fs-extra");fs.createReadStream('/dev/null');
var settings = config.INVERTER;this.settings=settings;
const StopLoss = require('./indicators/StopLoss');

const { Chess } = require('chess.js')

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

//INIT
var method = {
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
this.addTulipIndicator('dema', 'dema', {optInTimePeriod:1,optInFastPeriod:233,optInSlowPeriod:55});
this.addTulipIndicator('longema', 'ema', {optInTimePeriod:987,optInFastPeriod:233,optInSlowPeriod:55});
this.addTulipIndicator('shortema', 'ema', {optInTimePeriod:55,optInFastPeriod:233,optInSlowPeriod:55});
this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod:14,optInFastPeriod:89,optInSlowPeriod:21});
this.addTulipIndicator('di', 'di', {optInTimePeriod : this.settings.DI});
this.addTulipIndicator('adx', 'adx',{optInTimePeriod:3,optInFastPeriod:70,optInSlowPeriod:50});
this.addTulipIndicator('dx', 'dx', {optInTimePeriod: this.settings.DX});
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
rsi=this.tulipIndicators.rsi.result.result;
adx=this.tulipIndicators.adx.result.result;dx=this.tulipIndicators.dx.result.result;
longema = this.tulipIndicators.longema.result.result;shortema = this.tulipIndicators.shortema.result.result;
di_plus = this.tulipIndicators.di.result.diPlus;di_minus = this.tulipIndicators.di.result.diMinus;
dema = this.tulipIndicators.dema.result.result;
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
//https://www.investopedia.com/ask/answers/121714/what-are-differences-between-divergence-and-convergence.asp
	var diff = di_plus - di_minus;
	switch(diff){
	case diff > 0 :this.trend.state = 'long';break;
	case diff < 0 :this.trend.state = 'short';break;
	default:_.noop;
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
    if ((longema < shortema)&&(di_plus != undefined)&&(di_minus != undefined)){this.trend.ls ='short';}
    //trend moving up
    else if ((longema > shortema)&&(di_plus != undefined)&&(di_minus != undefined)){this.trend.ls ='long';}
    else _.noop;

    //stoploss
    if (this.stopLoss.shouldSell(candle)) {this.advice('short');}
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
ADX Trend Strength (DI+ DI-)
StopLoss

resources:
some copy and paste code from: https://github.com/xFFFFF/Gekko-Strategies

*/
