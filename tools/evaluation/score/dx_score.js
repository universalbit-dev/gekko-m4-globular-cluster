const DX = require('../indicator/DX.js');
const fs = require('fs');
const path = require('path');

/**
 * Score DX for given timeframes and candle data.
 * @param {Object} params
 * @returns {Object} DX values per timeframe
 */
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

module.exports = scoreDX;
