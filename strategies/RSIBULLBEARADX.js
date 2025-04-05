/*
	RSI Bull and Bear + ADX modifier with Fibonacci Analysis
	1. Use different RSI-strategies depending on a longer trend
	2. But modify this slightly if shorter BULL/BEAR is detected
	3. Use Fibonacci retracement levels to identify potential support and resistance levels
	-
	(CC-BY-SA 4.0) Tommie Hansen
	https://creativecommons.org/licenses/by-sa/4.0/
*/

var log = require('../core/log.js');
var config = require('../core/util.js').getConfig();

// strategy
var strat = {

	/* INIT */
	init: function()
	{
		// core
		this.name = 'Simple Moving Average Rsi and Adx Modifiers ';
		this.requiredHistory = config.tradingAdvisor.historySize;
		this.resetTrend();
        this.candleHistory = [];
		// debug? set to false to disable all logging/messages/stats (improves performance in backtests)
		this.debug = false;

		// performance
		config.backtest.batchSize = 1000; // increase performance
		config.silent = true;
		config.debug = false;

		// SMA
		this.addIndicator('maFast', 'SMA', this.settings.SMA_long );
		this.addIndicator('maSlow', 'SMA', this.settings.SMA_short );

		// RSI
		this.addIndicator('RSI', 'RSI', { interval: this.settings.RSI });
		this.addIndicator('BULL_RSI', 'RSI', { interval: this.settings.BULL_RSI });
		this.addIndicator('BEAR_RSI', 'RSI', { interval: this.settings.BEAR_RSI });

		// ADX
		this.addIndicator('ADX', 'ADX',  this.settings.ADX )

		// MOD (RSI modifiers)
		this.BULL_MOD_high = this.settings.BULL_MOD_high;
		this.BULL_MOD_low = this.settings.BULL_MOD_low;
		this.BEAR_MOD_high = this.settings.BEAR_MOD_high;
		this.BEAR_MOD_low = this.settings.BEAR_MOD_low;

		// Fibonacci levels
		this.fibonacciLevels = [0.236, 0.382, 0.5, 0.618, 1.0];

		// debug stuff
		this.startTime = new Date();

		// add min/max if debug
		if( this.debug ){
			this.stat = {
				adx: { min: 1000, max: 0 },
				bear: { min: 1000, max: 0 },
				bull: { min: 1000, max: 0 }
			};
		}

		/* MESSAGES */

		// message the user about required history
		log.info("====================================");
		log.info('Running', this.name);
		log.info('====================================');
		log.info("Make sure your warmup period matches SMA_long and that Gekko downloads data if needed");

		// warn users
		if( this.requiredHistory < this.settings.SMA_long )
		{
			log.warn("*** WARNING *** Your Warmup period is lower then SMA_long");
		}

	}, // init()


	/* RESET TREND */
	resetTrend: function()
	{
		var trend = {
			duration: 0,
			direction: 'none',
			longPos: false,
		};

		this.trend = trend;
	},


	/* get low/high for backtest-period */
	lowHigh: function( val, type )
	{
		let cur;
		if( type == 'bear' ) {
			cur = this.stat.bear;
			if( val < cur.min ) this.stat.bear.min = val; // set new
			else if( val > cur.max ) this.stat.bear.max = val;
		}
		else if( type == 'bull' ) {
			cur = this.stat.bull;
			if( val < cur.min ) this.stat.bull.min = val; // set new
			else if( val > cur.max ) this.stat.bull.max = val;
		}
		else {
			cur = this.stat.adx;
			if( val < cur.min ) this.stat.adx.min = val; // set new
			else if( val > cur.max ) this.stat.adx.max = val;
		}
	},

	/* Calculate Fibonacci levels */
	calculateFibonacciLevels: function(high, low)
	{
		let levels = [];
		let range = high - low;
		for (let i = 0; i < this.fibonacciLevels.length; i++) {
			levels.push(low + range * this.fibonacciLevels[i]);
		}
		return levels;
	},
	
	update: function(candle) {
    // Push the new candle to the history
    this.candleHistory.push(candle);
    // Keep only the necessary number of candles
    if (this.candleHistory.length > this.requiredHistory) {
        this.candleHistory.shift();
    }
    },

	/* CHECK */
	check: function()
	{
		// get all indicators
		let ind = this.indicators,
			maSlow = ind.maSlow.result,
			maFast = ind.maFast.result,
			RSI = ind.RSI.result,
			ADX = ind.ADX.result;

		console.debug('Indicators value:');
		console.debug('SMA+ :',maFast);
		console.debug('SMA- :',maSlow);
		console.debug('RSI :',RSI);
		console.debug('ADX :',ADX);
		console.debug('--------------------------------------------');

		// Ensure candleHistory is defined and not empty
		if (this.candleHistory && this.candleHistory.length > 0) {
		let high = Math.max(...this.candleHistory.map(candle => candle.high));
        let low = Math.min(...this.candleHistory.map(candle => candle.low));
        let fibLevels = this.calculateFibonacciLevels(high, low);
        // Further processing...
        } 
        else { console.error('Candle history is undefined or empty.'); }

		// BEAR TREND
		if( maFast < maSlow )
		{
			RSI = ind.BEAR_RSI.result;
			let rsi_hi = this.settings.BEAR_RSI_high,
				rsi_low = this.settings.BEAR_RSI_low;

			// ADX trend strength?
			if( ADX > this.settings.ADX_high ) rsi_hi = rsi_hi + this.BEAR_MOD_high;
			else if( ADX < this.settings.ADX_low ) rsi_low = rsi_low + this.BEAR_MOD_low;

			if( RSI > rsi_hi && this.candle.close < fibLevels[2]) this.short();
			else if( RSI < rsi_low && this.candle.close > fibLevels[2]) this.long();

			if(this.debug) this.lowHigh( RSI, 'bear' );
		}

		// BULL TREND
		else
		{
			RSI = ind.BULL_RSI.result;
			let rsi_hi = this.settings.BULL_RSI_high,
				rsi_low = this.settings.BULL_RSI_low;

			// ADX trend strength?
			if( ADX > this.settings.ADX_high ) rsi_hi = rsi_hi + this.BULL_MOD_high;
			else if( ADX < this.settings.ADX_low ) rsi_low = rsi_low + this.BULL_MOD_low;

			if( RSI > rsi_hi && this.candle.close < fibLevels[2]) this.short();
			else if( RSI < rsi_low && this.candle.close > fibLevels[2])  this.long();
			if(this.debug) this.lowHigh( RSI, 'bull' );
		}

		// add adx low/high if debug
		if( this.debug ) this.lowHigh( ADX, 'adx');

	}, // check()


	/* LONG */
	long: function()
	{
		if( this.trend.direction !== 'up' ) // new trend? (only act on new trends)
		{
			this.resetTrend();
			this.trend.direction = 'up';
			this.advice('long');this.resetTrend();
			if( this.debug ) log.info('Going long');
		}

		if( this.debug )
		{
			this.trend.duration++;
			console.debug('Long since', this.trend.duration, 'candle(s)');
		}
	},


	/* SHORT */
	short: function()
	{
		// new trend? (else do things)
		if( this.trend.direction !== 'down' )
		{
			this.resetTrend();
			this.trend.direction = 'down';
			this.advice('short');this.resetTrend();
			if( this.debug ) log.info('Going short');
		}

		if( this.debug )
		{
			this.trend.duration++;
			console.debug('Short since', this.trend.duration, 'candle(s)');
		}
	},


	/* END backtest */
	end: function()
	{
		let seconds = ((new Date()- this.startTime)/1000),
			minutes = seconds/60,
			str;

		minutes < 1 ? str = seconds.toFixed(2) + ' seconds' : str = minutes.toFixed(2) + ' minutes';

		log.info('====================================');
		log.info('Finished in ' + str);
		log.info('====================================');

		// print stats and messages if debug
		if(this.debug)
		{
			let stat = this.stat;
			log.info('BEAR RSI low/high: ' + stat.bear.min + ' / ' + stat.bear.max);
			log.info('BULL RSI low/high: ' + stat.bull.min + ' / ' + stat.bull.max);
			log.info('ADX min/max: ' + stat.adx.min + ' / ' + stat.adx.max);
		}

	}

};

module.exports = strat;
