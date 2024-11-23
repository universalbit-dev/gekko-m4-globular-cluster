// Downloaded from: https://github.com/xFFFFF/Gekko-Strategies
// Source: https://github.com/RJPGriffin/

/* universalbit-dev decentralized strategies */
const { addon: ov } = require('openvino-node');
var Promise = require("bluebird");
var convnetjs = require('../core/convnet.js');
var math = require('mathjs');
const { Chess } = require('chess.js')
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var tulind=require('../core/tulind');
var SMMA = require('./indicators/SMMA.js');
var config = require('../core/util.js').getConfig();
var fs = require("fs-extra");

var method = {
  priceBuffer: [],predictionCount: 0,batchsize: 1,
  layer_neurons: 0,layer_activation: 'sigmoid',layer2_activation:'relu',
  scale: 1,prevAction: 'wait',prevPrice: 0,stoplossCounter: 0,hodle_threshold: 1,

  //init
  init: function() {
    this.name = 'NEURALNETV2';
    this.nn = new convnetjs.Net();
    //https://stanford.edu/~shervine/teaching/cs-230/cheatsheet-convolutional-neural-networks#
    fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377'];//'610','987','1597','2584','4181'];
    var x = Math.floor(Math.random() * fibonacci_sequence.length);
    if (x == 0){Math.floor(Math.random() * fibonacci_sequence.length);}
    x = fibonacci_sequence[x];this.x=x;
    var y = 1;
    y = fibonacci_sequence[y];this.y=y;
    var z = 1;
    z = fibonacci_sequence[z];this.z=z;
    console.debug('\t\t\t\tNeuralNet Layer: ' + '\tINPUT:'+ x + "\tHIDE:" + y + "\tOUT:" + z);
    
    Alpha=[];min=0; max=0; median=0;
    //https://cs.stanford.edu/people/karpathy/convnetjs/demo/trainers.html
    //full connected layers
    let layers = [
      {type: 'input',out_sx: 1,out_sy: 1,out_depth: this.z},
      {type: 'fc',num_neurons: this.layer_neurons, activation: this.layer_activation},
            {type: 'fc',num_neurons: this.layer_neurons, activation: this.layer2_activation},
                  {type: 'fc',num_neurons: this.layer_neurons, activation: this.layer_activation},
                        {type: 'fc',num_neurons: this.layer_neurons, activation: this.layer2_activation},
                              {type: 'fc',num_neurons: this.layer_neurons, activation: this.layer_activation},
      {type: 'regression',num_neurons: 1}
    ];

    this.nn.makeLayers(layers);
    this.trainer = new convnetjs.Trainer(this.nn, {
      learning_rate: this.settings.learning_rate,
      momentum: this.settings.momentum,
      batch_size: this.batchsize,
      l2_decay: this.settings.decay
    });
    
    this.addIndicator('stoploss', 'StopLoss', {threshold: this.settings.stoploss_threshold});
    this.hodle_threshold = this.settings.hodle_threshold || 1;
  },

 learn: function(candle) {
    for (let i = 0; i < this.priceBuffer.length - this.z; i++) {
      let data = this.priceBuffer[i];
      let current_price = this.priceBuffer[i + 1];
      let vol = new convnetjs.Vol(data);
      this.trainer.train(vol, current_price);
      let predicted_values = this.nn.forward(vol);
      let accuracymatch = predicted_values.w[0] === current_price.first;
      this.nn.backward(accuracymatch);
      predictionCount=this.predictionCount++;
    }
  },

  setNormalizeFactor: function(candle) {
    this.scale = Math.pow(10, Math.trunc(candle.high).toString().length + 2);
  },

  makeoperator: function () {
  var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>'];
  var result = Math.floor(Math.random() * operator.length);
  console.log("\t\t\t\tcourtesy of... "+ operator[result]);
  }, 

  update: function(candle) {

    if (1 === this.scale && 1 < candle.high && 0 === this.predictionCount) this.setNormalizeFactor(candle);
    this.candle = candle;
    this.priceBuffer.push([(candle.low / this.scale),(candle.high / this.scale),(candle.close / this.scale),(candle.open / this.scale),(candle.volume / 1000)]);
    if ((this.z * 2) > this.priceBuffer.length) return;

    for (let i = 0; i < (this.z * 3); ++i) this.learn(candle);
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

  fxchess : function(){
  const chess = new Chess()
  while (!chess.isGameOver()) {
  const moves = chess.moves()
  const move = moves[Math.floor(Math.random() * moves.length)]
  chess.move(move)
}
return console.log(chess.pgn())},

  check: function(candle) {
  log.debug("Operator ");this.makeoperator();
  log.debug("Random game of Chess");this.fxchess();
  if (Alpha.length != 0){var max=math.max(Alpha);var min=math.min(Alpha);var median=math.median(Alpha);var matrix=math.mean(min,max,median);}
    if (this.predictionCount > this.settings.min_predictions) { this.predictionCount=0;
      //if ('buy' === this.prevAction && this.settings.stoploss_enabled && 'stoploss' === this.indicators.stoploss.action) 
      //{this.stoplossCounter++;log.debug('>>> STOPLOSS triggered <<<');this.advice('sell');} /* */

      let prediction = this.predictCandle() * this.scale;
      let currentPrice = candle.close;log.debug('Price = ' + currentPrice + ', Prediction = ' + prediction);

      log.debug('alpha_min = ' + min + ', alpha_max = ' + max + ',alpha_median = '+ median );
      let meanp = math.mean(prediction, currentPrice);
      let meanAlpha = (currentPrice - meanp) / currentPrice * 100;Alpha.push([meanAlpha]);
      let signalSell = candle.close > this.prevPrice || candle.close < (this.prevPrice * this.hodle_threshold);
      let signal = meanp < currentPrice;log.info('Alpha: '+meanAlpha);
      if ('buy' !== this.prevAction && signal === false && meanAlpha < this.settings.threshold_buy) {return this.advice('long');} /* */
      if ('sell' !== this.prevAction && signal === true && meanAlpha > this.settings.threshold_sell && signalSell) {return this.advice('short');} /* */
      
      switch(Alpha.length != 0){
      case (min < math.mean(min,max,median)):this.advice('long');break;
      case (max > math.mean(min,max,median)):this.advice('short');break;
      case (median < math.mean(min,max,median)):this.advice('buy');break;/* */
      case (median > math.mean(min,max,median)):this.advice('sell');break;/* */
      default: log.info('');
      }
    }
  },
  
  end: function() {log.debug('Triggered stoploss',this.stoplossCounter,'times');}

};

module.exports = method;

