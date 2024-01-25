/*NeuralNetwork*/

//https://cs.stanford.edu/people/karpathy/convnetjs/started.html
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var tulind = require('tulind');
var _ = require('lodash');

var convnetjs = require('../core/convnet.js');
var deepqlearn= require('../core/deepqlearn');
var math = require('mathjs');var uuid = require('uuid');
var fs = require('fs-extra');
var settings = config.NN;this.settings=settings;
var method = {
  priceBuffer : [],
  predictionCount : 0,
  stoplossCounter : 0,
  prevPrice : 0,
  prevAction : 'wait',
  hodl_threshold : 1,
  
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
      {type:'input', out_sx: 1, out_sy:1, out_depth: 1},
      {type:'fc', num_neurons:20, activation: 'relu'},
      {type:'fc', num_neurons:20, activation:'sigmoid'},
      {type:'regression', num_neurons:1}
    ];

    this.nn.makeLayers(layers);

    if(this.settings.method == 'sgd')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        learning_rate: this.settings.learning_rate,
        momentum: this.settings.momentum,
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
        batch_size:8,
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
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        method: this.settings.method,
        learning_rate: this.settings.learning_rate,
        momentum: this.settings.momentum,
        batch_size:8,
        eps: 1e-6,
        ro:0.95,
        l2_decay: this.settings.l2_decay,
        l1_decay: this.settings.l1_decay
      });
    }

    this.hodl_threshold = this.settings.hodl_threshold || 1;
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
    this.settings.scale = Math.pow(10,Math.trunc(candle.high).toString().length+2);
    log.debug('Set normalization factor to',this.settings.scale);
  },
  update : function(candle)
  {
    emaFast=this.tulipIndicators.emaFast.result.result;
    if (1 === this.settings.scale && 1 < candle.high && 0 === this.predictionCount) this.setNormalizeFactor(candle);
    this.priceBuffer.push(emaFast / this.settings.scale );

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
      let prediction = this.predictCandle() * this.settings.scale;
      let currentPrice = candle.close;
      let meanp = math.mean(prediction, currentPrice);
      let meanAlpha = (meanp - currentPrice) / currentPrice * 100;
      let signalSell = candle.close > this.prevPrice || candle.close < (this.prevPrice*this.settings.hodl_threshold);
      let signal = meanp < currentPrice;
      if ('buy' !== this.prevAction && signal === false  && meanAlpha> this.settings.threshold_buy )
      {
        log.debug("Buy - Predicted variation: ",meanAlpha);this.advice('long');this.learn();
      }
      else if
      ('sell' !== this.prevAction && signal === true && meanAlpha < this.settings.threshold_sell && signalSell)
      {
        log.debug("Sell - Predicted variation: ",meanAlpha);this.advice('short');this.learn();
      }
    }
    if ('stoploss' === this.indicators.stoploss.action)
    {this.stoplossCounter++;this.update(candle);this.learn();}

  },
  end : function() {
    log.debug('Triggered stoploss',this.stoplossCounter,'times');
  }
};
module.exports = method;
