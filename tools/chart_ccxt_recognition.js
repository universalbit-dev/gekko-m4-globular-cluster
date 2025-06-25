/**
 * chart_ccxt_recognition.js
 * 
 * Predicts market actions ('bull', 'bear', 'idle') from OHLCV CSV data using trained ConvNet models.
 * Ensures chronological order and deduplication of signals and prediction logs.
 * 
 * Features:
 * - Loads and parses OHLCV CSV data.
 * - Converts data to JSON for downstream processing.
 * - Loads all ConvNet models from a directory.
 * - Predicts market state for each candle.
 * - Logs only state transitions in signal logs.
 * - Deduplicates and sorts signal log entries.
 * 
 * Note: Inference runs every 15 minutes by default.
 */

const fs = require('fs');
const path = require('path');
const ConvNet = require('../core/convnet.js');

const CSV_PATH = path.join(__dirname, '../logs/csv/ohlcv_ccxt_data.csv');
const JSON_PATH = path.join(__dirname, '../logs/json/ohlcv/ohlcv_ccxt_data.json');
const MODEL_DIR = path.join(__dirname, './trained_ccxt_ohlcv');
const OUT_CSV_PATH = path.join(__dirname, './ohlcv_ccxt_data_prediction.csv');
const SIGNAL_LOG_PATH = path.join(__dirname, './ccxt_signal.log');
const LABELS = ['bull', 'bear', 'idle'];
const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function loadCsvRows(csvPath) {
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found at: ${csvPath}`);
  const rows = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  // Remove header if present (second column is not a number)
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

function predictAll(candles, net) {
  return candles.map(candle => {
    try {
      const input = [candle.open, candle.high, candle.low, candle.close, candle.volume];
      const x = new ConvNet.Vol(input);
      const out = net.forward(x);
      const probs = out.w;
      const idx = probs.indexOf(Math.max(...probs));
      return LABELS[idx] !== undefined ? LABELS[idx] : 'idle'; // Fallback for robustness
    } catch (err) {
      console.error('Prediction error:', err);
      return 'idle';
    }
  });
}

function writeEnhancedCsv(candles, predictions, modelName) {
  const header = 'timestamp,open,high,low,close,volume,prediction,model\n';
  const out = candles.map((candle, i) =>
    `${candle.timestamp},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume},${predictions[i]},${modelName}`
  ).join('\n');
  fs.writeFileSync(OUT_CSV_PATH, header + out + '\n');
  console.log('Wrote predicted CSV:', OUT_CSV_PATH);
}

// Append only signal transitions, in chronological order
function appendSignalTransitions(candles, predictions, logPath) {
  let lastPrediction = null;
  let lines = [];
  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] !== lastPrediction && predictions[i] !== undefined) {
      let isoTime = candles[i].timestamp;
      if (/^\d+$/.test(isoTime)) isoTime = new Date(Number(isoTime)).toISOString();
      lines.push(`${isoTime}\t${predictions[i]}`);
      lastPrediction = predictions[i];
    }
  }
  if (lines.length > 0) {
    fs.appendFileSync(logPath, lines.join('\n') + '\n');
    console.log('Appended signal transitions to', logPath);
  }
}

// Deduplicate and sort the log file
function deduplicateAndSortLogFile(logPath) {
  if (!fs.existsSync(logPath)) return;
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
  const seen = new Set();
  const deduped = [];
  const parsed = lines
    .map(line => {
      const [ts, signal] = line.split('\t');
      return { ts, signal, orig: line };
    })
    .filter(obj => obj.ts && obj.signal)
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));
  for (const obj of parsed) {
    if (!seen.has(obj.ts)) {
      deduped.push(obj.orig);
      seen.add(obj.ts);
    }
  }
  fs.writeFileSync(logPath, deduped.join('\n') + '\n');
}

function runRecognition() {
  try {
    const rows = loadCsvRows(CSV_PATH);
    let candles = csvToJson(rows, JSON_PATH);

    // Deduplicate by timestamp
    const uniqueCandlesMap = new Map();
    for (const candle of candles) uniqueCandlesMap.set(candle.timestamp, candle);
    let uniqueCandles = Array.from(uniqueCandlesMap.values());

    // Sort candles by timestamp ascending
    uniqueCandles.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const models = loadAllModels(MODEL_DIR);
    if (models.length) {
      for (const { net, filename } of models) {
        const predictions = predictAll(uniqueCandles, net);
        writeEnhancedCsv(uniqueCandles, predictions, filename);
        appendSignalTransitions(uniqueCandles, predictions, SIGNAL_LOG_PATH);
        deduplicateAndSortLogFile(SIGNAL_LOG_PATH);
        console.log(`[${new Date().toISOString()}] Prediction CSV generated for model: ${filename}`);
      }
    } else {
      console.log('Prediction CSV not generated because no trained models were found.');
    }
  } catch (err) {
    console.error('Recognition error:', err.stack || err.message);
  }
}

// Initial run
runRecognition();
// Repeat every INTERVAL_MS (15 minutes by default)
setInterval(runRecognition, INTERVAL_MS);
