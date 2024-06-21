require('../core/tulind');
const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
const _ = require('../core/lodash');
const fs = require('node:fs');
var math = require('mathjs');
var async = require('async');

var settings = config.CCI;this.settings=settings;
var stoploss= require('./indicators/StopLoss.js');

var convnetjs = require('../core/convnet.js');
var deepqlearn= require('../core/deepqlearn');

var async = require('async');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait() {console.log('keep calm and make something of amazing');await sleep(60000);};

var method = {
  priceBuffer : [],
  predictionCount : 0,
  stoplossCounter : 0,
  prevPrice : 0,
  prevAction : 'none',
  hodl_threshold : 1,


init : function() {
  this.requiredHistory = this.settings.historySize;
  this.RSIhistory = [];
  log.info('================================================');
  log.info('keep calm and make somethig of amazing');
  log.info('================================================');
  this.name = 'NNCCI';
  this.currentTrend;
  this.age = 0;
  //Date
  startTime = new Date();
  //Info Messages

  log.info('Running', this.name);
  this.trend = {
    direction: 'undefined',
    duration: 0,
    persisted: false,
    adviced: false
  };

  this.ppoadv = 'none';
  this.uplevel = 150;
  this.downlevel = -30;
  this.persisted = 5;
  //CCI
  this.addTulipIndicator('cci', 'cci', {optInTimePeriod: 21 });
  //DEMA
  this.addTulipIndicator('dema', 'dema', {optInTimePeriod: 1 });
  
  this.nn = new convnetjs.Net();
//https://stanford.edu/~shervine/teaching/cs-230/cheatsheet-convolutional-neural-networks#
    var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
    var x = 1;
    x = fibonacci_sequence[x];this.x=x;
    var y = 1;
    y = fibonacci_sequence[y];this.y=y;
    var z = Math.floor(Math.random() * fibonacci_sequence.length);
    z = fibonacci_sequence[z];this.z=z;
    console.debug('\t\t\t\tNeuralNet Layer' + '\tINPUT:'+ x + "\tHIDE:" + y + "\tOUT:" + z);

const layers = [
{type:'input', out_sx:x, out_sy:y, out_depth:z},
{type:'conv', num_neurons:8, activation: 'relu'},
{type:'fc', num_neurons:8, activation:'sigmoid'},
{type:'regression', num_neurons:1}
//https://cs.stanford.edu/people/karpathy/convnetjs/demo/regression.html
];

this.nn.makeLayers(layers);

switch(this.settings.method != undefined) {
case(this.settings.method == 'sgd'):
{this.trainer = new convnetjs.SGDTrainer(this.nn, {method: 'sgd',learning_rate: 0.01,momentum: 0.9,batch_size:8,l2_decay: 0.001,l1_decay: 0.001});}
case(this.settings.method == 'adadelta'):
{this.trainer = new convnetjs.Trainer(this.nn, {method: 'adadelta',learning_rate: 0.01,eps: 1e-6,ro:0.95,batch_size:1,l2_decay: 0.001});}
case(this.settings.method == 'nesterov'):
{this.trainer = new convnetjs.Trainer(this.nn, {method: 'nesterov',learning_rate: 0.01,momentum: 0.9,batch_size:8,l2_decay: 0.001});}
case(this.settings.method == 'windowgrad'):
{this.trainer = new convnetjs.Trainer(this.nn, {method: 'windowgrad',learning_rate: 0.01,eps: 1e-6,ro:0.95,batch_size:8,l2_decay: 0.001});}

//https://cs.stanford.edu/people/karpathy/convnetjs/demo/trainers.html
case(this.settings.method == 'alltrainers'):
{
  this.trainer_sgd = new convnetjs.SGDTrainer(this.nn, {method: 'sgd',learning_rate: 0.01,eps: 1e-6,ro:0.95,batch_size:1,l2_decay: 0.001});
  this.trainer_adadelta = new convnetjs.Trainer(this.nn, {method: 'adadelta',learning_rate: 0.01,eps: 1e-6,ro:0.95,batch_size:1,l2_decay: 0.001});
  this.trainer_nesterov = new convnetjs.Trainer(this.nn, {method: 'nesterov',learning_rate: 0.01,momentum: 0.9,batch_size:8,l2_decay: 0.001});
  this.trainer_windowgrad = new convnetjs.Trainer(this.nn, {method: 'windowgrad',learning_rate: 0.01,eps: 1e-6,ro:0.95,batch_size:8,l2_decay: 0.001});
}
default:
{this.trainer_adadelta = new convnetjs.Trainer(this.nn, {method: 'adadelta',learning_rate: 0.01,momentum: 0.0,batch_size:1,eps: 1e-6,ro:0.95,l2_decay: 0.001,l1_decay: 0.001});}

}
  this.hodl_threshold = 1 || 1;

},

  learn : function () {
    for (var i = 0; i < _.size(this.priceBuffer) - 1; i++) {
      var data = [this.priceBuffer[i]];
      var current_price = [this.priceBuffer[i + 1]];
      var vol = new convnetjs.Vol(data);
      this.trainer_sgd.train(vol, current_price);
      this.trainer_adadelta.train(vol, current_price);
      this.trainer_windowgrad.train(vol, current_price);
      this.trainer_nesterov.train(vol, current_price);
      this.predictionCount++;
    }
  },
  setNormalizeFactor : function() {
    this.settings.scale = Math.pow(10,Math.trunc(candle.high).toString().length+2);
    log.debug('Set normalization factor to',1);
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
    brain.backward([reward]); // <== learning magic happens here
    state[Math.floor(Math.random()*3)] += Math.random()*2-0.5;
    }
    brain.epsilon_test_time = 0.0;
    brain.learning = true;
  },



update : function(candle) {
if(_.size(this.priceBuffer) > this.settings.price_buffer_len)
  //remove oldest priceBuffer value
  this.priceBuffer.shift();
    dema=this.tulipIndicators.dema.result.result;
    if (1 === this.settings.scale && 1 < candle.high && 0 === this.predictionCount)
    this.setNormalizeFactor();this.priceBuffer.push(dema / this.settings.scale );
    if (2 > _.size(this.priceBuffer)) return;
    for (i=0;i<3;++i)
    this.learn();this.brain();
    while (this.settings.price_buffer_len < _.size(this.priceBuffer))this.priceBuffer.shift();

//general purpose log  {data}
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
  	candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n",
  	function(err) {if (err) {return console.log(err);}});
},

makeoperators:function() {
var operator = ['==','===','!=','&&','<=','>=','>','<','||','='];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
},

predictCandle : function(candle) {
    var vol = new convnetjs.Vol(this.priceBuffer);
    var prediction = this.nn.forward(vol);
    return prediction.w[0];
  },
  


check : function(candle) {
    var lastPrice = candle.close;this.age++;
    var cci = this.tulipIndicators.cci.result.result;

    if(this.predictionCount > this.settings.min_predictions)
    {
      var prediction = this.predictCandle() * this.settings.scale;
      var currentPrice = candle.close;
      var meanp = math.mean(prediction, currentPrice);
      //when alpha is the "excess" return over an index, what index are you using?
      var meanAlpha = (meanp - currentPrice) / currentPrice * 10;
      var signalSell = (candle.close > this.prevPrice) || (candle.close <
      (this.prevPrice * this.settings.hodl_threshold));
      var signal = meanp < currentPrice;
    }

if (cci >= this.uplevel && (this.trend.persisted || this.persisted == 0) && !this.trend.adviced && this.trend.direction ==  'overbought' && 
   ('buy' !== this.prevAction && signal === true && meanAlpha < -1 && signalSell === true)) 
{this.trend.adviced = true;this.trend.duration++;this.advice('short');this.makeoperators();wait();}
else if (cci <= this.downlevel && (this.trend.persisted || this.persisted == 0) && !this.trend.adviced && this.trend.direction == 'oversold' && ('sell' !== this.prevAction && signal === false  && meanAlpha > 1)) 
{this.trend.adviced = true;this.trend.duration++;this.advice('long');this.makeoperators();wait();}


switch(cci >= this.uplevel) {
  case (this.trend.direction != 'overbought' && ('buy' !== this.prevAction && signal === true && meanAlpha < -1 && signalSell === true)) :
  {this.trend.duration = 5;this.trend.direction = 'overbought';this.trend.persisted = false;this.trend.adviced = false;}break;
  case (this.persisted == 0) : 
  {this.trend.adviced = true;this.advice('short');this.makeoperators();wait();}break;
  default:
  {this.trend.duration++;this.trend.duration >= this.persisted,this.trend.persisted = true;}
} 

switch(cci <= this.downlevel) {
  case (cci <= this.downlevel && this.trend.direction != 'oversold' && ('sell' !== this.prevAction && signal === false  && meanAlpha > 1)) :
  {this.trend.duration = 1;this.trend.direction = 'oversold';this.trend.persisted = false;this.trend.adviced = false;}break;
  case (this.persisted == 0) : 
  {this.trend.adviced = true;this.advice('long');this.makeoperators();wait();}break;
  default:
  {this.trend.duration++;}
} 

switch (this.trend.duration >= this.persisted){
  case (this.trend.direction != 'nodirection'):
  {this.trend = {direction: 'nodirection',duration: 0,persisted: false,adviced: false};}break;
  default:
  {this.trend.duration++;}
}

    log.info('calculated CCI properties for candle:');
    log.info("Trend: ", this.trend.direction, " for ", this.trend.duration);
    log.info('Price:', candle.close);
    log.info('CCI:', cci);
    log.info("NeuralNet layer: " + this.x +" x "+ this.y +" x "+ this.z + " "+ "all volumes are 3D");
    log.info("calculated NeuralNet candle hypothesis:");
    log.info("meanAlpha:" + meanAlpha);
    log.info('==================================================================');
},

end : function() {log.info('THE END');}
};
module.exports = method;
