const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const tf = require('@tensorflow/tfjs-node');
const { labelCandles, EPSILON } = require('./label_ohlcv.js');

const JSON_PATH = path.resolve(__dirname, '../logs/json/ohlcv/ohlcv_ccxt_data.json');
const MODEL_DIR = path.resolve(__dirname, './trained_ccxt_ohlcv_tf');
const EPOCHS = 50;
const BATCH_SIZE = 32;
const INTERVAL_MS = Number(process.env.INTERVAL_MS) || 60000; // Default 1 minute

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadJsonCandles(jsonPath) {
  if (!fs.existsSync(jsonPath)) throw new Error(`JSON not found at: ${jsonPath}`);
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function normalizeFeatures(xs) {
  const nFeatures = xs[0].length;
  const max = Array(nFeatures).fill(-Infinity);
  const min = Array(nFeatures).fill(Infinity);
  xs.forEach(row => row.forEach((v, i) => {
    if (v > max[i]) max[i] = v;
    if (v < min[i]) min[i] = v;
  }));
  return xs.map(row => row.map((v, i) => (max[i] === min[i]) ? 0 : (v - min[i]) / (max[i] - min[i])));
}

function prepareData(candles, normalize = true) {
  const labeled = labelCandles(candles, EPSILON);

  const xs = labeled.map(c => [
    Number(c.open), Number(c.high), Number(c.low), Number(c.close), Number(c.volume)
  ]);
  const features = normalize ? normalizeFeatures(xs) : xs;

  const ys = labeled.map(c => {
    if (c.label === 0) return [1, 0, 0]; // bull
    if (c.label === 1) return [0, 1, 0]; // bear
    return [0, 0, 1]; // idle
  });

  // Class distribution log
  const dist = ys.reduce((a, y) => {
    if (y[0] === 1) a.bull++;
    else if (y[1] === 1) a.bear++;
    else a.idle++;
    return a;
  }, { bull: 0, bear: 0, idle: 0 });
  console.log(`Class distribution:`, dist);

  return { xs: features, ys };
}

function buildModel(inputShape) {
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [inputShape] }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
  model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
  return model;
}

async function train() {
  ensureDirExists(MODEL_DIR);
  const candles = loadJsonCandles(JSON_PATH);
  const { xs, ys } = prepareData(candles, true);

  if (xs.length === 0 || ys.length === 0) throw new Error('No training data found.');

  const xsTensor = tf.tensor2d(xs);
  const ysTensor = tf.tensor2d(ys);

  const model = buildModel(xs[0].length);

  await model.fit(xsTensor, ysTensor, {
    epochs: EPOCHS,
    batchSize: BATCH_SIZE,
    verbose: 1
  });

  const stamp = new Date().toISOString().replace(/[^\d]/g, '').slice(0, 15);
  const savePath = `file://${MODEL_DIR}/trained_ccxt_ohlcv_tf_${stamp}`;
  await model.save(savePath);
  console.log(`Model saved to ${savePath}`);
}

// Run once, then repeat at interval
async function trainAndReport() {
  try {
    await train();
  } catch (e) {
    console.error('Training error:', e.stack || e.message);
  }
}

trainAndReport();
setInterval(trainAndReport, INTERVAL_MS);
