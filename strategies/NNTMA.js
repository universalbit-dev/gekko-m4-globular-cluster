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
var settings = config.NNTMA;this.settings=settings;
var stoploss=require('./indicators/StopLoss');
var signal=false;
var method = {
  priceBuffer : [],
  predictionCount : 0,
  stoplossCounter : 0,
  prevPrice : 0,
  prevAction : 'none',
  hodl_threshold : 1,
init : function() {
  this.requiredHistory = config.tradingAdvisor.historySize;
  log.info('================================================');
  log.info('keep calm and make somethig of amazing');
  log.info('================================================');
  this.resetTrend();
//https://github.com/universalbit-dev/gekko-m4/blob/master/docs/strategies/tulip_indicators.md
    this.addTulipIndicator('tema', 'tema', {optInTimePeriod:1});
    this.addTulipIndicator('short', 'ema', {optInTimePeriod:this.settings.short});
    this.addTulipIndicator('long', 'ema', {optInTimePeriod:this.settings.long});
    this.addTulipIndicator('medium', 'dema', {optInTimePeriod:this.settings.medium});
    this.addIndicator('stoploss', 'StopLoss', {threshold : this.settings.stoploss});

    startTime = new Date();
    this.name = 'NNTMA';
    this.requiredHistory = this.settings.historySize;
    this.nn = new convnetjs.Net();

    //https://cs.stanford.edu/people/karpathy/convnetjs/demo/regression.html
    var x=Math.floor((Math.random() * 100) + 1);
    var y=Math.floor((Math.random() * 100) * 100);
    var z=Math.floor((Math.random() * 100) + 1);

const layers = [
  {type:'input', out_sx:x, out_sy:y, out_depth:z},
  {type:'conv', num_neurons:233, activation: 'relu'},
  {type:'fc', num_neurons:233, activation:'sigmoid'},
  {type:'regression', num_neurons:1}
];

this.nn.makeLayers(layers);

if(this.settings.method == 'sgd')
{
  this.trainer = new convnetjs.SGDTrainer(this.nn, {
    learning_rate: this.settings.learning_rate,
    momentum: 0.9,batch_size:8,
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
    eps: 1e-6,batch_size:8,
    l2_decay: this.settings.l2_decay
  });
}

else if(this.settings.method == 'nesterov')
{
  this.trainer = new convnetjs.SGDTrainer(this.nn, {
    method: this.settings.method,
    learning_rate: this.settings.learning_rate,
    momentum: 0.9,batch_size:8,
    l2_decay: this.settings.l2_decay
  });
}

else if(this.settings.method == 'windowgrad')
{
  this.trainer = new convnetjs.SGDTrainer(this.nn, {
    method: this.settings.method,
    learning_rate: this.settings.learning_rate,
    eps: 1e-6,ro:0.95,batch_size:8,
    l2_decay: this.settings.l2_decay
  });
}

else
{
  this.trainer = new convnetjs.Trainer(this.nn, {
    method: 'adadelta',
    learning_rate: 0.01,
    momentum: 0.0,
    batch_size:1,eps: 1e-6,ro:0.95,
    l2_decay: 0.001,l1_decay: 0.001
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
brain:function(){
  var brain = new deepqlearn.Brain(this.x, this.z);
  var state = [Math.random(), Math.random(), Math.random()];
  for(var k=0;k < _.size(this.priceBuffer) - 1;k++)
  {
    var action = brain.forward(state); //returns index of chosen action
    var reward = action === 0 ? 1.0 : 0.0;
    brain.backward([reward]); // <-- learning magic happens here
    state[Math.floor(Math.random()*3)] += Math.random()*2-0.5;
  }
  brain.epsilon_test_time = 0.0;//don't make any more random choices
  brain.learning = false;//
},

update : function(candle)
{
  long=this.tulipIndicators.long.result.result;
  short=this.tulipIndicators.short.result.result;
  medium=this.tulipIndicators.short.result.result;
  tema=this.tulipIndicators.tema.result.result;

  if(_.size(this.priceBuffer) > this.settings.price_buffer_len)
  //remove oldest priceBuffer Value
  this.priceBuffer.shift();
  if (1 === this.settings.scale && 1 < candle.high && 0 === this.predictionCount)
  this.setNormalizeFactor();
  this.priceBuffer.push(tema / this.settings.scale );
  if (2 > _.size(this.priceBuffer)) return;

  for (i=0;i<3;++i)this.learn();this.brain();
  while (this.settings.price_buffer_len < _.size(this.priceBuffer))
  this.priceBuffer.shift();

//log book
fs.appendFile('logs/csv/'
+ config.watch.asset + ':'
+ config.watch.currency + '_' + this.name + '_'
+ startTime + '.csv',candle.start
+ "," + candle.open + "," + candle.high + "," + candle.low + ","
+ candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n",
function(err) {if (err) {return console.log(err);}}
);

//stoploss as Reinforcement Learning
if ('stoploss' === this.indicators.stoploss.action)
{log.info('Reinforcement Learning');this.brain();this.prevAction='sell';signal=false;}

},

predictCandle : function() {
  let vol = new convnetjs.Vol(this.priceBuffer);
  let prediction = this.nn.forward(vol);
  return prediction.w[0];
},

wait :async function() {
  console.log('keep calm...');await new Promise(r => setTimeout(r, 1800000));//30'minutes'
  console.log('...make something of amazing');
  for (let i = 0; i < 3; i++){if (i === 3) await new Promise(r => setTimeout(r, 600000));}
},

resetTrend: function()
 {var trend = {duration: 0,direction: 'none'};this.trend = trend;},

check : function(candle) {
  //https://github.com/universalbit-dev/gekko-m4/blob/master/docs/strategies/tulip_indicators.md
  tema=this.tulipIndicators.tema.result.result;
  short = this.tulipIndicators.short.result.result;
  long = this.tulipIndicators.long.result.result;
  medium=this.tulipIndicators.medium.result.result;
  var lastPrice = candle.close;this.age++;

  if(this.predictionCount > this.settings.min_predictions)
  {
    var prediction = this.predictCandle() * this.settings.scale;
    var currentPrice = candle.open;
    var meanp = math.mean(prediction, currentPrice);
    //when alpha is the "excess" return over an index, what index are you using?
    var meanAlpha = (meanp - currentPrice) / currentPrice * 100;
    var signalSell = (candle.close > this.prevPrice) || (candle.close < (this.prevPrice * this.settings.hodl_threshold));
    var signal = meanp < currentPrice;
  }

switch (long != undefined)
{
  case((short < medium)&&(medium < long) && ('buy' !== this.prevAction && signal === false  && meanAlpha > this.settings.threshold_buy)):
  this.long();break;
  case((short > medium)&&(medium > long) && ('sell' !== this.prevAction && signal === true && meanAlpha < this.settings.threshold_sell && signalSell === true)):
  this.short();break;
  default : {log.info('...wait data');}
}

  log.info('calculated TMA properties for candle:');
  log.info("TMA long:\t\t" + long);
  log.info("TMA short:\t\t" + short);
  log.info('Direction:\t\t' + this.trend.direction);
  log.info("calculated NeuralNet candle hypothesis:");
  log.info("meanAlpha:" + meanAlpha);
  log.info('===========================================');
},

 long: function()
 {if(long != undefined){this.trend.direction = 'up';this.advice('long');this.wait();this.trend.duration++;}},
 short: function()
 {if(short != undefined){ this.trend.direction = 'down';this.advice('short');this.wait();this.trend.duration++;}},
 end : function() {log.info('THE END');}
};
module.exports = method;
