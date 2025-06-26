/**
 * chart_ccxt_recognition_fine_grained.js
 * 
 * Purpose:
 *   Processes OHLCV data (typically 15-minute intervals) using a trained CCXT model to recognize and classify 
 *   market states as 'bull', 'bear', or 'idle'. Logs only state transitions (not every prediction) to produce 
 *   concise, fine-grained signal data for trading strategies or analysis.
 * 
 * Key Features:
 *   - Loads recent high-frequency OHLCV data and applies a trained model for state recognition.
 *   - Logs only when the recognized state changes, with precise timestamps, to a dedicated signal log file.
 *   - Designed for higher-frequency (15-minute) recognition and signal logging.
 *   - Runs periodically for continuous, up-to-date signal generation.
 * 
 * Typical Usage:
 *   - As part of an automated trading system seeking higher-frequency signals.
 *   - For backtesting strategies at 15-minute intervals.
 * 
 * Dependencies:
 *   - Trained CCXT model files (.json)
 *   - High-frequency OHLCV CSV/JSON data
 *   - Node.js filesystem and path modules
 * 
 * Output:
 *   - signal log: ccxt_signal_fine.log
 *   - prediction CSV: ohlcv_ccxt_data_prediction.csv
 */

const fs = require('fs');
const path = require('path');
const ConvNet = require('../core/convnet.js');

const CSV_PATH = path.join(__dirname, '../logs/csv/ohlcv_ccxt_data.csv');
const JSON_PATH = path.join(__dirname, '../logs/json/ohlcv/ohlcv_ccxt_data_short.json');
const MODEL_DIR = path.join(__dirname, './trained_ccxt_ohlcv');
const OUT_CSV_PATH = path.join(__dirname, './ohlcv_ccxt_data_prediction.csv');
const SIGNAL_LOG_PATH = path.join(__dirname, './ccxt_signal_fine.log');
const LABELS = ['bull', 'bear', 'idle'];
const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function ensureDirExists(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadCsvRows(csvPath) {
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found at: ${csvPath}`);
  const rows = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  if (rows.length && isNaN(Number(rows[0].split(',')[1]))) rows.shift();
  return rows;
}

function csvToJson(rows, jsonPath) {
  ensureDirExists(jsonPath);
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

function loadModels(modelDir) {
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
      return LABELS[idx] !== undefined ? LABELS[idx] : 'idle';
    } catch (err) {
      console.error('Prediction error:', err);
      return 'idle';
    }
  });
}

function writePredictedCsv(candles, predictions, modelName) {
  ensureDirExists(OUT_CSV_PATH);
  const header = 'timestamp,open,high,low,close,volume,prediction,model\n';
  const out = candles.map((c, i) =>
    `${c.timestamp},${c.open},${c.high},${c.low},${c.close},${c.volume},${predictions[i]},${modelName}`
  ).join('\n');
  fs.writeFileSync(OUT_CSV_PATH, header + out + '\n');
  console.log('Wrote predicted CSV:', OUT_CSV_PATH);
}

// Log only state transitions
function logStateTransitions(candles, predictions, logPath) {
  ensureDirExists(logPath);
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
  // Overwrite log to avoid repeats
  fs.writeFileSync(logPath, lines.join('\n') + '\n');
  console.log('Wrote state transitions to', logPath);
}

function runRecognition() {
  try {
    const rows = loadCsvRows(CSV_PATH);
    const candles = csvToJson(rows, JSON_PATH);

    // Remove duplicate candles by timestamp
    const uniqueCandlesMap = new Map();
    for (const candle of candles) uniqueCandlesMap.set(candle.timestamp, candle);
    const uniqueCandles = Array.from(uniqueCandlesMap.values()).sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const models = loadModels(MODEL_DIR);

    if (models.length) {
      for (const { net, filename } of models) {
        const predictions = predictAll(uniqueCandles, net);
        writePredictedCsv(uniqueCandles, predictions, filename);
        logStateTransitions(uniqueCandles, predictions, SIGNAL_LOG_PATH);
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
setInterval(runRecognition, INTERVAL_MS);
