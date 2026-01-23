/**
 * Multi-timeframe OHLCV candle recognition and signal labeling (TensorFlow + ConvNetJS)
 * - Modular loaders for TensorFlow and ConvNetJS
 * - Robust latest-model discovery per timeframe
 * - Handles predictions for all available models
 * - Outputs enhanced prediction JSON per timeframe
 * - Runs continuously using TRAIN_INTERVAL_MS from .env
 */

const path = require('path');
const fs = require('fs');
const tf = require('@tensorflow/tfjs');
const convnetjs = require('../../core/convnet.js');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const OHLCV_DIR = path.resolve(__dirname, '../logs/json/ohlcv');
const TIMEFRAMES = (process.env.TRAIN_OHLCV_TIMEFRAMES || '1m,5m,15m,1h').split(',').map(s => s.trim()).filter(Boolean);
const TF_MODEL_ROOT = path.resolve(__dirname, '../trained/trained_ccxt_ohlcv_tf');
const CONVNET_MODEL_ROOT = path.resolve(__dirname, '../trained');
const EPSILON = 1e-8;
const TRAIN_INTERVAL_MS = parseInt(process.env.TRAIN_INTERVAL_MS, 10) || 300000; // default 5m

// --- TensorFlow Loader Utilities ---
function findLatestTfModelDir(tfFrame) {
  if (!fs.existsSync(TF_MODEL_ROOT)) return null;
  const entries = fs.readdirSync(TF_MODEL_ROOT, { withFileTypes: true });
  const match = new RegExp(`^trained_ccxt_ohlcv_tf_${tfFrame}_\\d+$`);
  const dirs = entries.filter(e => e.isDirectory() && match.test(e.name)).map(e => e.name);
  if (!dirs.length) return null;
  dirs.sort();
  return path.join(TF_MODEL_ROOT, dirs[dirs.length - 1]);
}

async function loadLatestTfModel(tfFrame) {
  const latestDir = findLatestTfModelDir(tfFrame);
  if (!latestDir) return null;
  const modelPath = path.join(latestDir, 'model.json');
  if (!fs.existsSync(modelPath)) return null;
  try {
    return await tf.loadLayersModel('file://' + modelPath);
  } catch (err) {
    console.error(`[ERROR] Could not load TensorFlow model for ${tfFrame}:`, err.message || err);
    return null;
  }
}

// --- ConvNetJS Loader Utilities ---
function findLatestConvNetModelPath() {
  if (!fs.existsSync(CONVNET_MODEL_ROOT)) return null;
  const files = fs.readdirSync(CONVNET_MODEL_ROOT)
    .filter(f => f.startsWith('trained_ccxt_ohlcv_') && f.endsWith('.json'));
  if (!files.length) return null;
  files.sort();
  return path.join(CONVNET_MODEL_ROOT, files[files.length - 1]);
}

function loadConvNetModel() {
  const modelPath = findLatestConvNetModelPath();
  if (!modelPath) return null;
  try {
    const raw = fs.readFileSync(modelPath, 'utf8');
    const json = JSON.parse(raw);
    const net = new convnetjs.Net();
    net.fromJSON(json);
    return net;
  } catch (e) {
    console.error(`[ERROR] Failed to load ConvNet model:`, e.message || e);
    return null;
  }
}

// --- Data Loading ---
function loadCandles(tf) {
  const jsonPath = path.join(OHLCV_DIR, `ohlcv_ccxt_data_${tf}.json`);
  if (!fs.existsSync(jsonPath)) return [];
  try {
    const arr = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error(`[ERROR] Failed to load candles for ${tf}:`, e);
    return [];
  }
}

// --- Feature Engineering ---
function computePVVM_PVD(candle, prevCandle) {
  if (!prevCandle) return { PVVM: 0, PVD: 0 };
  const pvvm = Math.abs(candle.volume - prevCandle.volume) / (prevCandle.volume + EPSILON);
  const pvd = Math.abs(candle.close - prevCandle.close) / (prevCandle.close + EPSILON);
  return { PVVM: pvvm, PVD: pvd };
}

// --- Prediction Functions ---
function predictConvNet(net, candle) {
  try {
    const input = new convnetjs.Vol([
      Number(candle.open),
      Number(candle.high),
      Number(candle.low),
      Number(candle.close),
      Number(candle.volume)
    ]);
    const out = net.forward(input);
    const scores = out.w;
    const idx = scores.indexOf(Math.max(...scores));
    return idx === 0 ? "bull" : idx === 1 ? "bear" : "idle";
  } catch (e) {
    console.error("[ERROR] ConvNet prediction error:", e.message || e);
    return "N/A";
  }
}

function predictTensorFlow(model, candle) {
  try {
    const features = [
      Number(candle.open),
      Number(candle.high),
      Number(candle.low),
      Number(candle.close),
      Number(candle.volume)
    ];
    const input = tf.tensor2d([features]);
    const pred = model.predict(input);
    const output = pred.arraySync()[0]; // [bull, bear, idle]
    const idx = output.indexOf(Math.max(...output));
    return idx === 0 ? "bull"
      : idx === 1 ? "bear"
      : "idle";
  } catch (e) {
    console.error("[ERROR] TF prediction error:", e.message || e);
    return "N/A";
  }
}

// --- Main Recognition Function ---
async function runRecognitionMulti() {
  const convnetModel = loadConvNetModel();
  if (!convnetModel) console.log(`[WARN] ConvNetJS model not found. Skipping ConvNet predictions.`);
  for (const tf of TIMEFRAMES) {
    const candles = loadCandles(tf);
    if (!candles.length) {
      console.log(`OHLCV JSON not found or empty for ${tf}, skipping timeframe.`);
      continue;
    }
    // Load TensorFlow model for this timeframe
    const tfModel = await loadLatestTfModel(tf);
    if (!tfModel) console.log(`[WARN] TensorFlow model not found for ${tf}. Skipping TF prediction.`);

    // Process candles
    const enhancedCandles = candles.map((candle, i) => {
      const prevCandle = i > 0 ? candles[i - 1] : null;
      const { PVVM, PVD } = computePVVM_PVD(candle, prevCandle);

      // ConvNetJS prediction
      let prediction_convnet = "N/A";
      let label_convnet = "neutral";
      if (convnetModel) {
        prediction_convnet = predictConvNet(convnetModel, candle);
        label_convnet = prediction_convnet === "bull" ? "strong_bull"
          : prediction_convnet === "bear" ? "strong_bear"
          : "neutral";
      }

      // TensorFlow prediction
      let prediction_tf = "N/A";
      let label_tf = "neutral";
      if (tfModel) {
        prediction_tf = predictTensorFlow(tfModel, candle);
        label_tf = prediction_tf === "bull" ? "strong_bull"
          : prediction_tf === "bear" ? "strong_bear"
          : "neutral";
      }

      // Ensemble label: majority voting
      let ensemble_label = "neutral";
      const votes = [label_convnet, label_tf];
      if (votes.filter(v => v === "strong_bull").length >= 1) ensemble_label = "strong_bull";
      else if (votes.filter(v => v === "strong_bear").length >= 1) ensemble_label = "strong_bear";

      return {
        ...candle,
        PVVM,
        PVD,
        prediction_convnet,
        prediction_tf,
        label_convnet,
        label_tf,
        ensemble_label
      };
    });

    // Write enhanced prediction JSON
    const outPath = path.join(OHLCV_DIR, `ohlcv_ccxt_data_${tf}_prediction.json`);
    try {
      fs.writeFileSync(outPath, JSON.stringify(enhancedCandles, null, 2));
      console.log(`Wrote enhanced prediction JSON: ${outPath}`);
    } catch (e) {
      console.error(`[ERROR] Failed to write prediction JSON for ${tf}:`, e.message || e);
    }
  }
}

// --- Continuous Execution ---
async function mainLoop() {
  await runRecognitionMulti();
  setTimeout(mainLoop, TRAIN_INTERVAL_MS);
}

mainLoop();
