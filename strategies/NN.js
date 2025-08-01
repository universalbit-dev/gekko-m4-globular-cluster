var log = require('../core/log.js');
var util= require('../core/util.js')
var config = require('../core/util.js').getConfig();
var _ = require('lodash');
var fs = require("fs-extra");fs.createReadStream('/dev/null');
const StopLoss = require('./indicators/StopLoss');
const RSI=require('./indicators/RSI');
const DEMA=require('./indicators/DEMA');

const { Chess } = require('chess.js');

//https://cs.stanford.edu/people/karpathy/convnetjs/started.html
var convnetjs = require('../core/convnet.js');
var deepqlearn= require('../core/deepqlearn');
var math = require('mathjs');

var settings = config.NN;this.settings=settings;var chess_universe = [];
var cov = require('compute-covariance');

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
predictionCount:0,priceBuffer:[],stoplossCounter:0,prevPrice:0,prevAction:'wait',hodl_threshold:1,
  init : function() {
    this.requiredHistory = this.settings.historySize;this.RSIhistory = [];
    log.info('================================================');
    log.info('keep calm and make somethig of amazing');
    log.info('================================================');
    this.trend = {direction: 'none',duration: 0,persisted: false,adviced: false};
    //Date
    startTime = new Date();
    this.hodle_threshold = this.settings.hodle_threshold || 1;
    this.addIndicator('dema', 'DEMA', {optInTimePeriod:this.settings.DEMA});
    this.addIndicator('rsi', 'RSI', {interval:this.settings.RSI});
    this.stopLoss = new StopLoss(5); // 5% stop loss threshold

    this.name = 'NN';
    this.nn = new convnetjs.Net();
    //https://stanford.edu/~shervine/teaching/cs-230/cheatsheet-convolutional-neural-networks#
    fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181','6765'];
    var x = Math.floor(Math.random() * fibonacci_sequence.length);
    if (x == 0){Math.floor(Math.random() * fibonacci_sequence.length);}
    x = fibonacci_sequence[x];this.x=x;
    var y = 1;
    y = fibonacci_sequence[y];this.y=y;
    var z = 1;
    z = fibonacci_sequence[z];this.z=z;
    console.debug('\t\t\t\tNeuralNet Layer: ' + '\tINPUT:'+ x + "\tHIDE:" + y + "\tOUT:" + z);

    const layers = [
      {type:'input', out_sx:this.x, out_sy:y, out_depth:z},
      {type:'conv', num_neurons:3, activation: 'relu'},
      {type:'fc', num_neurons:3, activation:'sigmoid'},
      {type:'regression', num_neurons:1}
      //https://cs.stanford.edu/people/karpathy/convnetjs/demo/regression.html
    ];
    this.nn.makeLayers(layers);

switch(this.settings.method)
{
    case(this.settings.method == 'sgd'):
      this.trainer = new convnetjs.SGDTrainer(this.nn,
      {learning_rate: this.settings.learning_rate,momentum: 0.9,batch_size:8,l2_decay: this.settings.l2_decay,l1_decay: this.settings.l1_decay});break;

    case(this.settings.method == 'adadelta'):
      this.trainer = new convnetjs.Trainer(this.nn,
      {method: this.settings.method,learning_rate: this.settings.learning_rate,eps: 1e-6,ro:0.95,batch_size:1,l2_decay: this.settings.l2_decay});break;

    case(this.settings.method == 'adagrad'):
      this.trainer = new convnetjs.Trainer(this.nn,
      {method: this.settings.method,learning_rate: this.settings.learning_rate,eps: 1e-6,batch_size:8,l2_decay: this.settings.l2_decay});break;

    case(this.settings.method == 'nesterov'):
      this.trainer = new convnetjs.Trainer(this.nn,
      {method: this.settings.method,learning_rate: this.settings.learning_rate,momentum: 0.9,batch_size:8,l2_decay: this.settings.l2_decay});break;

    case(this.settings.method == 'windowgrad'):
      this.trainer = new convnetjs.Trainer(this.nn,
      {method: this.settings.method,learning_rate: this.settings.learning_rate,eps: 1e-6,ro:0.95,batch_size:8,l2_decay: this.settings.l2_decay});break;

    default:
      this.trainer = new convnetjs.Trainer(this.nn,
      {method: 'adadelta',learning_rate: 0.01,momentum: 0.0,batch_size:1,eps: 1e-6,ro:0.95,l2_decay: 0.001,l1_decay: 0.001});
}
},

  learn : function () {
    for (let i = 0; i < _.size(this.priceBuffer) - 1; i++) {
      let data = [this.priceBuffer[i]];
      let current_price = [this.priceBuffer[i + 1]];
      let vol = new convnetjs.Vol(data);
      this.trainer.train(vol, current_price);
      predictionCount=this.predictionCount++;this.brain();
    }
  },
  setNormalizeFactor : function(candle) {
    this.settings.scale = Math.pow(10,Math.trunc(candle).toString().length+2);
    log.debug('Set normalization factor to',this.settings.scale);
  },

//Reinforcement Learning
//https://cs.stanford.edu/people/karpathy/convnetjs/docs.html

  brain: function(){
    var brain = new deepqlearn.Brain(this.x, this.z);
    var state = [Math.random(), Math.random(), Math.random()];
    for(var k=0;k < _.size(this.priceBuffer) - 1;k++)
    {
    var action = brain.forward(state); //returns index of chosen action
    var reward = action === 0 ? 1.0 : 0.0;
    brain.backward([reward]); // <-- learning magic happens here
    state[Math.floor(Math.random()*3)] += Math.random()*2-0.5;
    }
    brain.epsilon_test_time = 0.0;brain.learning = true;
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

makeoperator: async function () {
var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>'];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
},

predictCandle : function() {
var vol = new convnetjs.Vol(this.priceBuffer);
var prediction = this.nn.forward(vol);
return prediction.w[0];
},

fxchess :async function(){
  const chess = new Chess()
  while (!chess.isGameOver()) {
  const moves = chess.moves()
  const move = moves[Math.floor(Math.random() * moves.length)]
  chess.move(move)
}
chess_universe.push([chess.pgn()]); /* */
return console.log(chess.pgn())
},

  check :function(candle) {

  log.debug("Random game of Chess");this.fxchess();
  this.predictionCount=0;
  rsi=this.indicators.rsi;dema=this.indicators.dema;
  this.RSIhistory.push(rsi);

  if(_.size(this.RSIhistory) > 3){
  this.RSIhistory.shift();this.lowestRSI = _.min(this.RSIhistory);this.highestRSI = _.max(this.RSIhistory);
  this.stochRSI = ((rsi - this.lowestRSI) / (this.highestRSI - this.lowestRSI)) * 100;
  }

  if(_.size(this.priceBuffer) > this.settings.price_buffer_len)
  //remove oldest priceBuffer value
  this.priceBuffer.shift();
  if (1 === this.settings.scale && 1 < candle.high && 0 === this.predictionCount)this.setNormalizeFactor();this.priceBuffer.push(dema / this.settings.scale );
  if (2 > _.size(this.priceBuffer)) return;
  for (i=0;i<3;++i)this.learn();
  while (this.settings.price_buffer_len < _.size(this.priceBuffer))
  this.priceBuffer.shift();

if(this.stochRSI > this.settings.high) {
//new trend detected
        this.trend = {duration: 0,persisted: false,direction: 'buy',adviced: false};
		this.trend.duration++;this.advice('long');
		log.debug('In high since', this.trend.duration, 'candle(s)');
		if(this.trend.duration >= this.settings.duration)this.trend.persisted = true;
		if(this.trend.persisted && !this.trend.adviced && this.stochRSI !==100){this.trend.adviced = true;}

}
else if(this.stochRSI < this.settings.low) {
		// new trend detected
		this.trend = {duration: 0,persisted: false,direction: 'sell',adviced: false};
		this.trend.duration++;this.advice('short');
		log.debug('In low since', this.trend.duration, 'candle(s)');
		if(this.trend.duration >= this.settings.duration){this.trend.persisted = true;}
		if(this.trend.persisted && !this.trend.adviced && this.stochRSI !== 0){this.trend.adviced = true;}
		else {_.noop;} /* */
	}
else {
		// trends must be on consecutive candles
		this.trend.duration = 0;
		log.debug('In no trend');this.learn(); /* */
		}
if(this.predictionCount > this.settings.min_predictions)
{
    /*
      https://www.investopedia.com/articles/investing/092115/alpha-and-beta-beginners.asp
      α / Alpha	Performance Analysis Excess return relative to benchmark Higher is better; indicates outperformance
      β / Beta	Risk Assessment	Volatility relative to market	1 = market risk, >1 = higher risk, <1 = lower risk
    */
      var standardprice=candle.close;
      var currentprice=this.tulipIndicators.dema.result.result;
      var prediction = this.predictCandle();
      var meanprediction = math.mean([prediction, currentprice]);
      var variance= math.variance([prediction,currentprice]);
      var covariance = cov( [prediction,currentprice] );
      var Alpha = (meanprediction - currentprice) / currentprice * 100; /* */
      var Beta = (covariance / variance);
      var signalSell = ((standardprice > this.prevPrice) || (standardprice < (this.prevPrice * this.settings.hodl_threshold)));
      var signal = meanprediction < currentprice;
    log.info('calculated NN properties for candle:');
    log.info('Price:', this.candle.close);
    log.info("NeuralNet layer: " + this.x +" x "+ this.y +" x "+ this.z + " "+ "all volumes are 3D");
    log.info("NeuralNet candle hypothesis:"+ prediction);
    log.info("Alpha:" + Alpha.toFixed(2) + "%");
    log.info("Beta:" + Beta)
    log.info("learning method:"+ this.settings.method);
    log.info('==================================================================');
    if(Beta < 1){log.info('');}
    }
    if (this.trend.adviced && this.stochRSI !== 0 && 'buy' !== this.prevAction && signal === false && Alpha > this.settings.threshold_buy)
    {var buyprice = this.candle.low;this.advice('long');/* */}

    if ( this.trend.adviced && this.stochRSI !== 0 && signal === true && Alpha > this.settings.threshold_sell)
    {var sellprice = this.candle.high;this.advice('short');/* */}
    this.brain();

    //stoploss
    if (this.stopLoss.update(candle) == 'stoploss') {this.advice('short');} 
    else {this.advice('long');}
    
}, /* */

  end : function() {log.debug('THE END');}
};
module.exports = method;

