/*
NeuralNetwork
*/

//https://cs.stanford.edu/people/karpathy/convnetjs/started.html
var convnetjs = require('../core/convnet.js');
var math = require('mathjs');var uuid = require('uuid');
var log = require('../core/log');
var config= require('../core/util').getConfig();
var tulind = require('../core/tulind');

var strat = {
  priceBuffer : [],
  predictionCount : 0,
  batchsize : 50,
  num_neurons : 10000,
  layer_activation : 'sigmoid',
  layer_activation2 : 'relu',
  scale : 5,
  prevAction : 'continue',
  prevPrice : 0,
  stoplossCounter : 0,
  stoploss_enabled: true,
  threshold:0.85,
  threshold_buy:1.0,
  threshold_sell:-1.0,
  hodle_threshold : 1,

  init : function() {
    //indicators
    //DEMA
    this.addTulipIndicator('price', 'dema', {optInTimePeriod:1});
    this.addIndicator('stoploss', 'StopLoss');

    this.name = 'NN';
    this.nn = new convnetjs.Net();
    this.requiredHistory = config.tradingAdvisor.historySize;

    const layers = [
      {type:'input', out_sx: 7, out_sy:8, out_depth: 4},
      {type:'conv', num_neurons:10000, activation: this.layer_activation},
      {type:'svm', num_classes:1},
      {type:'regression', num_neurons: 1},
    ];
    const layers2 = [
      {type:'input', out_sx: 7, out_sy:8, out_depth: 4},
      {type:'conv', num_neurons:10000, activation: this.layer_activation2},
      {type:'svm', num_classes:1},
      {type:'regression', num_neurons: 1}
    ];

    this.nn.makeLayers(layers,layers2);


    if(this.settings.method == 'sgd')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        learning_rate: this.settings.learning_rate,
        momentum: this.settings.momentum,
        batch_size: this.batchsize,
        l2_decay: this.settings.decay,
        l1_decay: this.settings.decay
      });
    }
    else if(this.settings.method == 'adadelta')
    {
      this.trainer = new convnetjs.SGDTrainer(this.nn, {
        method: this.settings.method,
        learning_rate: this.settings.learning_rate,
        momentum: this.settings.momentum,
        batch_size: this.batchsize,
        l2_decay: this.settings.decay,
        l1_decay: this.settings.decay
      });
    }
    else
    {
      this.trainer = new convnetjs.Trainer(this.nn, {
        method: this.settings.method,
        batch_size: this.batchsize,
        eps: 1e-6,
        ro: 0.95,
        l2_decay: this.settings.decay,
        l1_decay: this.settings.decay
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
    price=this.tulipIndicators.price.result.result;
    if (1 === this.scale && 1 < candle.high && 0 === this.predictionCount) this.setNormalizeFactor(candle);
    this.priceBuffer.push(price / this.scale );

    if (2 > this.priceBuffer.length) return;
     for (i=0;i<3;++i)
      this.learn();
    while (this.settings.price_buffer_len < this.priceBuffer.length) this.priceBuffer.shift();
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
      if (
          'buy' === this.prevAction
          && this.settings.stoploss_enabled
          && 'stoploss' === this.indicators.stoploss.action
      ) {
        this.stoplossCounter++;
        log.debug('>>>>>>>>>> STOPLOSS triggered <<<<<<<<<<');
        this.advice('short');
      }
      let prediction = this.predictCandle() * this.scale;
      let currentPrice = candle.close;
      let meanp = math.mean(prediction, currentPrice);
      let meanAlpha = (meanp - currentPrice) / currentPrice * 100;
      let signalSell = candle.close > this.prevPrice || candle.close < (this.prevPrice*this.hodle_threshold);
      let signal = meanp < currentPrice;
      if ('buy' !== this.prevAction && signal === false  && meanAlpha> this.settings.threshold_buy )
      {
        log.debug("Buy - Predicted variation: ",meanAlpha);
        log.info('BUY');this.advice('long');
      }
      else if
      ('sell' !== this.prevAction && signal === true && meanAlpha < this.settings.threshold_sell && signalSell)
      {
        log.debug("Sell - Predicted variation: ",meanAlpha);
        log.info('SELL');this.advice('short');
      }
    }
  },
  end : function() {
    log.debug('Triggered stoploss',this.stoplossCounter,'times');
  }
};
module.exports = strat;
