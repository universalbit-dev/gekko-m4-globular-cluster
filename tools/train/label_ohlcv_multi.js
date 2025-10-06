const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); 
const fs = require('fs');
const { labelCandles, EPSILON } = require('./label_ohlcv.js');

const OHLCV_JSON_DIR = process.env.TRAIN_OHLCV_JSON_DIR || '../logs/json/ohlcv';
const TIMEFRAMES = (process.env.TRAIN_OHLCV_TIMEFRAMES || '1m,5m,15m,1h')
  .split(',').map(s => s.trim()).filter(Boolean);

const MULTI_INTERVAL_MS = parseInt(process.env.MULTI_INTERVAL_MS, 10) || 60000;

function processAllTimeframes() {
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
}

// Run once immediately
processAllTimeframes();

// Run at regular intervals
setInterval(processAllTimeframes, MULTI_INTERVAL_MS);
