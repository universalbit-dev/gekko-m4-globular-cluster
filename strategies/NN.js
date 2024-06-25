/* asyncronous method timed by fibonacci sequence */
require('../core/tulind');
const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var util= require('../core/util.js')
var config = require('../core/util.js').getConfig();
const _ = require('../core/lodash');
var async = require('async');
//https://cs.stanford.edu/people/karpathy/convnetjs/started.html
var convnetjs = require('../core/convnet.js');
var deepqlearn= require('../core/deepqlearn');
var math = require('mathjs');var uuid = require('uuid');
var fs = require('node:fs');
var settings = config.NN;this.settings=settings;

/* async fibonacci sequence */
var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
var sequence = ms => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * fibonacci_sequence.length)));
async function sequence() {console.log('keep calm and make something of amazing');await sequence;};

/* async keep calm and make something of amazing */ 
var keepcalm = ms => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * fibonacci_sequence.length)));
async function amazing() {console.log('keep calm and make something of amazing');await keepcalm;};

function AuxiliaryIndicators(){
   var directory = 'indicators/';
   var extension = '.js';
   var files = ['DEMA','StopLoss','RSI','SMMA','StopLoss'];  
   for (var file of files){ 
       var auxiliaryindicators = require('./' + directory + file + extension);
       log.debug('added', auxiliaryindicators);
   }
 }

function onTrade(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}
    this.prevAction = event.action;
    this.prevPrice = event.price;
}

var method = {
  priceBuffer : [],
  predictionCount : 0,
  stoplossCounter : 0,
  prevPrice : 0,
  prevAction : 'none',
  hodl_threshold : 1,

  init : function() {
    AuxiliaryIndicators();
    this.requiredHistory = this.settings.historySize;
    this.RSIhistory = [];
    log.info('================================================');
    log.info('keep calm and make somethig of amazing');
    log.info('================================================');

    this.trend = {
    direction: 'none',
    duration: 0,
    persisted: false,
    adviced: false
  };
    //Date
    startTime = new Date();
    //indicators
    //StopLoss as indicator
    this.addTulipIndicator('stoploss', 'StopLoss', {threshold:this.settings.STOPLOSS});
    //DEMA
    this.addTulipIndicator('dema', 'dema', {optInTimePeriod:this.settings.DEMA});
    //RSI
    this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod:this.settings.RSI});

    this.name = 'NN';
    this.nn = new convnetjs.Net();
    //https://stanford.edu/~shervine/teaching/cs-230/cheatsheet-convolutional-neural-networks#
    fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377'];//'610','987','1597','2584','4181'];
    var x = 1;
    x = fibonacci_sequence[x];this.x=x;
    var y = 1;
    y = fibonacci_sequence[y];this.y=y;
    var z = Math.floor(Math.random() * fibonacci_sequence.length);
    z = fibonacci_sequence[z];this.z=z;
    console.debug('\t\t\t\tNeuralNet Layer: ' + '\tINPUT:'+ x + "\tHIDE:" + y + "\tOUT:" + z);
    
    const layers = [
      {type:'input', out_sx:x, out_sy:y, out_depth:z},
      {type:'conv', num_neurons:4, activation: 'relu'},
      {type:'fc', num_neurons:4, activation:'sigmoid'},
      {type:'regression', num_neurons:1}
      //https://cs.stanford.edu/people/karpathy/convnetjs/demo/regression.html
    ];

    this.nn.makeLayers(layers);

    if(this.settings.method == 'sgd')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        learning_rate: this.settings.learning_rate,
        momentum: 0.9,
        batch_size:8,
        l2_decay: this.settings.l2_decay,
        l1_decay: this.settings.l1_decay
      });
    }
    else if(this.settings.method == 'adadelta')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        method: this.settings.method,
        learning_rate: this.settings.learning_rate,
        eps: 1e-6,
        ro:0.95,
        batch_size:1,
        l2_decay: this.settings.l2_decay
      });
    }
    else if(this.settings.method == 'adagrad')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        method: this.settings.method,
        learning_rate: this.settings.learning_rate,
        eps: 1e-6,
        batch_size:8,
        l2_decay: this.settings.l2_decay
      });
    }
    else if(this.settings.method == 'nesterov')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        method: this.settings.method,
        learning_rate: this.settings.learning_rate,
        momentum: 0.9,
        batch_size:8,
        l2_decay: this.settings.l2_decay
      });
    }
    else if(this.settings.method == 'windowgrad')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        method: this.settings.method,
        learning_rate: this.settings.learning_rate,
        eps: 1e-6,
        ro:0.95,
        batch_size:8,
        l2_decay: this.settings.l2_decay
      });
    }
    else
    {
      this.trainer = new convnetjs.Trainer(this.nn, {
        method: 'adadelta',
        learning_rate: 0.01,
        momentum: 0.0,
        batch_size:1,
        eps: 1e-6,
        ro:0.95,
        l2_decay: 0.001,
        l1_decay: 0.001
      });
    }

    this.hodl_threshold = this.settings.hodl_threshold || 1;
  },

  learn : function () {
    for (let i = 0; i < _.size(this.priceBuffer) - 1; i++) {
      let data = [this.priceBuffer[i]];
      let current_price = [this.priceBuffer[i + 1]];
      let vol = new convnetjs.Vol(data);
      this.trainer.train(vol, current_price);
      this.predictionCount++;
    }
  },
  setNormalizeFactor : function() {
    this.settings.scale = Math.pow(10,Math.trunc(candle.high).toString().length+2);
    log.debug('Set normalization factor to',this.settings.scale);
  },
  
//Reinforcement Learning
//https://cs.stanford.edu/people/karpathy/convnetjs/docs.html
  
  brain: function(candle){
    var brain = new deepqlearn.Brain(this.x, this.z);
    var state = [Math.random(), Math.random(), Math.random()];
    for(var k=0;k < _.size(this.priceBuffer) - 1;k++)
    {
    var action = brain.forward(state); //returns index of chosen action
    var reward = action === 0 ? 1.0 : 0.0;
    brain.backward([reward]); // <-- learning magic happens here
    state[Math.floor(Math.random()*3)] += Math.random()*2-0.5;
    }
    brain.epsilon_test_time = 0.0;
    brain.learning = true;
  },

  update : function(candle)
  {
  rsi=this.tulipIndicators.rsi.result.result;this.rsi=rsi;
  this.RSIhistory.push(this.rsi);
  if(_.size(this.RSIhistory) > this.interval)
  //remove oldest RSI value
  this.RSIhistory.shift();
  this.lowestRSI = _.min(this.RSIhistory);
  this.highestRSI = _.max(this.RSIhistory);
  this.stochRSI = ((this.rsi - this.lowestRSI) / (this.highestRSI - this.lowestRSI)) * 100;

  if(_.size(this.priceBuffer) > this.settings.price_buffer_len)
  // remove oldest priceBuffer value
  this.priceBuffer.shift();
    dema=this.tulipIndicators.dema.result.result;
    if (1 === this.settings.scale && 1 < candle.high && 0 === this.predictionCount)
    this.setNormalizeFactor();
    this.priceBuffer.push(dema / this.settings.scale );
    if (2 > _.size(this.priceBuffer)) return;
     for (i=0;i<3;++i)
     this.learn();this.brain();
     while (this.settings.price_buffer_len < _.size(this.priceBuffer))
     this.priceBuffer.shift();

//general purpose log  {data}
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
  	candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
  	if (err) {return console.log(err);}
  	});
},

makeoperators:function() {
var operator = ['==','===','!=','&&','<=','>=','>','<','||','='];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
},

predictCandle : function(candle) {
let vol = new convnetjs.Vol(this.priceBuffer);
let prediction = this.nn.forward(vol);
return prediction.w[0];
},

  //https://www.investopedia.com/articles/investing/092115/alpha-and-beta-beginners.asp
  check : function(candle) {

    dema=this.tulipIndicators.dema.result.result;
    rsi=this.tulipIndicators.rsi.result.result;
    this.rsi=rsi;
	if(this.stochRSI > 70) {
		// new trend detected
		if(this.trend.direction !== 'high')
			this.trend = {
				duration: 0,
				persisted: false,
				direction: 'high',
				adviced: false
			};

		this.trend.duration++;

		log.debug('In high since', this.trend.duration, 'candle(s)');

		if(this.trend.duration >= 3)this.trend.persisted = true;

		if(this.trend.persisted && !this.trend.adviced && this.stochRSI !==100)
		{this.trend.adviced = true;}
		else{this.advice();}

	} else if(this.stochRSI < 30) {

		// new trend detected
		if(this.trend.direction !== 'low')
		this.trend = {duration: 0,persisted: false,direction: 'low',adviced: false};
		this.trend.duration++;

		log.debug('In low since', this.trend.duration, 'candle(s)');
		if(this.trend.duration >= 3){this.trend.persisted = true;}
		if(this.trend.persisted && !this.trend.adviced && this.stochRSI !== 0)
		{this.trend.adviced = true;}
		else {this.advice();}

	} else {
		// trends must be on consecutive candles
		this.trend.duration = 0;
		log.debug('In no trend');this.advice();
	}

    if(this.predictionCount > this.settings.min_predictions)
    {
      var prediction = this.predictCandle() * this.settings.scale;
      var currentPrice = candle.close;
      var meanp = math.mean(prediction, currentPrice);
      //when alpha is the "excess" return over an index, what index are you using?
      var meanAlpha = (meanp - currentPrice) / currentPrice * 10;
      var signalSell = candle.close > this.prevPrice || candle.close <
      (this.prevPrice*this.settings.hodl_threshold);
      var signal = meanp < currentPrice;
    }
    if ((this.trend.adviced && this.stochRSI !== 0 && 'buy' !== this.prevAction) && ('buy' !== this.prevAction && signal === false  && meanAlpha > this.settings.threshold_buy))
    {this.advice('long');this.makeoperators();amazing();sequence();}
    if ((this.trend.adviced && this.stochRSI !== 100 && 'sell' !== this.prevAction) && ('sell' !== this.prevAction && signal === true && meanAlpha < this.settings.threshold_sell && signalSell === true))
    {this.advice('short');this.makeoperators();amazing();sequence();}

//stoploss as Reinforcement Learning
    if ('stoploss' === this.indicators.stoploss.action)
    {
    this.stoplossCounter++;log.info(':',this.indicators.stoploss.action);
    this.brain();this.prevAction='sell';signal=false;
    }
    log.info('calculated NN properties for candle:');
    log.info("Trend: ", this.trend.direction, " for ", this.trend.duration);
    log.info('Price:', candle.close);
    log.info("NeuralNet layer: " + this.x +" x "+ this.y +" x "+ this.z + " "+ "all volumes are 3D");
    log.info("calculated NeuralNet candle hypothesis:");
    log.info("meanAlpha:" + meanAlpha);
    log.info('==================================================================');sequence();
  },
  end : function() {log.info('THE END');}
};
module.exports = method;
