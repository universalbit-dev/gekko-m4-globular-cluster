/**
 * chart_ccxt_recognition.js
 *
 * Predicts market actions ('bull', 'bear', 'idle') from OHLCV CSV data using a trained ConvNetJS model.
 * - Reads OHLCV candles from CSV (../logs/csv/ohlcv_ccxt_data.csv)
 * - Loads the latest trained model & normalization stats from ./trained_ccxt_ohlcv
 * - Normalizes new candle data using saved min/max
 * - Predicts class ('bull', 'bear', 'idle') for each candle
 * - Writes per-candle predictions to ohlcv_ccxt_data_prediction.csv (with header)
 * - Logs deduplicated state transitions to ccxt_signal.log (with header): only when prediction changes, not for every candle
 * - Handles duplicate/malformed CSV headers gracefully
 * - Ensures robust file handling and efficiency for large CSV/log files
 * - Runs every INTERVAL_MS (default: 1 Hour)
 * - Uses clear, modern JavaScript practices
 *
 * The main improvement is in the deduplication logic: only log a signal when the prediction changes
 * (not when the timestamp changes), producing a clean signal log suitable for downstream order automation.
 * The code is robust for large datasets, properly sorts input candles, and is easy to maintain.
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

/**
 * Ensures the directory exists for the given file path
 * @param {string} filePath - The file path
 */
function ensureDirExists(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

/**
 * Loads and parses OHLCV candles from CSV file with robust header handling
 * @param {string} csvPath - Path to the CSV file
 * @returns {Array} Array of parsed candle objects
 */
function loadCsvCandles(csvPath) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found at: ${csvPath}`);
  }
  
  const content = fs.readFileSync(csvPath, 'utf8').trim();
  if (!content) {
    throw new Error('CSV file is empty');
  }

  let rows = content.split('\n');
  
  // Robust header detection and removal
  const headerPattern = /^timestamp,open,high,low,close,volume/i;
  rows = rows.filter(row => {
    const trimmed = row.trim();
    // Remove empty lines and header lines (including malformed ones)
    return trimmed && !headerPattern.test(trimmed);
  });

  const candles = rows.map(line => {
    const parts = line.split(',');
    if (parts.length < 6) return null; // Skip malformed rows
    
    const [timestamp, open, high, low, close, volume] = parts;
    return {
      timestamp: timestamp.trim(),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume)
    };
  }).filter(candle => 
    candle &&
    candle.timestamp &&
    !isNaN(candle.open) && 
    !isNaN(candle.high) && 
    !isNaN(candle.low) &&
    !isNaN(candle.close) && 
    !isNaN(candle.volume) &&
    candle.open > 0 && 
    candle.high > 0 && 
    candle.low > 0 && 
    candle.close > 0 &&
    candle.volume >= 0
  );

  // Deduplicate by timestamp and sort chronologically
  const uniqueCandlesMap = new Map();
  for (const candle of candles) {
    uniqueCandlesMap.set(candle.timestamp, candle);
  }
  
  const uniqueCandles = Array.from(uniqueCandlesMap.values());
  
  // Sort candles by timestamp ascending for chronological processing
  uniqueCandles.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeA - timeB;
  });

  console.log(`Loaded ${uniqueCandles.length} valid candles from ${rows.length} total rows`);
  return uniqueCandles;
}

/**
 * Loads normalization statistics from the saved file
 * @returns {Object} Object containing min and max arrays
 */
function loadNormStats() {
  if (!fs.existsSync(NORM_STATS_PATH)) {
    throw new Error(`No normalization stats found at: ${NORM_STATS_PATH}`);
  }
  
  try {
    const stats = JSON.parse(fs.readFileSync(NORM_STATS_PATH, 'utf8'));
    if (!stats.min || !stats.max || !Array.isArray(stats.min) || !Array.isArray(stats.max)) {
      throw new Error('Invalid normalization stats format');
    }
    return stats;
  } catch (err) {
    throw new Error(`Failed to load normalization stats: ${err.message}`);
  }
}

/**
 * Normalizes input values using min/max scaling
 * @param {Array} vals - Input values
 * @param {Array} min - Minimum values for normalization
 * @param {Array} max - Maximum values for normalization
 * @returns {Array} Normalized values
 */
function norm(vals, min, max) {
  return vals.map((v, i) => {
    if (max[i] === min[i]) return 0;
    return (v - min[i]) / (max[i] - min[i]);
  });
}

/**
 * Loads the latest trained model from the model directory
 * @param {string} modelDir - Path to the model directory
 * @returns {Object} Loaded ConvNet model
 */
function loadModel(modelDir) {
  if (!fs.existsSync(modelDir)) {
    throw new Error(`No trained model directory found at: ${modelDir}`);
  }
  
  const modelFiles = fs.readdirSync(modelDir)
    .filter(f => f.endsWith('.json') && f !== 'norm_stats.json')
    .sort()
    .reverse(); // use latest
    
  if (!modelFiles.length) {
    throw new Error('No trained model files found');
  }
  
  const modelPath = path.join(modelDir, modelFiles[0]);
  console.log(`Loading model: ${modelFiles[0]}`);
  
  try {
    const modelJson = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    const net = new ConvNet.Net();
    net.fromJSON(modelJson);
    return net;
  } catch (err) {
    throw new Error(`Failed to load model: ${err.message}`);
  }
}

/**
 * Predicts market actions for an array of candles
 * @param {Array} candles - Array of candle objects
 * @param {Object} net - Trained ConvNet model
 * @param {Array} min - Minimum values for normalization
 * @param {Array} max - Maximum values for normalization
 * @returns {Array} Array of predictions
 */
function predictCandles(candles, net, min, max) {
  return candles.map((candle, index) => {
    try {
      const inputRaw = [candle.open, candle.high, candle.low, candle.close, candle.volume];
      const input = norm(inputRaw, min, max);
      const x = new ConvNet.Vol(1, 1, 5, input);
      const out = net.forward(x);
      const probs = out.w;
      const idx = probs.indexOf(Math.max(...probs));
      const prediction = LABELS[idx] !== undefined ? LABELS[idx] : 'idle';
      
      // Log prediction details for debugging on first few predictions
      if (index < 3) {
        console.log(`Prediction ${index + 1}: ${prediction} (probs: ${probs.map(p => p.toFixed(3)).join(', ')})`);
      }
      
      return prediction;
    } catch (err) {
      console.warn(`Prediction error for candle ${index + 1}: ${err.message}`);
      return 'idle';
    }
  });
}

/**
 * Writes enhanced CSV with predictions, overwriting previous file
 * @param {Array} candles - Array of candle objects
 * @param {Array} predictions - Array of predictions
 * @param {string} outPath - Output file path
 */
function writeEnhancedCsv(candles, predictions, outPath) {
  ensureDirExists(outPath);
  const header = 'timestamp,open,high,low,close,volume,prediction\n';
  const lines = candles.map((candle, i) =>
    `${candle.timestamp},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume},${predictions[i]}`
  );
  
  const content = header + lines.join('\n') + '\n';
  fs.writeFileSync(outPath, content);
  console.log(`Wrote enhanced prediction CSV with ${lines.length} rows: ${outPath}`);
}

/**
 * Ensures the signal log file has proper header
 * @param {string} logPath - Path to the signal log file
 */
function ensureSignalLogHeader(logPath) {
  if (!fs.existsSync(logPath) || fs.statSync(logPath).size === 0) {
    ensureDirExists(logPath);
    fs.writeFileSync(logPath, 'timestamp\tprediction\tprice\n');
  }
}

/**
 * Logs state transitions with improved deduplication
 * Only logs when prediction actually changes, not on timestamp changes
 * @param {Array} candles - Array of candle objects
 * @param {Array} predictions - Array of predictions
 * @param {string} logPath - Path to the signal log file
 */
function logStateTransitions(candles, predictions, logPath) {
  ensureSignalLogHeader(logPath);
  
  // Read existing log to determine last logged prediction
  let lastLoggedPrediction = null;
  if (fs.existsSync(logPath)) {
    try {
      const existingContent = fs.readFileSync(logPath, 'utf8').trim();
      const lines = existingContent.split('\n');
      if (lines.length > 1) { // Skip header
        const lastLine = lines[lines.length - 1];
        const parts = lastLine.split('\t');
        if (parts.length >= 2) {
          lastLoggedPrediction = parts[1];
        }
      }
    } catch (err) {
      console.warn(`Warning: Could not read existing log: ${err.message}`);
    }
  }

  const newTransitions = [];
  let currentPrediction = lastLoggedPrediction;
  
  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i];
    const price = candles[i].close;
    let timestamp = candles[i].timestamp;
    
    // Normalize timestamp format
    if (/^\d+$/.test(timestamp)) {
      timestamp = new Date(Number(timestamp)).toISOString();
    }
    
    // Only log if prediction actually changes
    if (pred !== currentPrediction && 
        pred && 
        LABELS.includes(pred) && 
        timestamp && 
        !isNaN(price) && 
        price > 0) {
      
      newTransitions.push(`${timestamp}\t${pred}\t${price}`);
      currentPrediction = pred;
    }
  }
  
  if (newTransitions.length > 0) {
    fs.appendFileSync(logPath, newTransitions.join('\n') + '\n');
    console.log(`Logged ${newTransitions.length} new state transitions to ${logPath}`);
  } else {
    console.log('No new prediction changes to log');
  }
}

/**
 * Deduplicates and sorts the signal log file by timestamp
 * Removes duplicate timestamps while preserving chronological order
 * @param {string} logPath - Path to the signal log file
 */
function deduplicateAndSortLogFile(logPath) {
  if (!fs.existsSync(logPath)) return;
  
  try {
    const content = fs.readFileSync(logPath, 'utf8').trim();
    const lines = content.split('\n');
    
    if (lines.length <= 1) return; // Only header or empty
    
    const header = lines[0];
    const dataLines = lines.slice(1);
    
    // Parse, deduplicate by timestamp, and sort
    const seen = new Set();
    const parsed = dataLines
      .map(line => {
        const parts = line.split('\t');
        if (parts.length < 3) return null;
        const [ts, signal, price] = parts;
        return { ts, signal, price, orig: line };
      })
      .filter(obj => obj && obj.ts && obj.signal && obj.price)
      .sort((a, b) => new Date(a.ts) - new Date(b.ts));
    
    const deduped = [];
    for (const obj of parsed) {
      if (!seen.has(obj.ts)) {
        deduped.push(obj.orig);
        seen.add(obj.ts);
      }
    }
    
    if (deduped.length !== dataLines.length) {
      const newContent = header + '\n' + deduped.join('\n') + (deduped.length > 0 ? '\n' : '');
      fs.writeFileSync(logPath, newContent);
      console.log(`Deduplicated signal log: ${dataLines.length} -> ${deduped.length} entries`);
    }
  } catch (err) {
    console.warn(`Warning: Could not deduplicate signal log: ${err.message}`);
  }
}

/**
 * Main recognition function that orchestrates the entire process
 */
function runRecognition() {
  console.log(`[${new Date().toISOString()}] Starting recognition process...`);
  
  try {
    // Load and validate data
    const candles = loadCsvCandles(CSV_PATH);
    if (!candles.length) {
      throw new Error('No valid candles found in CSV');
    }
    
    console.log(`Processing ${candles.length} candles from ${candles[0].timestamp} to ${candles[candles.length - 1].timestamp}`);
    
    // Load model and normalization stats
    const { min, max } = loadNormStats();
    const model = loadModel(MODEL_DIR);
    
    // Generate predictions
    console.log('Generating predictions...');
    const predictions = predictCandles(candles, model, min, max);
    
    // Write outputs
    writeEnhancedCsv(candles, predictions, PRED_CSV_PATH);
    logStateTransitions(candles, predictions, SIGNAL_LOG_PATH);
    
    // Clean up signal log
    deduplicateAndSortLogFile(SIGNAL_LOG_PATH);
    
    console.log(`[${new Date().toISOString()}] Recognition process completed successfully`);
    
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Recognition error: ${err.stack || err.message}`);
  }
}

// Initial run
console.log('CCXT Recognition System Starting...');
console.log(`Monitoring: ${CSV_PATH}`);
console.log(`Model directory: ${MODEL_DIR}`);
console.log(`Output predictions: ${PRED_CSV_PATH}`);
console.log(`Signal log: ${SIGNAL_LOG_PATH}`);
console.log(`Update interval: ${INTERVAL_MS / 1000 / 60} minutes`);

runRecognition();

// Schedule periodic runs
setInterval(runRecognition, INTERVAL_MS);
