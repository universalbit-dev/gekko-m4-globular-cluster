/**
 * chart_ccxt_recognition.js (modular, uses label_ohlcv.js)
 * Processes OHLCV CSV, loads trained model, predicts and logs signals (no magnitude).
 */
const fs = require('fs');
const path = require('path');
const ConvNet = require('../core/convnet.js');
const { labelCandles, EPSILON } = require('./label_ohlcv.js');

const CSV_PATH = path.join(__dirname, '../logs/csv/ohlcv_ccxt_data.csv');
const MODEL_DIR = path.join(__dirname, './trained_ccxt_ohlcv');
const SIGNAL_LOG_PATH = path.join(__dirname, './ccxt_signal.log');
const LABELS = ['bull', 'bear', 'idle'];
const INTERVAL_MS = 15 * 60 * 1000;
const LOG_MAX_BYTES = 1024 * 1024;
const LOG_KEEP_BYTES = 512 * 1024;

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
  const header = 'timestamp\tprediction\tprice\n';
  if (!fs.existsSync(logPath) || fs.statSync(logPath).size === 0) {
    fs.writeFileSync(logPath, header);
  } else {
    const firstLine = fs.readFileSync(logPath, {encoding:'utf8', flag:'r'}).split('\n')[0];
    if (!firstLine.includes('\tprediction')) {
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

function loadModel(modelDir) {
  if (!fs.existsSync(modelDir)) throw new Error('No trained model directory found.');
  const modelFiles = fs.readdirSync(modelDir)
    .filter(f => f.endsWith('.json') && f !== 'norm_stats.json')
    .sort()
    .reverse();
  if (!modelFiles.length) throw new Error('No trained model files found.');
  let modelJson;
  let net;
  for (const modelFile of modelFiles) {
    try {
      modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, modelFile), 'utf8'));
      net = new ConvNet.Net();
      net.fromJSON(modelJson);
      return net;
    } catch (err) {
      console.error(`Skipping invalid model file: ${modelFile} (${err.message || err})`);
    }
  }
  throw new Error('No valid ConvNetJS model files could be loaded.');
}

function predictCandles(candles, net) {
  return candles.map((candle) => {
    try {
      const input = [candle.open, candle.high, candle.low, candle.close, candle.volume];
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

function logPredictions(candles, predictions, logPath) {
  ensureDirExists(logPath);
  enforceLogSizeLimit(logPath, LOG_MAX_BYTES, LOG_KEEP_BYTES);
  ensureSignalLogHeader(logPath);

  let lastPrediction = null;
  let lastTimestamp = null;
  let lines = [];

  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i];
    const price = candles[i].close;
    const timestamp = /^\d+$/.test(candles[i].timestamp)
      ? new Date(Number(candles[i].timestamp)).toISOString()
      : candles[i].timestamp;

    if (
      (pred !== lastPrediction || timestamp !== lastTimestamp) &&
      pred &&
      ['bull', 'bear', 'idle'].includes(pred) &&
      timestamp &&
      !isNaN(price)
    ) {
      lines.push(`${timestamp}\t${pred}\t${price}`);
      lastPrediction = pred;
      lastTimestamp = timestamp;
    }
  }
  if (lines.length) {
    fs.appendFileSync(logPath, lines.join('\n') + '\n');
    console.log('Wrote predictions to', logPath);
  } else {
    console.log('No new predictions to log.');
  }
}

function runRecognition() {
  try {
    let candles = loadCsvCandles(CSV_PATH);
    if (!candles.length) throw new Error('No valid candles found in CSV.');

    // Consistent modular labeling
    candles = labelCandles(candles, EPSILON);

    const model = loadModel(MODEL_DIR);
    const predictions = predictCandles(candles, model);
    logPredictions(candles, predictions, SIGNAL_LOG_PATH);
  } catch (err) {
    console.error('Recognition error:', err.stack || err.message);
  }
}

runRecognition();
setInterval(runRecognition, INTERVAL_MS);
