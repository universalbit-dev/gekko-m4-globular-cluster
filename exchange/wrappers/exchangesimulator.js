/**
 * File: exchangesimulator.js
 * Author: Universalbit Dev
 * License: MIT
 * Description:
 * Simulates exchange operations for testing within the Gekko M4 Globular Cluster project.
 * - Simulates price trends and fake trades with realistic volatility levels (low, moderate, high).
 * - Integrates real M4 coordinates from Noctua Sky API.
 * - Simulates unique star IDs for stars within the M4 cluster.
 * - Logs sky source price influence for transparency.
 * - Suitable for research, space economy, or crypto contexts.
 */

const axios = require('axios');
const moment = require('moment');
const _ = require('underscore');
const crypto = require('crypto');
const fs = require('fs');

// Parameters and constants
const m4Name = 'NGC 6121';
const apiUrl = `https://api.noctuasky.com/api/v1/skysources/name/M%204`;
const DEFAULT_NUM_STARS = 10000; // Change as needed

const fibonacci_sequence = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];
const TREND_DURATION = fibonacci_sequence[Math.floor(Math.random() * fibonacci_sequence.length)];

/**
 * Volatility settings.
 * low: very small price movements
 * moderate: typical stock/crypto volatility
 * high: wild swings, for stress tests
 */
const VOLATILITY_SETTINGS = {
    low:    { min: -0.2, max: 0.2, description: "Low volatility" },
    moderate: { min: -1, max: 1, description: "Moderate volatility" },
    high:   { min: -3, max: 3, description: "High volatility" }
};

// Utility: Realistic random walk for price changes
function getRndFloat(min, max) {
    if (typeof min !== 'number' || typeof max !== 'number') throw new Error('Invalid input to getRndFloat: min and max must be numbers');
    // Gaussian-like: average several uniforms for more realistic distribution
    let sum = 0;
    for (let i = 0; i < 3; i++) sum += Math.random() * (max - min) + min;
    return sum / 3;
}

class CandleCreator {
    calculateCandle(trades) {
        const open = trades[0].price;
        const close = trades[trades.length - 1].price;
        const high = Math.max(...trades.map(t => t.price));
        const low = Math.min(...trades.map(t => t.price));
        const volume = trades.reduce((acc, t) => acc + t.amount, 0);
        const vwp = trades.reduce((acc, t) => acc + (t.price * t.amount), 0) / volume;
        return { open, high, low, close, vwp, volume };
    }
}

class Trader {
    constructor({ initialPrice = 10, initialTrend = 'up', volatility = 'moderate' } = {}) {
        this.name = 'exchangesimulator';
        this.at = moment().subtract(1, 's');
        this.price = initialPrice;
        this.trend = initialTrend;
        this.tid = 0;
        this.candleHistory = [];
        this.balance = {
            GaiaNut: 0.0005,
            GaiaBolt: 1,
        };
        this.skySourceData = null;
        this.skySourceExpiresAt = null;
        this.simulatedStars = null;
        this.firstTradeEmitted = false;
        this.volatility = VOLATILITY_SETTINGS[volatility] ? volatility : 'moderate';
    }

    async fetchSkySourceData() {
        const cacheDuration = 60 * 60 * 1000; // 1 hour
        if (this.skySourceData && this.skySourceExpiresAt > Date.now()) {
            return this.skySourceData;
        }
        try {
            const response = await axios.get(apiUrl, {
                timeout: 5000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'gekko-m4-globular-cluster/1.0',
                },
            });
            if (response.status === 200 && response.data && response.data.model_data) {
                this.skySourceData = response.data;
                this.skySourceExpiresAt = Date.now() + cacheDuration;
                return response.data;
            } else {
                console.warn('[WARNING] Unexpected response status or empty data:', response.status);
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
        this.skySourceData = {
            name: 'Default Sky Source',
            model_data: { ra: 0, de: 0 },
        };
        this.skySourceExpiresAt = Date.now() + cacheDuration;
        return this.skySourceData;
    }

    async simulateStarsInCluster(numStars = DEFAULT_NUM_STARS) {
        const skySource = await this.fetchSkySourceData();
        const model = skySource.model_data;
        const ra = model.ra;
        const dec = model.de;
        if (ra === undefined || dec === undefined) {
            console.error("ERROR: Could not find RA/Dec in Sky Source data!");
            return [];
        }
        function simulateStar(clusterCenter, index) {
            const starRa = clusterCenter.ra + (Math.random() - 0.5) * 0.2;
            const starDec = clusterCenter.de + (Math.random() - 0.5) * 0.2;
            const mag = 10 + Math.random() * 6;
            const rawId = `${m4Name}_${index}_${starRa.toFixed(6)}_${starDec.toFixed(6)}_${mag.toFixed(2)}`;
            const uniqueId = crypto.createHash('sha256').update(rawId).digest('hex').slice(0, 16);
            return { ra: starRa, dec: starDec, mag, id: `M4_${uniqueId}` };
        }
        const stars = [];
        for (let i = 0; i < numStars; i++) {
            stars.push(simulateStar({ ra, de: dec }, i));
        }
        this.simulatedStars = stars;
        console.log("exchangesimulator | Simulated " + numStars + " stars in M4 cluster");
        console.log("Sample simulated star IDs:");
        stars.slice(0, 5).forEach(star =>
            console.log(`ID: ${star.id} | RA: ${star.ra.toFixed(6)} | Dec: ${star.dec.toFixed(6)} | Mag: ${star.mag.toFixed(2)}`)
        );
        return stars;
    }

    exportStarsToJSON(filename = "m4_simulated_stars.json") {
        if (!this.simulatedStars || !Array.isArray(this.simulatedStars)) {
            console.warn("No simulated stars to export.");
            return;
        }
        fs.writeFileSync(filename, JSON.stringify(this.simulatedStars, null, 2));
        console.log(`exchangesimulator | Simulated stars exported to ${filename}`);
    }

    // Realistic price update: volatility parameter controls the movement range.
    async fetchLatestPrice() {
        try {
            const maxWaitTime = 5000;
            const startTime = Date.now();
            while (!this.firstTradeEmitted) {
                if (Date.now() - startTime > maxWaitTime) {
                    console.warn('Timeout: First trade not emitted within 5 seconds.');
                    this.price = 10;
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            const { min, max, description } = VOLATILITY_SETTINGS[this.volatility];
            // Random walk: small Gaussian-like price change for realism
            const priceChange = getRndFloat(min, max);

            // Sky source influence: small deterministic factor
            const skySourceData = await this.fetchSkySourceData();
            if (skySourceData && skySourceData.model_data) {
                const ra = skySourceData.model_data.ra;
                const dec = skySourceData.model_data.de;
                const coordinateFactor = (ra + dec) % 5;
                const influence = coordinateFactor * 0.1;
                this.price += influence;
                console.log(`exchangesimulator | Sky Source price influence: RA=${ra}, Dec=${dec}, factor=${coordinateFactor.toFixed(2)}, influence=${influence.toFixed(4)}, new price=${this.price.toFixed(2)} [${description}]`);
            }
            if (isNaN(this.price)) {
                console.error('Warning: Current price is NaN. Resetting to default value.');
                this.price = 10;
            }
            // Clamp price to avoid crash, and simulate more realistic moves
            this.price += priceChange;
            this.price = Math.max(0.01, this.price); // never negative
            if (isNaN(this.price)) {
                throw new Error('Price calculation resulted in NaN');
            }
        } catch (error) {
            console.error('Error fetching latest price:', error);
            this.price = 10;
            this.manageFetchError(error);
        }
    }

    manageFetchError(error) {
        console.log('Managing fetch error:', error.message);
    }

    async getTrades(since, cb) {
        await this.fetchLatestPrice();
        // Number of trades can also vary with volatility
        let baseTrades = { low: 2, moderate: 4, high: 8 };
        let ntrades = baseTrades[this.volatility] || 4;
        const numberOfTrades = Math.max(1, Math.round(ntrades + getRndFloat(-1, 1)));
        const trades = _.range(numberOfTrades).map(() => {
            this.tid++;
            if (!this.firstTradeEmitted) {
                this.firstTradeEmitted = true;
            }
            if (this.tid % TREND_DURATION === 0) {
                this.trend = (this.trend === 'up') ? 'down' : 'up';
            }
            // Price is already updated above, so use it here
            return {
                date: this.at.add(1, 'seconds').unix(),
                price: this.price,
                amount: Math.max(0.1, Math.round(5 * Math.abs(getRndFloat(0.5, 1.5)) * 100)/100),
                tid: this.tid
            };
        });
        console.log(`exchangesimulator | Emitted candles event [${this.volatility} volatility]`);
        cb(null, trades);
    }

    async generateOHLCV(start, end, interval, cb) {
        const ohlcvData = [];
        let current = moment(start);
        const endMoment = moment(end);
        while (current.isBefore(endMoment)) {
            const next = current.clone().add(interval, 'seconds');
            const trades = _.filter(await this.getTrades(null, () => {}), trade => {
                return moment.unix(trade.date).isBetween(current, next);
            });
            if (trades.length > 0) {
                const candle = new CandleCreator().calculateCandle(trades);
                ohlcvData.push(candle);
            }
            current = next;
        }
        cb(null, ohlcvData);
    }

    static getCapabilities() {
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
    }
}

module.exports = Trader;

// Example usage: node exchangesimulator.js
if (require.main === module) {
    (async () => {
        // Choose volatility: 'low', 'moderate', 'high'
        const volatility = process.argv[2] || 'moderate';
        const trader = new Trader({ volatility });
        // Simulate stars in cluster
        await trader.simulateStarsInCluster(DEFAULT_NUM_STARS);

        // Optionally export to file
        trader.exportStarsToJSON("m4_simulated_stars.json");

        // Example: Fetch some trades
        await trader.getTrades(null, (err, trades) => {
            if (err) {
                console.error("Trade simulation error:", err);
            } else {
                console.log("Sample trades:", trades.slice(0, 3));
            }
        });
    })();
}
