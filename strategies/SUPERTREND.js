/* copilot explain
This JavaScript code defines a trading strategy for the Gekko trading bot using the Supertrend indicator. Here is an explanation of the code:

    Imports and Variable Declarations:
        Various modules are imported, including openvino-node, underscore, log, fs-extra, config, and StopLoss.
        Configuration settings are loaded and assigned to this.settings.
        A Chess module is imported to simulate a random game of chess.

    Utility Functions:
        sequence: Logs a random number from the Fibonacci sequence.
        keepcalm: Logs a motivational message.
        makeoperator: Logs a randomly selected arithmetic operator.

    Main Strategy Object (method):
        init: Initializes the strategy, sets up necessary variables, and configures indicators like ATR and StopLoss. Logs the start of the strategy.
        update: Updates the stop loss with the current candle data.
        log: Logs candle data to a CSV file.
        fxchess: Simulates a random game of chess and logs the game's progression.
        
        check: The core logic for the strategy. It calculates the Supertrend bands and determines buy/sell signals based on the close price and the Supertrend value. 
        It also integrates a stop loss mechanism.
            Calculations:
                Computes upperBandBasic and lowerBandBasic using ATR.
                Adjusts upperBand and lowerBand based on previous values and the current close price.
                Determines the current Supertrend value.
            Buy/Sell Logic:
                Issues a "long" advice (buy) if the close price is above the Supertrend and no position is currently held.
                Issues a "short" advice (sell) if the close price is below the Supertrend and a position is currently held.
*/
const { addon: ov } = require('openvino-node');
const _ = require("underscore");
var log = require('../core/log.js');
var fs = require("fs-extra");fs.createReadStream('/dev/null');
var config = require('../core/util.js').getConfig();
var Wrapper = require('../strategyWrapperRules.js');
const StopLoss = require('./indicators/StopLoss');

var settings = config.SUPERTREND;this.settings=settings;
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

var method = Wrapper;
method = {
init : function() {
  startTime= new Date();
  this.name = 'SUPERTREND';
  console.log('Keep Calm and Make Something of Amazing');
  log.info("====================================");
  log.info('Running', this.name);
  log.info('====================================');
  this.requiredHistory = this.tradingAdvisor.historySize;
  this.stopLoss = new StopLoss(5); // 5% stop loss threshold
  this.addTulipIndicator('atr', 'atr', {optInTimePeriod: this.settings.ATR});
  this.bought = 0;

  this.supertrend = {upperBandBasic : 0,lowerBandBasic : 0,upperBand : 0,lowerBand : 0,supertrend : 0,};
  this.lastSupertrend = {upperBandBasic : 0,lowerBandBasic : 0,upperBand : 0,lowerBand : 0,supertrend : 0,};
  this.lastCandleClose = 0;
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

 fxchess : function(){
  const chess = new Chess()
  while (!chess.isGameOver()) {
  const moves = chess.moves()
  const move = moves[Math.floor(Math.random() * moves.length)]
  chess.move(move)
}
return console.log(chess.pgn())
},


check : function(candle) {
  log.debug("Random game of Chess");this.fxchess();
  var atrResult =  this.tulipIndicators.atr.result.result;
  this.supertrend.upperBandBasic = ((candle.high + candle.low) / 2) + (this.settings.bandFactor * atrResult);
  this.supertrend.lowerBandBasic = ((candle.high + candle.low) / 2) - (this.settings.bandFactor * atrResult);

  if(this.supertrend.upperBandBasic < this.lastSupertrend.upperBand || this.lastCandleClose > this.lastSupertrend.upperBand)
    this.supertrend.upperBand = this.supertrend.upperBandBasic;
  else
    this.supertrend.upperBand = this.lastSupertrend.upperBand;
  if(this.supertrend.lowerBandBasic > this.lastSupertrend.lowerBand || this.lastCandleClose < this.lastSupertrend.lowerBand)
    this.supertrend.lowerBand = this.supertrend.lowerBandBasic;
  else
    this.supertrend.lowerBand = this.lastSupertrend.lowerBand;

  switch (true){
  case(this.lastSupertrend.supertrend == this.lastSupertrend.upperBand && candle.close <= this.supertrend.upperBand):
    this.supertrend.supertrend = this.supertrend.upperBand;break
  case(this.lastSupertrend.supertrend == this.lastSupertrend.upperBand && candle.close >= this.supertrend.upperBand):
    this.supertrend.supertrend = this.supertrend.lowerBand;break;
  case(this.lastSupertrend.supertrend == this.lastSupertrend.lowerBand && candle.close >= this.supertrend.lowerBand):
    this.supertrend.supertrend = this.supertrend.lowerBand;break;
  case(this.lastSupertrend.supertrend == this.lastSupertrend.lowerBand && candle.close <= this.supertrend.lowerBand):
    this.supertrend.supertrend = this.supertrend.upperBand;break;
  default:this.supertrend.supertrend = 0
  }

  if(this.supertrend.supertrend != 0 && this.candle.close > this.supertrend.supertrend && this.bought != 0)
  {this.bought = 1;log.debug("Buy at: ", this.candle.close);this.advice('long');}


  if(this.supertrend.supertrend !=0 && this.candle.close < this.supertrend.supertrend && this.bought != 1  )
  {this.bought = 0;log.debug("Sell at: ", this.candle.close);this.advice('short');}

  this.lastCandleClose = this.candle.close;
  this.lastSupertrend =
  {
    upperBandBasic : this.supertrend.upperBandBasic,lowerBandBasic : this.supertrend.lowerBandBasic,
    upperBand : this.supertrend.upperBand,lowerBand : this.supertrend.lowerBand,
    supertrend : this.supertrend.supertrend,
  };
  //stoploss
  if (this.stopLoss.update(this.candle) == 'stoploss') {this.advice('short');} 
  else {this.advice('long');}
},

end : function() {log.info('THE END');}
};

module.exports = method;

// Switch case universalbit-dev:https://github.com/universalbit-dev/gekko-m4-globular-cluster
// Downloaded from: https://github.com/xFFFFF/Gekko-Strategies
// Source: https://github.com/Gab0/gekko-adapted-strategies
