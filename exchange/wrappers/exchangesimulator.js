/*
 * exchangesimulator.js
 * 
 * This file simulates exchange operations for testing purposes within the Gekko M4 Globular Cluster project.
 * 
 * Description:
 * Provides a simulated exchange wrapper to mimic the behavior of real exchange APIs,
 * enabling testing and debugging without live market dependencies.
 * 
 * Features:
 * - Simulates price trends using Fibonacci sequence durations.
 * - Generates fake trades and OHLCV (Open-High-Low-Close-Volume) data for testing.
 * - Fetches sky source data for M4 (NGC 6121) from an external API and integrates it into price calculations.
 * 
 * M4 Coordinate Influence:
 * - The M4 globular cluster's coordinates (Right Ascension "ra" and Declination "dec") are fetched from the Noctua Sky API.
 * - These coordinates are used to introduce a deterministic factor in price fluctuations:
 *   - The sum of the RA and Dec values is taken.
 *   - A small adjustment to the price is applied based on the modulo of this sum (mod 5).
 *   - This creates a unique external factor to simulate celestial influence on market behavior.
 * 
 * Usage:
 * - Initialize a Trader instance to simulate a trading environment.
 * - Call `fetchSkySourceData` to fetch and cache M4 coordinate data.
 * - The `fetchLatestPrice` method integrates the M4 influence into simulated price trends.
 * 
 * Author: universalbit-dev
 * Repository: https://github.com/universalbit-dev/gekko-m4-globular-cluster
 * License: MIT
 */


const axios = require('axios');
const moment = require('moment');
const _ = require('underscore');

// Define the URL for the API call NGC6121
const apiUrl = 'https://api.noctuasky.com/api/v1/skysources/name/M%204';
let firstTradeEmitted = false; // Initialize the flag to track the first trade emission

// Fibonacci sequence and random initialization for trends
var fibonacci_sequence = ['0', '1', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '144', '233', '377', '610', '987', '1597', '2584', '4181', '6765'];
var fibonacci_number = Math.floor(Math.random() * fibonacci_sequence.length);
const TREND_DURATION = fibonacci_number;

function getRndInteger(min, max) {
    if (typeof min !== 'number' || typeof max !== 'number') {
        throw new Error('Invalid input to getRndInteger: min and max must be numbers');
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const CandleCreator = function() {};

CandleCreator.prototype.calculateCandle = function(trades) {
    const open = trades[0].price;
    const close = trades[trades.length - 1].price;
    const high = Math.max(...trades.map(t => t.price));
    const low = Math.min(...trades.map(t => t.price));
    const volume = trades.reduce((acc, t) => acc + t.amount, 0);
    const vwp = trades.reduce((acc, t) => acc + (t.price * t.amount), 0) / volume;
    const candle = { open, high, low, close, vwp, volume };
    return candle;
};

const Trader = function(initialPrice = 10, initialTrend = 'up') {
    this.name = 'ExchangeSimulator';
    this.at = moment().subtract(1, 's');
    this.price = initialPrice;
    this.trend = initialTrend;
    this.tid = 0;
    this.candleHistory = [];
    this.balance = {
        GaiaNut: 0.0005,
        GaiaBolt: 1,
    };
    this.skySourceData = null; // Holds fetched Sky Source data
    this.skySourceExpiresAt = null; // Expiry timestamp for cached data
};

// Fetch Sky Source Data with Caching
Trader.prototype.fetchSkySourceData = async function() {
    const cacheDuration = 60 * 60 * 1000; // Cache Sky Source data for 1 hour

    // Check if cached data is still valid
    if (this.skySourceData && this.skySourceExpiresAt > Date.now()) {
        console.log('[INFO] Using cached Sky Source Data.');
    }

    try {
        // Fetch new Sky Source data
        const response = await axios.get(apiUrl, {
            timeout: 5000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'gekko-m4-globular-cluster/1.0',
            },
        });

    if (response.status === 200 && response.data) {
    console.log('[INFO] Sky Source Data successfully fetched:');
    // Update cache
    this.skySourceData = response.data;
    this.skySourceExpiresAt = Date.now() + cacheDuration;
    return response.data;
    }
    else {
    console.warn('[WARNING] Unexpected response status or empty data:',
    response.status);
    }
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error('[ERROR] Request timeout while fetching Sky Source Data:', error.message);
        } else if (error.response) {
            console.error('[ERROR] API responded with error:', {
                status: error.response.status,
                data: error.response.data,
            });
        } else {
            console.error('[ERROR] Network or other error occurred:', error.message);
        }
    }

    // Fallback to default data on failure
    console.warn('[WARNING] Falling back to default Sky Source Data.');
    return {
        name: 'Default Sky Source',
        coordinates: {
            ra: 0,
            de: 0,
        },
    };
};

// Fetch Latest Price (Sky Source Data)
Trader.prototype.fetchLatestPrice = async function() {
    try {
        const maxWaitTime = 5000; // Max wait time in milliseconds
        const startTime = Date.now();

        // Wait until the first fake trade has been emitted
        while (!firstTradeEmitted) {
            if (Date.now() - startTime > maxWaitTime) {
                console.warn('Timeout: First trade not emitted within 5 seconds.');
                this.price = 10; // Reset to a default price to avoid NaN issues
                return; // Exit the function gracefully
            }
            await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
        }

        // Simulate fetching the latest price
        const priceChange = getRndInteger(-2, 2);

        // Adjust price based on Sky Source data
        const skySourceData = await this.fetchSkySourceData();
        if (skySourceData && skySourceData.coordinates) {
            const coordinateFactor = (skySourceData.coordinates.ra + skySourceData.coordinates.de) % 5;
            this.price += coordinateFactor * 0.1; // Add a small factor based on coordinates
            
            // Log the updated price with Sky Source influence
            console.log(`Updated price with Sky Source influence: ${this.price} (RA: ${skySourceData.coordinates.ra}, Dec: ${skySourceData.coordinates.de})`);
        }

        // Validate price before applying the change
        if (isNaN(this.price)) {
            console.error('Warning: Current price is NaN. Resetting to default value.');
            this.price = 10; // Reset to default
        }

        this.price += priceChange;

        // Validate the new price
        if (isNaN(this.price)) {
            throw new Error('Price calculation resulted in NaN');
        }
    } catch (error) {
        console.error('Error fetching latest price:', error);
        this.price = 10; // Reset to a default value if NaN error occurs
        this.manageFetchError(error);
    }
};

Trader.prototype.manageFetchError = function(error) {
    // Log the error to a monitoring service, send an alert, etc.
    console.log('Managing fetch error:', error.message);
    // Additional error handling logic can be added here
};

Trader.prototype.getTrades = async function(since, cb) {
    await this.fetchLatestPrice(); // Fetch the latest price before generating trades

    // Randomize the number of trades to simulate
    const minTrades = 1; // Minimum number of trades
    const maxTrades = 10; // Maximum number of trades
    const numberOfTrades = getRndInteger(minTrades, maxTrades);

    const trades = _.range(numberOfTrades).map(() => {
        this.tid++;

        // Ensure the first trade is emitted
        if (!firstTradeEmitted) {
            firstTradeEmitted = true; // Set the flag after emitting the first trade
        }

        // Adjust the trend based on Fibonacci duration
        if (this.tid % TREND_DURATION === 0) {
            this.trend = (this.trend === 'up') ? 'down' : 'up';
        }

        // Update the price based on the trend
        if (this.trend === 'up') this.price += getRndInteger(0, 2);
        else this.price -= getRndInteger(0, 2);

        // Ensure the price remains valid
        if (isNaN(this.price) || this.price <= 0) {
            console.warn('Price became invalid, resetting to default value.');
            this.price = 10; // Reset to a default value if invalid
        }

        return {
            date: this.at.add(1, 'seconds').unix(),
            price: this.price,
            amount: getRndInteger(1, 5), // Randomize trade volumes between 1 and 5
            tid: this.tid
        };
    });

    console.log(`[EXCHANGE SIMULATOR] emitted ${numberOfTrades} fake trades, up until ${this.at.format('YYYY-MM-DD HH:mm:ss')}.`);
    cb(null, trades);
};

Trader.prototype.generateOHLCV = async function(start, end, interval, cb) {
    const ohlcvData = [];
    let current = moment(start);
    const endMoment = moment(end);

    while (current.isBefore(endMoment)) {
        const next = current.clone().add(interval, 'seconds');
        const trades = _.filter(await this.getTrades(null, () => {}), trade => {
            return moment.unix(trade.date).isBetween(current, next);
        });

        if (trades.length > 0) {
            const candle = CandleCreator.prototype.calculateCandle(trades);
            ohlcvData.push(candle);
        }

        current = next;
    }

    cb(null, ohlcvData);
};

Trader.getCapabilities = function() {
    return {
        name: 'ExchangeSimulator',
        slug: 'exchangesimulator',
        currencies: ['GaiaNut'],
        assets: ['GaiaBolt'],
        maxTradesAge: 60,
        maxHistoryFetch: null,
        markets: [{ pair: ['GaiaNut', 'GaiaBolt'], minimalOrder: { amount: 0.01, unit: 'assets' } }],
        requires: [],
        fetchTimespan: 60,
        tid: 'tid',
        tradable: false
    };
};

module.exports = Trader;

