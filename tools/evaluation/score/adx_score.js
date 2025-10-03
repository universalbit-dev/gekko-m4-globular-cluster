const ADXIndicator = require('../indicator/ADX.js');
const fs = require('fs');
const path = require('path');

/**
 * Score ADX for given timeframes and candle data.
 * @param {Object} params - { symbol, exchange, timeframes, period, dataDir }
 * @returns {Object} - { [tf]: ADX value }
 */
module.exports = function scoreADX(params) {
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
};
