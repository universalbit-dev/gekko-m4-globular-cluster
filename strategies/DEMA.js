const { addon: ov } = require('openvino-node');
var Promise = require("bluebird");const _ = Promise.promisifyAll(require("underscore"));
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();

var fs = require("fs-extra");fs.createReadStream('/dev/null');
var settings = config.DEMA;this.settings=settings;
var  {Chess} = require('chess.js');
var math= require('mathjs');

function makeoperator() {
var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>'];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
}

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
 
var method = {
init : function() {
  startTime = new Date();
  this.name = 'DEMA';
  this.currentTrend;
  this.requiredHistory = config.tradingAdvisor.historySize;
  this.addTulipIndicator('dema', 'dema', {optInTimePeriod: this.settings.DEMA});
  this.addTulipIndicator('sma', 'sma', {optInTimePeriod: this.settings.SMA});
},

update : function(candle) {_.noop;},

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
