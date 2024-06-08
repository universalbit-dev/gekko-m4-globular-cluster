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
var math = require('mathjs');
var fs = require('node:fs');
var settings = config.NNDEMA;this.settings=settings;
var stoploss=require('./indicators/StopLoss');

var async = require('async');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait() {console.log('keep calm and make something of amazing');await sleep(200000);};

var method = {
  priceBuffer : [],
  predictionCount : 0,
  stoplossCounter : 0,
  prevPrice : 0,
  prevAction : 'none',
  hodl_threshold : 1,
init : function() {
    this.requiredHistory = this.settings.historySize;
    log.info('================================================');
    log.info('keep calm and make somethig of amazing');
    log.info('================================================');
    this.name = 'NNDEMA';
//optInTimePeriod : Fibonacci Sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 , 610 , 987 , 1597 , 2584 , 4181
    this.addTulipIndicator('dema', 'dema', {optInTimePeriod:1});
    this.addTulipIndicator('long', 'dema', {optInTimePeriod:144});
    this.addTulipIndicator('short', 'dema', {optInTimePeriod:55});
    this.addTulipIndicator('medium', 'ema',{optInTimePeriod:89});
    //Date
    startTime = new Date();
    log.info('Running', this.name);
    //Indicators
    this.addIndicator('stoploss', 'StopLoss', {threshold : 3});
    this.nn = new convnetjs.Net();
    //https://stanford.edu/~shervine/teaching/cs-230/cheatsheet-convolutional-neural-networks#
    var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
    var x = Math.floor(Math.random() * fibonacci_sequence.length);
    x = fibonacci_sequence[x];this.x=x;
    var y = Math.floor(Math.random() * fibonacci_sequence.length);
    y = fibonacci_sequence[y];this.y=y;
    var z = Math.floor(Math.random() * fibonacci_sequence.length);
    z = fibonacci_sequence[z];this.z=z;
    console.debug('\t\t\t\tNeuralNet Layer: ' + '\tINPUT:'+ x + "\tHIDE:" + y + "\tOUT:" + z);
    
    const layers = [
      {type:'input', out_sx:x, out_sy:y, out_depth:z},
      {type:'conv', num_neurons:144, activation: 'relu'},
      {type:'fc', num_neurons:144, activation:'sigmoid'},
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
    for (var i = 0; i < _.size(this.priceBuffer) - 1; i++) {
      var data = [this.priceBuffer[i]];
      var current_price = [this.priceBuffer[i + 1]];
      var vol = new convnetjs.Vol(data);
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
  
  brain:function(candle){
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
    dema=this.tulipIndicators.dema.result.result;
  
    if(_.size(this.priceBuffer) > this.settings.price_buffer_len)
    //remove oldest priceBuffer value
    this.priceBuffer.shift();
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
  	candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {if (err) {return console.log(err);}});
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

check : function(candle) {
 long=this.tulipIndicators.long.result.result;
 short=this.tulipIndicators.short.result.result;
 medium=this.tulipIndicators.medium.result.result;
 
  var lastPrice = candle.close;this.age++;

  if(this.predictionCount > this.settings.min_predictions)
    {
      var prediction = this.predictCandle() * this.settings.scale;
      var currentPrice = candle.close;
      var meanp = math.mean(prediction, currentPrice);
      //when alpha is the "excess" return over an index, what index are you using?
      var meanAlpha = (meanp - currentPrice) / currentPrice * 10;
      var signalSell = (candle.close > this.prevPrice) || (candle.close < (this.prevPrice * this.settings.hodl_threshold));
      var signal = meanp < currentPrice;
    }

  switch ((long != 'undefined')&&(short != 'undefined')){
//Below-average values --
  case((short < medium)&&(medium < long)&&('buy' !== this.prevAction &&
  signal === false  && meanAlpha > this.settings.threshold_buy)):
  this.advice('sell');this.makeoperators();wait();break;

  case((short > medium)&&(medium < long)&&('sell' !== this.prevAction &&
  signal === true && meanAlpha < this.settings.threshold_sell && signalSell === true)):
  _.noop;this.makeoperators();wait();break;
//Above-average values ++
  case((short > medium)&&(medium > long)&&('sell' !== this.prevAction &&
  signal === true && meanAlpha < this.settings.threshold_sell && signalSell === true)):
  this.advice('buy');this.makeoperators();wait();break;

  default : {log.info('...wait data');}

  }
    log.info('calculated DEMA properties for candle:');
    log.info("DEMA long:\t\t" + long);
    log.info("EMA medium:\t\t" + medium);
    log.info("DEMA short:\t\t" + short);
    log.info("NeuralNet layer: "+ this.x +" x "+ this.y +" x "+ this.z + " " + "all volumes are 3D");
    log.info("calculated NeuralNet candle hypothesis:");
    log.info("meanAlpha:" + meanAlpha);
    log.info('==================================================================');
},
  end : function() {log.info('THE END');}
};
module.exports = method;
