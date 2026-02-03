/**
 * File: exchangesimulator.js
 * Author: Universalbit Dev (enhanced)
 * License: MIT
 * Description:
 * Enhanced exchange simulator for testing within the Gekko M4 Globular Cluster project.
 * Improvements:
 * - Seeded RNG for reproducibility (optional).
 * - Log-return diffusion with mean reversion + GARCH-like volatility clustering.
 * - Poisson-like trade arrivals with variable trade sizes and occasional "whales".
 * - Microstructure: dynamic bid/ask spread, trades around mid-price.
 * - Sky source introduces occasional deterministic shocks and mild directional bias.
 * - Robust candle creation and OHLCV generation.
 * - Improved async flow and error handling.
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
const TREND_DURATION = fibonacci_sequence[Math.floor(Math.random() * fibonacci_sequence.length)] || 13;

/**
 * Volatility profile maps to baseline sigma (per-second fractional volatility)
 * and typical trade intensity.
 */
const VOLATILITY_PROFILE = {
  low:      { baseSigma: 0.001, meanTradesPerSec: 0.5, description: "Low volatility" },
  moderate: { baseSigma: 0.008, meanTradesPerSec: 2, description: "Moderate volatility" },
  high:     { baseSigma: 0.03,  meanTradesPerSec: 6, description: "High volatility" }
};

// Utility: create a seeded RNG (mulberry32)
function createSeededRNG(seed) {
  // seed: number
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Utility: small helper random float using RNG or Math.random
function getRandom(rng, min = 0, max = 1) {
  return min + (rng() * (max - min));
}

// Gaussian-ish sampler by summing uniforms (approx)
function gaussianLike(rng) {
  // approximate normal via CLT
  let s = 0;
  for (let i = 0; i < 6; i++) s += rng();
  return (s - 3) / 3; // roughly N(0,1)
}

/**
 * CandleCreator: robust handling (vwp when volume>0)
 */
class CandleCreator {
  calculateCandle(trades) {
    if (!Array.isArray(trades) || trades.length === 0) {
      return { open: 0, high: 0, low: 0, close: 0, vwp: 0, volume: 0 };
    }
    const open = trades[0].price;
    const close = trades[trades.length - 1].price;
    const high = Math.max(...trades.map(t => t.price));
    const low = Math.min(...trades.map(t => t.price));
    const volume = trades.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const weighted = trades.reduce((acc, t) => acc + ((Number(t.price) || 0) * (Number(t.amount) || 0)), 0);
    const vwp = volume > 0 ? (weighted / volume) : close;
    return { open, high, low, close, vwp, volume };
  }
}

/**
 * Trader / ExchangeSimulator
 */
class Trader {
  constructor({
    initialPrice = 10,
    initialTrend = 'up',
    volatility = 'moderate',
    seed = null,
    clusterSize = DEFAULT_NUM_STARS
  } = {}) {
    this.name = 'exchangesimulator';
    this.at = moment().subtract(1, 'seconds');
    this.price = Number(initialPrice) || 10;
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

    // RNG: seeded if provided, else Math.random
    if (seed !== null) {
      // Accept numeric seed or string
      let numericSeed;
      if (typeof seed === 'number') numericSeed = seed;
      else numericSeed = parseInt(crypto.createHash('sha256').update(String(seed)).digest('hex').slice(0, 8), 16);
      this.rng = createSeededRNG(numericSeed);
      this.seed = numericSeed;
    } else {
      this.rng = Math.random;
      this.seed = null;
    }

    // Volatility and GARCH-like state
    this.volatilityProfile = VOLATILITY_PROFILE[volatility] ? volatility : 'moderate';
    this.baseSigma = VOLATILITY_PROFILE[this.volatilityProfile].baseSigma;
    this.meanTradesPerSec = VOLATILITY_PROFILE[this.volatilityProfile].meanTradesPerSec;

    // GARCH-like params (simple)
    this.sigmaSq = Math.pow(this.baseSigma, 2); // variance
    this.alpha0 = 0.000001; // baseline variance floor
    this.alpha1 = 0.08; // influence of squared return
    this.beta1 = 0.85;  // persistence of variance

    // drift for mean reversion on log price
    this.mu = 0; // neutral drift, trend emerges via shocks

    // microstructure
    this.spreadBase = Math.max(0.0005, this.price * 0.0005); // minimal spread
    this.clusterSize = clusterSize;

    // Keep a little history for trade arrival/vol
    this.prevReturn = 0;
    this.returnHistory = [];
  }

  // Fetch sky data with caching (1 hour)
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

  // Simulate stars using sky source coordinates (keeps behavior but hardened)
  async simulateStarsInCluster(numStars = DEFAULT_NUM_STARS) {
    const skySource = await this.fetchSkySourceData();
    const model = skySource.model_data || {};
    const ra = (typeof model.ra === 'number') ? model.ra : 0;
    const dec = (typeof model.de === 'number') ? model.de : 0;

    function simulateStar(clusterCenter, index, rng) {
      const starRa = clusterCenter.ra + (rng() - 0.5) * 0.2;
      const starDec = clusterCenter.dec + (rng() - 0.5) * 0.2;
      const mag = 10 + rng() * 6;
      const rawId = `${m4Name}_${index}_${starRa.toFixed(6)}_${starDec.toFixed(6)}_${mag.toFixed(2)}`;
      const uniqueId = crypto.createHash('sha256').update(rawId).digest('hex').slice(0, 16);
      return { ra: starRa, dec: starDec, mag, id: `M4_${uniqueId}` };
    }

    const rng = (this.seed !== null) ? this.rng : Math.random;
    const stars = [];
    for (let i = 0; i < numStars; i++) {
      stars.push(simulateStar({ ra, dec }, i, rng));
    }
    this.simulatedStars = stars;
    console.log(`exchangesimulator | Simulated ${numStars} stars in M4 cluster`);
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

  // Internal: produce an external shock possibly influenced by sky data
  async _maybeExternalShock() {
    const sky = await this.fetchSkySourceData();
    const model = sky.model_data || {};
    const ra = Number(model.ra) || 0;
    const dec = Number(model.de) || 0;

    // Use RA/Dec to create deterministic pseudo-randomness for occasional events
    const coordSeed = Math.abs(Math.sin(ra + dec));
    const chance = coordSeed * 0.1; // up to 0.1 (10% per tick) online bias; small
    const roll = (this.seed !== null) ? this.rng() : Math.random();
    if (roll < chance * 0.01) {
      // small shock
      const direction = (this.trend === 'up') ? 1 : -1;
      const magnitudeFactor = 0.05 + ((this.seed !== null) ? this.rng() : Math.random()) * 0.15;
      const shock = direction * magnitudeFactor * this.price;
      return { shock, reason: 'sky-event' };
    }
    // small persistent bias based on coords
    const bias = ((ra + dec) % 10 - 5) * 0.0001; // tiny bias per second
    return { shock: 0, bias };
  }

  // Update price using log-return model with evolving volatility
  async fetchLatestPrice() {
    try {
      // Ensure we have a first trade seed
      if (!this.firstTradeEmitted) this.firstTradeEmitted = true;

      // time step in seconds
      const dt = 1;

      // Sample a standard normal
      const z = gaussianLike(this.rng);

      // Compute current sigma (std dev)
      const sigma = Math.sqrt(Math.max(1e-12, this.sigmaSq));

      // log-return
      const logReturn = this.mu * dt + sigma * Math.sqrt(dt) * z;

      // apply to price (log-normal)
      const prevPrice = this.price;
      const newPrice = Math.max(0.000001, prevPrice * Math.exp(logReturn));

      // Update GARCH-like variance
      const ret = Math.log(newPrice / prevPrice) || 0;
      const retSq = ret * ret;
      this.sigmaSq = this.alpha0 + this.alpha1 * retSq + this.beta1 * this.sigmaSq;

      // External shock influence (occasional)
      const ext = await this._maybeExternalShock();
      let shockedPrice = newPrice;
      if (ext && ext.shock && Math.abs(ext.shock) > 0) {
        shockedPrice = Math.max(0.000001, shockedPrice + ext.shock);
        console.log(`exchangesimulator | External shock applied: ${ext.shock.toFixed(6)} (${ext.reason}) newPrice=${shockedPrice.toFixed(6)}`);
      } else if (ext && ext.bias) {
        // small deterministic bias
        shockedPrice = Math.max(0.000001, shockedPrice * (1 + ext.bias));
      }

      // Small deterministic sky-source influence for transparency
      const skySourceData = await this.fetchSkySourceData();
      if (skySourceData && skySourceData.model_data) {
        const ra = Number(skySourceData.model_data.ra) || 0;
        const dec = Number(skySourceData.model_data.de) || 0;
        // coordinate-based tiny influence
        const coordinateFactor = ((ra + dec) % 5) * 0.0001; // very small per-second influence
        shockedPrice = shockedPrice * (1 + coordinateFactor);
        // log with safe formatting
        // eslint-disable-next-line no-console
        console.log(`exchangesimulator | Sky influence: RA=${ra}, Dec=${dec}, factor=${coordinateFactor.toFixed(6)}, price=${shockedPrice.toFixed(6)}`);
      }

      if (!isFinite(shockedPrice) || isNaN(shockedPrice)) {
        throw new Error('Price calculation produced invalid number');
      }

      this.price = shockedPrice;
      this.prevReturn = ret;
      this.returnHistory.push(ret);
      if (this.returnHistory.length > 1000) this.returnHistory.shift();
    } catch (error) {
      console.error('Error in fetchLatestPrice:', error && error.message ? error.message : error);
      // fallback safe reset
      this.price = 10;
      this.sigmaSq = Math.pow(this.baseSigma, 2);
    }
  }

  // Helper: poisson-ish trade count: we approximate by sampling a Poisson with mean lambda using Knuth's algorithm
  _poissonSample(lambda) {
    const rng = this.rng;
    let L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    while (p > L) {
      k++;
      p *= rng();
      if (k > 1e4) break; // safety
    }
    return Math.max(0, k - 1);
  }

  // Generate microtrades for a single second; returns array of trades
  async _generateTradesForSecond(timestampUnix) {
    await this.fetchLatestPrice();

    // current instantaneous volatility (std)
    const sigma = Math.sqrt(Math.max(1e-12, this.sigmaSq));

    // trade intensity scales with volatility
    const intensity = Math.max(0.1, this.meanTradesPerSec * (1 + sigma / this.baseSigma));
    const nTrades = Math.max(1, this._poissonSample(intensity));

    const trades = [];
    // spread widens with volatility
    const spread = this.spreadBase * (1 + (sigma / this.baseSigma) * 5);

    for (let i = 0; i < nTrades; i++) {
      this.tid++;
      // micro-price around mid price with small random offset
      const priceOffset = gaussianLike(this.rng) * (sigma * this.price) + ((this.rng() - 0.5) * spread);
      // occasional whale trade large move
      const whaleProb = Math.min(0.005 + sigma * 2, 0.1); // small probability that depends on vol
      let amount;
      if (this.rng() < whaleProb) {
        amount = Math.round((10 + this.rng() * 1000) * 100) / 100; // big trade
      } else {
        amount = Math.round((0.1 + this.rng() * 5) * 100) / 100;
      }

      const side = (this.rng() > 0.5) ? 'buy' : 'sell';
      const tradePrice = Math.max(0.000001, this.price + priceOffset);

      // construct trade
      const trade = {
        date: timestampUnix,
        price: tradePrice,
        amount,
        tid: this.tid,
        side
      };

      trades.push(trade);
      this.firstTradeEmitted = true;
      if (this.tid % TREND_DURATION === 0) {
        this.trend = (this.trend === 'up') ? 'down' : 'up';
      }
    }
    return trades;
  }

  // getTrades(since, cb): returns trades via callback OR Promise if cb omitted
  async getTrades(since, cb) {
    try {
      // If caller didn't supply since, we produce trades for current timestamp
      const timestampUnix = moment().unix();
      const trades = await this._generateTradesForSecond(timestampUnix);

      // console logging summary
      console.log(`exchangesimulator | Emitted ${trades.length} trades [vol=${this.volatilityProfile}] price=${this.price.toFixed(6)}`);

      if (typeof cb === 'function') {
        return cb(null, trades);
      }
      return trades;
    } catch (error) {
      console.error('Error generating trades:', error && error.message ? error.message : error);
      if (typeof cb === 'function') {
        return cb(error);
      }
      throw error;
    }
  }

  // generateOHLCV(start, end, interval, cb): interval in seconds
  async generateOHLCV(start, end, interval, cb) {
    try {
      const ohlcvData = [];
      let current = moment(start);
      const endMoment = moment(end);
      while (current.isBefore(endMoment)) {
        const next = current.clone().add(interval, 'seconds');
        // Collect trades for each second inside the interval
        const tradesInInterval = [];
        let secCursor = current.clone();
        while (secCursor.isBefore(next)) {
          const ts = secCursor.unix();
          // for deterministic behavior we can call _generateTradesForSecond with test timestamp
          // but use getTrades which updates price and internal state
          // call getTrades as promise
          const trades = await this.getTrades(null); // returns trades for current time
          // filter (trades use same timestamp) but keep all
          trades.forEach(t => {
            if (moment.unix(t.date).isBetween(current, next, undefined, '[)')) {
              tradesInInterval.push(t);
            }
          });
          secCursor.add(1, 'second');
        }

        if (tradesInInterval.length > 0) {
          const candle = new CandleCreator().calculateCandle(tradesInInterval);
          // add timestamp metadata
          candle.start = current.toISOString();
          candle.end = next.toISOString();
          ohlcvData.push(candle);
        } else {
          // still add empty candle with previous close if desired; here we skip empties
        }
        current = next;
      }

      if (typeof cb === 'function') {
        return cb(null, ohlcvData);
      }
      return ohlcvData;
    } catch (error) {
      console.error('Error generating OHLCV:', error && error.message ? error.message : error);
      if (typeof cb === 'function') return cb(error);
      throw error;
    }
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
    try {
      // Choose volatility: 'low', 'moderate', 'high'
      const volatility = process.argv[2] || 'moderate';
      const seedArg = process.argv[3] || null;
      const trader = new Trader({ volatility, seed: seedArg, clusterSize: DEFAULT_NUM_STARS });

      // Simulate stars in cluster (smaller sample by default during quick runs)
      await trader.simulateStarsInCluster(Math.min(1000, trader.clusterSize));

      // Optionally export to file
      trader.exportStarsToJSON("m4_simulated_stars.json");

      // Example: Fetch some trades
      const trades = await trader.getTrades(null);
      console.log("Sample trades (first 3):", trades.slice(0, 3));

      // Example: generate OHLCV for next 10 seconds with 5-second interval
      const start = moment();
      const end = moment().add(10, 'seconds');
      const ohlcv = await trader.generateOHLCV(start, end, 5);
      console.log("Generated OHLCV:", ohlcv);

    } catch (err) {
      console.error("Fatal simulation error:", err && err.message ? err.message : err);
    }
  })();
}
