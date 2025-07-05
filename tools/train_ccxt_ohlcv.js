/**
 * train_ccxt_ohlcv.js (modular, uses label_ohlcv.js)
 *
 * Reads OHLCV data from CSV or JSON, labels using the shared label_ohlcv.js module,
 * normalizes features, strictly validates, and trains a ConvNetJS model.
 */

const fs = require('fs');
const path = require('path');
const ConvNet = require('../core/convnet.js');
const { labelCandles, EPSILON } = require('./label_ohlcv.js');

// Configurable parameters
const DATA_PATH = process.env.DATA_PATH
  || path.join(__dirname, '../logs/json/ohlcv/ohlcv_ccxt_data.json'); // or .csv
const MODEL_DIR = process.env.MODEL_DIR || './trained_ccxt_ohlcv';
const INTERVAL_MS = Number(process.env.INTERVAL_MS) || 15 * 60 * 1000;
const EPOCHS = Number(process.env.EPOCHS) || 10;
const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 10;
const L2_DECAY = Number(process.env.L2_DECAY) || 0.001;
const NUM_CLASSES = 3; // bull, bear, idle

function validateCandleRow(obj) {
  let timestamp, open, high, low, close, volume;
  if (Array.isArray(obj)) {
    if (obj.length !== 6) return { valid: false, reason: "Incorrect number of columns" };
    [timestamp, open, high, low, close, volume] = obj.map(s => (s || '').toString().trim());
  } else {
    const required = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
    for (const k of required) if (!(k in obj)) return { valid: false, reason: `Missing field: ${k}` };
    ({ timestamp, open, high, low, close, volume } = obj);
  }
  const openNum = Number(open);
  const highNum = Number(high);
  const lowNum = Number(low);
  const closeNum = Number(close);
  const volumeNum = Number(volume);
  if (
    [openNum, highNum, lowNum, closeNum, volumeNum].some(v => isNaN(v))
  ) return { valid: false, reason: "NaN in numeric fields" };
  if (!/^\d+$/.test(String(timestamp))) return { valid: false, reason: "Non-numeric timestamp" };
  return {
    valid: true,
    data: {
      timestamp: Number(timestamp),
      open: openNum,
      high: highNum,
      low: lowNum,
      close: closeNum,
      volume: volumeNum
    }
  };
}

function parseAndLabelData(dataPath, epsilon = EPSILON) {
  const ext = path.extname(dataPath).toLowerCase();
  let arr;
  if (ext === '.json') {
    try {
      arr = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      if (!Array.isArray(arr)) throw new Error("JSON root is not an array");
    } catch (err) {
      console.error(`Failed to read/parse JSON: ${err.message}`);
      return [];
    }
  } else if (ext === '.csv') {
    const lines = fs.readFileSync(dataPath, 'utf8').trim().split('\n');
    if (lines.length < 2) return [];
    arr = lines.slice(1).map(line => line.split(','));
  } else {
    console.error(`Unsupported file extension: ${ext}`);
    return [];
  }
  let validRows = 0, invalidRows = 0;
  const out = [];
  arr.forEach((row, idx) => {
    if (Array.isArray(row) && row.length === 1 && !row[0].trim()) {
      invalidRows++;
      return;
    }
    const result = validateCandleRow(row);
    if (!result.valid) {
      invalidRows++;
      return;
    }
    const candle = result.data;
    out.push(candle);
    validRows++;
  });
  // Modular, consistent labeling
  const labeled = labelCandles(out, epsilon);

  // Print label distribution for debug
  const stats = { bull: 0, bear: 0, idle: 0 };
  labeled.forEach(c => {
    if (c.label === 0) stats.bull++;
    else if (c.label === 1) stats.bear++;
    else if (c.label === 2) stats.idle++;
  });
  console.log(`[INFO] Valid rows: ${validRows}, Skipped rows: ${invalidRows}`);
  console.log('[INFO] Label distribution:', stats);

  return labeled;
}

function computeMinMax(data) {
  let min = [Infinity, Infinity, Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity];
  data.forEach(candle => {
    [candle.open, candle.high, candle.low, candle.close, candle.volume].forEach((v, i) => {
      if (v < min[i]) min[i] = v;
      if (v > max[i]) max[i] = v;
    });
  });
  return [min, max];
}

function norm(vals, min, max) {
  return vals.map((v, i) =>
    max[i] === min[i] ? 0 : (v - min[i]) / (max[i] - min[i])
  );
}

// Optional: Balance dataset so all classes are equally represented
function balanceData(candles) {
  const byClass = [[], [], []];
  candles.forEach(c => byClass[c.label].push(c));
  const minLen = Math.min(...byClass.map(arr => arr.length));
  if (minLen === 0) return candles; // Don't balance if any class absent
  // Shuffle and cut each class to minLen
  byClass.forEach(arr => arr.sort(() => Math.random() - 0.5));
  return byClass.flatMap(arr => arr.slice(0, minLen));
}

function trainAndSave() {
  let data;
  try {
    data = parseAndLabelData(DATA_PATH, EPSILON);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Failed to read or parse ${DATA_PATH}:`, e.message);
    return;
  }

  if (!Array.isArray(data) || !data.length) {
    console.error(`[${new Date().toISOString()}] No valid training samples found.`);
    return;
  }

  // Optional: balance classes
  data = balanceData(data);

  const [min, max] = computeMinMax(data);
  // Save min/max for normalization in recognition script
  const NORM_PATH = path.join(MODEL_DIR, 'norm_stats.json');
  fs.mkdirSync(MODEL_DIR, { recursive: true });
  fs.writeFileSync(NORM_PATH, JSON.stringify({ min, max }));

  const trainingSet = data.map(candle => ({
    input: norm([candle.open, candle.high, candle.low, candle.close, candle.volume], min, max),
    output: candle.label
  }));

  let fatalCount = 0;
  trainingSet.forEach((ex, idx) => {
    if (
      !Array.isArray(ex.input) ||
      ex.input.length !== 5 ||
      ex.input.some(x => typeof x !== 'number' || isNaN(x)) ||
      typeof ex.output !== 'number' ||
      ex.output < 0 || ex.output >= NUM_CLASSES
    ) {
      fatalCount++;
      console.error(`[FATAL] Bad training sample at index ${idx}:`, ex);
    }
  });
  if (fatalCount > 0) {
    console.error(`[FATAL] Found ${fatalCount} invalid samples. Aborting.`);
    process.exit(1);
  }

  console.log(`[${new Date().toISOString()}] Training on ${trainingSet.length} samples.`);
  console.log('First 3 normalized training samples:', trainingSet.slice(0, 3));

  const net = new ConvNet.Net();
  const layer_defs = [
    { type: 'input', out_sx: 1, out_sy: 1, out_depth: 5 },
    { type: 'fc', num_neurons: 64, activation: 'relu' },
    { type: 'softmax', num_classes: NUM_CLASSES }
  ];
  net.makeLayers(layer_defs);

  const trainer = new ConvNet.Trainer(net, {
    method: 'sgd',
    learning_rate: 0.01,
    batch_size: BATCH_SIZE,
    l2_decay: L2_DECAY
  });

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    trainingSet.forEach((example) => {
      const x = new ConvNet.Vol(1, 1, 5, example.input);
      trainer.train(x, example.output);
    });
    // Optionally: add logging for progress
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(MODEL_DIR, `trained_ohlcv_ccxt_${timestamp}.json`);
  const tmpFilename = filename + '.tmp';
  fs.writeFileSync(tmpFilename, JSON.stringify(net.toJSON()));
  fs.renameSync(tmpFilename, filename);
  console.log(`[${timestamp}] Model saved as ${filename}`);
}

// Initial training run
trainAndSave();
// Scheduled retraining
setInterval(trainAndSave, INTERVAL_MS);

/*
 * NOTES:
 * - Your data file can be JSON (array of objects: {timestamp,open,high,low,close,volume})
 *   or CSV (header row + rows of 6 columns: timestamp,open,high,low,close,volume)
 * - The script validates every row and shows stats on how many were skipped/used.
 * - Features are normalized to [0,1].
 * - ConvNet.Vol is constructed as new ConvNet.Vol(1, 1, 5, inputArray).
 * - Labeling is consistent and modular via label_ohlcv.js.
 */
