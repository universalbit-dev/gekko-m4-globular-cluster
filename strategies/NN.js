/*NeuralNetwork*/

//https://cs.stanford.edu/people/karpathy/convnetjs/started.html
var convnetjs = require('../core/convnet.js');
var deepqlearn= require('../core/deepqlearn');
var math = require('mathjs');var uuid = require('uuid');
var log = require('../core/log');
var util = require('../core/util');
var fs = require('fs-extra');
var stoploss= require('./indicators/StopLoss.js');

var config= util.getConfig();
var settings = config.NN;
var tulind = require('../core/tulind');
var method = {
  priceBuffer : [],
  predictionCount : 0,
  batch_size : 8,
  num_neurons : 10000,
  layer_activation : 'sigmoid',
  layer_activation2 : 'relu',
  scale : 5,
  prevAction : 'wait',
  prevPrice : 0,
  stoplossCounter : 0,
  stoploss_enabled: true,
  threshold:1,
  threshold_buy:1.0,
  threshold_sell:-1.0,
  hodle_threshold : 1,
  min_predictions:100,

  init : function() {
    log.info('================================================');
    log.info('keep calm and make somethig of amazing');
    log.info('================================================');

    //Date
    startTime = new Date();

    //indicators
    this.addIndicator('stoploss', 'StopLoss', {threshold : this.settings.threshold});
    //DEMA
    this.addTulipIndicator('emaFast', 'dema', {optInTimePeriod:1});
    this.name = 'NN';
    this.nn = new convnetjs.Net();
    const layers = [
      {type:'input', out_sx: 7, out_sy:8, out_depth: 4},
      {type:'conv', num_neurons:10000, activation: this.layer_activation},
      {type:'svm', num_classes:1},
      {type:'regression', num_neurons: 1}
    ];
    const layers2 = [
      {type:'input', out_sx: 7, out_sy:8, out_depth: 4},
      {type:'conv', num_neurons:10000, activation: this.layer_activation2},
      {type:'svm', num_classes:1},
      {type:'regression', num_neurons: 1}
    ];

    this.nn.makeLayers(layers);this.nn.makeLayers(layers2);

    if(this.settings.method == 'sgd')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        learning_rate: this.settings.learning_rate,
        momentum: this.settings.momentum,
        batch_size: this.batchsize,
        l2_decay: this.settings.l2_decay,
        l1_decay: this.settings.l1_decay
      });
    }
    else if(this.settings.method == 'adadelta')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        method: this.settings.method,
        learning_rate: this.settings.learning_rate,
        momentum: this.settings.momentum,
        batch_size: this.batchsize,
        l2_decay: this.settings.l2_decay,
        l1_decay: this.settings.l1_decay
      });
    }
    else
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        method: this.settings.method,
        learning_rate: this.settings.learning_rate,
        momentum: this.settings.momentum,
        batch_size: this.batchsize,
        l2_decay: this.settings.l2_decay,
        l1_decay: this.settings.l1_decay
      });
    }

    this.hodle_threshold = this.settings.hodle_threshold || 1;
  },

  learn : function () {
    for (let i = 0; i < this.priceBuffer.length - 1; i++) {
      let data = [this.priceBuffer[i]];
      let current_price = [this.priceBuffer[i + 1]];
      let vol = new convnetjs.Vol(data);
      this.trainer.train(vol, current_price);
      this.predictionCount++;
    }
  },
  setNormalizeFactor : function(candle) {
    this.scale = Math.pow(10,Math.trunc(candle.high).toString().length+2);
    log.debug('Set normalization factor to',this.scale);
  },
  update : function(candle)
  {
    emaFast=this.tulipIndicators.emaFast.result.result;
    if (1 === this.scale && 1 < candle.high && 0 === this.predictionCount) this.setNormalizeFactor(candle);
    this.priceBuffer.push(emaFast / this.scale );

    if (2 > this.priceBuffer.length) return;
     for (i=0;i<3;++i)
      this.learn();
    while (this.settings.price_buffer_len < this.priceBuffer.length) this.priceBuffer.shift();

    fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
  	candle.start + "," + candle.open + "," + candle.high + "," + candle.low + "," + candle.close + "," + candle.vwp + "," + candle.volume + "," + candle.trades + "\n", function(err) {
  	if (err) {return console.log(err);}
  	});
  },
  onTrade: function(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}
    this.prevAction = event.action;
    this.prevPrice = event.price;
  },

  predictCandle : function() {
    let vol = new convnetjs.Vol(this.priceBuffer);
    let prediction = this.nn.forward(vol);
    return prediction.w[0];
  },

  check : function(candle) {
    if(this.predictionCount > this.settings.min_predictions)
    {
      let prediction = this.predictCandle() * this.scale;
      let currentPrice = candle.close;
      let meanp = math.mean(prediction, currentPrice);
      let meanAlpha = (meanp - currentPrice) / currentPrice * 100;
      let signalSell = candle.close > this.prevPrice || candle.close < (this.prevPrice*this.hodle_threshold);
      let signal = meanp < currentPrice;
      if ('buy' !== this.prevAction && signal === false  && meanAlpha> this.settings.threshold_buy )
      {
        log.debug("Buy - Predicted variation: ",meanAlpha);this.advice('long');
      }
      else if
      ('sell' !== this.prevAction && signal === true && meanAlpha < this.settings.threshold_sell && signalSell)
      {
        log.debug("Sell - Predicted variation: ",meanAlpha);this.advice('short');
      }
    }
    if ('stoploss' === this.indicators.stoploss.action){this.learn();}

  },
  end : function() {
    log.debug('Triggered stoploss',this.stoplossCounter,'times');
  }
};
module.exports = method;
