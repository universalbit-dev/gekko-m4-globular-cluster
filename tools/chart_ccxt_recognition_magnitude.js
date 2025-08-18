/**
 * chart_ccxt_recognition_magnitude.js (modular, uses label_ohlcv.js)
 * Processes OHLCV CSV, loads ConvNet and TensorFlow.js models, computes PVVM/PVD, labels and logs predictions for comparative analysis.
 */
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const ConvNet = require('../core/convnet.js');
const tf = require('@tensorflow/tfjs-node');
const { labelCandles, EPSILON } = require('./label_ohlcv.js');

const CSV_PATH = path.resolve(__dirname, '../logs/csv/ohlcv_ccxt_data.csv');
const MODEL_DIR_CONVNET = path.resolve(__dirname, './trained_ccxt_ohlcv');
const MODEL_DIR_TF = path.resolve(__dirname, './trained_ccxt_ohlcv_tf');
const SIGNAL_LOG_PATH_COMPARISON = path.resolve(__dirname, './ccxt_signal_comparative.log');
const LABELS = ['bull', 'bear', 'idle'];

// IMPORTANT: INTERVAL_MS must be the same in all related scripts for consistent signal processing and order logic.
// Set INTERVAL_MS in .env to synchronize intervals.
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS, 10) || 3600000; // default 1h

const LOG_MAX_BYTES = 1024 * 1024;
const LOG_KEEP_BYTES = 512 * 1024;

const PVVM_THRESHOLD = parseFloat(process.env.PVVM_BASE_THRESHOLD) || 10;
const PVD_THRESHOLD = parseFloat(process.env.PVD_BASE_THRESHOLD) || 10;

// Utility functions (unchanged)
function ensureDirExists(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function enforceLogSizeLimit(logPath, maxBytes = LOG_MAX_BYTES, keepBytes = LOG_KEEP_BYTES) {
  if (fs.existsSync(logPath)) {
    const stats = fs.statSync(logPath);
    if (stats.size > maxBytes) {
      const data = fs.readFileSync(logPath);
      const firstNl = data.indexOf('\n');
      let header = '';
      let body = data;
      if (firstNl !== -1) {
        header = data.slice(0, firstNl + 1).toString();
        body = data.slice(firstNl + 1);
      }
      let keepBody = body.slice(-keepBytes);
      const firstBodyNl = keepBody.indexOf('\n');
      if (firstBodyNl !== -1) {
        keepBody = keepBody.slice(firstBodyNl + 1);
      }
      fs.writeFileSync(logPath, header + keepBody.toString());
      console.log(`Truncated ${logPath} to header + last ${keepBytes} bytes.`);
    }
  }
}

function ensureSignalLogHeader(logPath) {
  const header = 'timestamp\tprediction_convnet\tprediction_tf\tprice\tPVVM\tPVD\tlabel_convnet\tlabel_tf\tensemble_label\n';
  if (!fs.existsSync(logPath) || fs.statSync(logPath).size === 0) {
    fs.writeFileSync(logPath, header);
  } else {
    const firstLine = fs.readFileSync(logPath, {encoding:'utf8', flag:'r'}).split('\n')[0];
    if (!firstLine.includes('\tensemble_label')) {
      const data = fs.readFileSync(logPath);
      const firstNl = data.indexOf('\n');
      const body = data.slice(firstNl + 1);
      fs.writeFileSync(logPath, header + body);
    }
  }
}

function loadCsvCandles(csvPath) {
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found at: ${csvPath}`);
  let rows = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  rows = rows.filter(row => !/^timestamp,open,high,low,close,volume/i.test(row));
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

function loadModelConvNet(modelDir) {
  if (!fs.existsSync(modelDir)) throw new Error('No trained ConvNet model directory found.');
  const modelFiles = fs.readdirSync(modelDir)
    .filter(f => f.endsWith('.json') && f !== 'norm_stats.json')
    .sort()
    .reverse();
  if (!modelFiles.length) throw new Error('No trained ConvNet model files found.');
  let modelJson;
  let net;
  for (const modelFile of modelFiles) {
    try {
      modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, modelFile), 'utf8'));
      net = new ConvNet.Net();
      net.fromJSON(modelJson);
      return net;
    } catch (err) {
      console.error(`Skipping invalid ConvNet model file: ${modelFile} (${err.message || err})`);
    }
  }
  throw new Error('No valid ConvNetJS model files could be loaded.');
}

// TensorFlow.js model loader
async function loadModelTF(modelDir) {
  if (!fs.existsSync(modelDir)) throw new Error('No trained TensorFlow model directory found.');
  const modelFiles = fs.readdirSync(modelDir)
    .filter(f => f.startsWith('trained_ccxt_ohlcv_tf_'))
    .sort()
    .reverse();
  if (!modelFiles.length) throw new Error('No trained TensorFlow model files found.');
  for (const modelFile of modelFiles) {
    try {
      const modelPath = `file://${path.join(modelDir, modelFile)}`;
      const model = await tf.loadLayersModel(modelPath + '/model.json');
      return model;
    } catch (err) {
      console.error(`Skipping invalid TensorFlow model: ${modelFile} (${err.message || err})`);
    }
  }
  throw new Error('No valid TensorFlow models could be loaded.');
}

function priceVolumeVectorMagnitude(a, b) {
  const dx = b.close - a.close;
  const dy = b.volume - a.volume;
  return Math.sqrt(dx * dx + dy * dy);
}

function priceVolumeDistance(a, b) {
  return Math.abs(b.close - a.close) + Math.abs(b.volume - a.volume);
}

function computeMagnitudeIndicators(candles) {
  let indicators = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      indicators.push({ PVVM: 0, PVD: 0 });
    } else {
      indicators.push({
        PVVM: priceVolumeVectorMagnitude(candles[i - 1], candles[i]),
        PVD: priceVolumeDistance(candles[i - 1], candles[i])
      });
    }
  }
  return indicators;
}

function labelSignal(pred, PVVM, PVD) {
  if (pred === 'bull' && PVVM > PVVM_THRESHOLD && PVD > PVD_THRESHOLD) return 'strong_bull';
  if (pred === 'bull') return 'weak_bull';
  if (pred === 'bear' && PVVM > PVVM_THRESHOLD && PVD > PVD_THRESHOLD) return 'strong_bear';
  if (pred === 'bear') return 'weak_bear';
  return 'neutral';
}

// ConvNet prediction (unchanged)
function predictCandlesConvNet(candles, indicators, net) {
  return candles.map((candle, i) => {
    try {
      const input = [
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume,
        indicators[i].PVVM,
        indicators[i].PVD
      ];
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

// TensorFlow.js prediction
function predictCandlesTF(candles, indicators, model) {
  // Prepare input for TF model: [open, high, low, close, volume]
  const inputs = candles.map(candle => [
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume
    // Note: if your TF model was trained with PVVM/PVD, add indicators[i].PVVM and indicators[i].PVD here
  ]);
  const xs = tf.tensor2d(inputs, [inputs.length, 5]);
  const preds = model.predict(xs);
  const probsArr = preds.arraySync();
  return probsArr.map(row => {
    const idx = row.indexOf(Math.max(...row));
    return LABELS[idx] !== undefined ? LABELS[idx] : 'idle';
  });
}

// Ensemble/Comparison function
function ensembleLabel(labelConvNet, labelTF) {
  // Simple majority voting or agreement
  if (labelConvNet === labelTF) return labelConvNet;
  // If different, you may prefer 'idle' or 'neutral' or more advanced logic
  return 'neutral';
}

// Logging function for comparative analysis
function logComparativeStateTransitions(candles, predictionsConvNet, predictionsTF, indicators, logPath) {
  ensureDirExists(logPath);
  enforceLogSizeLimit(logPath, LOG_MAX_BYTES, LOG_KEEP_BYTES);
  ensureSignalLogHeader(logPath);

  let lastPredictionConvNet = null;
  let lastPredictionTF = null;
  let lastTimestamp = null;
  let lines = [];

  for (let i = 0; i < predictionsConvNet.length; i++) {
    const predConvNet = predictionsConvNet[i];
    const predTF = predictionsTF[i];
    const price = candles[i].close;
    const timestamp = /^\d+$/.test(candles[i].timestamp)
      ? new Date(Number(candles[i].timestamp)).toISOString()
      : candles[i].timestamp;
    const { PVVM, PVD } = indicators[i];
    const labelConvNet = labelSignal(predConvNet, PVVM, PVD);
    const labelTF = labelSignal(predTF, PVVM, PVD);
    const ensemble = ensembleLabel(labelConvNet, labelTF);

    if (
      (predConvNet !== lastPredictionConvNet || predTF !== lastPredictionTF || timestamp !== lastTimestamp) &&
      predConvNet && predTF &&
      ['bull', 'bear', 'idle'].includes(predConvNet) &&
      ['bull', 'bear', 'idle'].includes(predTF) &&
      timestamp &&
      !isNaN(price)
    ) {
      lines.push(`${timestamp}\t${predConvNet}\t${predTF}\t${price}\t${PVVM}\t${PVD}\t${labelConvNet}\t${labelTF}\t${ensemble}`);
      lastPredictionConvNet = predConvNet;
      lastPredictionTF = predTF;
      lastTimestamp = timestamp;
    }
  }
  if (lines.length) {
    fs.appendFileSync(logPath, lines.join('\n') + '\n');
    console.log('Wrote comparative state transitions to', logPath);
  } else {
    console.log('No new transitions to log.');
  }
}

// Main recognition function (async for TensorFlow model loading)
async function runRecognition() {
  try {
    let candles = loadCsvCandles(CSV_PATH);
    if (!candles.length) throw new Error('No valid candles found in CSV.');

    // Consistent modular labeling
    candles = labelCandles(candles, EPSILON);

    const indicators = computeMagnitudeIndicators(candles);
    const modelConvNet = loadModelConvNet(MODEL_DIR_CONVNET);
    const modelTF = await loadModelTF(MODEL_DIR_TF);

    const predictionsConvNet = predictCandlesConvNet(candles, indicators, modelConvNet);
    const predictionsTF = predictCandlesTF(candles, indicators, modelTF);

    logComparativeStateTransitions(candles, predictionsConvNet, predictionsTF, indicators, SIGNAL_LOG_PATH_COMPARISON);
  } catch (err) {
    console.error('Recognition error:', err.stack || err.message);
  }
}

// Initial run
runRecognition();
// Repeat every INTERVAL_MS
setInterval(runRecognition, INTERVAL_MS);
