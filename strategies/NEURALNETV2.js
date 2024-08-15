// Downloaded from: https://github.com/xFFFFF/Gekko-Strategies
// Source: https://github.com/RJPGriffin/

var convnetjs = require('../core/convnet.js');
var math = require('mathjs');

var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var d = 5

var SMMA = require('./indicators/SMMA.js');

var method = {
  priceBuffer: [],
  predictionCount: 0,
  batchsize: 1,
  layer_neurons: 0,
  layer_activation: 'sigmoid',
  scale: 1,
  prevAction: 'wait',
  prevPrice: 0,
  stoplossCounter: 0,
  hodle_threshold: 1,

  //init
  init: function() {

    this.name = 'NEURALNETV2';
    this.requiredHistory = config.tradingAdvisor.historySize;

    // smooth the input to reduce the noise of the incoming data
    this.SMMA = new SMMA(5);

    let layers = [{
        type: 'input',
        out_sx: 1,
        out_sy: 1,
        out_depth: d
      },
      {
        type: 'fc',
        num_neurons: this.layer_neurons, 
        activation: this.layer_activation
      },
      {
        type: 'regression',
        num_neurons: 1
      }
    ];

    this.nn = new convnetjs.Net();

    this.nn.makeLayers(layers);
    this.trainer = new convnetjs.SGDTrainer(this.nn, {
      learning_rate: this.settings.learning_rate,
      momentum: this.settings.momentum,
      batch_size: this.batchsize,
      l2_decay: this.settings.decay
    });

    this.addIndicator('stoploss', 'StopLoss', {
      threshold: this.settings.stoploss_threshold
    });

    this.hodle_threshold = this.settings.hodle_threshold || 1;
  },

  learn: function() {
    for (let i = 0; i < this.priceBuffer.length - d; i++) {
      let data = this.priceBuffer[i];
      let current_price = this.priceBuffer[i + 1];
      let vol = new convnetjs.Vol(data);
      this.trainer.train(vol, current_price);
      let predicted_values = this.nn.forward(vol);
      let accuracymatch = predicted_values.w[0] === current_price.first;
      this.nn.backward(accuracymatch);
      this.predictionCount++;
    }
  },

  setNormalizeFactor: function(candle) {
    this.scale = Math.pow(10, Math.trunc(candle.high).toString().length + 2);
    // log.debug('Set normalization factor to',this.scale);
  },

  update: function(candle) {

    if (1 === this.scale && 1 < candle.high && 0 === this.predictionCount) this.setNormalizeFactor(candle);
    this.candle = candle;
    this.priceBuffer.push([
      (candle.low / this.scale),
      (candle.high / this.scale),
      (candle.close / this.scale),
      (candle.open / this.scale),
      (candle.volume / 1000)
    ]);
    if ((d * 2) > this.priceBuffer.length) return; 

    for (let i = 0; i < (d * 3); ++i) this.learn();

    while (this.settings.price_buffer_len < this.priceBuffer.length) this.priceBuffer.shift();
  },

  onTrade: function(event) {
    if ('buy' === event.action) {this.indicators.stoploss.long(event.price);}
    this.prevAction = event.action;
    this.prevPrice = event.price;
  },

  printObject: function(o) {
    var out = '';
    for (var p in o) {out += p + ': ' + o[p] + '\n';}
    alert(out);
  },


  predictCandle: function() {
    let vol = new convnetjs.Vol(this.priceBuffer);
    let prediction = this.nn.forward(vol);

    return prediction.w[0];
  },

  check: function(candle) {
    if (this.predictionCount > this.settings.min_predictions) { 
      if ('buy' === this.prevAction && this.settings.stoploss_enabled && 'stoploss' === this.indicators.stoploss.action) 
      {this.stoplossCounter++;log.debug('>>> STOPLOSS triggered <<<');this.advice();} /* */

      let prediction = this.predictCandle() * this.scale;
      let currentPrice = candle.close;log.debug('Price = ' + currentPrice + ', Prediction = ' + prediction);
      let meanp = math.mean(prediction, currentPrice);
      let meanAlpha = (meanp - currentPrice) / currentPrice * 100;
      let signalSell = candle.close > this.prevPrice || candle.close < (this.prevPrice * this.hodle_threshold);
      let signal = meanp < currentPrice;
      if ('buy' !== this.prevAction && signal === false && meanAlpha > this.settings.threshold_buy) {return this.advice();} /* */
      else if ('sell' !== this.prevAction && signal === true && meanAlpha < this.settings.threshold_sell && signalSell) {return this.advice();} /* */
    }
  },

  end: function() {log.debug('Triggered stoploss',this.stoplossCounter,'times');}
};

module.exports = method;
