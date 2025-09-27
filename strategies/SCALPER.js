/* copilot explain
This JavaScript code defines a trading strategy for the Gekko trading bot called "SCALPER". Here is an explanation of the code:

    Imports and Variable Declarations:
        Various modules are imported, including openvino-node,underscore, log, Chess, fs-extra, and StopLoss.

    Utility Functions:
        makeoperator: Logs a randomly selected arithmetic operator.
        fxchess: Simulates a random game of chess and logs the game's progression.

    Main Strategy Object (method):
        init: Initializes the strategy, sets up necessary variables, and configures the Parabolic SAR (PSAR) indicator and stop loss.
            Sets the strategy name to 'SCALPER'.
            
            Initializes a candle queue, buy-in status, and buy-in price.
            Adds the PSAR indicator with specific settings.
            Initializes a stop loss with a 5% threshold.
        update: Updates the strategy with the current candle data.
            Updates the PSAR and stop loss.
            Tracks Darvas Box high and low values.
            Calculates the delta of the candle close price.
        check: The core logic for the strategy, which evaluates the indicators and makes buy/sell decisions.
            Logs a random operator and a random game of chess for debugging purposes.
            Checks if the candle queue length is sufficient for analysis.
            Calculates running minimum and maximum candle close prices over a period.
            Determines buy/sell signals based on various conditions, such as candle close price relative to PSAR, running minimum/maximum, and other computed values.
            Resets relevant variables after a buy/sell decision is made.
            Integrates a stop loss mechanism.
        stopLoss: Updates the stop loss with the current candle data and makes buy/sell decisions based on the stop loss condition.
        log: Logs the debug information.

The strategy uses a combination of the PSAR indicator, Darvas Box, and custom logic to determine buy and sell signals. 
It also includes debugging functionalities and a stop loss mechanism to manage risk.
*/
var Promise = require("bluebird");const _ = require("underscore");
var log = require('../core/log.js');
const { Chess } = require('chess.js');
var fs = require("fs-extra");fs.createReadStream('/dev/null');
const StopLoss = require('./indicators/StopLoss');

var method = {};

method.makeoperator = function() {
var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>'];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
}

method.init = function() {
  this.name = 'SCALPER';
  this.addTulipIndicator('ps', 'psar', {optInAcceleration: 0.25,optInMaximum: 0.50});
  this.candle_queue = [];
  this.is_buyin = false;
  this.price_buyin = 0;
  this.stopLoss = new StopLoss(5); // 5% stop loss threshold
}

var barscount = 0;
var DarvasHigh = 0;
var DarvasLow = 0;

method.update = function(candle) {
  psar = this.tulipIndicators.ps.result.result;this.psar=psar;
  if (candle.low < DarvasLow) {DarvasLow = candle.low;}
  if (candle.high < DarvasHigh) {DarvasHigh = candle.low;}
  this.candle_queue.push(candle);barscount++;
  if (this.candle_queue.length > 0) {candle.delta = candle.close - this.candle_queue[0].close;}
  this.stopLoss.update(candle);
}

var percent = 35;
var distance = 3;
var Period = 14;
var lastcolor = 0;
var Min = [];
var MovingTR = [];
IsReversalUp = function(min, candle) {
  var c1 = this.candle_queue[this.candle_queue.length - 2];
  return (candle.low < min && candle.close > c1.close);

}

var MoveCycle = [];

method.fxchess = function(){
  const chess = new Chess()
  while (!chess.isGameOver()) {
  const moves = chess.moves()
  const move = moves[Math.floor(Math.random() * moves.length)]
  chess.move(move)
}
return console.log(chess.pgn())
}

method.check = function(candle) {

  log.debug("Operator ");this.makeoperator();
  log.debug("Random game of Chess");this.fxchess();
  if (this.candle_queue.length >= 15) {
    runningMin = 99999999;
    runninMax = 0;
    for (var barsBack = Math.min(this.candle_queue.length, Period - 1); barsBack > 0; barsBack--) {
      var bar = this.candle_queue[barsBack];
      if (bar.close <= runningMin) {
        var runningMin = bar.close;
      }
    }
    Min.push(runningMin);
    for (var barsBack = Math.min(this.candle_queue.length, Period - 1); barsBack > 0; barsBack--) {
      var bar = this.candle_queue[barsBack];
      if (bar.close >= runninMax) {var runninMax = bar.close;}
    }

    var LowerLow = Min[Min.length - 1] > Min[0];
    var CandeLow = this.candle.close < runningMin && (this.candle.close - runningMin) / 100;
    MoveCycle.push((this.candle.close - runningMin) / 100);
    var Downslow = MoveCycle[MoveCycle.length - 1] > MoveCycle[0];

    var c1 = this.candle_queue[this.candle_queue.length - 2];
    var TrueRange = Math.max(runninMax, c1.close) - Math.min(runningMin, c1.close);
    var valid = TrueRange / (candle.close - c1.close);
    var Range = 100 * ((valid - runningMin) / (runninMax - runningMin));
    MovingTR.push(valid);
    var MovingSlower = MovingTR[MovingTR.length - 2] > valid;

    switch(true){

    case (CandeLow && !MovingSlower && valid > 0 && !this.is_buyin && this.candle.close > this.psar):
    this.price_buyin = candle.close;log.debug("valid : ", valid);
    this.candle_queue.length = 0;runningMin = 0;runninMax = 0;Downslow.length = 0;
    this.is_buyin = true;this.advice('long');break;/* */

    case(candle.close >= runninMax && this.is_buyin):
    this.is_buyin = false;this.advice('short');break;/* */

    default:log.info();
    }

  }
  //stoploss
  if (this.stopLoss.update(this.candle) == 'stoploss') {this.advice('short');} 
  else {this.advice('long');}
}

module.exports = method;
