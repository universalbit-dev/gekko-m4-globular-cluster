/**
 * chart_ccxt_recognition.js
 *
 * Predicts market actions ('bull', 'bear', 'idle') from OHLCV CSV data using a trained ConvNetJS model.
 * - Loads OHLCV data from CSV (with duplicate-header handling)
 * - Converts to JSON and saves for analysis
 * - Loads latest ConvNetJS model from MODEL_DIR
 * - Makes predictions; writes an enhanced CSV with predictions and true labels (overwrites each run)
 * - Appends only state transitions to ccxt_signal.log (deduplicated)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ConvNet = require('../core/convnet.js');

// --- Import labeling logic ---
const { labelCandle, labelCandles, EPSILON } = require('./label_ohlcv.js');

const CSV_PATH = path.join(__dirname, '../logs/csv/ohlcv_ccxt_data.csv');
const JSON_PATH = path.join(__dirname, '../logs/json/ohlcv/ohlcv_ccxt_data.json');
const MODEL_DIR = path.join(__dirname, './trained_ccxt_ohlcv');
const OUT_CSV_PATH = path.join(__dirname, './ohlcv_ccxt_data_prediction.csv');
const SIGNAL_LOG_PATH = path.join(__dirname, './ccxt_signal.log');
const LABELS = ['bull', 'bear', 'idle'];

// IMPORTANT: INTERVAL_MS must be the same in all related scripts for consistent signal processing and order logic.
// Set INTERVAL_MS in .env to synchronize intervals.
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS, 10) || 3600000; // default 1h


function loadCsvRows(csvPath) {
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found at: ${csvPath}`);
  let rows = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  // Remove duplicate headers
  rows = rows.filter(row => !/^timestamp,open,high,low,close,volume/i.test(row));
  return rows;
}

function csvToJson(rows, jsonPath) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  const candles = rows.map(line => {
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
  fs.writeFileSync(jsonPath, JSON.stringify(candles, null, 2));
  return candles;
}

function loadLatestModel(modelDir) {
  if (!fs.existsSync(modelDir)) throw new Error('No trained model directory found.');
  const modelFiles = fs.readdirSync(modelDir)
    .filter(f => f.endsWith('.json') && f !== 'norm_stats.json')
    .sort()
    .reverse();
  if (!modelFiles.length) throw new Error('No trained model files found.');
  const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, modelFiles[0]), 'utf8'));
  const net = new ConvNet.Net();
  net.fromJSON(modelJson);
  return net;
}

function predictAll(candles, net) {
  return candles.map(candle => {
    try {
      const input = [candle.open, candle.high, candle.low, candle.close, candle.volume];
      const x = new ConvNet.Vol(input);
      const out = net.forward(x);
      const probs = out.w;
      const idx = probs.indexOf(Math.max(...probs));
      return LABELS[idx] || 'idle';
    } catch (err) {
      return 'idle';
    }
  });
}

function writeEnhancedCsv(candles, predictions) {
  const header = 'timestamp,open,high,low,close,volume,label,prediction\n';
  const lines = candles.map((c, i) =>
    `${c.timestamp},${c.open},${c.high},${c.low},${c.close},${c.volume},${LABELS[c.label]},${predictions[i]}`
  );
  fs.writeFileSync(OUT_CSV_PATH, header + lines.join('\n') + '\n');
  console.log('Wrote enhanced prediction CSV:', OUT_CSV_PATH);
}

// Only append to log when prediction changes (state transition), deduplicate by prediction
function appendSignalTransitions(candles, predictions, logPath) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  let prevPrediction = null;
  let lines = [];
  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] !== prevPrediction && predictions[i] !== undefined) {
      lines.push(`${candles[i].timestamp}\t${predictions[i]}`);
      prevPrediction = predictions[i];
    }
  }
  if (lines.length) {
    fs.appendFileSync(logPath, lines.join('\n') + '\n');
    console.log('Appended signal transitions to', logPath);
  }
  deduplicateLogFile(logPath);
}

function deduplicateLogFile(logPath) {
  if (!fs.existsSync(logPath)) return;
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
  let deduped = [];
  let prevPrediction = null;
  for (const line of lines) {
    const [timestamp, prediction] = line.split('\t');
    if (prediction !== prevPrediction) {
      deduped.push(line);
      prevPrediction = prediction;
    }
  }
  fs.writeFileSync(logPath, deduped.join('\n') + '\n');
}

function runRecognition() {
  try {
    const rows = loadCsvRows(CSV_PATH);
    const candles = csvToJson(rows, JSON_PATH);
    const labeledCandles = labelCandles(candles, EPSILON); // <--- Use label logic
    const model = loadLatestModel(MODEL_DIR);
    const predictions = predictAll(labeledCandles, model);
    writeEnhancedCsv(labeledCandles, predictions);
    appendSignalTransitions(labeledCandles, predictions, SIGNAL_LOG_PATH);
    console.log(`[${new Date().toISOString()}] Prediction CSV generated and signals updated.`);
  } catch (err) {
    console.error('Recognition error:', err.message || err);
  }
}

runRecognition();
setInterval(runRecognition, INTERVAL_MS);
