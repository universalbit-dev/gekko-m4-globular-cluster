/**
 * Multi-timeframe RSI score system using prediction data, running continuously.
 * Usage:
 *   node scoreRSI.continuous.js
 * Prints scores to console at regular intervals.
 */

const fs = require('fs');
const path = require('path');
const RSI = require('../indicator/RSI');

// Loads prediction OHLCV for one timeframe
function loadPredictionOHLCV({ symbol, exchange, timeframe, dataDir }) {
  const file = path.resolve(__dirname, dataDir, `ohlcv_ccxt_data_${timeframe}_prediction.json`);
  if (!fs.existsSync(file)) return [];
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  return rows
    .filter(row => row.symbol === symbol && row.exchange === exchange)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Runs RSI on close prices for each timeframe and returns scores
function scoreRSI({
  symbol = "BTC/EUR",
  exchange = "kraken",
  timeframes = ["1m", "5m", "15m", "1h"],
  interval = 14,
  buyLevel = 30,
  sellLevel = 70,
  dataDir = "../../logs/json/ohlcv"
} = {}) {
  let results = {};
  for (const tf of timeframes) {
    const candles = loadPredictionOHLCV({ symbol, exchange, timeframe: tf, dataDir });
    if (candles.length < interval + 1) {
      results[tf] = null;
      continue;
    }
    const rsi = new RSI({ interval, buyLevel, sellLevel });
    for (const candle of candles) {
      rsi.update(candle.close);
    }
    results[tf] = rsi.value; // Latest RSI value
  }
  return results;
}

// --- Continuous Run ---
const params = {
  symbol: "BTC/EUR",
  exchange: "kraken",
  timeframes: ["1m", "5m", "15m", "1h"],
  interval: 14,
  buyLevel: 30,
  sellLevel: 70,
  dataDir: "../../logs/json/ohlcv", // adjust path as needed
  runInterval: 60000 // 1 minute
};

function loop() {
  const scores = scoreRSI(params);
  const now = new Date().toISOString();
  console.log(`[${now}] RSI Scores:`, scores);
  // Optionally, log to file, trigger alerts, etc.
}

loop(); // Initial run
setInterval(loop, params.runInterval);

module.exports = scoreRSI;
