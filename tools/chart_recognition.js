/**
 * chart_ccxt_recognition.js
 *
 * Description: Predicts market actions ('bull', 'bear', 'idle') from OHLCV CSV data (ExchangeSimulator) using trained ConvNet models.
 * - Loads OHLCV data from CSV (ExchangeSimulator)
 * - Converts to JSON and saves
 * - Loads models from MODEL_DIR
 * - Makes predictions and writes enhanced CSV with predictions
 * - Runs every 15 minutes by default
 *
 * Note: This script overwrites the output CSV file on each run to avoid file size growth.
 * It also appends only signal transitions (state changes) to exchangesimulator_signal.log.
 */

const fs = require('fs');
const path = require('path');
const ConvNet = require('../core/convnet.js'); // adjust path if needed

const CSV_PATH = path.join(__dirname, '../logs/csv/ohlcv_data.csv');
const JSON_PATH = path.join(__dirname, '../logs/json/ohlcv/ohlcv_data.json');
const MODEL_DIR = path.join(__dirname, './trained_ohlcv'); // Directory
const OUT_CSV_PATH = path.join(__dirname, './ohlcv_data_prediction.csv');
const SIGNAL_LOG_PATH = path.join(__dirname, './exchangesimulator_signal.log');
const LABELS = ['bull', 'bear', 'idle'];
const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function loadCsvRows(csvPath) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found at: ${csvPath}`);
  }
  const rows = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  // Remove header if present
  if (rows.length && isNaN(Number(rows[0].split(',')[1]))) rows.shift();
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
  });
  fs.writeFileSync(jsonPath, JSON.stringify(candles, null, 2));
  return candles;
}

function loadAllModels(modelDir) {
  if (!fs.existsSync(modelDir)) {
    console.warn('No trained model directory found. Skipping prediction step.');
    return [];
  }
  const modelFiles = fs.readdirSync(modelDir).filter(file => file.endsWith('.json'));
  return modelFiles.map(file => {
    const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, file), 'utf8'));
    const net = new ConvNet.Net();
    net.fromJSON(modelJson);
    return { net, filename: file };
  });
}

function predictAll(candles, model) {
  return candles.map(candle => {
    const input = [candle.open, candle.high, candle.low, candle.close, candle.volume];
    const x = new ConvNet.Vol(input);
    const out = model.forward(x);
    const probs = out.w;
    const idx = probs.indexOf(Math.max(...probs));
    return LABELS[idx];
  });
}

// Overwrite output file each time to prevent file growth
function writeEnhancedCsv(rows, predictions, modelName) {
  const header = 'timestamp,open,high,low,close,volume,prediction,model\n';
  const out = rows.map((row, i) => `${row},${predictions[i]},${modelName}`).join('\n');
  fs.writeFileSync(OUT_CSV_PATH, header + out + '\n');
  console.log('Wrote predicted CSV:', OUT_CSV_PATH);
}

// Append signal changes only (timestamp\tprediction) to log file
function appendSignalTransitions(timestamps, predictions, SIGNAL_LOG_PATH) {
  let lastPrediction = null;
  let lines = [];
  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] !== lastPrediction && predictions[i] !== undefined) {
      lines.push(`${timestamps[i]}\t${predictions[i]}`);
      lastPrediction = predictions[i];
    }
  }
  if (lines.length > 0) {
    // Append new lines to the log file
    fs.appendFileSync(SIGNAL_LOG_PATH, lines.join('\n') + '\n');
    console.log('Appended signal transitions to', SIGNAL_LOG_PATH);
  }
}

function runRecognition() {
  try {
    const rows = loadCsvRows(CSV_PATH);
    const candles = csvToJson(rows, JSON_PATH);
    const timestamps = candles.map(c => c.timestamp);

    const models = loadAllModels(MODEL_DIR);

    if (models.length) {
      for (const { net, filename } of models) {
        const predictions = predictAll(candles, net);
        writeEnhancedCsv(rows, predictions, filename);
        appendSignalTransitions(timestamps, predictions, SIGNAL_LOG_PATH);
        deduplicateLogFile(SIGNAL_LOG_PATH);
        console.log(`[${new Date().toISOString()}] Prediction CSV generated for model: ${filename}`);
      }
    } else {
      console.log('Prediction CSV not generated because no trained models were found.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

function deduplicateLogFile(SIGNAL_LOG_PATH) {
  if (!fs.existsSync(SIGNAL_LOG_PATH)) return;
  const lines = fs.readFileSync(SIGNAL_LOG_PATH, 'utf8').trim().split('\n');
  const seen = new Set();
  const deduped = [];
  for (const line of lines) {
    const ts = line.split('\t')[0];
    if (!seen.has(ts)) {
      deduped.push(line);
      seen.add(ts);
    }
  }
  fs.writeFileSync(SIGNAL_LOG_PATH, deduped.join('\n') + '\n');
}

// Initial run
runRecognition();
// Repeat every INTERVAL_MS (15 minutes by default)
setInterval(runRecognition, INTERVAL_MS);
