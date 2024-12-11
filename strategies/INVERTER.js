//const { addon: ov } = require('openvino-node');
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var fs = require("fs-extra");fs.createReadStream('/dev/null');
var settings = config.INVERTER;this.settings=settings;

const { Chess } = require('chess.js')

/* async fibonacci sequence */
var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
var seqms = fibonacci_sequence[Math.floor(Math.random() * fibonacci_sequence.length)];

var sequence = ms => new Promise(resolve => setTimeout(resolve, seqms));
async function sequence() {await sequence;};

/* async keep calm and make something of amazing */
var keepcalm = ms => new Promise(resolve => setTimeout(resolve,seqms));
async function amazing() {console.log('keep calm and make something of amazing');await keepcalm;
};

//https://github.com/Gab0/gekko-extra-indicators
function AuxiliaryIndicators(){
   var directory = 'indicators/';
   var extension = '.js';
   var files = ['DEMA','EMA','RSI','ADX','DX','StopLoss'];
   for (var file of files){
       var auxiliaryindicators = require('./' + directory + file + extension);
       log.debug('Ported Indicator:', auxiliaryindicators);
   }
 }
 
//INIT
var method = {
 prevPrice : 0,prevAction :'none',
init:  function()
{
this.interval = this.settings.interval;
this.RSIhistory = [];
AuxiliaryIndicators();
this.name = 'INVERTER';
log.info('Start' , this.name);
this.trend = {direction: 'none',duration: 0,state:'none',ls:'none'};

this.debug = true;
//optInTimePeriod : Fibonacci Sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 ,610 ,987
this.addTulipIndicator('dema', 'dema', {optInTimePeriod:this.settings.DEMA,optInFastPeriod:233,optInSlowPeriod:55});
this.addTulipIndicator('longema', 'ema', {optInTimePeriod: this.settings.long_EMA,optInFastPeriod:233,optInSlowPeriod:55});
this.addTulipIndicator('shortema', 'ema', {optInTimePeriod: this.settings.short_EMA,optInFastPeriod:233,optInSlowPeriod:55});
this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod: this.settings.RSI,optInFastPeriod:89,optInSlowPeriod:21});
this.addTulipIndicator('di', 'di', {optInTimePeriod : this.settings.DI});
this.addTulipIndicator('adx', 'adx',{optInTimePeriod: this.settings.ADX,optInFastPeriod:70,optInSlowPeriod:50});
this.addTulipIndicator('dx', 'dx', {optInTimePeriod: this.settings.DX});
this.addIndicator('stoploss', 'StopLoss', {threshold:this.settings.stoploss_threshold});

log.info('================================================');
log.info('keep calm and make somethig of amazing');
log.info('================================================');

//Date
startTime = new Date();
this.requiredHistory = this.settings.historySize;
log.info('Running', this.name);
},

update : function(candle) {_.noop;},

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

onTrade: function(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}
    this.prevAction = event.action;
    this.prevPrice = event.price;
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

check: function()
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
	case (rsi > 70 && rsi < 80):this.advice('sell');this.makeoperator();break;
	case (rsi > 20 && rsi < 30):this.advice('buy');this.makeoperator();break;
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
    
    //if ('buy' === this.prevAction && this.settings.stoploss_enabled && 'stoploss' === this.indicators.stoploss.action) 
    //  {this.stoplossCounter++;log.debug('>>> STOPLOSS triggered <<<');this.advice('sell');} /* */
},

/* LONG  */
  long: function() {
    if (this.trend.direction.length != 0 && this.trend.direction !==  'buy')
    {
    this.trend.ls='long';
    this.trend.direction = 'screw_up';return Promise.promisifyAll(require("../exchange/wrappers/ccxt/ccxtOrdersBuy.js"));this.advice('long');
	}
  },

/* SHORT  */
  short: function() { 
    if (this.trend.direction.length != 0 && this.trend.direction !== 'sell')
    {
    this.trend.ls='short';
    this.trend.direction = 'screw_down';return Promise.promisifyAll(require("../exchange/wrappers/ccxt/ccxtOrdersSell.js"));this.advice('short');
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
