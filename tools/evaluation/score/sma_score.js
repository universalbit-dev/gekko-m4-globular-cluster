const SMA = require('../indicator/SMA.js');
const fs = require('fs');
const path = require('path');

module.exports = function scoreSMA(params) {
  const { timeframes, period = 14, dataDir } = params;
  const results = {};

  for (const tf of timeframes) {
    const file = path.join(dataDir, `ohlcv_ccxt_data_${tf}_prediction.json`);
    if (!fs.existsSync(file)) continue;
    let arr;
    try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { continue; }
    if (!Array.isArray(arr) || arr.length < period) continue;

    const sma = new SMA(period);
    for (const candle of arr.slice(-period)) {
      sma.update(candle.close);
    }
    results[tf] = sma.value;
  }
  return results;
};
