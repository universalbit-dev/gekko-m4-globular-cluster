/**
 * @file baseTradingMethod.js
 * @description Defines the Base class, a core component for creating trading strategies within the Gekko framework.
 * This class handles key aspects of strategy execution, such as:
 * - Managing both synchronous and asynchronous custom indicators.
 * - Processing real-time market data (candles) to generate actionable trading advice.
 * - Emitting and handling events related to the strategy's lifecycle.
 *
 * Key Features:
 * - Dynamically loads indicators from the configured directory.
 * - Supports both synchronous and asynchronous indicator calculations.
 * - Provides default implementations for optional methods (e.g., `update`, `end`, `onTrade`).
 * - Ensures essential methods (`init` and `check`) are implemented for custom strategies.
 *
 * Usage:
 * Extend this class to implement custom trading strategies. Custom strategies must define the `init` and `check` methods,
 * while other methods can be optionally overridden to customize behavior.
 *
 * @author Mike van Rossum
 * @copyright 2014-2017
 * @license MIT License
 */

// Import required modules
const _ = require("underscore");
const fs = require("fs-extra");
const util = require('../../core/util');
const log = require('../../core/log');
const { EventEmitter } = require("events");

// Extract configuration and environment details
const config = util.getConfig();
const dirs = util.dirs();
const ENV = util.gekkoEnv();
const mode = util.gekkoMode();
const startTime = util.getStartTime();
const indicatorsPath = dirs.methods + 'indicators/';

// Load all available indicators dynamically
const indicatorFiles = fs.readdirSync(indicatorsPath);
const Indicators = {};

// Register each indicator, skipping files with names starting with "_"
_.each(indicatorFiles, function (indicator) {
  const indicatorName = indicator.split(".")[0];
  if (indicatorName[0] !== "_") {
    try {
      Indicators[indicatorName] = require(indicatorsPath + indicator);
    } catch (e) {
      log.error("Failed to load indicator", indicatorName);
    }
  }
});

// Store the names of all loaded indicators
const allowedIndicators = _.keys(Indicators);

/**
 * Base class for creating trading strategies.
 * Handles common functionality such as indicator management and event handling.
 */
var Base = function (settings) {
  _.bindAll(this, _.functions(this));
  EventEmitter.call(this);

  // Initialize strategy state variables
  this.age = 0; // Number of ticks processed
  this.processedTicks = 0; // Ticks processed by the strategy
  this.setup = false; // Indicates whether the strategy is properly initialized
  this.settings = settings;
  this.tradingAdvisor = config.tradingAdvisor;
  this.priceValue = 'open'; // Default price type for indicators
  this.indicators = {}; // Stores all indicators used by the strategy
  this.asyncTick = false; // Indicates whether async processing is used
  this.deferredTicks = []; // Stores deferred ticks for async processing

  this.propogatedAdvices = 0; // Count of advice events emitted
  this.completedWarmup = false; // Indicates whether warmup is complete

  this.asyncIndicatorRunner = new AsyncIndicatorRunner();

  // Ensure essential methods (init, check) are implemented
  _.each(['init', 'check'], function (fn) {
    if (!this[fn]) util.die('No ' + fn + ' function in this strategy found.');
  }, this);

  // Define optional methods if not implemented
  if (!this.update) this.update = function () {};
  if (!this.end) this.end = function () {};
  if (!this.onTrade) this.onTrade = function () {};

  // Run the strategy's initialization logic
  this.init();

  // Ensure required history settings are consistent
  if (_.isNumber(this.requiredHistory)) {
    log.debug('Ignoring strategy\'s required history, using the "config.tradingAdvisor.historySize" instead.');
  }
  this.requiredHistory = config.tradingAdvisor.historySize;

  // Define default logging behavior
  if (!config.debug || !this.log) this.log = function () {};

  this.setup = true;

  // Determine if async indicator processing is required
  if (_.size(this.asyncIndicatorRunner.tulipIndicators)) this.asyncTick = false;
  else delete this.asyncIndicatorRunner;
};

// Export the Base class as a module
module.exports = Base;
