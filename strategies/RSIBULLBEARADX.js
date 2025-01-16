const { addon: ov } = require('openvino-node');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var Promise = require("bluebird");const _ = require("underscore");
const fs = require("fs-extra");fs.createReadStream('/dev/null');

var settings = config.RSIBULLBEARADX;this.settings=settings;
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

function makeoperator() {
var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>'];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
}

var method = {
  /* INIT */
  init: function() {
    startTime=new Date();this.debug=true;
    this.name = 'RSIBULLBEARADX';
    this.requiredHistory = config.tradingAdvisor.historySize;
    this.resetTrend();
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

  /* GET low/high for backtest-period */
  lowHigh: function(val, type) {
    let cur;
    if (type == 'bear') {cur = this.stat.bear;
      if (val < cur.min) this.stat.bear.min = val;
      else if (val > cur.max) this.stat.bear.max = val;
    } else if (type == 'bull') {
      cur = this.stat.bull;
      if (val < cur.min) this.stat.bull.min = val;
      else if (val > cur.max) this.stat.bull.max = val;
    } else {
      cur = this.stat.adx;
      if (val < cur.min) this.stat.adx.min = val;
      else if (val > cur.max) this.stat.adx.max = val;
    }
  },

update : function(candle) {_.noop;},

log : function(candle) {
/* general purpose log data */
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
    candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
    if (err) {return console.log(err);}
    });
},

/* FXChess */
 fxchess : function(){
  const chess = new Chess()
  while (!chess.isGameOver()) {
  const moves = chess.moves()
  const move = moves[Math.floor(Math.random() * moves.length)]
  chess.move(move)
}
return console.log(chess.pgn())
},

  /* CHECK */
  check: function(candle) {
    log.debug("Random game of Chess");this.fxchess();
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
      if (adx > this.settings.ADX_high) rsi_hi = rsi_hi + this.BEAR_MOD_high;
      else if (adx < this.settings.ADX_low) rsi_low = rsi_low + this.BEAR_MOD_low;
      else if (rsi < rsi_low) this.long();
      else  this.lowHigh(rsi, 'bear');
    }

    else
    {
    //bull rsi
      rsi = this.tulipIndicators.BULL_RSI.result.result;
      let rsi_hi = this.settings.BULL_RSI_high,rsi_low = this.settings.BULL_RSI_low;
      // ADX
      if (adx > this.settings.ADX_high) rsi_hi = rsi_hi + this.BULL_MOD_high;
      else if (adx < this.settings.ADX_low) rsi_low = rsi_low + this.BULL_MOD_low;
      else if (rsi > rsi_hi) this.short();
      else  this.lowHigh(rsi, 'bull');
    }
    // add adx low/high if debug
    if (this.debug) this.lowHigh(adx, 'adx');
  },

  /* LONG  */
  long: function() {
    if(this.trend.direction != 'buy')
    this.trend = {duration: 0,direction: 'buy',longPos: true};
    this.trend.duration++;this.advice('buy');
    log.debug('-- UP --', this.trend.duration, 'candle(s)');
    if (this.trend.duration == 3){return Promise.promisifyAll(require("../exchange/wrappers/ccxt/ccxtOrdersBuy.js"));this.advice('long');}
  },

  /* SHORT  */
  short: function() {
    if (this.trend.direction != 'sell') 
    this.trend = {duration: 0,direction: 'sell',longPos: false};
    this.trend.duration++;this.advice('sell');
    log.debug('-- DOWN --', this.trend.duration, 'candle(s)');
    if (this.trend.duration == 3) {return Promise.promisifyAll(require("../exchange/wrappers/ccxt/ccxtOrdersSell.js"));this.advice('short');}
  },

end : function() {log.info('THE END');}

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
