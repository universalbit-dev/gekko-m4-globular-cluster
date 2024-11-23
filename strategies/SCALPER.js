const { addon: ov } = require('openvino-node');
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
var log = require('../core/log.js');
const { Chess } = require('chess.js');
var fs = require("fs-extra");
var method = {};

method.makeoperator = function() {
var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>'];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
}

method.init = function() {
  this.name = 'SCALPER';
  this.addTulipIndicator('ps', 'psar', {optInAcceleration: 0.25,optInMaximum: 0.50});
  this.addIndicator('stoploss', 'StopLoss', {threshold: this.settings.stoploss_threshold});
  this.candle_queue = [];
  this.is_buyin = false;
  this.price_buyin = 0;
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
}

method.onTrade = function(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}
    this.prevAction = event.action;
    this.prevPrice = event.price;
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
  //if ('buy' === this.prevAction && this.settings.stoploss_enabled && 'stoploss' === this.indicators.stoploss.action) 
      //{this.stoplossCounter++;log.debug('>>> STOPLOSS triggered <<<');this.advice('sell')} /* */

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
    this.is_buyin = true;this.advice('buy');break;/* */
    
    case(candle.close >= runninMax && this.is_buyin):
    this.is_buyin = false;this.advice('sell');break;/* */
    
    default:log.info();
    }
    
  }
}

module.exports = method;
