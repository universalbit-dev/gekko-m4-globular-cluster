/**
 * chart_ccxt_recognition.js
 *
 * Predicts market actions ('bull', 'bear', 'idle') from OHLCV CSV data using a trained ConvNet model.
 *
 * - Reads OHLCV candles from CSV (../logs/csv/ohlcv_ccxt_data.csv)
 * - Loads a trained model from ./trained_ccxt_ohlcv
 * - Predicts a label ('bull', 'bear', 'idle') for each candle
 * - Writes per-candle predictions to ohlcv_ccxt_data_prediction.csv (with header)
 * - Logs state transitions to ccxt_signal_hourly.log (with header)
 * - Handles duplicate/malformed CSV headers gracefully
 * - Runs every INTERVAL_MS (default: 1 hour)
 *
 * Usage:
 *   node chart_ccxt_recognition.js
 *
 * Author: universalbit-dev (https://github.com/universalbit-dev)
 * License: MIT
 */

const fs = require('fs');
const path = require('path');
const ConvNet = require('../core/convnet.js');

const CSV_PATH = path.join(__dirname, '../logs/csv/ohlcv_ccxt_data.csv');
const MODEL_DIR = path.join(__dirname, './trained_ccxt_ohlcv');
const PRED_CSV_PATH = path.join(__dirname, './ohlcv_ccxt_data_prediction.csv');
const SIGNAL_LOG_PATH = path.join(__dirname, './ccxt_signal.log');
const LABELS = ['bull', 'bear', 'idle'];
// INTERVAL_MS determines how often the script runs (in milliseconds).
// Common intervals:
//   5 minutes  (high frequency):   const INTERVAL_MS = 5 * 60 * 1000;
//  15 minutes  (high frequency):   const INTERVAL_MS = 15 * 60 * 1000;
//   1 hour     (medium term):      const INTERVAL_MS = 60 * 60 * 1000;
//  24 hours    (long term):        const INTERVAL_MS = 24 * 60 * 60 * 1000;
// Adjust this value based on your analysis timeframe needs.
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour (default: medium term)

// Ensure the directory for a file exists
function ensureDirExists(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

// Read and parse OHLCV CSV, skipping all header rows and malformed lines
function loadCsvCandles(csvPath) {
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found at: ${csvPath}`);
  let rows = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  // Remove all header rows (e.g. first line or repeated header lines)
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

// Load the first available model from the directory
function loadModel(modelDir) {
  if (!fs.existsSync(modelDir)) throw new Error('No trained model directory found.');
  const modelFiles = fs.readdirSync(modelDir).filter(f => f.endsWith('.json'));
  if (!modelFiles.length) throw new Error('No trained model files found.');
  // Use the first model
  const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, modelFiles[0]), 'utf8'));
  const net = new ConvNet.Net();
  net.fromJSON(modelJson);
  return net;
}

// Predict label for each candle
function predictCandles(candles, net) {
  return candles.map(candle => {
    try {
      const input = [candle.open, candle.high, candle.low, candle.close, candle.volume];
      const x = new ConvNet.Vol(input);
      const out = net.forward(x);
      const probs = out.w;
      const idx = probs.indexOf(Math.max(...probs));
      return LABELS[idx] !== undefined ? LABELS[idx] : 'idle';
    } catch (err) {
      return 'idle';
    }
  });
}

// Write enhanced CSV with predictions
function writeEnhancedCsv(candles, predictions, outPath) {
  ensureDirExists(outPath);
  const header = 'timestamp,open,high,low,close,volume,prediction\n';
  const lines = candles.map((candle, i) =>
    `${candle.timestamp},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume},${predictions[i]}`
  );
  fs.writeFileSync(outPath, header + lines.join('\n') + '\n');
  console.log('Wrote enhanced prediction CSV:', outPath);
}

// Ensure log header exists
function ensureSignalLogHeader(logPath) {
  if (!fs.existsSync(logPath) || fs.statSync(logPath).size === 0) {
    fs.writeFileSync(logPath, 'timestamp\tprediction\tprice\n');
  }
}

// Log only state transitions, tab-separated (timestamp, prediction, price)
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
      ['bull', 'bear', 'idle'].includes(pred) &&
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

// Main recognition process
function runRecognition() {
  try {
    const candles = loadCsvCandles(CSV_PATH);
    if (!candles.length) throw new Error('No valid candles found in CSV.');
    const model = loadModel(MODEL_DIR);
    const predictions = predictCandles(candles, model);
    writeEnhancedCsv(candles, predictions, PRED_CSV_PATH);
    logStateTransitions(candles, predictions, SIGNAL_LOG_PATH);
  } catch (err) {
    console.error('Recognition error:', err.stack || err.message);
  }
}

runRecognition();
setInterval(runRecognition, INTERVAL_MS);
