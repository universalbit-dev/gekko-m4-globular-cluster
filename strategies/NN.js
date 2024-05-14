const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var util= require('../core/util.js')
var config = require('../core/util.js').getConfig();
const _ = require('../core/lodash');
//https://cs.stanford.edu/people/karpathy/convnetjs/started.html
var convnetjs = require('../core/convnet.js');
var deepqlearn= require('../core/deepqlearn');
var math = require('mathjs');var uuid = require('uuid');
var fs = require('node:fs');
var settings = config.NN;this.settings=settings;
var stoploss= require('./indicators/StopLoss.js');

var async = require('async');
var sleep = ms => new Promise(r => setTimeout(r, ms));
async function wait() {
  console.log('keep calm...');await sleep(2000);
  console.log('...make something of amazing');await sleep(200000);
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
    this.addTulipIndicator('dema', 'dema', {optInTimePeriod:1});
    //RSI
    this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod:21});

    this.name = 'NN';
    this.nn = new convnetjs.Net();
    //https://stanford.edu/~shervine/teaching/cs-230/cheatsheet-convolutional-neural-networks#
    var x= Math.floor((Math.random() * 100) + 1);
    var y=Math.floor((Math.random() * 100) * 10);
    var z=Math.floor((Math.random() * 100) + 1);
    console.debug('\t\t\t\tNeuralNet Layer' + '\tINPUT:'+ x + "\tHIDE:" + y + "\tOUT:" + z);
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
        learning_rate: 0.01,
        momentum: 0.9,
        batch_size:8,
        l2_decay: 0.001,
        l1_decay: 0.001
      });
    }
    else if(this.settings.method == 'adadelta')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        method: 'adadelta',
        learning_rate: 0.01,
        eps: 1e-6,
        ro:0.95,
        batch_size:1,
        l2_decay: 0.001
      });
    }
    else if(this.settings.method == 'adagrad')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        method: 'adagrad',
        learning_rate: 0.01,
        eps: 1e-6,
        batch_size:8,
        l2_decay: 0.001
      });
    }
    else if(this.settings.method == 'nesterov')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        method: 'nesterov',
        learning_rate: 0.01,
        momentum: 0.9,
        batch_size:8,
        l2_decay: 0.001
      });
    }
    else if(this.settings.method == 'windowgrad')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        method: 'windowgrad',
        learning_rate: 0.01,
        eps: 1e-6,
        ro:0.95,
        batch_size:8,
        l2_decay: 0.001
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

    this.hodl_threshold = 1 || 1;
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

  if(_.size(this.priceBuffer) > 987)
  // remove oldest priceBuffer value
  this.priceBuffer.shift();
    dema=this.tulipIndicators.dema.result.result;
    if (1 === 1 && 1 < candle.high && 0 === this.predictionCount)
    this.setNormalizeFactor();
    this.priceBuffer.push(dema / 1 );
    if (2 > _.size(this.priceBuffer)) return;
    for (i=0;i<3;++i)this.learn();
    while ( 987 < _.size(this.priceBuffer))this.priceBuffer.shift();

    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
  	candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {if (err) {return console.log(err);}});

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

		if(this.trend.duration >= 6)this.trend.persisted = true;

		if(this.trend.persisted && !this.trend.adviced && this.stochRSI !=100)
		{this.trend.adviced = true;}
		else{this.advice();}

	} else if(this.stochRSI < 30) {

		// new trend detected
		if(this.trend.direction !== 'low')
		this.trend = {duration: 0,persisted: false,direction: 'low',adviced: false};
		this.trend.duration++;

		log.debug('In low since', this.trend.duration, 'candle(s)');
		if(this.trend.duration >= 6){this.trend.persisted = true;}
		if(this.trend.persisted && !this.trend.adviced && this.stochRSI != 0)
		{this.trend.adviced = true;}
		else {this.advice();}

	} else {
		// trends must be on consecutive candles
		this.trend.duration = 0;
		log.debug('In no trend');this.advice();
	}

    if(this.predictionCount > 377)
    {
      var prediction = this.predictCandle() * 1;
      var currentPrice = candle.close;
      var meanp = math.mean(prediction, currentPrice);
      //when alpha is the "excess" return over an index, what index are you using?
      var meanAlpha = (meanp - currentPrice) / currentPrice * 100;
      var signalSell = candle.close > this.prevPrice || candle.close < (this.prevPrice * 1);
      var signal = meanp < currentPrice;
    }
    if ((this.trend.adviced && this.stochRSI != 0 && 'buy' !== this.prevAction)&& ('buy' !== this.prevAction && signal === false  && meanAlpha > 1))
    {this.advice('short');wait();}
    if ((this.trend.adviced && this.stochRSI != 100 &&'sell' !== this.prevAction)&&
    ('sell' !== this.prevAction && signal === true && meanAlpha < -1  && signalSell === true))
    {this.advice('long');wait();}

//stoploss as Reinforcement Learning
    if ('stoploss' === this.indicators.stoploss.action)
    {
    this.stoplossCounter++;log.info(':',this.indicators.stoploss.action);
    this.brain();this.prevAction='sell';signal=false;
    }

  },

  end : function() {log.info('THE END');}
};
module.exports = method;
