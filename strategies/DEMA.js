//const { addon: ov } = require('openvino-node');
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();

var fs = require("fs-extra");
var settings = config.DEMA;this.settings=settings;
var  {Chess} = require('chess.js');
var math= require('mathjs');

/* async fibonacci sequence */
var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
var seqms = fibonacci_sequence[Math.floor(Math.random() * fibonacci_sequence.length)];

/* async keep calm and make something of amazing */
var keepcalm = ms => new Promise(resolve => setTimeout(resolve,seqms));
async function amazing() {console.log('keep calm and make something of amazing');await keepcalm;
};

function AuxiliaryIndicators(){
   var directory = 'indicators/';
   var extension = '.js';
   var files = ['DEMA','StopLoss','SMA'];  
   for (var file of files){ 
       var auxiliaryindicators = require('./' + directory + file + extension);
       //log.debug('added', auxiliaryindicators);
   }
 }

function makeoperator() {
var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>'];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
}
 
var method = {
init : function() {
  AuxiliaryIndicators();
  startTime = new Date();
  this.name = 'DEMA';
  this.currentTrend;
  this.requiredHistory = config.tradingAdvisor.historySize;
  this.addIndicator('stoploss', 'StopLoss', {threshold:this.settings.stoploss_threshold});
  this.addTulipIndicator('dema', 'dema', {optInTimePeriod: this.settings.DEMA});
  this.addTulipIndicator('sma', 'sma', {optInTimePeriod: this.settings.SMA});
},

update : function(candle) {_.noop;},

onTrade: function(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}
    this.prevAction = event.action;
    this.prevPrice = event.price;
  },

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
return console.table(chess.pgn())
},

check : function(candle) {
   
   //if ('buy' === this.prevAction && this.settings.stoploss_enabled && 'stoploss' === this.indicators.stoploss.action) 
      //{this.stoplossCounter++;log.debug('>>> STOPLOSS triggered <<<');this.advice('sell');} /* */

  log.debug("Operator ");makeoperator();
  log.debug("Random game of Chess");this.fxchess();
  dema =  this.tulipIndicators.dema.result.result;sma = this.tulipIndicators.sma.result.result;var price = this.candle.close;this.price=price;
  if(dema && sma != null) {var meanmatrix= math.mean(dema,sma); 
  var matrix=(meanmatrix - price) / price * 100; /* */
  this.matrix=matrix;
  }

  switch (true){
  case(this.matrix  < this.settings.thresholds.down && sma != 'undefined' && this.matrix < 0): 
  return Promise.promisifyAll(require("../exchange/wrappers/ccxt/ccxtOrdersBuy.js"));this.advice('long');break;
  case(this.matrix > this.settings.thresholds.up && sma != 'undefined' && this.matrix > 0): 
  return Promise.promisifyAll(require("../exchange/wrappers/ccxt/ccxtOrdersSell.js"));this.advice('short');break;
  default: _.noop;
  }
  
  log.debug('Calculated DEMA and SMA properties for candle:');
  log.debug('DEMA:', dema);
  log.debug('SMA:', sma);
  log.debug('\t MATRIX:', this.matrix);
},


end : function() {log.info('THE END');}

};

module.exports = method;
