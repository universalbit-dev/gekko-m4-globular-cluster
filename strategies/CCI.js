/*copilot explain
This JavaScript file (CCI.js) defines a trading strategy for the Gekko trading bot using the Commodity Channel Index (CCI). Here are the key components:

    Dependencies:
        lodash for utility functions.
        log for logging.
        StopLoss for implementing a stop loss mechanism.

    Method Initialization (method.init):
        Sets up initial properties such as currentTrend, requiredHistory, stopLoss, age, trend, and thresholds.
        Adds the CCI indicator.

    Candle Update (method.update):
        Updates the stop loss with the new candle data.

    Logging (method.log):
        Logs the calculated CCI properties for debugging purposes.

    Check Method (method.check):
        Evaluates the CCI indicator and determines trading advice (buy/sell/hold) based on the trend.
        Handles overbought/oversold conditions and updates the trend state.
        Implements a stop loss check to sell if necessary.

    Export:
        The method object is exported for use in the Gekko trading bot.

This strategy uses the CCI indicator to identify overbought and oversold conditions and makes trading decisions accordingly. 
It also incorporates a stop loss mechanism to limit potential losses. You can view the full content here.
*/

var _ = require('lodash');
var log = require('../core/log.js');
var Wrapper = require('../strategyWrapperRules.js');
//let's create our own method
var method = {Wrapper};
const StopLoss = require('./indicators/StopLoss');
// prepare everything our method needs
method.init = function() {
  this.currentTrend;
  this.requiredHistory = this.tradingAdvisor.historySize;
  this.stopLoss = new StopLoss(5); // 5% stop loss threshold
  this.age = 0;
  this.trend = {
    direction: 'undefined',duration: 0,persisted: false,adviced: false
  };
  this.historySize = this.settings.history;
  this.ppoadv = 'none';
  this.uplevel = this.settings.thresholds.up;
  this.downlevel = this.settings.thresholds.down;
  this.persisted = this.settings.thresholds.persistence;

  // log.debug("CCI started with:\nup:\t", this.uplevel, "\ndown:\t", this.downlevel, "\npersistence:\t", this.persisted);
  // define the indicators we need
  this.addIndicator('cci', 'CCI', this.settings);
}

// what happens on every new candle?
method.update = function(candle) { this.stopLoss.update(candle);}

// for debugging purposes: log the last calculated
// EMAs and diff.
method.log = function(candle) {
    var cci = this.indicators.cci;
    if (typeof(cci.result) == 'boolean') {
        log.debug('Insufficient data available. Age: ', cci.size, ' of ', cci.maxSize);
        return;
    }

    log.debug('calculated CCI properties for candle:');
    log.debug('Price: ', candle.close);
    log.debug('CCI tp: ', cci.tp);
    log.debug('CCI avgtp: ', cci.avgtp);
    log.debug('CCI mean: ', cci.mean);
    if (typeof(cci.result) == 'boolean')
        log.debug('no data available.');
    else
        log.debug('CCI: ', cci.result);
}

method.check = function(candle) {

    var lastPrice = candle.close;

    this.age++;
    var cci = this.indicators.cci;

    if (typeof(cci.result) == 'number') {

        // overbought?
        if (cci.result >= this.uplevel && (this.trend.persisted || this.persisted == 0) && !this.trend.adviced && this.trend.direction == 'overbought' ) {
            this.trend.adviced = true;
            this.trend.duration++;
            this.advice('short');
        } else if (cci.result >= this.uplevel && this.trend.direction != 'overbought') {
            this.trend.duration = 1;
            this.trend.direction = 'overbought';
            this.trend.persisted = false;
            this.trend.adviced = false;
            if (this.persisted == 0) {
                this.trend.adviced = true;
                this.advice('short');
            }
        } else if (cci.result >= this.uplevel) {
            this.trend.duration++;
            if (this.trend.duration >= this.persisted) {
                this.trend.persisted = true;
            }
        } else if (cci.result <= this.downlevel && (this.trend.persisted || this.persisted == 0) && !this.trend.adviced && this.trend.direction == 'oversold') {
            this.trend.adviced = true;
            this.trend.duration++;
            this.advice('long');
        } else if (cci.result <= this.downlevel && this.trend.direction != 'oversold') {
            this.trend.duration = 1;
            this.trend.direction = 'oversold';
            this.trend.persisted = false;
            this.trend.adviced = false;
            if (this.persisted == 0) {
                this.trend.adviced = true;
                this.advice('long');
            }
        } else if (cci.result <= this.downlevel) {
            this.trend.duration++;
            if (this.trend.duration >= this.persisted) {
                this.trend.persisted = true;
            }
        } else {
            if( this.trend.direction != 'nodirection') {
                this.trend = {
                    direction: 'nodirection',
                    duration: 0,
                    persisted: false,
                    adviced: false
                };
            } else {this.trend.duration++;}
        }
    }

    log.debug("Trend: ", this.trend.direction, " for ", this.trend.duration);
}

module.exports = method;
