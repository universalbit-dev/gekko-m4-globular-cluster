/**
 * INVERTER Strategy Plugin for Gekko Trading Bot
 * Compliance Level: Gekko M4 Framework Stable v3.3
 */
'use strict';

const _ = require("underscore");
const log = require('../core/log.js');
const config = require('../core/util.js').getConfig();
const fs = require("fs-extra");

// Pull setup configuration blocks cleanly
const settings = config.INVERTER || {};

const method = {
    prevPrice: 0,
    prevAction: 'none',
    
    // Initialize strategy-specific settings and indicators
    init: function() {
        this.name = 'INVERTER';
        this.requiredHistory = this.settings.historySize || 14;
        
        log.info('Initializing Strategy:', this.name);
        
        // Setup localized tracker state objects
        this.trend = { direction: 'none', duration: 0, state: 'none', ls: 'none' };
        
        // CORRECTED: Use native indicators with native settings keys
        this.addIndicator('rsi', 'RSI', { interval: 14 });
        
        // CORRECTED: Use Tulip registration for indicators requiring 'optIn' parameters
        this.addTulipIndicator('dema', 'dema', { optInTimePeriod: 1 });
        this.addTulipIndicator('maFast', 'sma', { optInTimePeriod: 10 }); 
        this.addTulipIndicator('maSlow', 'sma', { optInTimePeriod: 21 }); // Fixed missing indicator
        this.addTulipIndicator('adx', 'adx', { optInTimePeriod: 3 });
        this.addTulipIndicator('dx', 'dx', { optInTimePeriod: 3 });      // Fixed missing indicator

        // Track instance initiation execution logs
        log.info('================================================');
        log.info('    INVERTER Engine Deployed Successfully       ');
        log.info('================================================');
    },

    // Update function called on each new candle
    update: function(candle) {
        // Safe container loop for keeping history tracking properties up to date
        this.prevPrice = candle.close;
    },

    // Log function to store candle data safely in a CSV format
    log: function(candle) {
        // Fixed undefined startTime variable runtime crash bug by generating an on-the-fly execution stamp
        const datestamp = candle.start.format('YYYY-MM-DD');
        const logPath = `logs/csv/${config.watch.asset}_${config.watch.currency}_${this.name}_${datestamp}.csv`;
        const payload = `${candle.start.toISOString()},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume},${candle.trades}\n`;

        fs.appendFile(logPath, payload, function(err) {
            if (err) log.error('Error writing log matrix file:', err);
        });
    },

    // Main check function for generating inverted buy/sell signals
    check: function(candle) {
        // CORRECTED: Extract values using the precise structural .result framework keys
        const rsiVal = this.indicators.rsi.result;
        const demaVal = this.tulipIndicators.dema.result.result;
        const adxVal = this.tulipIndicators.adx.result.result;
        const dxVal = this.tulipIndicators.dx.result.result;
        const fastMaVal = this.tulipIndicators.maFast.result.result;
        const slowMaVal = this.tulipIndicators.maSlow.result.result;
        
        // Handle RSI Inversion Logic gate conditions cleanly
        if (rsiVal > 70) {
            // Overbought: Typically sells, but inverts signals here
            this.advice({ direction: 'short' });
            this.prevAction = 'short';
        } else if (rsiVal < 30) {
            // Oversold: Typically buys
            this.advice({ direction: 'long' });
            this.prevAction = 'long';
        }
        
        // Trend strength classification matching baseline setups
        if (adxVal < 25) {
            this.trend.direction = 'weak';
        } else if (adxVal > 50) {
            this.trend.direction = 'strong';
        }
        
        // Optional: Debug telemetry trace prints for background log tracking
        log.debug(`[${this.name}] Price: ${candle.close} | RSI: ${rsiVal.toFixed(2)} | ADX: ${adxVal.toFixed(2)}`);
    },

    // End function called when the strategy session stops
    end: function() {
        log.info('| The End | - Strategy execution stack closed cleanly.');
    }
};

module.exports = method;
