const log = require('../../core/log');

const StopLoss = function() {
  this.input = 'candle';
  this.candle = null;
  this.price = 0;
  this.action = 'continue'; // 'continue', 'stoploss', 'freefall'
  this.triggered = false;
};

// Initialize with settings
StopLoss.prototype.init = function() {
  this.threshold = typeof this.settings.threshold === 'number' ? this.settings.threshold : 5; // % drop for stop-loss
  this.trailing = typeof this.settings.trailing === 'boolean' ? this.settings.trailing : true;
  this.resetAfterTrigger = typeof this.settings.resetAfterTrigger === 'boolean' ? this.settings.resetAfterTrigger : false;
  this.candleSize = this.settings.candleSize || 1;

  this.price = 0;
  this.action = 'continue';
  this.triggered = false;

  log.info(
    `StopLoss initialized: threshold=${this.threshold}%, trailing=${this.trailing}, resetAfterTrigger=${this.resetAfterTrigger}, candleSize=${this.candleSize}`
  );

  if (this.candleSize <= 1) {
    log.warn(`[StopLoss] WARNING: You are using a very small candle size (${this.candleSize} min). This may cause performance issues.`);
  }
};

// Update internal state on every candle
StopLoss.prototype.update = function(candle) {
  this.candle = candle;

  if (this.price === 0) {
    this.price = candle.close;
  }

  const stoploss = this.price * (1 - this.threshold / 100);

  if (candle.close < stoploss) {
    if (!['stoploss', 'freefall'].includes(this.action)) {
      this.action = 'stoploss'; // trigger stoploss
    } else {
      this.updatePrice(); // lower our standards
      this.action = 'freefall'; // already triggered, do nothing
    }
  } else {
    if (this.trailing && this.price < candle.close) {
      this.updatePrice(); // trailing stop
    }
    this.action = 'continue';
  }
};

// Called by Gekko to make a decision
StopLoss.prototype.check = function() {
  if (this.action === 'stoploss' && !this.triggered) {
    this.triggered = true;
    log.info(`[StopLoss] Stop-loss triggered at price ${this.candle.close} (threshold: ${this.threshold}%)`);
    this.advice('short');
    if (this.resetAfterTrigger) {
      log.info('[StopLoss] Resetting stop-loss after trigger as configured.');
      this.price = 0;
      this.action = 'continue';
      this.triggered = false;
    }
  } else if (this.action === 'continue') {
    // No-op or this.advice(); to continue other strategy logic
  }
  // If action is 'freefall', stay out of the market
};

// Call this when a long (buy) is entered
StopLoss.prototype.onTrade = function(trade) {
  if (trade.action === 'buy') {
    this.price = trade.price;
    this.action = 'continue';
    this.triggered = false;
    log.info(`[StopLoss] Position entered (LONG) at ${trade.price}`);
  }
};

// Helper to update trailing stop price
StopLoss.prototype.updatePrice = function() {
  this.price = this.candle.close;
};

module.exports = StopLoss;
