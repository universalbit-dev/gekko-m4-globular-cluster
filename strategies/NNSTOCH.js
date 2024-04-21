/* */
const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var util= require('../core/util.js')
var config = require('../core/util.js').getConfig();
var tulind = require('../core/tulind');
const _ = require('../core/lodash');

//https://cs.stanford.edu/people/karpathy/convnetjs/started.html
var convnetjs = require('../core/convnet.js');
var deepqlearn= require('../core/deepqlearn');
var math = require('mathjs');
var fs = require('node:fs');
var settings = config.NNSTOCH;this.settings=settings;
var stoploss=require('./indicators/StopLoss');

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wait() {
  console.log('keep calm...');await sleep(2000);
  console.log('...make something of amazing');
  for (let i = 0; i < 5; i++) 
  {if (i === 3) await sleep(200000);}
};

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

    this.trend = {
    direction: 'none',
    duration: 0,
    persisted: false,
    adviced: false
  };
    //Date
    startTime = new Date();
    //indicators
    this.addIndicator('stoploss', 'StopLoss', {threshold : 3});
    //DEMA
    this.addTulipIndicator('emaFast', 'dema', {optInTimePeriod:1});
    //RSI
    this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod:5});
    
    this.requiredHistory = this.settings.historySize;
    this.name = 'NNSTOCH';
    this.nn = new convnetjs.Net();
    //https://cs.stanford.edu/people/karpathy/convnetjs/demo/regression.html
    const layers = [
      {type:'input', out_sx: 1, out_sy:1, out_depth: 1},
      {type:'fc', num_neurons:100, activation: 'relu'},
      {type:'fc', num_neurons:100, activation:'sigmoid'},
      {type:'regression', num_neurons:1}
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

  resetnet: function(){
  this.nn = new convnetjs.Net();
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
  var brain = new deepqlearn.Brain(1, 1);
  var state = [Math.random(), Math.random(), Math.random()];
  for(var k=0;k < _.size(this.priceBuffer) - 1;k++)
  {
    var action = brain.forward(state); //returns index of chosen action
    var reward = action === 0 ? 1.0 : -1.0;
    brain.backward([reward]); // <-- learning magic happens here
    state[Math.floor(Math.random()*3)] += Math.random()*2-0.5;
  }
  brain.epsilon_test_time = 0.0;//don't make any more random choices
  brain.learning = true;

  var action = brain.forward([this.priceBuffer[k + 1]]);
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

  if(_.size(this.priceBuffer) > this.settings.price_buffer_len)
  //remove oldest priceBuffer value
  this.priceBuffer.shift();
    emaFast=this.tulipIndicators.emaFast.result.result;
    if (1 === this.settings.scale && 1 < candle.high && 0 === this.predictionCount)
    this.setNormalizeFactor();
    this.priceBuffer.push(emaFast / this.settings.scale );
    if (2 > _.size(this.priceBuffer)) return;
     for (i=0;i<3;++i)
     this.learn();this.brain();
     while (this.settings.price_buffer_len < _.size(this.priceBuffer))
     this.priceBuffer.shift();
//log book
    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
  	candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
  	if (err) {return console.log(err);}
  	});
  },

  predictCandle : function(candle) {
    var vol = new convnetjs.Vol(this.priceBuffer);
    var prediction = this.nn.forward(vol);
    return prediction.w[0];
  },
  //https://www.investopedia.com/articles/investing/092115/alpha-and-beta-beginners.asp
  check :function(candle){

    emaFast=this.tulipIndicators.emaFast.result.result;
    rsi=this.tulipIndicators.rsi.result.result;

    switch (true)
    {
    case((this.trend.duration >= this.settings.thresholds.persistence)):
    this.trend.persisted = true;
    case (this.trend.persisted && !this.trend.adviced && this.stochRSI !=100):
    this.trend.adviced = true;
    case (this.stochRSI > 70):
    this.trend = {duration: this.trend.duration,persisted: this.trend.persisted,direction:'high',adviced: this.trend.adviced};
    this.trend.duration++;
    log.debug('\t','In high since',this.trend.duration,'candle(s)');break;
	default:
	this.advice();
    this.trend = {duration: 0,persisted: false,direction: 'none',adviced: false};
	}

	switch (true){
	case(this.trend.duration >= this.settings.thresholds.persistence):
	this.trend.persisted = true;
	case(this.trend.persisted && !this.trend.adviced && this.stochRSI != 0):
	this.trend.adviced = true;
	case(this.stochRSI < 30):
	this.trend = {duration: this.trend.duration,persisted: this.trend.persisted,direction:
	'low',adviced:this.trend.adviced};
	this.trend.duration++;
	log.debug('\t','In low since',this.trend.duration,'candle(s)');break;
	default:
	this.advice();
	this.trend = {duration: 0,persisted: false,direction: 'none',adviced: false};
	}
	
	if(this.predictionCount > this.settings.min_predictions)
    {
      var prediction = this.predictCandle() * this.settings.scale;
      var currentPrice = candle.close;
      var meanp = math.mean(prediction, currentPrice);
      //when alpha is the "excess" return over an index, what index are you using?
      var meanAlpha = (meanp - currentPrice) / currentPrice * 100;
      var signalSell = (candle.close > this.prevPrice) || (candle.close < (this.prevPrice * this.settings.hodl_threshold));
      var signal = meanp < currentPrice; 
    }

    log.info('calculated StochRSI properties for candle:');
    log.info('\t', 'rsi:', rsi);
    log.info("StochRSI min:" + this.lowestRSI);
    log.info("StochRSI max:" + this.highestRSI);
    log.info("StochRSI Value:" + this.stochRSI);
    log.info("calculated NeuralNet candle prediction:");
    log.info('meanAlpha:',meanAlpha);
    log.info('===========================================');

    if ((this.trend.persisted && this.stochRSI != 0 )&&
    ('buy' !== this.prevAction && signal === false   && 
    meanAlpha > this.settings.threshold_buy))
    {
    this.advice('long');wait();this.brain();
    this.trend = {duration: 0,persisted: false,direction: 'none',adviced: false};
    }

    if ((this.trend.persisted && this.stochRSI != 100)&&
    ('sell' !== this.prevAction &&  signal === true && 
    meanAlpha < this.settings.threshold_sell && signalSell === true)) 
    
    {
    this.advice('short');wait();this.brain();
    this.trend = {duration: 0,persisted: false,direction: 'none',adviced: false};
    }
    //stoploss as Reinforcement Learning
    if ('stoploss' === this.indicators.stoploss.action)
    {
    log.info('Reinforcement Learning');this.brain();
    this.prevAction='sell';signal=false;
    }

  },

  end : function() {log.info('THE END');}
};
module.exports = method;
