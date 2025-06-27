/*
  RSI Bull and Bear + ADX modifier with Fibonacci Analysis
  (CC-BY-SA 4.0) Tommie Hansen
  Log file limited to 1MB
*/

const log = require('../core/log.js');
const config = require('../core/util.js').getConfig();
const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, 'rsibullbearadx.json');
const MAX_LOG_SIZE = 1048576; // 1 MB

function writeLog(data) {
  try {
    if (fs.existsSync(LOG_PATH)) {
      const stats = fs.statSync(LOG_PATH);
      if (stats.size >= MAX_LOG_SIZE) {
        fs.truncateSync(LOG_PATH, 0);
        log.info('Log file exceeded 1MB. Truncated.');
      }
    }
    fs.appendFileSync(LOG_PATH, JSON.stringify(data) + '\n');
  } catch (err) {
    log.error('Error writing to log:', err);
  }
}

const strat = {
  init: function () {
    this.name = 'RSI Bull & Bear with ADX and Fibo';
    this.requiredHistory = config.tradingAdvisor.historySize;
    this.resetTrend();
    this.candleHistory = [];
    this.debug = false;

    // Performance tweaks
    config.backtest.batchSize = 1000;
    config.silent = true;
    config.debug = false;

    // Indicators
    this.addIndicator('maFast', 'SMA', this.settings.SMA_short);
    this.addIndicator('maSlow', 'SMA', this.settings.SMA_long);
    this.addIndicator('RSI', 'RSI', { interval: this.settings.RSI });
    this.addIndicator('BULL_RSI', 'RSI', { interval: this.settings.BULL_RSI });
    this.addIndicator('BEAR_RSI', 'RSI', { interval: this.settings.BEAR_RSI });
    this.addIndicator('ADX', 'ADX', this.settings.ADX);

    // Modifiers
    this.BULL_MOD_high = this.settings.BULL_MOD_high;
    this.BULL_MOD_low = this.settings.BULL_MOD_low;
    this.BEAR_MOD_high = this.settings.BEAR_MOD_high;
    this.BEAR_MOD_low = this.settings.BEAR_MOD_low;

    // Fibonacci
    this.fibonacciLevels = [0.236, 0.382, 0.5, 0.618, 1.0];

    // Debug/statistics
    this.startTime = new Date();
    if (this.debug) {
      this.stat = {
        adx: { min: 1000, max: 0 },
        bear: { min: 1000, max: 0 },
        bull: { min: 1000, max: 0 }
      };
    }

    log.info("====================================");
    log.info('Running', this.name);
    log.info('====================================');
  },

  resetTrend: function () {
    this.trend = { duration: 0, direction: 'none', longPos: false };
  },

  lowHigh: function (val, type) {
    if (!this.stat) return;
    let cur = this.stat[type];
    if (!cur) return;
    if (val < cur.min) cur.min = val;
    else if (val > cur.max) cur.max = val;
  },

  calculateFibonacciLevels: function (high, low) {
    const range = high - low;
    return this.fibonacciLevels.map(lvl => low + range * lvl);
  },

  update: function (candle) {
    this.candleHistory.push(candle);
    if (this.candleHistory.length > this.requiredHistory) this.candleHistory.shift();
  },

  logTrade: function (candle, indicators, advice, fibLevels, trend) {
    const logEntry = {
      time: candle.start,
      price: candle.close,
      indicators,
      advice,
      fibLevels,
      trend
    };
    writeLog(logEntry);
  },

  check: function (candle) {
    // Example usage: (implement your actual logic here)
    const maFast = this.indicators.maFast.result;
    const maSlow = this.indicators.maSlow.result;
    const rsi = this.indicators.RSI.result;
    const adx = this.indicators.ADX.result;
    const fibLevels = this.calculateFibonacciLevels(candle.high, candle.low);

    // Example trend/advice logic
    let advice = 'wait';
    if (maFast > maSlow && rsi > 50 && adx > 20) {
      advice = 'long';
    } else if (maFast < maSlow && rsi < 50 && adx > 20) {
      advice = 'short';
    }

    this.logTrade(candle, { maFast, maSlow, rsi, adx }, advice, fibLevels, this.trend);

    if (advice === 'long') this.advice('long');
    else if (advice === 'short') this.advice('short');
    else this.advice();
  }
};

module.exports = strat;
