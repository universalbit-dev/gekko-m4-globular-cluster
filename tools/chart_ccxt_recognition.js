/**
 * chart_ccxt_recognition.js
 *
 * Predicts market actions ('bull', 'bear', 'idle') from OHLCV CSV data using a trained ConvNetJS model.
 * - Reads OHLCV candles from CSV (../logs/csv/ohlcv_ccxt_data.csv)
 * - Loads the latest trained model & normalization stats from ./trained_ccxt_ohlcv
 * - Normalizes new candle data using saved min/max
 * - Predicts class ('bull', 'bear', 'idle') for each candle
 * - Writes per-candle predictions to ohlcv_ccxt_data_prediction.csv (with header)
 * - Logs state transitions to ccxt_signal.log (with header)
 * - Handles duplicate/malformed CSV headers gracefully
 * - Runs every INTERVAL_MS (default: 1 hour)
 *
 * Usage: node chart_ccxt_recognition.js
 */

const fs = require('fs');
const path = require('path');
const ConvNet = require('../core/convnet.js');

const CSV_PATH = path.join(__dirname, '../logs/csv/ohlcv_ccxt_data.csv');
const MODEL_DIR = path.join(__dirname, './trained_ccxt_ohlcv');
const PRED_CSV_PATH = path.join(__dirname, './ohlcv_ccxt_data_prediction.csv');
const SIGNAL_LOG_PATH = path.join(__dirname, './ccxt_signal.log');
const NORM_STATS_PATH = path.join(MODEL_DIR, 'norm_stats.json');
const LABELS = ['bull', 'bear', 'idle'];
// INTERVAL_MS determines how often the script runs (in milliseconds).
// Common intervals:
//   5 minutes  (high frequency):   const INTERVAL_MS = 5 * 60 * 1000;
//  15 minutes  (high frequency):   const INTERVAL_MS = 15 * 60 * 1000;
//   1 hour     (medium term):      const INTERVAL_MS = 60 * 60 * 1000;
//  24 hours    (long term):        const INTERVAL_MS = 24 * 60 * 60 * 1000;
// Adjust this value based on your analysis timeframe needs.
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function ensureDirExists(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadCsvCandles(csvPath) {
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found at: ${csvPath}`);
  let rows = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  // Remove all header rows (first or repeated header lines)
  rows = rows.filter(row => !/^timestamp,open,high,low,close,volume/i.test(row));
  return rows.map(line => {
    const [timestamp, open, high, low, close, volume] = line.split(',');
    return {
      timestamp,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume)
    };
  }).filter(c =>
    c.timestamp &&
    !isNaN(c.open) && !isNaN(c.high) && !isNaN(c.low) &&
    !isNaN(c.close) && !isNaN(c.volume)
  );
}

function loadNormStats() {
  if (!fs.existsSync(NORM_STATS_PATH)) throw new Error('No normalization stats found.');
  return JSON.parse(fs.readFileSync(NORM_STATS_PATH, 'utf8'));
}

function norm(vals, min, max) {
  return vals.map((v, i) => max[i] === min[i] ? 0 : (v - min[i]) / (max[i] - min[i]));
}

function loadModel(modelDir) {
  if (!fs.existsSync(modelDir)) throw new Error('No trained model directory found.');
  const modelFiles = fs.readdirSync(modelDir)
    .filter(f => f.endsWith('.json') && f !== 'norm_stats.json')
    .sort()
    .reverse(); // use latest
  if (!modelFiles.length) throw new Error('No trained model files found.');
  const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, modelFiles[0]), 'utf8'));
  const net = new ConvNet.Net();
  net.fromJSON(modelJson);
  return net;
}

function predictCandles(candles, net, min, max) {
  return candles.map(candle => {
    try {
      const inputRaw = [candle.open, candle.high, candle.low, candle.close, candle.volume];
      const input = norm(inputRaw, min, max);
      const x = new ConvNet.Vol(1, 1, 5, input);
      const out = net.forward(x);
      const probs = out.w;
      const idx = probs.indexOf(Math.max(...probs));
      return LABELS[idx] !== undefined ? LABELS[idx] : 'idle';
    } catch (err) {
      return 'idle';
    }
  });
}

function writeEnhancedCsv(candles, predictions, outPath) {
  ensureDirExists(outPath);
  const header = 'timestamp,open,high,low,close,volume,prediction\n';
  const lines = candles.map((candle, i) =>
    `${candle.timestamp},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume},${predictions[i]}`
  );
  fs.writeFileSync(outPath, header + lines.join('\n') + '\n');
  console.log('Wrote enhanced prediction CSV:', outPath);
}

function ensureSignalLogHeader(logPath) {
  if (!fs.existsSync(logPath) || fs.statSync(logPath).size === 0) {
    fs.writeFileSync(logPath, 'timestamp\tprediction\tprice\n');
  }
}

function logStateTransitions(candles, predictions, logPath) {
  ensureDirExists(logPath);
  ensureSignalLogHeader(logPath);
  let lastPrediction = null;
  let lines = [];
  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i];
    const price = candles[i].close;
    let timestamp = candles[i].timestamp;
    if (/^\d+$/.test(timestamp)) timestamp = new Date(Number(timestamp)).toISOString();
    if (
      pred !== lastPrediction &&
      pred &&
      LABELS.includes(pred) &&
      timestamp &&
      !isNaN(price)
    ) {
      lines.push(`${timestamp}\t${pred}\t${price}`);
      lastPrediction = pred;
    }
  }
  if (lines.length) {
    fs.appendFileSync(logPath, lines.join('\n') + '\n');
    console.log('Wrote state transitions to', logPath);
  } else {
    console.log('No new transitions to log.');
  }
}

function runRecognition() {
  try {
    const candles = loadCsvCandles(CSV_PATH);
    if (!candles.length) throw new Error('No valid candles found in CSV.');
    const {min, max} = loadNormStats();
    const model = loadModel(MODEL_DIR);
    const predictions = predictCandles(candles, model, min, max);
    writeEnhancedCsv(candles, predictions, PRED_CSV_PATH);
    logStateTransitions(candles, predictions, SIGNAL_LOG_PATH);
  } catch (err) {
    console.error('Recognition error:', err.stack || err.message);
  }
}

runRecognition();
setInterval(runRecognition, INTERVAL_MS);
