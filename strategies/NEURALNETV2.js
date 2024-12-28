// Downloaded from: https://github.com/xFFFFF/Gekko-Strategies
// Source: https://github.com/RJPGriffin/

/* universalbit-dev decentralized strategies */
const { addon: ov } = require('openvino-node');
const ccxt = require("ccxt");
var convnetjs = require('../core/convnet.js');
var math = require('mathjs');
const { Chess } = require('chess.js')
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var tulind=require('../core/tulind');
var fs = require("fs-extra");fs.createReadStream('/dev/null');

var settings = config.NEURALNETV2;this.settings=settings;

/*ccxt library: https://www.npmjs.com/package/ccxt*/
var symbol = '';var type='';var side='';
var amount = 0.01; var price =0.00; 
var limit=0.00;var stoporder=0.00;var takeorder=0.00;
var parameters = {};

/* https://github.com/ccxt/ccxt/wiki/Exchange-Markets-By-Country */
var id = 'coinmate'; 
var exchange = new ccxt[id] ({
        verbose: false,
        apiKey: '',
        secret: '', 
    });

/*placing order schema: https://github.com/ccxt/ccxt/wiki/Manual#placing-orders*/
const buy = async function() {
    try {
    symbol ='LTC/BTC';type='limit';side='buy';amount = 0.01;price=currentPrice;parameters={};
    const orders = await exchange.createOrder(symbol,type,side,amount,price);
    console.log ('Submitted Buy Order -- Wohoo! -- ',orders);this.predictionCount=0;
    }
    catch (e) {
    console.log (exchange.iso8601 (Date.now ()), e.constructor.name, e.message);
    console.log ('Submit Buy Order -- Error -- ');
    }
};

const sell = async function() {
    try {
    symbol = 'LTC/BTC';type='limit';side='sell';amount = 0.01;price=currentPrice;parameters={};
    const orders = await exchange.createOrder(symbol,type,side,amount,price);
    console.log ('Submitted Sell Order -- Wohoo! -- ',orders);this.predictionCount=0;
    }
    catch (e) {
    console.log (exchange.iso8601 (Date.now ()), e.constructor.name, e.message);
    console.log ('Submit Sell Order -- Error -- ');
    }
};

const stop = async function() {
    try {
    symbol = 'LTC/BTC';type='limit';side='sell';amount = 0.01;price=stoporder;parameters={};
    const orders = await exchange.createOrder(symbol,type,side,amount,price);
    console.log ('Submitted Stop Order -- Wohoo! -- ',orders);this.predictionCount=0;
    }
    catch (e) {
    console.log (exchange.iso8601 (Date.now ()), e.constructor.name, e.message);
    console.log ('Submit Stop Order -- Error -- ');
    }
};

const take = async function() {
    try {
    symbol = 'LTC/BTC';type='limit';side='buy';amount = 0.01;price=takeorder;parameters={};
    const orders = await exchange.createOrder(symbol,type,side,amount,price);
    console.log ('Submitted Take Order -- Wohoo! -- ',orders);this.predictionCount=0;
    }
    catch (e) {
    console.log (exchange.iso8601 (Date.now ()), e.constructor.name, e.message);
    console.log ('Submit Take Order -- Error -- ');
    }
};

var Alpha=[];var min=0;var max=0;var median=0;var matrix=0;
var method = {
  priceBuffer: [],predictionCount: 0,batchsize: 1,
  layer_neurons: 0,layer_activation: 'sigmoid',layer2_activation: 'relu',
  scale: 1,prevPrice: 0,hodle_threshold: 1,

  //init
  init: function() {
    //https://stanford.edu/~shervine/teaching/cs-230/cheatsheet-convolutional-neural-networks#
    this.name = 'NEURALNETV2';
    this.nn = new convnetjs.Net();
    fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181','6765'];
    var x = Math.floor(Math.random() * fibonacci_sequence.length);
    if (x == 0){Math.floor(Math.random() * fibonacci_sequence.length);}
    x = fibonacci_sequence[x];this.x=x;
    var y = 1;
    y = fibonacci_sequence[y];this.y=y;
    var z = 1;
    z = fibonacci_sequence[z];this.z=z;
    console.debug('\tNeuralNet Layer: ' + '\tINPUT:'+ x + "\tHIDE:" + y + "\tOUT:" + z);
    
    //random learning method
    random_learning=['adadelta','sgd','adagrad','nesterov','windowgrad'];
    var learningmethod = Math.floor(Math.random() * random_learning.length);
    if (learningmethod == undefined){Math.floor(Math.random() * random_learning.length);}
    
    //https://cs.stanford.edu/people/karpathy/convnetjs/demo/trainers.html
    switch (true){
    case (learningmethod == 0 ):learningmethod='adadelta';break;
    case (learningmethod == 1):learningmethod='sgd';break;
    case(learningmethod == 2):learningmethod='adagrad';break;
    case(learningmethod == 3):learningmethod='nesterov';break;
    case(learningmethod == 4):learningmethod='windowgrad';break;
    default: learningmethod = 'adadelta';
    }
    /**/
    log.debug('Learning Method: '+ learningmethod);
    this.settings.method=learningmethod;
    
    //full connected layers
    let layers = [
      {type: 'input',out_sx: this.x,out_sy: 1,out_depth: 1},
      {type: 'fc',num_neurons: this.layer_neurons, activation: this.layer_activation},
            {type: 'fc',num_neurons: this.layer_neurons, activation: this.layer2_activation},
                  {type: 'fc',num_neurons: this.layer_neurons, activation: this.layer_activation},
                        {type: 'fc',num_neurons: this.layer_neurons, activation: this.layer2_activation},
                              {type: 'fc',num_neurons: this.layer_neurons, activation: this.layer_activation},
      {type: 'regression',num_neurons: 1}
    ];
    
    switch(this.settings.method)
    {
    case(this.settings.method == 'sgd'):
      this.trainer = new convnetjs.SGDTrainer(this.nn, 
      {learning_rate: this.settings.learning_rate,momentum: 0.9,batch_size:8,l2_decay: this.settings.l2_decay,l1_decay: this.settings.l1_decay});break;
    
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
      {method: this.settings.method,learning_rate: this.settings.learning_rate,eps: 1e-6,ro:0.95,batch_size:8,l2_decay: this.settings.l2_decay});break;
    
    default:
      this.trainer = new convnetjs.Trainer(this.nn, 
      {method: 'adadelta',learning_rate: 0.01,momentum: 0.0,batch_size:1,eps: 1e-6,ro:0.95,l2_decay: 0.001,l1_decay: 0.001});      
    }

    this.nn.makeLayers(layers);
    this.trainer = new convnetjs.Trainer(this.nn, {
      learning_rate: this.settings.learning_rate,
      momentum: this.settings.momentum,
      batch_size: this.batchsize,
      l2_decay: this.settings.decay
    });

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
  console.log("\tcourtesy of... "+ operator[result]);
  }, 

  update: function(candle) {
    if (1 === this.scale && 1 < candle.high && 0 === this.predictionCount) this.setNormalizeFactor(candle);
    this.candle = candle;
    this.priceBuffer.push([(candle.low / this.scale),(candle.high / this.scale),(candle.close / this.scale),(candle.open / this.scale),(candle.volume / 1000)]);
    if ((this.z * 2) > this.priceBuffer.length) return;

    for (let i = 0; i < (this.z * 3); ++i) this.learn(candle);
    while (this.settings.price_buffer_len < this.priceBuffer.length) this.priceBuffer.shift();
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
return console.log(chess.pgn())
},

  check: async function(candle) {
  log.debug("Operator ");this.makeoperator();
  log.debug("Random game of Chess");this.fxchess();

  if (Alpha.length != 0) { 
  max=math.max(Alpha);min=math.min(Alpha);median=math.median(Alpha);
  if (math.mean(min,max,median) != undefined) {matrix=math.mean(min,max,median);}
  }
  log.info('Nostradamus Counter: '+this.predictionCount);
  if (this.predictionCount > this.settings.min_predictions) 
    {
      var prediction = this.predictCandle() * this.scale;
      let currentPrice = candle.close;log.debug('Price = ' + currentPrice + ', Prediction = ' + prediction);
      log.debug('Alpha_Median = '+ median);
      
      /*  Orders: -- Buy - Sell - Take - Stop --     Open/Close Position -- */
      limit_buy = prediction - (currentPrice * this.settings.limit_order/100); //limit order nearest currentPrice
      limit_sell= prediction + (currentPrice * this.settings.limit_order/100);
      takeorder= prediction - (prediction * this.settings.take_order/100);//takeorder - 0.2% of prediction
      stoporder= prediction + (prediction * this.settings.stop_order/100);//stoporder + 0.2% of prediction
      
      
      let meanp = math.mean(prediction, currentPrice);
      let meanAlpha = (currentPrice - meanp) / currentPrice * 100;Alpha.push([meanAlpha]);
      let signalSell = candle.close > this.prevPrice || candle.close < (this.prevPrice * this.hodle_threshold);
      let signal = meanp < currentPrice;log.info('Alpha: '+ meanAlpha);

      if(Alpha.length != 0){
      if(prediction > currentPrice && median !=0 && median < matrix){log.info('Nostradamus predict : --UP--');buy();stop();this.predictionCount=0;median=0;}
      if(prediction < currentPrice && median !=0 && median > matrix){log.info('Nostradamus predict : --DOWN--');sell();take();this.predictionCount=0;median=0;}
      if(this.predictionCount > this.settings.min_predictions){this.predictionCount=0;}
      }
      
    }
    /*
    log.info("-- Price -- :" + currentPrice);
    log.info("-- Limit Buy -- :" + limit_buy);
    log.info("-- Limit Sell-- :" + limit_sell);
    log.info("-- Stop  -- :" + stoporder);
    log.info("-- Take  -- :" + takeorder);
    */
  },
  end: function() {log.debug('THE END');}

};
module.exports = method;
