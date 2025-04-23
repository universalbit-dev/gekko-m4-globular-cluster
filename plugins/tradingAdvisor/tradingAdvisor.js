/**
 * TradingAdvisor is a core component of the Gekko trading bot, responsible for managing trading strategies,
 * handling real-time and historical data, and processing candles for strategy execution. It integrates with
 * candle batching and custom strategies to provide a modular and extensible trading framework.
 *
 * Key Features:
 * - Dynamically loads and initializes trading strategies based on user configuration.
 * - Processes incoming candle data using a batching system for custom candle sizes.
 * - Supports both real-time and historical data preparation for strategy execution.
 * - Relays trading advice, strategy updates, and notifications to other components.
 * - Handles trade completion events and propagates updates to trading strategies.
 *
 * Usage:
 * - Configure the strategy in the Gekko configuration file under `tradingAdvisor`.
 * - Ensure the strategy file exists in the methods directory with the correct name.
 * - Process candles with `processCandle`, which interacts with the batching system and strategy.
 * - Extensible for implementing new strategies and integrating with the Gekko ecosystem.
 *
 * License:
 * The MIT License (MIT)
 * Copyright (c) 2014-2017 Mike van Rossum
 */

// Importing required modules
const _ = require("underscore");
const { EventEmitter } = require("events"); // Provides an interface for handling events
class Event extends EventEmitter {}; // Custom event emitter class
const fs = require("fs-extra"); // File system utilities
const util = require('../../core/util'); // Utility functions
const dirs = util.dirs(); // Directories configuration
var config = util.getConfig(); // Gekko configuration
const moment = require('moment'); // Date and time utilities
const log = require("../../core/log.js"); // Logging utility

var CandleBatcher = require('../../core/candleBatcher'); // Handles batching of candle data

// Actor is the core class responsible for managing strategies and processing candles
var Actor = function(done) {
  // Bind all functions of this object to ensure the context is preserved
  _.bindAll(this, _.functions(this));

  // Inherit from EventEmitter
  EventEmitter.call(this);
  this.done = done;

  // Set up a candle batcher with the configured candle size
  var batcher = new CandleBatcher(config.tradingAdvisor.candleSize);
  this.batcher = batcher;

  // Load the strategy name from the configuration
  this.strategyName = config.tradingAdvisor.method;

  // Initialize the trading strategy
  this.setupStrategy();

  // Determine the mode (e.g., real-time or backtesting)
  var mode = util.gekkoMode();

  // If running in real-time mode, prepare historical data
  if (mode === 'realtime') {
    var Stitcher = require('../../core/tools/dataStitcher');
    var stitcher = new Stitcher(this.batcher);
    stitcher.prepareHistoricalData(done);
  }
}

// Inherit EventEmitter capabilities
util.makeEventEmitter(Actor);
util.inherit(Event, Actor);

// Set up the trading strategy
Actor.prototype.setupStrategy = function() {
  // Check if the strategy file exists; if not, terminate the process
  if (!fs.existsSync(dirs.methods + this.strategyName + '.js'))
    util.die('Gekko can\'t find the strategy "' + this.strategyName + '"');
  
  log.info('\t', 'Using the strategy: ' + this.strategyName);

  // Load the strategy module
  var strategy = require(dirs.methods + this.strategyName);

  // Load the base trading method
  const WrappedStrategy = require("./baseTradingMethod");

  // Add all strategy functions to the WrappedStrategy prototype
  _.each(strategy, function(fn, name) {
    WrappedStrategy.prototype[name] = fn;
  });

  // Load strategy-specific configuration if available
  let stratSettings;
  if (config[this.strategyName]) {
    stratSettings = config[this.strategyName];
  }

  // Initialize the strategy
  this.strategy = new WrappedStrategy(stratSettings);

  // Set up event handlers for strategy events
  this.strategy
    .on('stratWarmupCompleted', e => this.deferredEmit('stratWarmupCompleted', e))
    .on('advice', this.relayAdvice)
    .on('stratUpdate', e => this.deferredEmit('stratUpdate', e))
    .on('stratNotification', e => this.deferredEmit('stratNotification', e))
    .on('tradeCompleted', this.processTradeCompleted);

  // Handle batched candle events
  this.batcher
    .on('candle', _candle => {
      const { id, ...candle } = _candle; // Exclude the `id` property
      this.deferredEmit('stratCandle', candle); // Emit the candle to the strategy
      this.emitStratCandle(candle); // Process the candle with the strategy
    });
}

// Process an incoming candle
Actor.prototype.processCandle = function(candle, done) {
  this.candle = candle;

  // Write the candle to the batcher and check if the batch is completed
  const completedBatch = this.batcher.write([candle]);
  if (completedBatch) {
    this.next = done; // Store the callback for the next step
  } else {
    done(); // Call the callback immediately if no batch is completed
    this.next = false;
  }
  this.batcher.flush(); // Flush any pending data in the batcher
}

// Emit a custom-sized candle to the trading strategy
Actor.prototype.emitStratCandle = function(candle) {
  const next = this.next || _.noop; // Use the stored callback or a no-op function
  this.strategy.tick(candle, next); // Tick the strategy with the candle
}

// Handle a completed trade event
Actor.prototype.processTradeCompleted = function(trade) {
  this.strategy.processTrade(trade); // Notify the strategy of the completed trade
}

// Finish up the strategy
Actor.prototype.finish = function(done) {
  this.strategy.finish(done); // Call the strategy's finish method
}

// Relay trading advice from the strategy
Actor.prototype.relayAdvice = function(advice) {
  // Set the advice date to one minute after the candle's start time
  advice.date = this.candle.start.clone().add(1, 'minute');
  this.deferredEmit('advice', advice); // Emit the advice event
}

// Export the Actor class
module.exports = Actor;
