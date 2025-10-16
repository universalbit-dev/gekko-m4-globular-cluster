/**
 * Robust TensorFlow.js OHLCV Trainer (single-file, vector input)
 * - Defensive: Handles missing/corrupt/incomplete data, skips bad candles, never crashes.
 * - Auto-recovery: Skips epoch/candle if input is malformed or label is missing/invalid.
 * - Logs all issues, recovers next interval if file is fixed.
 * - For best results, pre-label ohlcv_ccxt_data.json using label_ohlcv_multi.js or label_ohlcv_aggregate.js.
 * - Uses tfjs-node with a simple dense (fc) architecture.
 * - Models are saved to the aggregate directory: ../trained/trained_ccxt_ohlcv_aggregate
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');
const tf = require('@tensorflow/tfjs-node');

const TRAIN_INTERVAL_MS = parseInt(process.env.TRAIN_INTERVAL_MS, 10) || 3600000; // default 1h
const filePath = path.resolve(__dirname, '../logs/json/ohlcv/ohlcv_ccxt_data.json');
const dir = path.resolve(__dirname, '../trained/trained_ccxt_ohlcv_aggregate'); // aggregate directory
const EPOCHS = parseInt(process.env.TRAIN_EPOCHS, 10) || 20;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10) || 16;

function ensureFileExists(fp, fallback = '[]') {
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, fallback, 'utf8');
    console.log(`[TRAIN][TFJS] Created missing file: ${fp}`);
  }
}

function ensureDirExists(d) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
    console.log(`[TRAIN][TFJS] Created missing directory: ${d}`);
  }
}

function toOneHot(label, numClasses = 3) {
  if (![0, 1, 2].includes(label)) return null;
  const arr = Array(numClasses).fill(0);
  arr[label] = 1;
  return arr;
}

let running = false;
async function trainAndSave() {
  if (running) {
    console.log('[TRAIN][TFJS] Previous training still running; skipping this interval.');
    return;
  }
  running = true;
  try {
    ensureFileExists(filePath, '[]');
    ensureDirExists(dir);

    let data = [];
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error('[TRAIN][TFJS] Failed to read or parse ohlcv_ccxt_data.json:', e.message);
      running = false;
      return;
    }

    let valid = 0, invalid = 0;
    const invalidSamples = [];
    const xs = [];
    const ys = [];
    if (Array.isArray(data)) {
      data.forEach(candle => {
        if (
          !candle ||
          typeof candle.label !== 'number' ||
          ![0, 1, 2].includes(candle.label) ||
          [candle.open, candle.high, candle.low, candle.close, candle.volume].some(
            v => typeof v !== 'number' || isNaN(v)
          )
        ) {
          invalid++;
          if (invalidSamples.length < 5) invalidSamples.push(candle);
          return;
        }
        valid++;
        xs.push([candle.open, candle.high, candle.low, candle.close, candle.volume]);
        ys.push(toOneHot(candle.label));
      });
    }

    if (!xs.length) {
      console.warn('[TRAIN][TFJS] No valid labeled candles found, skipping training.');
      if (invalid) {
        console.warn(`[TRAIN][TFJS] Invalid sample examples:`);
        invalidSamples.forEach((s, i) => console.warn(`[Invalid ${i + 1}]`, s));
      }
      running = false;
      return;
    }

    if (invalid) {
      console.warn(`[TRAIN][TFJS] Skipped ${invalid} invalid candles. Showing up to 5:`);
      invalidSamples.forEach((s, i) => console.warn(`[Invalid ${i + 1}]`, s));
    }
    console.log(`[TRAIN][TFJS] Loaded ${valid} valid samples for training.`);

    // Create tensors
    const xsTensor = tf.tensor2d(xs);        // shape: [samples, 5]
    const ysTensor = tf.tensor2d(ys);        // shape: [samples, 3]

    // Define model
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [5] }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));

    model.compile({
      optimizer: tf.train.adam(),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    console.log(`[TRAIN][TFJS] Model summary:`);
    model.summary();

    console.log(`[TRAIN][TFJS] Starting training for ${EPOCHS} epochs...`);
    const history = await model.fit(xsTensor, ysTensor, {
      epochs: EPOCHS,
      batchSize: BATCH_SIZE,
      verbose: 1
    });

    // Save model
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const savePath = `file://${dir}/trained_ccxt_ohlcv_tfjs_${timestamp}`;
    await model.save(savePath);
    console.log(`[TRAIN][TFJS][${timestamp}] Model saved to ${savePath}`);

    // Cleanup tensors
    xsTensor.dispose();
    ysTensor.dispose();
    model.dispose();
    tf.disposeVariables();
  } catch (err) {
    console.error('[TRAIN][TFJS] Error during training:', err.stack || err.message);
  } finally {
    running = false;
  }
}

// Initial run and repeat
trainAndSave();
setInterval(trainAndSave, TRAIN_INTERVAL_MS);
