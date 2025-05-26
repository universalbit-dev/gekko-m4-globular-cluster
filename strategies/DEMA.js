/**
 * DEMA Strategy with Advanced Elliott Wave Analysis
 * 
 * This strategy utilizes the Double Exponential Moving Average (DEMA) and Simple Moving Average (SMA) indicators
 * to identify market trends and make trading decisions. Additionally, it incorporates an advanced Elliott Wave 
 * analysis to detect complex market patterns and enhance the decision-making process.
 * 
 * Key Components:
 * - DEMA Indicator: Calculates the Double Exponential Moving Average to identify the trend direction.
 * - SMA Indicator: Calculates the Simple Moving Average to provide a baseline for comparison with the DEMA.
 * - StopLoss Indicator: Implements a stop-loss mechanism to limit potential losses to a specified threshold (5%).
 * - Advanced Elliott Wave Analysis: Analyzes market waves to detect impulse and corrective wave patterns, 
 *   providing additional insights for trend reversals and continuations.
 * 
 * Trading Logic:
 * - The strategy checks the relationship between DEMA and SMA to determine the current trend (up or down).
 * - It uses the Elliott Wave analysis to identify potential trend reversals or continuations based on the wave counts.
 * - The strategy advises 'long' (buy) or 'short' (sell) positions based on the combined analysis of DEMA, SMA, 
 *   and Elliott Wave patterns.
 * 
 * This strategy aims to leverage both traditional technical indicators and advanced wave analysis to improve 
 * trading performance and decision-making accuracy.
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
  this.name = 'DEMA';

  this.currentTrend = '';
  this.requiredHistory = this.tradingAdvisor.historySize;
  this.stopLoss = new StopLoss(5); // 5% stop loss threshold
  // define the indicators we need
  this.addIndicator('DEMA', 'DEMA', this.settings);
  this.addIndicator('SMA', 'SMA', this.settings.weight);

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
// EMAs and diff.
method.log = function() {
  let DEMA = this.indicators.DEMA;
  let SMA = this.indicators.SMA.result;

  // Log  in  table format
const TableData = [
  { Metric: 'Inner EMA', Value: DEMA.inner.result },
  { Metric: 'Outer EMA', Value: DEMA.outer.result },
  { Metric: 'DEMA', Value: DEMA.result },
  { Metric: 'SMA', Value: SMA },
  { Metric: 'DEMA Age (candles)', Value: DEMA.inner.age }
];

// Display the table
console.log(TableData);
  // Log Elliott Wave analysis in a table with clear labels
const waveCounts = this.ewAnalyzer.getWaveCounts();
console.log([
  { WaveType: 'Impulse', Count: waveCounts.impulse },
  { WaveType: 'Corrective', Count: waveCounts.corrective }
]);
}

method.check = function(candle) {
  let DEMA = this.indicators.DEMA;
  let SMA = this.indicators.SMA;

  let resDEMA = DEMA.result;
  let resSMA = SMA.result;
  let price = candle.close;
  let diff = resSMA - resDEMA;
  console.debug('Spread:', diff);

  if (DEMA.inner.result > DEMA.outer.result) {
    log.debug('We are currently in Up trend');
    this.currentTrend = 'up';
  } else if (DEMA.inner.result < DEMA.outer.result) {
    log.debug('We are currently in Down trend');
    this.currentTrend = 'down';
  }

  // Use advanced Elliott Wave analysis in trading decisions
  if (this.ewAnalyzer.isWaveComplete()) {
    let waveCounts = this.ewAnalyzer.getWaveCounts();

    if (waveCounts.impulse >= 5) {
      // End of impulse wave (potential trend reversal)
      if (this.currentTrend !== 'down') {
        this.currentTrend = 'down';
        this.advice('short');
      }
    } else if (waveCounts.corrective >= 3) {
      // End of corrective wave (potential trend continuation)
      if (this.currentTrend !== 'up') {
        this.currentTrend = 'up';
        this.advice('long');
      }
    }
  }

  if (diff > this.settings.thresholds.up && this.currentTrend !== 'up') {
    this.currentTrend = 'up';
    this.advice('long');
  } else if (diff < this.settings.thresholds.down && this.currentTrend !== 'down') {
    this.currentTrend = 'down';
    this.advice('short');
  }
}

module.exports = method;
