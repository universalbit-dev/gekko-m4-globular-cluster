/**
 * NEURALNET_REFINEMENTS.js
 *
 * This version includes refinements to improve readability, maintainability, and performance.
 * Key changes:
 * - Modularized learning methods
 * - Optimized reinforcement learning logic
 * - Improved parameter handling and randomization toggles
 * - Enhanced logging and debugging
 * - Centralized configurations
 */
const convnetjs = require('../core/convnet.js');
const deepqlearn = require('../core/deepqlearn.js');
const log = require('../core/log.js');
const config = require('../core/util.js').getConfig();
const StopLoss = require('./indicators/StopLoss');

// Load strategy settings
const settings = config.NEURALNET;

// Learning method configurations
const learningMethods = {
  'sgd': { method: 'sgd', momentum: 0.0 },
  'sgd+momentum': { method: 'sgd+momentum', momentum: 0.9 },
  'adadelta': { method: 'adadelta', eps: 1e-6, ro: 0.95 },
  'adagrad': { method: 'adagrad', eps: 1e-6 },
  'nesterov': { method: 'nesterov', momentum: 0.9 },
  'windowgrad': { method: 'windowgrad', eps: 1e-6, ro: 0.95 }
};

const NeuralNetStrategy = {
  priceBuffer: [],
  predictionCount: 0,
  batchsize: 1,
  scale: 1,
  nn: null,
  trainer: null,

  // Initialize the strategy
  init: function() {
    log.info("Initializing NEURALNET_REFINEMENTS strategy...");
    this.name = 'NEURALNET_REFINEMENTS';
    this.nn = new convnetjs.Net();
    this.stopLoss = new StopLoss(5); // 5% stop loss threshold

    // Configure neural network layers
    const layers = [
      { type: 'input', out_sx: 1, out_sy: 1, out_depth: 4 },
      { type: 'fc', num_neurons: 21, activation: 'relu' },
      { type: 'fc', num_neurons: 21, activation: 'sigmoid' },
      { type: 'regression', num_neurons: 1 }
    ];
    this.nn.makeLayers(layers);

    // Select learning method
    const selectedMethod = learningMethods[settings.method || 'adadelta'];
    this.trainer = new convnetjs.Trainer(this.nn, {
      method: selectedMethod.method,
      learning_rate: settings.learning_rate,
      momentum: selectedMethod.momentum || 0.0,
      batch_size: this.batchsize,
      l2_decay: settings.l2_decay
    });

    log.info("Neural network and trainer configured.");
  },

  // Normalize data scale
  setNormalizeFactor: function(candle) {
    this.scale = Math.pow(10, Math.trunc(candle.high).toString().length + 2);
  },

  // Train the neural network with price data
  learn: async function() {
    for (let i = 0; i < this.priceBuffer.length - 1; i++) {
      const data = this.priceBuffer[i];
      const currentPrice = this.priceBuffer[i + 1];
      const vol = new convnetjs.Vol(data);
      this.trainer.train(vol, currentPrice);
    }
  },

  // Reinforcement learning logic
  trainBrain: async function(brain, data) {
    const action = brain.forward(data);
    const reward = action === 0 ? 1.0 : 0.0;
    brain.backward(reward);
    brain.epsilon_test_time = 0.0;
    brain.learning = false;
    return brain.forward(data);
  },

  // Update the strategy with the latest candle
  update: function(candle) {
    this.stopLoss.update(candle);
    if (this.scale === 1 && candle.high > 1 && this.predictionCount === 0) {
      this.setNormalizeFactor(candle);
    }

    this.priceBuffer.push([
      candle.low / this.scale,
      candle.high / this.scale,
      candle.close / this.scale,
      candle.open / this.scale,
      candle.volume / 1000
    ]);

    if (this.priceBuffer.length > settings.price_buffer_len) {
      this.priceBuffer.shift();
    }

    if (this.priceBuffer.length >= this.batchsize * 2) {
      this.learn();
    }
  },

  // Predict the next candle
  predictCandle: function() {
    const vol = new convnetjs.Vol(this.priceBuffer);
    const prediction = this.nn.forward(vol);
    return prediction.w[0];
  },

  // Make trading decisions
  check: function() {
    const prediction = this.predictCandle() * this.scale;
    const currentPrice = this.priceBuffer[this.priceBuffer.length - 1][2] * this.scale;

    if (prediction > currentPrice) {
      log.info("Prediction indicates upward trend. Advising to go long.");
      this.advice('long');
    } else if (prediction < currentPrice) {
      log.info("Prediction indicates downward trend. Advising to go short.");
      this.advice('short');
    }

    log.debug(`Prediction: ${prediction}, Current Price: ${currentPrice}`);
  },

  // Finalize the strategy
  end: function() {
    log.info("Strategy execution finished.");
  }
};

module.exports = NeuralNetStrategy;
