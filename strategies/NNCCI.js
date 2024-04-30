const { spawn } = require('node:child_process');
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
const _ = require('../core/lodash');
const fs = require('node:fs');
var math = require('mathjs');
var async = require('async');

var settings = config.CCI;this.settings=settings;

var convnetjs = require('../core/convnet.js');
var deepqlearn= require('../core/deepqlearn');

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wait() {
  console.log('keep calm...');await sleep(200000);
  console.log('...make something of amazing');
  for (let i = 0; i < 5; i++)
  {if (i === 3) await sleep(2000);}
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
  this.uplevel = this.settings.thresholds.up;
  this.downlevel = this.settings.thresholds.down;
  this.persisted = this.settings.thresholds.persistence;
  //CCI
  this.addTulipIndicator('cci', 'cci', {optInTimePeriod: 13 });
  //DEMA
  this.addTulipIndicator('dema', 'dema', {optInTimePeriod: 1 });

  this.nn = new convnetjs.Net();
  //https://cs.stanford.edu/people/karpathy/convnetjs/demo/regression.html
    var x= Math.floor((Math.random() * 100) + 1);
    var y=Math.floor((Math.random() * 100) + 10);
    var z=Math.floor((Math.random() * 100) + 1);
    const layers = [
      {type:'input', out_sx:this.x, out_sy:this.y, out_depth:this.z},
      {type:'conv', num_neurons:144, activation: 'relu'},
      {type:'fc', num_neurons:144, activation:'sigmoid'},
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
  resetnet: function(){this.nn = new convnetjs.Net();},

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
  var action = brain.forward(this.priceBuffer);
  if (brain.backward([reward]) != undefined){log.info(brain.backward([reward]));}
  },

update : function(candle) {
if(_.size(this.priceBuffer) > this.settings.price_buffer_len)
  //remove oldest priceBuffer value
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

  log : function(candle) {
    var cci = this.tulipIndicators.cci.result.result;
    if (typeof(cci) == 'boolean') {
        log.debug('Insufficient data available. Age: ', cci.size, ' of ', cci.maxSize);
        return;
    }

    if (typeof(cci) == 'boolean' )log.debug('\t In sufficient data available.');


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
      var meanAlpha = (meanp - currentPrice) / currentPrice * 100;
      var signalSell = (candle.close > this.prevPrice) || (candle.close <
      (this.prevPrice * this.settings.hodl_threshold));
      var signal = meanp < currentPrice;

    }


    if (typeof(cci) == 'number') {
    //overbought?
    if (cci >= this.uplevel && (this.trend.persisted || this.persisted == 0) && !this.trend.adviced && this.trend.direction ==  'overbought' && ('sell' !== this.prevAction && signal === true && meanAlpha < this.settings.threshold_sell && signalSell === true))
    {
            this.trend.adviced = true;
            this.trend.duration++;
            this.advice('short');wait();
    }
        else if (cci >= this.uplevel && this.trend.direction != 'overbought' && ('sell' !== this.prevAction &&
  signal === true && meanAlpha < this.settings.threshold_sell && signalSell === true)) {
            this.trend.duration = 1;
            this.trend.direction = 'overbought';
            this.trend.persisted = false;
            this.trend.adviced = false;
            if (this.persisted == 0) {
                this.trend.adviced = true;
                this.advice('short');wait();
            }
        }
        else if (cci >= this.uplevel) {
            this.trend.duration++;
            if (this.trend.duration >= this.persisted) {
                this.trend.persisted = true;
            }
        }
        else if (cci <= this.downlevel && (this.trend.persisted || this.persisted == 0) && !this.trend.adviced && this.trend.direction == 'oversold' && ('buy' !== this.prevAction &&
  signal === false  && meanAlpha > this.settings.threshold_buy)) {
            this.trend.adviced = true;
            this.trend.duration++;
            this.advice('long');wait();
        }
        else if (cci <= this.downlevel && this.trend.direction != 'oversold' && ('buy' !== this.prevAction &&
  signal === false  && meanAlpha > this.settings.threshold_buy)) {
            this.trend.duration = 1;
            this.trend.direction = 'oversold';
            this.trend.persisted = false;
            this.trend.adviced = false;
            if (this.persisted == 0) {
                this.trend.adviced = true;
                this.advice('long');wait();
            }
        }
        else if (cci <= this.downlevel) {
            this.trend.duration++;
            if (this.trend.duration >= this.persisted) {
                this.trend.persisted = true;
            }
        }
        else
        {
            if( this.trend.direction != 'nodirection')
            {this.trend = {direction: 'nodirection',duration: 0,persisted: false,adviced: false};}
            else {this.trend.duration++;}
            this.advice();
        }

    } else {this.advice();}

    log.info('===========================================');
    log.info('calculated CCI properties for candle:');
    log.info("Trend:\t\t", this.trend.direction, " for ", this.trend.duration);
    log.info('Price:\t\t', candle.close);
    log.info('CCI:\t\t', cci);
    log.info("calculated NeuralNet candle hypothesis:");
    log.info('meanAlpha:\t',meanAlpha);

},
end : function() {log.info('THE END');}
};
module.exports = method;
