/*
  RSI Bull and Bear + ADX modifier with Fibonacci Analysis
  (CC-BY-SA 4.0) Tommie Hansen
*/

const log = require('../core/log.js');
const config = require('../core/util.js').getConfig();
const Wrapper = require('../strategyWrapperRules.js');
const { logger, appendToJsonFile } = require('./logger')('rsibullbearadx');

const strat = {
  init: function () {
    this.name = 'RSI Bull & Bear with ADX and Fibo';
    this.requiredHistory = config.tradingAdvisor.historySize;
    this.resetTrend();
    this.candleHistory = [];
    this.debug = false;

    // Performance
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

    // Debug
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
    const { maFast, maSlow, RSI, ADX } = indicators;

    const comments = [];
    if (maFast != null && maSlow != null) comments.push(maFast < maSlow ? 'BEAR' : 'BULL');
    if (RSI != null) {
      if (RSI > 80) comments.push('RSI Oversold');
      else if (RSI < 30) comments.push('RSI Overbought');
      else comments.push('RSI Weak');
    }
    if (ADX != null) comments.push(ADX > 25 ? 'ADX Strong' : 'ADX Weak');

    const output = {
      timestamp: new Date().toISOString(),
      strategyName: this.name,
      type: 'DATA',
      advice,
      trend: trend.direction,
      indicators: { RSI, ADX, maFast, maSlow },
      fibLevels,
      comments,
      candle: {
        open: candle.open,
        close: candle.close,
        high: candle.high,
        low: candle.low,
        time: candle.start,
        ...(candle.volume !== undefined ? { volume: candle.volume } : {})
      }
    };

    logger.info(output);
    appendToJsonFile(output);
  },

  check: function () {
    const ind = this.indicators;
    let maSlow = ind.maSlow.result;
    let maFast = ind.maFast.result;
    let RSI = ind.RSI.result;
    let ADX = ind.ADX.result;

    // Fibonacci levels calculation
    let fibLevels = [null, null, null, null, null];
    if (this.candleHistory && this.candleHistory.length > 0) {
      let high = Math.max(...this.candleHistory.map(c => c.high));
      let low = Math.min(...this.candleHistory.map(c => c.low));
      fibLevels = this.calculateFibonacciLevels(high, low);
      if (this.debug) log.info('Fibonacci Levels:', fibLevels);
    }

    // Log trade
    this.logTrade(this.candle, this.indicators, this.advice, fibLevels, this.trend);

    // BEAR
    if (maFast < maSlow) {
      RSI = ind.BEAR_RSI.result;
      let rsi_hi = this.settings.BEAR_RSI_high;
      let rsi_low = this.settings.BEAR_RSI_low;
      if (ADX > this.settings.ADX_high) rsi_hi += this.BEAR_MOD_high;
      else if (ADX < this.settings.ADX_low) rsi_low += this.BEAR_MOD_low;

      if (RSI > rsi_hi && this.candle.close < fibLevels[2]) this.short();
      else if (RSI < rsi_low && this.candle.close > fibLevels[2]) this.long();

      if (this.debug) this.lowHigh(RSI, 'bear');
    }
    // BULL
    else {
      RSI = ind.BULL_RSI.result;
      let rsi_hi = this.settings.BULL_RSI_high;
      let rsi_low = this.settings.BULL_RSI_low;
      if (ADX > this.settings.ADX_high) rsi_hi += this.BULL_MOD_high;
      else if (ADX < this.settings.ADX_low) rsi_low += this.BULL_MOD_low;

      if (RSI > rsi_hi && this.candle.close < fibLevels[2]) this.short();
      else if (RSI < rsi_low && this.candle.close > fibLevels[2]) this.long();

      if (this.debug) this.lowHigh(RSI, 'bull');
    }

    if (this.debug) this.lowHigh(ADX, 'adx');
  },

  long: function () {
    if (this.trend.direction !== 'up') {
      this.resetTrend();
      this.trend.direction = 'up';
      this.advice('long');
      if (this.debug) log.info('Going long');
    }
    if (this.debug) {
      this.trend.duration++;
      log.info('Long since', this.trend.duration, 'candle(s)');
    }
  },

  short: function () {
    if (this.trend.direction !== 'down') {
      this.resetTrend();
      this.trend.direction = 'down';
      this.advice('short');
      if (this.debug) log.info('Going short');
    }
    if (this.debug) {
      this.trend.duration++;
      log.info('Short since', this.trend.duration, 'candle(s)');
    }
  },

  end: function () {
    const seconds = ((new Date() - this.startTime) / 1000);
    const minutes = seconds / 60;
    const str = minutes < 1 ? `${seconds.toFixed(2)} seconds` : `${minutes.toFixed(2)} minutes`;
    log.info('====================================');
    log.info('Finished in ' + str);
    log.info('====================================');
    if (this.debug && this.stat) {
      const stat = this.stat;
      log.info('BEAR RSI low/high: ' + stat.bear.min + ' / ' + stat.bear.max);
      log.info('BULL RSI low/high: ' + stat.bull.min + ' / ' + stat.bull.max);
      log.info('ADX min/max: ' + stat.adx.min + ' / ' + stat.adx.max);
    }
  }
};

strat.Wrapper = Wrapper;
module.exports = strat;
