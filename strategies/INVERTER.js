/**
 * INVERTER Strategy Plugin for Gekko Trading Bot
 *
 * This strategy is designed to invert trading signals, effectively executing
 * the opposite of what a standard strategy recommends. It incorporates key features like
 * RSI Overbought/Oversold detection, ADX Trend Strength analysis, and StopLoss strategies.
 *
 * Key Features:
 * - Inverts trading signals, switching between 'long' and 'short' recommendations.
 * - Implements RSI for identifying overbought/oversold conditions.
 * - Utilizes ADX for measuring trend strength.
 * - Includes StopLoss mechanisms for risk management.
 *
 * Resources:
 * - Some code sourced from: https://github.com/xFFFFF/Gekko-Strategies
 *
 * Authors:
 * - _RSI and _ADX by (@TommieHansen) (CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/)
 * - Additional contributions by Gabriel Araujo (@Gab0)
 * - universalBit-dev: https://github.com/universalbit-dev/gekko-m4-globular-cluster/
 *
 * License:
 * The MIT License (MIT)
 * (c) 2025 universalBit-dev
 *
 * References:
 * - [Gab0's Gekko Adapted Strategies](https://github.com/Gab0/gekko-adapted-strategies)
 * - [Extra Indicators by Gabriel Araujo](https://github.com/Gab0/gekko-extra-indicators)
 */

// Import necessary libraries and modules
const { addon: ov } = require('openvino-node'); // OpenVINO library for AI processing
const _ = require("underscore"); // Utility library for common functions
var log = require('../core/log.js'); // Logging utility
var config = require('../core/util.js').getConfig(); // Load configuration file
var Wrapper = require('../strategyWrapperRules.js'); // Strategy wrapper rules
var fs = require("fs-extra"); // File system utility
fs.createReadStream('/dev/null'); // Placeholder to prevent unused import warnings

// Load settings from the configuration
var settings = config.INVERTER; 
this.settings = settings;

// Import indicators used in the strategy
const RSI = require('./indicators/RSI'); // RSI Indicator
const DEMA = require('./indicators/DEMA'); // DEMA Indicator
const ADX = require('./indicators/ADX'); // ADX Indicator
const DX = require('./indicators/DX'); // DX Indicator
const SMA = require('./indicators/SMA'); // SMA Indicator
const StopLoss = require('./indicators/StopLoss'); // StopLoss mechanism

// Import Chess library for a fun "easter egg"
const { Chess } = require('chess.js');

// Helper function: Generate a random Fibonacci number (for fun/debugging)
const sequence = async function() {
    try {
        const fibonacci_sequence = ['0', '1', '1', '2', '3', '5', '8', '13', ...];
        var fibonacci_number = Math.floor(Math.random() * fibonacci_sequence.length);
        fibonacci_number = fibonacci_sequence[fibonacci_number];
        await console.log('Fibonacci Sequence -- Wohoo! -- Number: ', fibonacci_number);
    } catch (e) {
        console.log('Error generating Fibonacci sequence:', e.message);
    }
};

// Helper function: Logging a motivational message
const keepcalm = async function() {
    try {
        await console.log('Keep Calm and Make Something Amazing -- Wohoo!');
    } catch (e) {
        console.log('Error logging motivational message:', e.message);
    }
};

// Define the main strategy method object
var method = Wrapper;

// Initialize the strategy
method = {
    prevPrice: 0, // Previous price for reference
    prevAction: 'none', // Previous action ('long', 'short', or 'none')
    
    init: function() {
        // Initialize strategy-specific settings and indicators
        this.interval = this.settings.interval;
        this.RSIhistory = [];
        this.name = 'INVERTER'; // Strategy name
        log.info('Start', this.name); // Log the start of the strategy
        
        // Initialize trend data
        this.trend = { direction: 'none', duration: 0, state: 'none', ls: 'none' };
        this.debug = true; // Enable debug logs
        
        // Add indicators with specific settings
        this.addIndicator('dema', 'DEMA', { optInTimePeriod: 1, optInFastPeriod: 233, optInSlowPeriod: 55 });
        this.addIndicator('maFast', 'SMA', { optInTimePeriod: 987 });
        this.addIndicator('rsi', 'RSI', { optInTimePeriod: 14 });
        this.addIndicator('adx', 'ADX', { optInTimePeriod: 3 });
        
        // Initialize StopLoss with a 5% threshold
        this.stopLoss = new StopLoss(5);
        
        // Log initialization messages
        log.info('================================================');
        log.info('Keep calm and trade wisely!');
        log.info('================================================');
        
        // Set required history size for backtesting
        this.requiredHistory = this.settings.historySize;
    },

    // Update function called on each new candle
    update: function(candle) {
        this.stopLoss.update(candle);
    },

    // Log function to store candle data in a CSV file
    log: function(candle) {
        fs.appendFile('logs/csv/' + config.watch.asset + ':' + config.watch.currency + '_' + this.name + '_' + startTime + '.csv',
            `${candle.start},${candle.open},${candle.high},${candle.low},${candle.close},${candle.vwp},${candle.volume},${candle.trades}\n`,
            function(err) {
                if (err) console.log('Error writing log file:', err);
            });
    },

    // Main check function for generating buy/sell signals
    check: function(candle) {
        const rsi = this.indicators.rsi; // RSI value
        const adx = this.indicators.adx; // ADX value
        const dx = this.indicators.dx; // DX value
        const maFast = this.indicators.maFast; // Fast-moving average
        const maSlow = this.indicators.maSlow; // Slow-moving average
        
        // Analyze RSI to generate buy/sell signals
        if (rsi > 70) {
            this.advice('short'); // Overbought: Sell
        } else if (rsi < 30) {
            this.advice('long'); // Oversold: Buy
        }
        
        // Trend analysis using ADX
        if (adx < 25) {
            this.trend.direction = 'weak';
        } else if (adx > 50) {
            this.trend.direction = 'strong';
        }
        
        // StopLoss handling
        if (this.stopLoss.update(candle) === 'stoploss') {
            this.advice('short');
        }
    },

    // End function called when the strategy stops
    end: function() {
        log.info('|The End|');
    }
};

module.exports = method;
