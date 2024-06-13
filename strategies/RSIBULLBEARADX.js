var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();

var method = {
  /* INIT */
  init: function() {
    this.name = 'RSIBULLBEARADX';
    this.requiredHistory = config.tradingAdvisor.historySize;
    this.resetTrend();

    this.debug = false;
    config.backtest.batchSize = 1000; // increase performance
    config.silent = true; // NOTE: You may want to set this to 'false' @ live
    config.debug = false;

    // SMA
    this.addTulipIndicator('maSlow', 'sma', {optInTimePeriod: this.settings.SMA_long});
    this.addTulipIndicator('maFast', 'sma', {optInTimePeriod:this.settings.SMA_short});

    // RSI
    this.addTulipIndicator('rsi', 'rsi', {optInTimePeriod: this.settings.RSI});
    this.addTulipIndicator('BULL_RSI', 'rsi', {optInTimePeriod: this.settings.BULL_RSI});
    this.addTulipIndicator('BEAR_RSI', 'rsi', {optInTimePeriod: this.settings.BEAR_RSI});

    // ADX
    this.addTulipIndicator('adx', 'adx', {optInTimePeriod:this.settings.ADX});
    this.addTulipIndicator('dx', 'dx', {optInTimePeriod:this.settings.ADX});

    // MOD (RSI modifiers)
    this.BULL_MOD_high = this.settings.BULL_MOD_high;
    this.BULL_MOD_low = this.settings.BULL_MOD_low;
    this.BEAR_MOD_high = this.settings.BEAR_MOD_high;
    this.BEAR_MOD_low = this.settings.BEAR_MOD_low;

    // debug stuff
    this.startTime = new Date();

    // add min/max if debug
    if (this.debug) {
      this.stat = {
        adx: {min: 1000,max: 0},
        bear: {min: 1000,max: 0},
        bull: {min: 1000,max: 0}
      };
    }

    /* MESSAGES */

    // message the user about required history
    log.info("====================================");
    log.info('Running', this.name);
    log.info('====================================');
    log.info("Make sure your warmup period matches SMA_long and that Gekko downloads data if needed");
    this.requiredHistory = config.tradingAdvisor.historySize;
    // warn users
    if (this.requiredHistory < this.settings.SMA_long) {
    log.warn("*** WARNING *** Your Warmup period is lower then SMA_long. If Gekko does not download data automatically when running LIVE the strategy will default to BEAR-mode until it has enough data.");
    }

  },


  /* RESET TREND */
  resetTrend: function() {
    var trend = {duration: 0,direction: 'none',longPos: false,};
    this.trend = trend;
  },

  /* get low/high for backtest-period */
  lowHigh: function(val, type) {
    let cur;
    if (type == 'bear') {
      cur = this.stat.bear;
      if (val < cur.min) this.stat.bear.min = val; // set new
      else if (val > cur.max) this.stat.bear.max = val;
    } else if (type == 'bull') {
      cur = this.stat.bull;
      if (val < cur.min) this.stat.bull.min = val; // set new
      else if (val > cur.max) this.stat.bull.max = val;
    } else {
      cur = this.stat.adx;
      if (val < cur.min) this.stat.adx.min = val; // set new
      else if (val > cur.max) this.stat.adx.max = val;
    }
  },


  /* CHECK */
  check: function() {
    // get all indicators
    let ind = this.tulipIndicators,
    maSlow =  this.tulipIndicators.maSlow.result.result,
    maFast =  this.tulipIndicators.maFast.result.result,
    adx =  this.tulipIndicators.adx.result.result,dx=this.tulipIndicators.dx.result.result,
    rsi =  this.tulipIndicators.rsi.result.result;


    if (maFast < maSlow)
    {
    //bear rsi
      rsi = this.tulipIndicators.BEAR_RSI.result.result;
      let rsi_hi = this.settings.BEAR_RSI_high,rsi_low = this.settings.BEAR_RSI_low;
      //ADX
      if (adx > this.settings.ADX_high) rsi_hi = rsi_hi + this.BEAR_MOD_high;
      else if (adx < this.settings.ADX_low) rsi_low = rsi_low + this.BEAR_MOD_low;
      //DX
      if (dx > this.settings.ADX_high) rsi_hi = rsi_hi + this.BEAR_MOD_high;
      else if (dx < this.settings.ADX_low) rsi_low = rsi_low + this.BEAR_MOD_low;

      if (rsi > rsi_hi) this.short();
      else if (rsi < rsi_low) this.long();
      if (this.debug) this.lowHigh(rsi, 'bear');
    }

    else
    {
    //bull rsi
      rsi = this.tulipIndicators.BULL_RSI.result.result;
      let rsi_hi = this.settings.BULL_RSI_high,rsi_low = this.settings.BULL_RSI_low;

      // ADX
      if (adx > this.settings.ADX_high) rsi_hi = rsi_hi + this.BULL_MOD_high;
      else if (adx < this.settings.ADX_low) rsi_low = rsi_low + this.BULL_MOD_low;
      // DX
      if (dx > this.settings.ADX_high) rsi_hi = rsi_hi + this.BULL_MOD_high;
      else if (dx < this.settings.ADX_low) rsi_low = rsi_low + this.BULL_MOD_low;


      if (rsi > rsi_hi) this.short();
      else if (rsi < rsi_low) this.long();
      if (this.debug) this.lowHigh(rsi, 'bull');
    }

    // add adx low/high if debug
    if (this.debug) this.lowHigh(adx, 'adx');

  },


  /* LONG */
  long: function() {
    if (this.trend.direction !== 'up') // new trend? (only act on new trends)
    {
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


  /* SHORT */
  short: function() {
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


  /* END backtest */
  end: function() {
    let seconds = ((new Date() - this.startTime) / 1000),
      minutes = seconds / 60,
      str;

    minutes < 1 ? str = seconds.toFixed(2) + ' seconds' : str = minutes.toFixed(2) + ' minutes';

    log.info('====================================');
    log.info('Finished in ' + str);
    log.info('====================================');

    // print stats and messages if debug
    if (this.debug) {
      let stat = this.stat;
      log.info('BEAR RSI low/high: ' + stat.bear.min + ' / ' + stat.bear.max);
      log.info('BULL RSI low/high: ' + stat.bull.min + ' / ' + stat.bull.max);
      log.info('ADX min/max: ' + stat.adx.min + ' / ' + stat.adx.max);
    }

  }

};

module.exports = method;

/*
	RSI Bull and Bear + ADX modifier
	1. Use different RSI-strategies depending on a longer trend
	2. But modify this slighly if shorter BULL/BEAR is detected
	-
	(CC-BY-SA 4.0) Tommie Hansen
	https://creativecommons.org/licenses/by-sa/4.0/
	-
	NOTE: Requires custom indicators found here:
	https://github.com/Gab0/Gekko-extra-indicators
	(c) Gabriel Araujo
	Howto: Download + add to gekko/strategies/indicators
*/