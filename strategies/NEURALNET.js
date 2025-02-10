// Downloaded from: https://github.com/xFFFFF/Gekko-Strategies
// Source: https://github.com/RJPGriffin/

/* copilot explain
### Summary
This strategy uses neural networks and reinforcement learning to predict price movements and make trading decisions on a cryptocurrency exchange. 
It fetches market data, trains a neural network, and places buy/sell orders based on the predictions and calculated metrics like Alpha and Beta. 
The strategy also includes functions for debugging and random operations.
*/

// universalbit-dev decentralized strategies */
require('dotenv').config();
const { addon: ov } = require('openvino-node');
const ccxt = require("ccxt");
var convnetjs = require('../core/convnet.js');
var deepqlearn= require('../core/deepqlearn.js');
const _ = require("underscore");
var math = require('mathjs');var cov = require('compute-covariance');
const { Chess } = require('chess.js')
var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();
var tulind=require('../core/tulind');
const StopLoss = require('./indicators/StopLoss');

var fs = require("fs-extra");fs.createReadStream('/dev/null');

var settings = config.NEURALNET;this.settings=settings;

var symbol = '';var type='';var side='';
var amount = 0.00; var price =0.00; var since='';var limit=0;var parameters = {};
var limit_buy=0.00;var limit_sell=0.00;var stoporder=0.00;var takeorder=0.00;
var currentPrice=0.00;var spread=0.00;
var candle_open=0.00;var candle_high=0.00;var candle_low=0.00;var candle_close=0.00;var candle_volume=0.00;

var bid_array=[];var ask_array=[];

this.exchange = new ccxt.kraken({ enableRateLimit: true }); // Initialize the exchange instance without API keys

var ohlcv = async function() {
try {
    const since = await exchange.milliseconds() - 86400 * 1000; //last 24 hrs
    symbol ='LTC/BTC';timeframe='45m';limit=100;parameters={};
    const Ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, limit);
    console.log (' -- ohlcv -- Wohoo! -- open -- high -- close -- volume --',Ohlcv);
    //ccxt Histogram -- open -- high -- low -- close -- volume --
    for (let i = 0; i <= _.size(limit)-1; i++) {
        for (let j = 1; j <= 5; j++) {
      candle_open = this.priceBuffer.push(Ohlcv[i][j]);this.candle_open=candle_open;
          candle_high = this.priceBuffer.push(Ohlcv[i][j]);this.candle_high=candle_high;
             candle_low = this.priceBuffer.push(Ohlcv[i][j]);this.candle_low=candle_low;
                 candle_close = this.priceBuffer.push(Ohlcv[i][j]);this.candle_close=candle_close;
                    candle_volume = Ohlcv[i][j];this.candle_volume=candle_volume; }
    }
    
    }
    catch (e) {
    console.log (exchange.iso8601 (Date.now ()), e.constructor.name, e.message);
    console.log (' ohlcv -- Error -- ');
    }
};
    
/* Placing Order Schema: https://github.com/ccxt/ccxt/wiki/Manual#placing-orders */
const buy = async function() {
    try {
    symbol ='LTC/BTC';type='limit';side='buy';amount = 0.02;price=limit_buy;parameters={};
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
    symbol = 'LTC/BTC';type='limit';side='sell';amount = 0.02;price=limit_sell;parameters={};
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
    symbol = 'LTC/BTC';type='limit';side='sell';amount = 0.02;price=stoporder;parameters={};
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
    symbol = 'LTC/BTC';type='limit';side='buy';amount = 0.02;price=takeorder;parameters={};
    const orders = await exchange.createOrder(symbol,type,side,amount,price);
    console.log ('Submitted Take Order -- Wohoo! -- ',orders);this.predictionCount=0;
    }
    catch (e) {
    console.log (exchange.iso8601 (Date.now ()), e.constructor.name, e.message);
    console.log ('Submit Take Order -- Error -- ');
    }
};

const openOrders = async function() {
    try {
    symbol = 'LTC/BTC';
    let since = await exchange.milliseconds() - 86400000 // -1 day from now (24 hours)
    let limit =20;parameters={};
    const openorders = await exchange.fetchOpenOrders(symbol, since, limit, parameters);
    console.log ('OpenOrders -- Wohoo! -- ', openorders);
    }
    catch (e) {
    console.log (exchange.iso8601 (Date.now ()), e.constructor.name, e.message);
    console.log ('OpenOrders -- Error -- ');
    }
};

//https://www.investopedia.com/terms/a/alpha.asp
var Alpha=[];var min=0;var max=0;var median=0;var matrix=0;
var method = {
  priceBuffer: [],predictionCount: 0,batchsize: 1,
  layer_neurons: 21,layer_activation: 'sigmoid',layer2_activation: 'relu',
  scale: 1,prevPrice: 0,hodle_threshold: 1,

  //init
  init: function() {
    //ohlcv();
    this.name = 'NEURALNET';
    this.stopLoss = new StopLoss(5); // 5% stop loss threshold
    this.nn = new convnetjs.Net();
    //https://stanford.edu/~shervine/teaching/cs-230/cheatsheet-convolutional-neural-networks#
    fibonacci_sequence=['0','1','1','2','3','5','8','13','21','34','55','89','144','233','377','610','987','1597','2584','4181','6765'];
    var x = Math.floor(Math.random() * fibonacci_sequence.length);this.x=x;
    
    while(x == 0){
    Math.floor(Math.random() * fibonacci_sequence.length);
    x = fibonacci_sequence[x];this.x=x;
    }
    
    var y = 1;y = fibonacci_sequence[y];this.y=y;
    var z = 1;z = fibonacci_sequence[z];this.z=z;
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
    
    this.settings.method='sgd+momentum'; //'adadelta'  'sgd' 'sgd+momentum' 'adagrad' 'nesterov' 'windowgrad'
    
    //Enable Random Trainer default: -- 'sgd+momentum' --
    //this.settings.method=learningmethod;  
    
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

  learn: async function(candle) {
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
  
  //Reinforcement Learning
  brain: async function(candle){
  var brain = new deepqlearn.Brain(1, 1);//number of input,number of actions
  var action = brain.forward(this.data);
  var reward = action === 0 ? 1.0 : 0.0;
  brain.backward(reward); 
  brain.epsilon_test_time = 0.0;
  brain.learning = false;
  var action = brain.forward(this.data);
  },

  makeoperator: function () {
  var operator = ['+','-','*','**','/','%','++','--','=','+=','*=','/=','%=','**=','==','===','!=','!==','>','<','>=','<=','?','&&','||','!','&','|','~','^','<<','>>','>>>','...'];
  var result = Math.floor(Math.random() * operator.length);
  log.debug("\tcourtesy of... "+ operator[result]);
  }, 

  update: function(candle) {
    this.stopLoss.update(candle);
    if (1 === this.scale && 1 < candle.high && 0 === this.predictionCount) this.setNormalizeFactor(candle);
    this.candle = candle;
    this.priceBuffer.push([(candle.low / this.scale),(candle.high / this.scale),(candle.close / this.scale),(candle.open / this.scale),(candle.volume / 1000)]);
    if ((this.x * 2) > this.priceBuffer.length) return;
    for (let i = 0; i < (this.x * 3); ++i) this.learn(candle);this.brain(candle);
    if (this.settings.price_buffer_len < this.priceBuffer.length) this.priceBuffer.unshift();
  },
 
  predictCandle: function() { // --copilot enhance --
  // Normalize the priceBuffer before creating the volume
  let normalizedBuffer = this.priceBuffer.map(data => data.map(value => value / this.scale));
  // Create a Vol of size 32x32x3, and filled with normalized priceBuffer numbers
  var vol = new convnetjs.Vol(32, 32, 3, normalizedBuffer);
  // Forward pass to get the prediction
  var prediction = this.nn.forward(vol);
  // Return the predicted value
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
  log.debug("Operator ");this.makeoperator();log.debug("Random game of Chess");this.fxchess();

  if (Alpha.length != 0) {
  max=math.max(Alpha);min=math.min(Alpha);median=math.median(Alpha);
  if (math.mean(min,max,median) != 0) { matrix=math.mean(min,max,median); }
  }
  
  log.info('Nostradamus Counter: '+ this.predictionCount);
  if (this.predictionCount > this.settings.min_predictions ) 
    {
      var prediction = this.predictCandle() * this.scale;
      currentPrice = this.candle.close;
      var variance= math.variance([prediction,currentPrice]);
      var covariance = cov( [prediction,currentPrice] );
      log.debug('Price = ' + currentPrice + ', Prediction = ' + prediction);
      
      //A spread in finance typically refers to some form of difference or gap between two related values:  https://www.investopedia.com/terms/s/spread.asp
      var spread=prediction - currentPrice;
      /*  Orders: -- Buy - Sell - Take - Stop -- Open/Close Position --  */ 
      limit_buy = currentPrice - ((currentPrice * 0.2)/100);
      limit_sell= currentPrice + ((currentPrice * 0.2)/100);
      takeorder= limit_buy - spread;
      stoporder= limit_sell + spread;
      
      let meanp =  math.mean(prediction, currentPrice);
      let meanAlpha = (currentPrice - meanp) / currentPrice * 100;Alpha.push([meanAlpha]);
      var Beta = (covariance / variance);
      log.info('Alpha: '+ meanAlpha);log.info("Beta:" + Beta);
      if(Alpha.length != 0){
      if(prediction > currentPrice && median < matrix && (spread > 0 && spread < 21)&& prediction != undefined && Beta < 0.9999999999999999)
      /* OpenPosition (buy order) price should --up-- */
      {log.info('Nostradamus predict : --UP--');buy();stop();this.predictionCount=0;median=0;}
      if(prediction < currentPrice && median > matrix && (spread > -21 && spread < 0)&& prediction != undefined && Beta < 0.9999999999999999)
      /* ClosePosition (sell order) price should --down-- */
      {log.info('Nostradamus predict : --DOWN--');sell();take();this.predictionCount=0;median=0;}
      if(this.predictionCount > this.settings.min_predictions){this.predictionCount=0;}
      }
    }
    console.debug("-- Price -- :" + currentPrice);console.debug("-- Prediction -- :" + prediction);
    console.debug("-- Buy  -- :" + limit_buy);console.debug("-- Sell  -- :" + limit_sell);
    console.debug("-- Stop  -- :" + stoporder);console.debug("-- Take  -- :" + takeorder);
    console.debug("-- Spread  -- :" + spread);
    console.debug('-- Learning Method -- :' + this.settings.method);
    //stoploss
    if (this.stopLoss.shouldSell(candle)) {this.advice('short');} 
    else {this.advice('long');}
  },
  end: function() {log.debug('THE END');}
};
module.exports = method;

/* copilot explain
This file, `NEURALNET.js`, is a trading strategy for the Gekko trading bot. It leverages machine learning, specifically neural networks, for predicting market trends and making trading decisions. Here's a detailed breakdown of the code:

### Libraries and Modules
- **openvino-node**: For neural network operations.
- **ccxt**: For interacting with cryptocurrency exchanges.
- **convnetjs** and **deepqlearn**: For neural network and reinforcement learning.
- **underscore**: Utility library.
- **mathjs** and **compute-covariance**: For mathematical operations.
- **chess.js**: For simulating chess games (used for debugging or random operations).
- **fs-extra**: For file system operations.
- **log.js** and **util.js**: Custom logging and utility modules.

### Configuration and Initialization
- ** Settings and Variables **: Various settings and variables are initialized, including symbol, type, side, amount, price, and exchange-related variables.
- ** Exchange Initialization **: Initializes an exchange object using ccxt.

### Functions
1. **OHLCV Data Fetching**:
   - `ohlcv`: Fetches OHLCV (Open, High, Low, Close, Volume) data from the exchange.

2. **Order Placement**:
   - `buy`, `sell`, `stop`, `take`: Functions to place different types of limit orders (buy, sell, stop, take) on the exchange.

3. **Open Orders Fetching**:
   - `openOrders`: Fetches open orders from the exchange.

4. **Neural Network and Learning**:
   - **Initialization**:
     - `init`: Initializes the neural network with random parameters and sets up the training method.
   - **Learning**:
     - `learn`: Trains the neural network using price data.
     - `setNormalizeFactor`: Sets a normalization factor for price data.
     - `brain`: Implements reinforcement learning using deepqlearn.
   - **Prediction**:
     - `update`: Updates the neural network with new candle data.
     - `predictCandle`: Predicts the next candle using the neural network.
   - **Debugging or Random Operations:  
     - `fxchess`: Simulates a random game of chess (used for debugging or random operations).
     - `makeoperator`: Generates a random operator for debugging purposes.

5. **Trading Logic**:
   - `check`: Main function that checks trading conditions and makes decisions based on predictions and calculated metrics (Alpha, Beta, Spread).

6. **End**:
   - `end`: Function to be called at the end of the strategy.
*/
