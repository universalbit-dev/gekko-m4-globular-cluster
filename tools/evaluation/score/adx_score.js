const ADXIndicator = require('../indicator/ADX.js');
const fs = require('fs');
const path = require('path');

/**
 * Continuously score ADX for given timeframes and candle data.
 * Prints results to console, can be extended to log or trigger actions.
 * Usage: node scoreADX.continuous.js
 */
const params = {
  symbol: 'BTC/EUR', // set as needed
  exchange: 'kraken', // set as needed
  timeframes: ['1m', '5m', '15m', '1h'], // set as needed
  period: 14,
  dataDir: path.resolve(__dirname, '../../logs/json/ohlcv'),
  interval: 60000 // 1 minute, adjust as needed
};

function scoreADX(params) {
  const { timeframes, period = 14, dataDir } = params;
  const results = {};

  for (const tf of timeframes) {
    const file = path.join(dataDir, `ohlcv_ccxt_data_${tf}_prediction.json`);
    if (!fs.existsSync(file)) continue;

    let arr;
    try {
      arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      continue;
    }
    if (!Array.isArray(arr) || arr.length < period + 1) continue;

    const adx = new ADXIndicator(period);
    // Use the last (period + 1) candles for proper initialization
    for (const candle of arr.slice(-period - 1)) {
      adx.update(candle);
    }
    results[tf] = typeof adx.value !== "undefined" ? adx.value : adx.result || null;
  }

  return results;
}

// --- Continuous Run ---
function loop() {
  const adxResults = scoreADX(params);
  const now = new Date().toISOString();
  console.log(`[${now}] ADX Results:`, adxResults);
  // Optionally, log to file, trigger alerts, etc.
}

loop(); // Initial run
setInterval(loop, params.interval);
