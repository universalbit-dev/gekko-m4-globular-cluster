/**
 * StopLoss Plugin for Gekko M4
 * --------------------------------
 * Implements a simple (or trailing) stop-loss mechanism.
 * Monitors live or backtest trades, tracks entry price, and triggers a "short" advice
 * when the asset price falls below a configurable stop-loss threshold relative to the
 * entry or highest price (trailing).
 *
 * Notes:
 * - This is a basic example. Integration with your Gekko instance may require adjustments
 *
 */

const log = require('../../core/log');

const StopLoss = function() {
  this.triggered = false;
};

StopLoss.prototype.init = function() {
  this.stopLossPercent = this.settings.stopLossPercent || 5;
  this.entryPrice = null;
  log.info('StopLoss plugin initialized with stop-loss at ' + this.stopLossPercent + '%');
};

StopLoss.prototype.onTrade = function(trade) {
  if(trade.action === 'buy') {
    this.entryPrice = trade.price;
    this.highestPrice = trade.price;
    this.triggered = false;
  } else if(trade.action === 'sell') {
    this.entryPrice = null;
    this.highestPrice = null;
    this.triggered = false;
  }
};

StopLoss.prototype.processCandle = function(candle) {
  if(this.entryPrice && !this.triggered) {
    // For trailing stop-loss
    if(candle.close > this.highestPrice) {
      this.highestPrice = candle.close;
    }
    const threshold = this.highestPrice * (1 - this.stopLossPercent / 100);
    if(candle.close <= threshold) {
      this.triggered = true;
      log.info(`Stop-loss triggered at price ${candle.close}`);
      this.advice('short');
    }
  }
};

module.exports = StopLoss;
