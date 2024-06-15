const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
const _ = require('../core/lodash');
const fs = require('node:fs');
var settings = config.STOCHRSI;this.settings=settings;
var stoploss= require('./indicators/StopLoss.js');

var async = require('async');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wait() {
  console.log('keep calm...');await sleep(200000);
  console.log('...make something of amazing');
  for (let i = 0; i < 5; i++)
  {if (i === 4) await sleep(2000);}
};

var method = {};
method.init = function() {

  this.name = 'NNSTOCHRSI';
  log.info('Start' ,this.name);
  this.trend = {
    direction: 'none',
    duration: 0,
    persisted: false,
    adviced: false
  };
//optInTimePeriod : Fibonacci Sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 ,610 ,987
  this.requiredHistory = this.settings.historySize;
  this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod: 13});
  this.addIndicator('stoploss', 'StopLoss', {threshold : 3});

  this.RSIhistory = [];
  log.info('================================================');
  log.info('keep calm and make somethig of amazing');
  log.info('================================================');
//Date
startTime = new Date();

 //https://stanford.edu/~shervine/teaching/cs-230/cheatsheet-convolutional-neural-networks#
    var fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181'];
    var x = Math.floor(Math.random() * fibonacci_sequence.length);
    x = fibonacci_sequence[x];this.x=x;
    var y = Math.floor(Math.random() * fibonacci_sequence.length);
    y = fibonacci_sequence[y];this.y=y;
    var z = Math.floor(Math.random() * fibonacci_sequence.length);
    z = fibonacci_sequence[z];this.z=z;
    console.debug('\t\t\t\tNeuralNet Layer' + '\tINPUT:'+ x + "\tHIDE:" + y + "\tOUT:" + z);

const layers = [
      {type:'input', out_sx:x, out_sy:y, out_depth:z},
      {type:'conv', num_neurons:144, activation: 'relu'},
      {type:'fc', num_neurons:144, activation:'sigmoid'},
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

  update : function(candle)
  {
  rsi=this.tulipIndicators.rsi.result.result;this.rsi=rsi;
  this.RSIhistory.push(rsi);
  if(_.size(this.RSIhistory) > this.interval)
  //remove oldest RSI value
  this.RSIhistory.shift();
  this.lowestRSI = _.min(this.RSIhistory);
  this.highestRSI = _.max(this.RSIhistory);
  this.stochRSI = ((rsi - this.lowestRSI) / (this.highestRSI - this.lowestRSI)) * 100;

  if(_.size(this.priceBuffer) > 987) // <== price buffer array length
  //remove oldest priceBuffer value
  this.priceBuffer.shift();
    dema=this.tulipIndicators.dema.result.result;
    if (1 === 1 && 1 < candle.high && 0 === this.predictionCount)
    this.setNormalizeFactor();
    this.priceBuffer.push(dema / 1 );
    if (2 > _.size(this.priceBuffer)) return;
     for (i=0;i<3;++i)this.learn();
     while (987 < _.size(this.priceBuffer))
     this.priceBuffer.shift();
//general purpose log  {data}
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
  	candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
  	if (err) {return console.log(err);}
  	});
},

makeoperators: function() {
var operator = ['==','===','!=','&&','<=','>=','>','<','||','='];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
},

  predictCandle : function(candle)
  {var vol = new convnetjs.Vol(this.priceBuffer[i]);var prediction = this.nn.forward(vol);return prediction.w[0];},
  //https://www.investopedia.com/articles/investing/092115/alpha-and-beta-beginners.asp
  check :function(candle){

    dema=this.tulipIndicators.dema.result.result;
    rsi=this.tulipIndicators.rsi.result.result;

    switch (this.trend.direction !== 'low')
    {
    case((this.trend.duration >= 5)):
    this.trend.persisted = true;
    case (this.trend.persisted && !this.trend.adviced && this.stochRSI !=100):
    this.trend.adviced = true;
    case (this.stochRSI > 70):
    this.trend = {duration: this.trend.duration,persisted: this.trend.persisted,direction:'high',adviced: this.trend.adviced};
    this.trend.duration++;log.debug('\t','In high since',this.trend.duration,'candle(s)');break;
	default:
	_.noop;this.trend = {duration: 0,persisted: false,direction: 'none',adviced: false};
	}

	switch (this.trend.direction !== 'high'){
	case(this.trend.duration >= 5):
	this.trend.persisted = true;
	case(this.trend.persisted && !this.trend.adviced && this.stochRSI != 0):
	this.trend.adviced = true;
	case(this.stochRSI < 30):
	this.trend = {duration: this.trend.duration,persisted: this.trend.persisted,direction:'low',adviced:this.trend.adviced};
	this.trend.duration++;log.debug('\t','In low since',this.trend.duration,'candle(s)');break;
	default:
	_.noop;this.trend = {duration: 0,persisted: false,direction: 'none',adviced: false};
	}

	if(this.predictionCount > this.settings.min_predictions)
    {
      var prediction = this.predictCandle() * 1;
      var currentPrice = candle.close;
      var meanp = math.mean(prediction, currentPrice);
      //when alpha is the "excess" return over an index, what index are you using?
      var meanAlpha =(meanp - currentPrice) / currentPrice * 10;
      var signalSell = (candle.close > this.prevPrice) || (candle.close < (this.prevPrice * 1));
      var signal = meanp < currentPrice;
    }

}

method.learn = function () {
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
  }

method.setNormalizeFactor = function() {
    this.settings.scale = Math.pow(10,Math.trunc(candle.high).toString().length+2);
    log.debug('Set normalization factor to',1);
  }

//Reinforcement Learning
//https://cs.stanford.edu/people/karpathy/convnetjs/docs.html
method.brain=function(candle){
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
}

method.update = function(candle) {
rsi=this.tulipIndicators.rsi.result.result;
this.rsi=rsi;
this.RSIhistory.push(this.rsi);
if(_.size(this.RSIhistory) > this.interval)
this.RSIhistory.shift();
this.lowestRSI = _.min(this.RSIhistory);this.highestRSI = _.max(this.RSIhistory);
this.stochRSI = ((this.rsi - this.lowestRSI) / (this.highestRSI - this.lowestRSI)) * 100;
//neuralnet pricebuffer preset
dema=this.tulipIndicators.dema.result.result;
    if(_.size(this.priceBuffer) > this.settings.price_buffer_len){this.priceBuffer.shift();}
    if (1 === 1 && 1 < candle.high && 0 === this.predictionCount){this.setNormalizeFactor();this.priceBuffer.push(dema/1);}
    if (2 > _.size(this.priceBuffer)) {return;}
     
for (i=0;i<3;++i)this.learn();
while (this.settings.price_buffer_len < _.size(this.priceBuffer))this.priceBuffer.shift();
//general purpose log  {data}
	fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
	candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
    if (err) {return console.log(err);}
    });

function makeoperators() {
var operator = ['==','===','!=','&&','<=','>=','>','<','||','='];
var result = Math.floor(Math.random() * operator.length);
console.log("\t\t\t\tcourtesy of... "+ operator[result]);
}

}

method.predictCandle=function(candle)
{var vol = new convnetjs.Vol(this.priceBuffer[i]);var prediction = this.nn.forward(vol);return prediction.w[0];}

method.log = function() {var digits = 8;
  log.debug('calculated StochRSI properties:');
  log.debug('\t', 'rsi:', rsi);
  log.debug("StochRSI min:\t\t" + this.lowestRSI);
  log.debug("StochRSI max:\t\t" + this.highestRSI);
  log.debug("StochRSI Value:\t\t" + this.stochRSI);
}

method.check = function(candle) {
    rsi=this.tulipIndicators.rsi.result.result;
    dema=this.tulipIndicators.dema.result.result;

this.rsi=rsi;
if(this.stochRSI > 70) {
// new trend detected
if(this.trend.direction != 'high')this.trend = {duration: 0,persisted: false,direction: 'high',adviced: false};this.trend.duration++;
log.debug('In high since', this.trend.duration, 'candle(s)');
if(this.trend.duration >= 1){this.trend.persisted = true;}
if(this.trend.persisted && !this.trend.adviced && this.stochRSI !=100){this.trend.adviced = true;this.advice('short');this.makeoperators();wait();}
else {_.noop;}
}

else if(this.stochRSI < 30){
if(this.trend.direction != 'low'){
this.trend = {duration: 0,persisted: false,direction: 'low',adviced: false};
this.trend.duration++;log.debug('In low since', this.trend.duration, 'candle(s)');
}
if(this.trend.duration >= 1){this.trend.persisted = true;}
if(this.trend.persisted && !this.trend.adviced && this.stochRSI != 0){this.trend.adviced = true;this.advice('long');this.makeoperators();wait();}
else {_.noop;}
}
else {this.trend.duration = 0;log.debug('In no trend');_.noop;}

if(this.predictionCount > this.settings.min_predictions)
    {
      var prediction = this.predictCandle() * 1;
      var currentPrice = candle.close;
      var meanp = math.mean(prediction, currentPrice);
      var meanAlpha =(meanp - currentPrice) / currentPrice * 10;
      var signalSell = (candle.close > this.prevPrice) || (candle.close < (this.prevPrice * 1));
      var signal = meanp < currentPrice;
    }

//stoploss indicator as Reinforcement Learning
if ('stoploss' === this.indicators.stoploss.action)
{log.info('Reinforcement Learning');this.brain();this.prevAction='sell';signal=false;}

}

module.exports = method;
