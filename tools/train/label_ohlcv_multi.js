const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');
const { labelCandles, EPSILON } = require('./label_ohlcv.js');

// Use the environment variable directly, defaulting to a relative path
const OHLCV_JSON_DIR = '../tools/logs/json/ohlcv';
const TIMEFRAMES = (process.env.TRAIN_OHLCV_TIMEFRAMES || '1m,5m,15m,1h')
  .split(',').map(s => s.trim()).filter(Boolean);

TIMEFRAMES.forEach(tf => {
  const filePath = path.join(OHLCV_JSON_DIR, `ohlcv_ccxt_data_${tf}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[${tf}] OHLCV file not found: ${filePath}`);
    return;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`[${tf}] Failed to read or parse ${filePath}:`, e.message);
    return;
  }
  if (!Array.isArray(data) || data.length === 0) {
    console.warn(`[${tf}] No data in file: ${filePath}`);
    return;
  }
  const labeled = labelCandles(data, EPSILON);
  fs.writeFileSync(filePath, JSON.stringify(labeled, null, 2));
  console.log(`[${tf}] Labeled and saved ${labeled.length} candles to ${filePath}`);
});
