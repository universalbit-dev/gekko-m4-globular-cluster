/**
 * @file CCI.js
 * @description This strategy script combines the Commodity Channel Index (CCI) indicator with Advanced Elliott Wave Analysis
 * to provide buy and sell signals based on trend detection and wave patterns.
 * 
 */

var _ = require('lodash');
var log = require('../core/log.js');
var Wrapper = require('../strategyWrapperRules.js');
var StopLoss = require('./indicators/StopLoss');

// let's create our own method
var method = {Wrapper};

// Advanced Elliott Wave Analysis function
function AdvancedElliottWave() {
  this.wavePattern = [];
  this.previousPrice = 0;
  this.impulseWaveCount = 0;
  this.correctiveWaveCount = 0;
}

AdvancedElliottWave.prototype.update = function(candle) {
  let currentPrice = candle.close;
  let waveType = '';

  // Determine wave type based on price movement
  if (currentPrice > this.previousPrice) {
    waveType = 'impulse';
    this.impulseWaveCount++;
    this.correctiveWaveCount = 0;
  } else {
    waveType = 'corrective';
    this.correctiveWaveCount++;
    this.impulseWaveCount = 0;
  }

  // Add wave type to pattern
  this.wavePattern.push(waveType);

  // Ensure the wave pattern array doesn't grow indefinitely
  if (this.wavePattern.length > 10) {
    this.wavePattern.shift();
  }

  this.previousPrice = currentPrice;
}

AdvancedElliottWave.prototype.getWaveCounts = function() {
  return {
    impulse: this.impulseWaveCount,
    corrective: this.correctiveWaveCount
  };
}

AdvancedElliottWave.prototype.isWaveComplete = function() {
  let counts = this.getWaveCounts();
  return counts.impulse >= 5 || counts.corrective >= 3;
}

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

  // Add CCI indicator
  this.addIndicator('cci', 'CCI', this.settings);
  
  // Initialize Elliott Wave analysis
  this.ewAnalyzer = new AdvancedElliottWave();
}

// what happens on every new candle?
method.update = function(candle) {
  this.stopLoss.update(candle);
  
  // Update Elliott Wave analysis with new candle data
  this.ewAnalyzer.update(candle);
}

// for debugging purposes: log the last calculated
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
    
  // Log Elliott Wave analysis
  log.debug('Elliott Wave Analysis:', this.ewAnalyzer.getWaveCounts());
}

method.check = function(candle) {
  var lastPrice = candle.close;
  this.age++;
  var cci = this.indicators.cci;
  var elliottWaveSignal = this.ewAnalyzer.isWaveComplete(); // Get Elliott Wave signal

  switch (cci.result) {
    case (cci.result >= this.uplevel && (this.trend.persisted || this.persisted == 0) && !this.trend.adviced && this.trend.direction !== 'overbought'):
      this.trend.adviced = true;
      this.trend.duration++;
      this.advice('short');
      break;
    case (cci.result >= this.uplevel && this.trend.direction !== 'overbought'):
      this.trend.duration = 1;
      this.trend.direction = 'overbought';
      this.trend.persisted = false;
      this.trend.adviced = false;
      break;
    case (this.persisted == 0):
      this.trend.adviced = true;
      this.advice('short');
      break;
    case (cci.result >= this.uplevel):
      this.trend.duration++;
      break;
    case (this.trend.duration >= this.persisted):
      this.trend.persisted = true;
      break;
    case (cci.result <= this.downlevel && (this.trend.persisted || this.persisted == 0) && !this.trend.adviced && this.trend.direction !== 'oversold'):
      this.trend.adviced = true;
      this.trend.duration++;
      this.advice('long');
      break;
    case (cci.result <= this.downlevel && this.trend.direction !== 'oversold'):
      this.trend.duration = 1;
      this.trend.direction = 'oversold';
      this.trend.persisted = false;
      this.trend.adviced = false;
      break;
    case (this.persisted == 0):
      this.trend.adviced = true;
      this.advice('long');
      break;
    case (cci.result <= this.downlevel):
      this.trend.duration++;
      break;
    case (this.trend.duration >= this.persisted):
      this.trend.persisted = true;
      break;
    case (this.trend.direction !== 'nodirection'):
      this.trend = {direction: 'nodirection',duration: 0,persisted: false,adviced: false};
      break;
    default:
      this.trend.duration++;
  }

  // Combine CCI and Elliott Wave signals for final advice
  if (elliottWaveSignal) {
    let waveCounts = this.ewAnalyzer.getWaveCounts();

    if (waveCounts.impulse >= 5) {
      // End of impulse wave (potential trend reversal)
      if (this.trend.direction !== 'down') {
        this.trend.direction = 'down';
        this.advice('short');
      }
    } else if (waveCounts.corrective >= 3) {
      // End of corrective wave (potential trend continuation)
      if (this.trend.direction !== 'up') {
        this.trend.direction = 'up';
        this.advice('long');
      }
    }
  }

  log.debug("Trend: ", this.trend.direction, " for ", this.trend.duration);
}

module.exports = method;
