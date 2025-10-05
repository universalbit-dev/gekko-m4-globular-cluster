/**
 * Continuously score DX for given timeframes and candle data.
 * Prints results to console at regular intervals.
 * Usage: node scoreDX.continuous.js
 */
const DX = require('../indicator/DX.js');
const fs = require('fs');
const path = require('path');

const params = {
  timeframes: ['1m', '5m', '15m', '1h'],  // Set your timeframes
  period: 14,
  dataDir: path.resolve(__dirname, '../../logs/json/ohlcv'),
  interval: 60000  // 1 minute; adjust as needed
};

function scoreDX(params) {
  const { timeframes, period = 14, dataDir } = params;
  const results = {};

  for (const tf of timeframes) {
    const file = path.join(dataDir, `ohlcv_ccxt_data_${tf}_prediction.json`);
    if (!fs.existsSync(file)) continue;
    let arr;
    try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { continue; }
    if (!Array.isArray(arr) || arr.length < period + 1) continue;

    const dx = new DX(period);
    for (const candle of arr.slice(-period - 1)) {
      dx.update(candle);
    }
    results[tf] = dx.result;
  }
  return results;
}

// --- Continuous Run ---
function loop() {
  const dxResults = scoreDX(params);
  const now = new Date().toISOString();
  console.log(`[${now}] DX Results:`, dxResults);
  // Optionally, log to file, trigger alerts, etc.
}

loop(); // Initial run
setInterval(loop, params.interval);
