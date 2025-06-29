/**
 * chart_ccxt_recognition_magnitude.js
 *
 * Processes 15m OHLCV data, computes PVVM and PVD indicators,
 * applies a trained CCXT model, and logs state transitions.
 * 
 * Features intelligent log rotation to maintain ccxt_signal_magnitude.log
 * under 1MB by truncating to keep only the last 0.5MB of data when exceeded.
 */

const fs = require('fs');
const path = require('path');
const ConvNet = require('../core/convnet.js');

const CSV_PATH = path.join(__dirname, '../logs/csv/ohlcv_ccxt_data.csv');
const MODEL_DIR = path.join(__dirname, './trained_ccxt_ohlcv');
const SIGNAL_LOG_PATH = path.join(__dirname, './ccxt_signal_magnitude.log');
const LABELS = ['bull', 'bear', 'idle'];
const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOG_SIZE = 1048576; // 1MB
const TARGET_LOG_SIZE = 524288; // 0.5MB

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

/**
 * Compute PVVM (Price-Volume-Volatility-Momentum) indicator
 * Combines price movement, volume strength, volatility, and momentum
 */
function computePVVM(candles, index) {
  if (index < 1) return 0;
  
  const current = candles[index];
  const previous = candles[index - 1];
  
  // Price change rate (momentum)
  const priceChange = (current.close - current.open) / current.open;
  
  // Volatility (normalized high-low spread)
  const volatility = (current.high - current.low) / current.close;
  
  // Volume-weighted momentum
  const volumeWeight = current.volume / (previous.volume || 1);
  
  // PVVM calculation: price_change * volume_weight * volatility
  return priceChange * volumeWeight * volatility;
}

/**
 * Compute PVD (Price-Volume-Delta) indicator  
 * Measures the change in volume-weighted price relationship
 */
function computePVD(candles, index) {
  if (index < 1) return 0;
  
  const current = candles[index];
  const previous = candles[index - 1];
  
  // Volume-weighted average price for current and previous periods
  const currentVWAP = (current.high + current.low + current.close) / 3 * current.volume;
  const previousVWAP = (previous.high + previous.low + previous.close) / 3 * previous.volume;
  
  // Normalize by volume to get PVD
  const currentNormalized = currentVWAP / (current.volume || 1);
  const previousNormalized = previousVWAP / (previous.volume || 1);
  
  return currentNormalized - previousNormalized;
}

function predictCandles(candles, net) {
  return candles.map((candle, index) => {
    try {
      // Compute PVVM and PVD indicators for analysis
      // Note: These are computed for future enhancement but not used in model input
      // to maintain compatibility with existing trained models
      const pvvm = computePVVM(candles, index);
      const pvd = computePVD(candles, index);
      
      // Use original 5 features to maintain model compatibility
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

/**
 * Intelligent log truncation to maintain file size under 1MB
 * When log exceeds 1MB, truncates to keep only the last 0.5MB of data
 * while preserving the header and most recent entries
 */
function truncateLogIfNeeded(logPath) {
  try {
    if (!fs.existsSync(logPath)) return;
    
    const stats = fs.statSync(logPath);
    if (stats.size < MAX_LOG_SIZE) return;
    
    console.log(`Log file size (${stats.size} bytes) exceeds 1MB. Truncating to preserve last 0.5MB...`);
    
    // Read the entire log file
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    
    if (lines.length <= 1) return; // Only header or empty file
    
    // Extract header (first line)
    const header = lines[0];
    const dataLines = lines.slice(1).filter(line => line.trim().length > 0);
    
    // Calculate how many lines to keep for ~0.5MB
    let currentSize = Buffer.byteLength(header + '\n', 'utf8');
    let linesToKeep = 0;
    
    // Count backwards from the end to find how many lines fit in TARGET_LOG_SIZE
    for (let i = dataLines.length - 1; i >= 0; i--) {
      const lineSize = Buffer.byteLength(dataLines[i] + '\n', 'utf8');
      if (currentSize + lineSize > TARGET_LOG_SIZE) break;
      currentSize += lineSize;
      linesToKeep++;
    }
    
    if (linesToKeep === 0) {
      // If even one line is too big, keep at least the last few lines
      linesToKeep = Math.min(10, dataLines.length);
    }
    
    // Keep the last N lines that fit within target size
    const keptLines = dataLines.slice(-linesToKeep);
    const truncatedContent = header + '\n' + keptLines.join('\n') + '\n';
    
    // Write truncated content back to file
    fs.writeFileSync(logPath, truncatedContent);
    
    const newSize = fs.statSync(logPath).size;
    console.log(`Log truncated: ${stats.size} bytes -> ${newSize} bytes (kept ${linesToKeep} most recent entries)`);
    
  } catch (err) {
    console.error('Error during log truncation:', err.message);
    // If truncation fails, continue with normal operation
  }
}

// Log only state transitions, with valid tab-separated (timestamp, prediction, price)
// Includes intelligent log size management to prevent excessive file growth
function logStateTransitions(candles, predictions, logPath) {
  try {
    ensureDirExists(logPath);
    ensureSignalLogHeader(logPath);
    
    // Truncate log if needed BEFORE appending new data
    truncateLogIfNeeded(logPath);

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
      console.log(`Wrote ${lines.length} state transitions to`, logPath);
    } else {
      console.log('No new transitions to log.');
    }
    
  } catch (err) {
    console.error('Error in logStateTransitions:', err.message);
    // Continue execution even if logging fails
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