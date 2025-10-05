/**
 * Multi-timeframe ATR score system using prediction data, running continuously.
 * Usage:
 *   node scoreATR.continuous.js
 * Prints scores to console at regular intervals.
 */

const fs = require('fs');
const path = require('path');
const ATR = require('../indicator/ATR');

// Loads prediction OHLCV for one timeframe
function loadPredictionOHLCV({ symbol, exchange, timeframe, dataDir }) {
  const file = path.resolve(__dirname, dataDir, `ohlcv_ccxt_data_${timeframe}_prediction.json`);
  if (!fs.existsSync(file)) return [];
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  return rows
    .filter(row => row.symbol === symbol && row.exchange === exchange)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Runs ATR on candles for each timeframe and returns scores
function scoreATR({
  symbol = "BTC/EUR",
  exchange = "kraken",
  timeframes = ["1m", "5m", "15m", "1h"],
  period = 14,
  dataDir = "../../logs/json/ohlcv"
} = {}) {
  let results = {};
  for (const tf of timeframes) {
    const candles = loadPredictionOHLCV({ symbol, exchange, timeframe: tf, dataDir });
    if (candles.length < period + 1) {
      results[tf] = null;
      continue;
    }
    const atr = new ATR({ period });
    for (const candle of candles) {
      atr.update(candle); // candle is object with open, high, low, close, volume
    }
    results[tf] = atr.value; // Latest ATR value
  }
  return results;
}

// --- Continuous Run ---
const params = {
  symbol: "BTC/EUR",
  exchange: "kraken",
  timeframes: ["1m", "5m", "15m", "1h"],
  period: 14,
  dataDir: "../../logs/json/ohlcv", // adjust path as needed
  interval: 60000 // 1 minute
};

function loop() {
  const scores = scoreATR(params);
  const now = new Date().toISOString();
  console.log(`[${now}] ATR Scores:`, scores);
  // Optionally, log to file, trigger alerts, etc.
}

loop(); // Initial run
setInterval(loop, params.interval);

module.exports = scoreATR;
