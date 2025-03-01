// Downloaded from: https://github.com/xFFFFF/Gekko-Strategies
// Source: https://github.com/RJPGriffin/

const { addon: ov } = require('openvino-node');
const ccxt = require("ccxt");
var log = require('../core/log.js');
var convnetjs = require('../core/convnet.js');
var deepqlearn= require('../core/deepqlearn.js');
const _ = require("underscore");
var math = require('mathjs');var cov = require('compute-covariance');
const { Chess } = require('chess.js');
var config = require('../core/util.js').getConfig();
var tulind=require('../core/tulind');
var Wrapper = require('../strategyWrapperRules.js');
var fs = require("fs-extra");fs.createReadStream('/dev/null');

var settings = config.NEURALNET;this.settings=settings;

const StopLoss = require('./indicators/StopLoss');
var symbol = '';var type='';var side='';
var amount = 0.00; var price =0.00; var since='';var limit=0;var parameters = {};
var limit_buy=0.00;var limit_sell=0.00;var stoporder=0.00;var takeorder=0.00;
var currentPrice=0.00;var spread=0.00;var digits = 8;
//https://www.investopedia.com/terms/a/alpha.asp
var Alpha=[];var min=0;var max=0;var median=0;var matrix=0;

var method = Wrapper;
method = {
  priceBuffer: [],predictionCount: 0,batchsize: 1,array_operator: [],array_chess: [],array_fibonacci:[],
  layer_neurons: 21,layer_activation: 'sigmoid',layer2_activation: 'relu',
  scale: 1,prevPrice: 0,hodle_threshold: 1,

  //init
  init: function() {
    //ohlcv();
    //orderBook();
    this.name = 'NEURALNET';
    this.nn = new convnetjs.Net();
    this.stopLoss = new StopLoss(5); // 5% stop loss threshold
    
    // SMA
	this.addIndicator('maFast', 'SMA', this.settings.SMA_long );
	this.addIndicator('maSlow', 'SMA', this.settings.SMA_short );
    
    //https://stanford.edu/~shervine/teaching/cs-230/cheatsheet-convolutional-neural-networks#
    fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181','6765'];
    var x = Math.floor(Math.random() * fibonacci_sequence.length);this.x=x;
    
    while(x == 0){Math.floor(Math.random() * fibonacci_sequence.length);x = fibonacci_sequence[x];this.x=x;}
    
    var y = 1;y = fibonacci_sequence[y];this.y=y;var z = 1;z = fibonacci_sequence[z];this.z=z;
    console.debug('NeuralNet Layer: ' + '\t\tINPUT:'+ x + '\tHIDE:' + y + '\tOUT:' + z);

    //random trainer  
    var random_trainer=true;
    random_learning=['adadelta','sgd','sgd+momentum','adagrad','nesterov','windowgrad'];
    var learningmethod = Math.floor(Math.random() * random_learning.length);
    if (learningmethod != undefined){Math.floor(Math.random() * random_learning.length);} 
    
    //https://cs.stanford.edu/people/karpathy/convnetjs/demo/trainers.html
    switch (random_trainer){
    case (learningmethod == 0 ):learningmethod='adadelta';break;
    case (learningmethod == 1):learningmethod='sgd';break;
    case (learningmethod == 2):learningmethod='sgd+momentum';break;
    case(learningmethod == 3):learningmethod='adagrad';break;
    case(learningmethod == 4):learningmethod='nesterov';break;
    case(learningmethod == 5):learningmethod='windowgrad';break;
    default: learningmethod = 'sgd+momentum';
    }
    this.settings.method='nesterov'; //default 
    
    //full connected layers and convolutional neural network
    let layers = [
      {type: 'input',out_sx: x,out_sy: 1,out_depth: 1},
      {type: 'conv',num_neurons: 21, activation: 'relu'},
            {type: 'fc',num_neurons: 21, activation: 'sigmoid'},
                  {type: 'conv',num_neurons: 21, activation: 'relu'},
                        {type: 'fc',num_neurons: 21, activation: 'sigmoid'},
                              {type: 'conv',num_neurons: 21, activation: 'relu'},
      {type: 'regression',num_neurons: 1}
    ];
    
    switch(this.settings.method)
    {
    case(this.settings.method == 'sgd'):
      this.trainer = new convnetjs.SGDTrainer(this.nn, 
      {method: this.settings.method,learning_rate: this.settings.learning_rate,momentum: 0.0,batch_size:8,l2_decay: this.settings.l2_decay,l1_decay: this.settings.l1_decay});break;
      
    case(this.settings.method == 'sgd+momentum'):
      this.trainer = new convnetjs.SGDTrainer(this.nn, 
      {method: this.settings.method,learning_rate: this.settings.learning_rate,momentum: 0.9,batch_size:8,l2_decay: this.settings.l2_decay,l1_decay: this.settings.l1_decay});break;

    case(this.settings.method == 'adadelta'):
      this.trainer = new convnetjs.Trainer(this.nn, 
      {method: this.settings.method,learning_rate: this.settings.learning_rate,eps: 1e-6,ro:0.95,batch_size:1,l2_decay: this.settings.l2_decay});break;

    case(this.settings.method == 'adagrad'): 
      this.trainer = new convnetjs.Trainer(this.nn, 
      {method: this.settings.method,learning_rate: this.settings.learning_rate,eps: 1e-6,batch_size:8,l2_decay: this.settings.l2_decay});break;
      
    case(this.settings.method == 'nesterov'):    
      this.trainer = new convnetjs.Trainer(this.nn, 
      {method: this.settings.method,learning_rate: this.settings.learning_rate,momentum: 0.9,batch_size:8,l2_decay: this.settings.l2_decay});break;

    case(this.settings.method == 'windowgrad'):
      this.trainer = new convnetjs.Trainer(this.nn, 
      {method: this.settings.method,learning_rate: 0.01,eps: 1e-6,ro:0.95,batch_size:1,l2_decay: this.settings.l2_decay});break;
    default:
      this.trainer = new convnetjs.Trainer(this.nn, 
      {method: 'adadelta',learning_rate: 0.01,momentum: 0.0,batch_size:1,eps: 1e-6,ro:0.95,l2_decay: 0.001,l1_decay: 0.001});      
    }

    this.nn.makeLayers(layers);
    this.trainer = new convnetjs.Trainer(this.nn, {
      method: this.settings.method,
      learning_rate: this.settings.learning_rate,
      momentum: this.settings.momentum,
      batch_size: this.batchsize,
      l2_decay: this.settings.decay
    });
},

  learn: async function() {
    for (let i = 0; i < this.priceBuffer.length - 2; i++) {
      let data = this.priceBuffer[i];this.data=data;
      let current_price = this.priceBuffer[i + 1];
      let vol = new convnetjs.Vol(data);
      this.trainer.train(vol, current_price);
      let predicted_values = this.nn.forward(vol);
      let accurancymatch = predicted_values.w[0] === current_price.first;
      this.nn.backward(accurancymatch);
      predictionCount=this.predictionCount++;
    }
  },

  setNormalizeFactor: function(candle) {
    this.scale = Math.pow(10, Math.trunc(candle.high).toString().length + 2);
  },
  
  // Price Prediction Reinforcement Learning
  brain: async function(){
  var brain1 = new deepqlearn.Brain(this.x, 3);//number of input,number of actions
  //console.info('brain1',brain1 , this.data);
  var action = brain1.forward(this.data);
  var reward = action === 0 ? 1.0 : 0.0;
  brain1.backward(reward); 
  brain1.epsilon_test_time = 0.0;
  brain1.learning = false;
  var action = brain1.forward(this.data);
  },
  
  //Chess Learning
  chess_brain: async function(){
  var brain2 = new deepqlearn.Brain(this.x, 3);//number of input,number of actions
  //console.info('brain2',brain2 ,this.chess_data);
  var action = brain2.forward(this.chess_data);
  var reward = action === 0 ? 1.0 : 0.0;
  brain2.backward(reward); 
  brain2.epsilon_test_time = 0.0;
  brain2.learning = false;
  var action = brain2.forward(this.chess_data);
  },

  makeoperator: function () {
  var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>','...'];
  var result = Math.floor(Math.random() * operator.length);this.array_operator.push(operator[result]);
  log.debug("\tcourtesy of... "+ operator[result]);this.operator_data=this.array_operator;
  },
  
  //Operator Learning
  operator_brain: async function(){
  var brain3 = new deepqlearn.Brain(this.x, 3);//number of input,number of actions
  //console.info('brain3',brain3 ,this.operator_data);
  var action = brain3.forward(this.operator_data);
  var reward = action === 0 ? 1.0 : 0.0;
  brain3.backward(reward); 
  brain3.epsilon_test_time = 0.0;
  brain3.learning = false;
  var action = brain3.forward(this.operator_data);
  },
  
  makenumber: function () {
  var operator = ['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181','6765'];
  var result = Math.floor(Math.random() * operator.length);this.array_fibonacci.push(operator[result]);
  this.fibonacci_data=this.array_fibonacci;
  },
  
  //Operator Learning
  fibonacci_brain: async function(){
  var brain4 = new deepqlearn.Brain(this.x, 3);//number of input,number of actions
  //console.info('brain4',brain4 ,this.fibonacci_data);
  var action = brain4.forward(this.fibonacci_data);
  var reward = action === 0 ? 1.0 : 0.0;
  brain4.backward(reward); 
  brain4.epsilon_test_time = 0.0;
  brain4.learning = false;
  var action = brain4.forward(this.fibonacci_data);
  },
  
  update: function(candle) {
    this.stopLoss.update(this.candle);
    if (1 === this.scale && 1 < candle.high && 0 === this.predictionCount) this.setNormalizeFactor(candle);this.candle = candle;
    this.priceBuffer.push([(candle.low / this.scale),(candle.high / this.scale),(candle.close / this.scale),(candle.open / this.scale),(candle.volume / 1000)]);
    
    if ((this.x * 2) > this.priceBuffer.length) return;
    
    for (let i = 0; i < (this.x * 3); ++i)
    {
    this.learn(candle);this.brain(this.data);this.chess_brain(this.chess_data);this.operator_brain(this.operator_data);
    this.fibonacci_brain(this.fibonacci_data);
    }
    
    if (this.settings.price_buffer_len < this.priceBuffer.length) this.priceBuffer.unshift();
  },
 
  predictCandle : function() {
  var vol = new convnetjs.Vol(this.priceBuffer);
  var prediction = this.nn.forward(vol);
  return prediction.w[0];
  },

  fxchess : function(){
  const chess = new Chess()
  while (!chess.isGameOver()) {
  const moves = chess.moves()
  const move = moves[Math.floor(Math.random() * moves.length)]
  chess.move(move)
  }
  this.chess_data=chess;this.array_chess.push(chess);
  return console.debug('Random Game Of Chess:' + chess.pgn());
  },

  check: function() {
  let ind = this.indicators,maSlow = ind.maSlow.result,maFast = ind.maFast.result;
  this.makeoperator();this.makenumber();console.debug('--------------------------------------------');this.fxchess();
  //log.debug("Operator ");log.debug("Random game of Chess");

  if (Alpha.length != 0) { max=math.max(Alpha);min=math.min(Alpha);median=math.median(Alpha);
  if (math.mean(min,max,median) != 0) {matrix=math.mean(min,max,median);}
  }
  
  if (this.predictionCount > this.settings.min_predictions ) 
    {
      this.predictionCount=0;
      var prediction = this.predictCandle() * this.scale;
      currentPrice = this.candle.close;
      var variance= math.variance([prediction,currentPrice]);
      var covariance = cov( [prediction,currentPrice] );
      log.debug('Price = ' + currentPrice + ', Prediction = ' + prediction);
      var spread= prediction - currentPrice;
      
      let meanp =  math.mean(prediction, currentPrice);
      let meanAlpha = (currentPrice - meanp) / currentPrice * 100;Alpha.push([meanAlpha]);
      var Beta = (covariance / variance);
      console.debug('--------------------------------------------');
      console.debug("Alpha :", meanAlpha);
      console.debug("Beta :" , Beta);
      
      if(Alpha.length != 0){
      
      /* prediction and currentprice differ from positive spread */
      if(prediction < currentPrice && median < matrix && (spread > 0 && spread < 55) && prediction != undefined && Beta < 1){
      /* OpenPosition (buy order) price should --up-- */
      if( maFast < maSlow ){{log.info('Nostradamus predict : --UP--');this.advice('long');median=0;}}
      }
      
      /* prediction and currentprice differ from negative spread */
      if(prediction > currentPrice && median > matrix && (spread > -55 && spread < 0) && prediction != undefined && Beta < 1){
      /* ClosePosition (sell order) price should --down-- */
      if( maFast > maSlow ){{log.info('Nostradamus predict : --DOWN--');this.advice('short');median=0;}}
      }
      }
      
      console.debug('--------------------------------------------');
      console.debug("-- Price -- :" , currentPrice);
      console.debug('-- SMA+ :',maFast);
	  console.debug('-- SMA- :',maSlow);
      console.debug('-- Prediction --:' , prediction);
      console.debug("-- Spread  -- :" , spread);
      console.debug('-- Learning Method -- :' + this.settings.method);
      console.debug('--------------------------------------------');
    }
      
  },
  
  end: function() {log.debug('THE END');}
};
module.exports = method;
