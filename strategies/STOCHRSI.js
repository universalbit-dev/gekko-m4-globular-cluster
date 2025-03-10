const { addon: ov } = require('openvino-node');
var Promise = require("bluebird");const _ = require("underscore");
var fs = require("fs-extra");fs.createReadStream('/dev/null');
const math= require('mathjs');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var settings = config.STOCHRSI;this.settings=settings;

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
const StopLoss = require('./indicators/StopLoss');

var method = {};

method.init = function() {
  this.name = 'STOCHRSI';
  log.info('Start' ,this.name);
  this.trend = {direction: 'none',duration: 0,persisted: false,adviced: false};
//optInTimePeriod : Fibonacci Sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 ,610 ,987
  this.requiredHistory = this.settings.historySize;
  this.stopLoss = new StopLoss(5); // 5% stop loss threshold
  this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod: this.settings.RSI,optInFastPeriod:89,optInSlowPeriod:21});
  this.addTulipIndicator('stoch', 'stoch', {optInFastKPeriod: 89,optInSlowKPeriod:21,optInSlowDPeriod:this.settings.STOCH});

  RSIhistory=[];this.RSIhistory = RSIhistory;

  log.info('================================================');
  log.info('keep calm and make somethig of amazing');
  log.info('================================================');
//Date
startTime = new Date();
}

method.update = function(candle) {this.stopLoss.update(candle);
_.noop;}

method.log = function(candle) {
//general purpose log data
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
    candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
    if (err) {return console.log(err);}
    });
}

method.makeoperator= function() {
var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>'];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
},

method.fxchess = function(){
  const chess = new Chess()
  while (!chess.isGameOver()) {
  const moves = chess.moves()
  const move = moves[Math.floor(Math.random() * moves.length)]
  chess.move(move)
}
return console.log(chess.pgn())
}

method.check = function(candle)
{

    log.debug("Operator ");this.makeoperator();log.debug("Random game of Chess");this.fxchess();
    rsi=this.tulipIndicators.rsi.result.result;this.rsi=rsi;
    stoch=this.tulipIndicators.stoch.result.result;
    this.RSIhistory.push(this.rsi);

    if(_.size(this.RSIhistory) > this.interval)
    this.RSIhistory.shift();
    this.lowestRSI = _.min(this.RSIhistory);
    this.highestRSI = _.max(this.RSIhistory);
    this.stochRSI = ((this.rsi - this.lowestRSI) / (this.highestRSI - this.lowestRSI)) * 100;

	if((this.stochRSI > 70)&&(this.trend.direction !== 'long'))
	{
	this.trend = {duration: 0,persisted: false,direction: 'long',adviced: false}
	this.trend.duration++;
	log.debug('In high since' ,this.trend.duration, 'candle(s)');
	}
	if(this.trend.duration >= this.settings.persisted){this.trend.persisted = true;}
	if(this.trend.persisted && this.trend.adviced != false && this.stochRSI !=100){this.trend.adviced = true;
	}

	if((this.stochRSI < 30)&&(this.trend.direction !== 'short'))
	{
	this.trend = {duration: 0,persisted: false,direction: 'short',adviced: false};
    this.trend.duration++;
    log.debug('In low since', this.trend.duration, 'candle(s)');
	if(this.trend.duration >= this.settings.persisted){this.trend.persisted = true;}
	if(this.trend.persisted && this.trend.adviced != false && this.stochRSI != 0){this.trend.adviced = true;
	return Promise.promisifyAll(require("../exchange/wrappers/ccxt/ccxtOrdersSell.js"));}
	else {this.trend.duration = 0;log.debug('In no trend');_.noop;}
	}
    log.debug('calculated StochRSI properties:');
    log.debug('\t', 'rsi:', rsi);
    log.debug("StochRSI min:\t\t" + this.lowestRSI);
    log.debug("StochRSI max:\t\t" + this.highestRSI);
    log.debug("StochRSI value:\t\t" + this.stochRSI);
    //stoploss
    if (this.stopLoss.update(candle) == 'stoploss') {this.advice('short');} 
    else {this.advice('long');}
},
method.end = function() {log.info('THE END');}

module.exports = method;
