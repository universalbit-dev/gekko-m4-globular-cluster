/**
 * Gann Indicator with DEMA, SMA, and Elliott Wave Analysis
 * 
 * This module implements a comprehensive indicator that combines Gann angles, 
 * Double Exponential Moving Average (DEMA), Simple Moving Average (SMA), and 
 * Elliott Wave Analysis. This indicator aims to provide robust signals for 
 * trading decisions.
 *
 * Features:
 * - Calculates Gann angles for time-price relationships.
 * - Utilizes DEMA for trend direction with reduced lag.
 * - Uses SMA for baseline trend comparison.
 * - Integrates Elliott Wave Analysis for detecting market patterns.
 * - Generates buy/sell signals based on combined analysis.
 * 
 * Usage:
 * const GannIndicator = require('./indicators/GANN');
 * const gann = new GannIndicator(settings);
 * 
 * // Update the indicator with new price data
 * gann.update(newCandle);
 * console.log(gann.result);
 * console.log(gann.getSignal());
 *
 * @param {object} settings - Configuration settings for the indicator.
 * @param {array} settings.gannAngleRatios - Array of Gann angle ratios.
 * @param {number} settings.DEMA - The period for the DEMA calculation.
 * @param {number} settings.SMA - The period for the SMA calculation.
 * @param {number} settings.shortWindowLength - The short window length for the Elliott Wave Oscillator.
 * @param {number} settings.longWindowLength - The long window length for the Elliott Wave Oscillator.
 *
 * @method update - Updates the indicator with a new candle.
 * @method getSignal - Retrieves the current buy/sell signal.
 * 
 * @module GANN
 */

var StopLoss = require('./StopLoss');
var ElliottWaveOscillator = require('./ELLIOTT');
var DEMA = require('./DEMA');
var SMA = require('./SMA');

var Indicator = function(settings) {
  this.input = 'candle';
  this.gannAngleRatios = settings.gannAngleRatios;
  this.stopLoss = new StopLoss(5); // 5% stop loss threshold
  this.ewAnalyzer = new ElliottWaveOscillator(settings.shortWindowLength, settings.longWindowLength);
  this.age = 0;
  this.dema = new DEMA({ weight: settings.DEMA });
  this.sma = new SMA(settings.SMA);
  this.currentTrend = '';
  this.signal = null;
  this.gannAngles = {};
}

Indicator.prototype.update = function(candle) {
  let price = candle.close;

  // Update DEMA and SMA
  this.dema.update(price);
  this.sma.update(price);

  // Update Elliott Wave analysis
  this.ewAnalyzer.update(price);

  // Calculate Gann Angles
  this.calculateGannAngles(price);

  // Generate signals
  this.generateSignals(price);
  
  this.age++;
}

Indicator.prototype.calculateGannAngles = function(price) {
  const timeElapsed = this.age;
  this.gannAngles = this.gannAngleRatios.reduce((acc, ratio) => {
    acc[ratio] = price + ratio * timeElapsed;
    return acc;
  }, {});
}

Indicator.prototype.generateSignals = function(price) {
  if (this.dema.result > this.sma.result) {
    this.currentTrend = 'up';
  } else {
    this.currentTrend = 'down';
  }

  let ewSignal = this.ewAnalyzer.getSignal();

  if (ewSignal === 'buy' && this.currentTrend !== 'up') {
    this.currentTrend = 'up';
    this.signal = 'buy';
  } else if (ewSignal === 'sell' && this.currentTrend !== 'down') {
    this.currentTrend = 'down';
    this.signal = 'sell';
  }

  if (price >= this.gannAngles[1] && this.currentTrend !== 'up') {
    this.currentTrend = 'up';
    this.signal = 'buy';
  } else if (price <= this.gannAngles[4] && this.currentTrend !== 'down') {
    this.currentTrend = 'down';
    this.signal = 'sell';
  }
}

Indicator.prototype.getSignal = function() {
  return this.signal;
}

module.exports = Indicator;
