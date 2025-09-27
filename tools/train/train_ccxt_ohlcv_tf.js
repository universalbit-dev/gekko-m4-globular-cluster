/**
 * Optimized TensorFlow.js trainer for OHLCV candles with multi-timeframe support.
 * - Defensive data checks
 * - Robust logging (class distribution, model summary, timings)
 * - Async interval loop prevents overlap
 * - Trains and saves separate models for each timeframe in TRAIN_OHLCV_TIMEFRAMES
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');
const tf = require('@tensorflow/tfjs-node');
const { labelCandles, EPSILON } = require('./label_ohlcv.js');

// === CONFIG ===
const OHLCV_JSON_DIR = path.resolve(__dirname, '../logs/json/ohlcv');
const TIMEFRAMES = (process.env.TRAIN_OHLCV_TIMEFRAMES || '1m,5m,15m,1h').split(',').map(s => s.trim()).filter(Boolean);
const MODEL_DIR = path.resolve(__dirname, '../trained/trained_ccxt_ohlcv_tf');
const EPOCHS = Number(process.env.TRAIN_EPOCHS) || 50;
const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 32;
const TRAIN_INTERVAL_MS = Number(process.env.TRAIN_INTERVAL_MS) || 60000; // Default 1 minute

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Loads candles for the given timeframe from the OHLCV JSON file.
 * @param {string} timeframe
 * @returns {Array}
 */
function loadCandlesForTimeframe(timeframe) {
  const jsonPath = path.join(OHLCV_JSON_DIR, `ohlcv_ccxt_data_${timeframe}.json`);
  if (!fs.existsSync(jsonPath)) throw new Error(`JSON not found at: ${jsonPath}`);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!Array.isArray(data) || data.length === 0) throw new Error(`No candle data in: ${jsonPath}`);
  return data;
}

function normalizeFeatures(xs) {
  if (!Array.isArray(xs) || xs.length === 0 || xs[0] === undefined) throw new Error('No features extracted from candles.');
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
  if (!Array.isArray(candles) || candles.length === 0) throw new Error('No candles to label.');
  const labeled = labelCandles(candles, EPSILON);

  const xs = labeled.map(c => [
    Number(c.open), Number(c.high), Number(c.low), Number(c.close), Number(c.volume)
  ]);
  if (xs.length === 0 || xs[0] === undefined) throw new Error('No features extracted from candles.');
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
  return { xs: features, ys, dist };
}

function buildModel(inputShape) {
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [inputShape] }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
  model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
  return model;
}

async function trainForTimeframe(timeframe) {
  try {
    console.log(`\n[TRAIN][${timeframe}] Loading candles...`);
    const candles = loadCandlesForTimeframe(timeframe);
    const { xs, ys, dist } = prepareData(candles, true);

    if (xs.length === 0 || ys.length === 0) throw new Error('No training data found.');

    console.log(`[TRAIN][${timeframe}] Loaded ${candles.length} candles`);
    console.log(`[TRAIN][${timeframe}] Class distribution:`, dist);

    const xsTensor = tf.tensor2d(xs);
    const ysTensor = tf.tensor2d(ys);

    const model = buildModel(xs[0].length);

    console.log(`[TRAIN][${timeframe}] Model Summary:`);
    model.summary();

    console.log(`[TRAIN][${timeframe}] Starting training for ${EPOCHS} epochs...`);
    const startTime = Date.now();

    await model.fit(xsTensor, ysTensor, {
      epochs: EPOCHS,
      batchSize: BATCH_SIZE,
      verbose: 1,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          console.log(`[TRAIN][${timeframe}] Epoch ${epoch + 1} complete: acc=${logs.acc?.toFixed(3)} loss=${logs.loss?.toFixed(3)}`);
        }
      }
    });

    ensureDirExists(MODEL_DIR);
    const stamp = new Date().toISOString().replace(/[^\d]/g, '').slice(0, 15);
    const savePath = `file://${MODEL_DIR}/trained_ccxt_ohlcv_tf_${timeframe}_${stamp}`;
    await model.save(savePath);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[TRAIN][${timeframe}] Model saved to ${savePath}`);
    console.log(`[TRAIN][${timeframe}] Training finished in ${elapsed} seconds`);
  } catch (e) {
    console.error(`[TRAIN][${timeframe}] Training error:`, e.stack || e.message);
  }
}

let running = false;
async function trainAndReportMultiTimeframe() {
  if (running) {
    console.log('[TRAIN][MULTI] Previous training still in progress. Skipping this interval.');
    return;
  }
  running = true;
  try {
    for (const tf of TIMEFRAMES) {
      await trainForTimeframe(tf);
    }
  } finally {
    running = false;
  }
}

// Run once, then repeat at interval (robust to overlap)
trainAndReportMultiTimeframe();
setInterval(trainAndReportMultiTimeframe, TRAIN_INTERVAL_MS);
