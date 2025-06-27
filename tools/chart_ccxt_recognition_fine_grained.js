/**
 * chart_ccxt_recognition_fine_grained.js
 *
 * Processes 15m OHLCV data, applies a trained CCXT model
 * 
 */

const fs = require('fs');
const path = require('path');
const ConvNet = require('../core/convnet.js');

const CSV_PATH = path.join(__dirname, '../logs/csv/ohlcv_ccxt_data.csv');
const MODEL_DIR = path.join(__dirname, './trained_ccxt_ohlcv');
const SIGNAL_LOG_PATH = path.join(__dirname, './ccxt_signal_fine.log');
const LABELS = ['bull', 'bear', 'idle'];
const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function ensureDirExists(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

// Load OHLCV candles from CSV
function loadCsvCandles(csvPath) {
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found at: ${csvPath}`);
  let rows = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  if (rows.length && isNaN(Number(rows[0].split(',')[1]))) rows.shift(); // skip header
  return rows.map(line => {
    const [timestamp, open, high, low, close, volume] = line.split(',');
    return {
      timestamp,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume),
    };
  }).filter(c =>
    c.timestamp &&
    !isNaN(c.open) && !isNaN(c.high) && !isNaN(c.low) &&
    !isNaN(c.close) && !isNaN(c.volume)
  );
}

function loadModel(modelDir) {
  if (!fs.existsSync(modelDir)) throw new Error('No trained model directory found.');
  const modelFiles = fs.readdirSync(modelDir).filter(f => f.endsWith('.json'));
  if (!modelFiles.length) throw new Error('No trained model files found.');
  // Use the first model for prediction
  const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, modelFiles[0]), 'utf8'));
  const net = new ConvNet.Net();
  net.fromJSON(modelJson);
  return net;
}

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

// Write header if missing
function ensureSignalLogHeader(logPath) {
  if (!fs.existsSync(logPath) || fs.statSync(logPath).size === 0) {
    fs.writeFileSync(logPath, 'timestamp\tprediction\tprice\n');
  }
}

// Log only state transitions, with valid tab-separated (timestamp, prediction, price)
function logStateTransitions(candles, predictions, logPath) {
  ensureDirExists(logPath);
  ensureSignalLogHeader(logPath);

  let lastPrediction = null;
  let lines = [];

  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i];
    const price = candles[i].close;
    const timestamp = /^\d+$/.test(candles[i].timestamp)
      ? new Date(Number(candles[i].timestamp)).toISOString()
      : candles[i].timestamp;

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

function runRecognition() {
  try {
    const candles = loadCsvCandles(CSV_PATH);
    if (!candles.length) throw new Error('No valid candles found in CSV.');
    const model = loadModel(MODEL_DIR);
    const predictions = predictCandles(candles, model);
    logStateTransitions(candles, predictions, SIGNAL_LOG_PATH);
  } catch (err) {
    console.error('Recognition error:', err.stack || err.message);
  }
}

runRecognition();
setInterval(runRecognition, INTERVAL_MS);
