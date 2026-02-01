#!/usr/bin/env node
/**
 * tools/train/train_ccxt_ohlcv_multi.js
 *
 * Enhanced TFJS trainer (non-invasive) — upgrades to the simple fallback trainer:
 * - Train/validation split (VALIDATION_SPLIT)
 * - Optional stratified split to keep class balance (default)
 * - Optional class weighting (TRAIN_USE_CLASS_WEIGHT)
 * - Early stopping + save-best-model via manual epoch loop (TRAIN_EARLY_STOPPING, TRAIN_PATIENCE)
 * - Persist per-TF feature scaler (min/max) so runtime normalization can match training
 * - Optional export of validation predictions (EXPORT_VAL_PREDICTIONS)
 * - Optional TFJS Platt calibrator trained on validation preds (ENABLE_PLATT_CALIBRATION)
 * - Save simple training metadata (SAVE_TRAIN_METADATA)
 *
 * Backwards-compatible: defaults keep the original behavior unless env flags are set.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');

let tf;
try {
  // Prefer the node bindings (registers filesystem save handlers and uses native accel)
  tf = require('@tensorflow/tfjs-node');
  console.log('[TRAIN] using @tensorflow/tfjs-node backend');
  try {
    if (tf && tf.setBackend) {
      tf.setBackend && tf.setBackend('tensorflow');
      // don't await here, but ensure ready is requested
      tf.ready().catch(() => {});
    }
  } catch (_) {}
} catch (e) {
  // Fallback to pure JS if node bindings unavailable (model.save to file:// will fail)
  console.warn('[TRAIN] @tensorflow/tfjs-node not available, falling back to @tensorflow/tfjs. file:// saves will fail.');
  tf = require('@tensorflow/tfjs');
}

// Try to load label helper (fallback to same-file require)
let labelCandles = null;
let EPSILON = 1e-6;
try {
  const mod = require('./label_ohlcv.js');
  if (typeof mod === 'function') labelCandles = mod;
  else if (mod && typeof mod.labelCandles === 'function') labelCandles = mod.labelCandles;
  if (mod && mod.EPSILON !== undefined) EPSILON = mod.EPSILON;
} catch (e) {
  console.warn('[TRAIN] Could not require ./label_ohlcv.js — ensure it exists in this folder.');
}

if (!labelCandles) {
  console.error('[TRAIN] labelCandles not found. Aborting.');
  process.exit(1);
}

// === CONFIG ===
const OHLCV_JSON_DIR = path.resolve(__dirname, '../logs/json/ohlcv');
const TIMEFRAMES = (process.env.TRAIN_OHLCV_TIMEFRAMES || '1m,5m,15m,1h').split(',').map(s => s.trim()).filter(Boolean);
const MODEL_DIR = path.resolve(__dirname, '../trained/trained_ccxt_ohlcv_tf');

const EPOCHS = Number(process.env.TRAIN_EPOCHS || 50);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 32);
const TRAIN_INTERVAL_MS = Number(process.env.TRAIN_INTERVAL_MS || 60000);

const VALIDATION_SPLIT = Number(process.env.VALIDATION_SPLIT || 0.2);
const STRATIFY = (process.env.TRAIN_STRATIFY !== '0'); // default true
const TRAIN_USE_CLASS_WEIGHT = (process.env.TRAIN_USE_CLASS_WEIGHT === '1' || process.env.TRAIN_USE_CLASS_WEIGHT === 'true');

const TRAIN_EARLY_STOPPING = (process.env.TRAIN_EARLY_STOPPING === '1' || process.env.TRAIN_EARLY_STOPPING === 'true');
const TRAIN_PATIENCE = Number(process.env.TRAIN_PATIENCE || 8);
const TRAIN_MIN_DELTA = Number(process.env.TRAIN_MIN_DELTA || 1e-4);

const EXPORT_VAL_PREDICTIONS = (process.env.EXPORT_VAL_PREDICTIONS === '1' || process.env.EXPORT_VAL_PREDICTIONS === 'true');
const ENABLE_PLATT_CALIBRATION = (process.env.ENABLE_PLATT_CALIBRATION === '1' || process.env.ENABLE_PLATT_CALIBRATION === 'true');

const SAVE_TRAIN_METADATA = (process.env.SAVE_TRAIN_METADATA === '1' || process.env.SAVE_TRAIN_METADATA === 'true');

function ensureDirExists(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function saveJSON(fp, obj) { try { ensureDirExists(path.dirname(fp)); fs.writeFileSync(fp, JSON.stringify(obj, null, 2), 'utf8'); } catch (e) { console.error('[SAVE JSON] failed', fp, e && e.message ? e.message : e); } }

// === Small helpers (avoid relying on tf.util to be present) ===
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
function createShuffledIndices(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  return shuffleArray(a);
}

// === IO helpers ===
function loadCandlesForTimeframe(timeframe) {
  const jsonPath = path.join(OHLCV_JSON_DIR, `ohlcv_ccxt_data_${timeframe}.json`);
  if (!fs.existsSync(jsonPath)) throw new Error(`JSON not found at: ${jsonPath}`);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!Array.isArray(data) || data.length === 0) throw new Error(`No candle data in: ${jsonPath}`);
  return data;
}

// === Feature & label helpers ===
function normalizeFeaturesMinMax(xs) {
  const nFeatures = xs[0].length;
  const max = Array(nFeatures).fill(-Infinity);
  const min = Array(nFeatures).fill(Infinity);
  xs.forEach(r => r.forEach((v, i) => { if (!Number.isFinite(v)) v = 0; if (v > max[i]) max[i] = v; if (v < min[i]) min[i] = v; }));
  for (let i = 0; i < nFeatures; i++) { if (!isFinite(max[i]) || !isFinite(min[i])) { max[i] = 0; min[i] = 0; } }
  const scaled = xs.map(r => r.map((v, i) => (max[i] === min[i] ? 0 : (v - min[i]) / (max[i] - min[i]))));
  return { scaled, min, max };
}

function extractFeatures(candles) {
  // support CCXT-like arrays and object entries
  const rows = [];
  for (const c of candles) {
    if (!c) continue;
    if (Array.isArray(c)) {
      const [_ts, open, high, low, close, volume] = c;
      rows.push([Number(open), Number(high), Number(low), Number(close), Number(volume)]);
    } else {
      rows.push([Number(c.open), Number(c.high), Number(c.low), Number(c.close), Number(c.volume || 0)]);
    }
  }
  return rows;
}

// one-hot mapping: 0->bull,1->bear,else idle
function oneHotFromLabel(l) {
  const lab = Number(l);
  if (lab === 0) return [1,0,0];
  if (lab === 1) return [0,1,0];
  return [0,0,1];
}

// classifier builder (same architecture)
function buildModel(inputDim) {
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [inputDim] }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
  model.compile({ optimizer: tf.train.adam(), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
  return model;
}

// small Platt calibrator: maps logit(prob) -> label binary using a single sigmoid neuron
async function trainPlattCalibrator(probArray, labelBinary, epochs = 200, batchSize = 64) {
  const eps = 1e-6;
  const probs = probArray.map(p => Math.max(eps, Math.min(1 - eps, Number(p))));
  const logits = probs.map(p => Math.log(p / (1 - p)));
  const X = tf.tensor2d(logits.map(v => [v]));
  const y = tf.tensor2d(labelBinary.map(v => [v]));
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid', inputShape: [1] }));
  model.compile({ optimizer: tf.train.adam(0.01), loss: 'binaryCrossentropy', metrics: ['accuracy'] });
  try {
    await model.fit(X, y, { epochs, batchSize, verbose: 0 });
    const ws = model.layers[0].getWeights();
    const kernel = await ws[0].array();
    const bias = await ws[1].array();
    const a = Number(kernel[0][0]);
    const b = Number(bias[0]);
    X.dispose(); y.dispose(); ws.forEach(t => t.dispose()); model.dispose(); try { tf.engine().disposeVariables(); } catch (_) {}
    return { a, b };
  } catch (e) {
    console.warn('[PLATT] failed', e && e.message ? e.message : e);
    try { X.dispose(); y.dispose(); model.dispose(); } catch (_) {}
    return null;
  }
}

function disposeMaybeTensor(x) {
  try {
    if (Array.isArray(x)) x.forEach(t => t && typeof t.dispose === 'function' && t.dispose());
    else if (x && typeof x.dispose === 'function') x.dispose();
  } catch (_) {}
}

// === Training per timeframe ===
async function trainForTimeframe(tfName) {
  try {
    console.log(`\n[TRAIN][${tfName}] Loading candles...`);
    const candles = loadCandlesForTimeframe(tfName);
    const labeled = labelCandles(candles, EPSILON);
    if (!Array.isArray(labeled) || labeled.length === 0) throw new Error('labelCandles returned no data');

    const rawFeatures = extractFeatures(labeled);
    if (rawFeatures.length === 0) throw new Error('no features extracted');

    // normalization and scaler save
    const { scaled, min, max } = normalizeFeaturesMinMax(rawFeatures);
    const Xall = scaled;
    const Yall = labeled.map(r => oneHotFromLabel(r.label));

    // stratified shuffle & split
    const N = Xall.length;
    const indicesByClass = { 0: [], 1: [], 2: [] };
    for (let i = 0; i < N; i++) {
      const lab = Yall[i][0] === 1 ? 0 : (Yall[i][1] === 1 ? 1 : 2);
      indicesByClass[lab].push(i);
    }
    // shuffle each class list using local shuffle
    for (const k of Object.keys(indicesByClass)) shuffleArray(indicesByClass[k]);

    const valIndices = new Set();
    const valCountTotal = Math.max(1, Math.floor(N * VALIDATION_SPLIT));
    if (STRATIFY) {
      // distribute validation slots proportionally per class
      const counts = { 0: indicesByClass[0].length, 1: indicesByClass[1].length, 2: indicesByClass[2].length };
      const total = counts[0] + counts[1] + counts[2];
      for (const k of [0,1,2]) {
        const want = Math.round(valCountTotal * (counts[k] / (total || 1)));
        for (let i = 0; i < Math.min(want, indicesByClass[k].length); i++) valIndices.add(indicesByClass[k][i]);
      }
      // if still below valCountTotal, fill from remaining
      const allIdx = Array.from({ length: N }, (_, i) => i).filter(i => !valIndices.has(i));
      let j = 0;
      while (valIndices.size < valCountTotal && j < allIdx.length) { valIndices.add(allIdx[j]); j++; }
    } else {
      // simple shuffled selection
      const allIdx = createShuffledIndices(N);
      for (let i = 0; i < valCountTotal; i++) valIndices.add(allIdx[i]);
    }

    // build train/val arrays; keep source indices for correct mapping
    const Xtrain = [], Ytrain = [], Xval = [], Yval = [], valSource = [];
    for (let i = 0; i < N; i++) {
      if (valIndices.has(i)) { Xval.push(Xall[i]); Yval.push(Yall[i]); valSource.push(i); }
      else { Xtrain.push(Xall[i]); Ytrain.push(Yall[i]); }
    }

    console.log(`[TRAIN][${tfName}] samples: total=${N} train=${Xtrain.length} val=${Xval.length}`);
    // save scaler for runtime
    ensureDirExists(MODEL_DIR);
    const stamp = new Date().toISOString().replace(/[^\d]/g,'').slice(0,15);
    const scalerFp = path.join(MODEL_DIR, `scaler_${tfName}.json`);
    saveJSON(scalerFp, { min, max });

    // tensors
    const xTrainT = tf.tensor2d(Xtrain);
    const yTrainT = tf.tensor2d(Ytrain);
    const xValT = tf.tensor2d(Xval);
    const yValT = tf.tensor2d(Yval);

    // class weights (optional)
    let classWeight = null;
    if (TRAIN_USE_CLASS_WEIGHT) {
      const counts = [0,0,0];
      Ytrain.forEach(y => { if (y[0]===1) counts[0]++; else if (y[1]===1) counts[1]++; else counts[2]++; });
      const total = counts.reduce((s,x)=>s+x,0) || 1;
      classWeight = {
        0: total / ((counts[0] || 1) * 3),
        1: total / ((counts[1] || 1) * 3),
        2: total / ((counts[2] || 1) * 3)
      };
      console.log(`[TRAIN][${tfName}] class weights:`, classWeight);
    }

    // build model
    const model = buildModel(Xtrain[0].length);
    model.summary();

    // manual epoch loop to support early stopping + save-best
    let bestValLoss = Number.POSITIVE_INFINITY;
    let patienceCounter = 0;
    const bestModelDir = path.join(MODEL_DIR, `best_${tfName}_${stamp}`);
    ensureDirExists(bestModelDir);

    for (let epoch = 1; epoch <= EPOCHS; epoch++) {
      // train 1 epoch
      const fitOpts = { epochs: 1, batchSize: BATCH_SIZE, verbose: 1, validationData: [xValT, yValT] };
      if (classWeight) fitOpts.classWeight = classWeight;
      await model.fit(xTrainT, yTrainT, fitOpts);

      // evaluate val loss (explicitly dispose eval tensors)
      let valLoss = Number.POSITIVE_INFINITY;
      try {
        const evalRes = await model.evaluate(xValT, yValT, { batchSize: Math.min(256, Xval.length), verbose: 0 });
        // evalRes may be a Tensor or an array of Tensors [loss, acc]
        if (Array.isArray(evalRes)) {
          const t = evalRes[0];
          valLoss = t.dataSync ? Number(t.dataSync()[0]) : Number(t);
          disposeMaybeTensor(evalRes);
        } else {
          valLoss = evalRes.dataSync ? Number(evalRes.dataSync()[0]) : Number(evalRes);
          disposeMaybeTensor(evalRes);
        }
      } catch (e) {
        console.warn('[TRAIN] could not parse eval result', e && e.message ? e.message : e);
      }
      console.log(`[TRAIN][${tfName}] Epoch ${epoch} val_loss=${Number(valLoss).toFixed(6)}`);

      // save best
      if (valLoss + TRAIN_MIN_DELTA < bestValLoss) {
        bestValLoss = valLoss;
        patienceCounter = 0;
        try {
          ensureDirExists(bestModelDir);
          await model.save(`file://${bestModelDir}`);
          console.log(`[TRAIN][${tfName}] Saved improved model to ${bestModelDir} (val_loss=${bestValLoss.toFixed(6)})`);
        } catch (e) {
          console.warn(`[TRAIN][${tfName}] saving best model failed:`, e && e.message ? e.message : e);
          if (!tf || !tf.io || !tf.io.getSaveHandlers) {
            console.warn('[TRAIN] save handler not found — likely @tensorflow/tfjs-node is not installed.');
          }
        }
      } else {
        patienceCounter++;
      }

      if (TRAIN_EARLY_STOPPING && patienceCounter >= TRAIN_PATIENCE) {
        console.log(`[TRAIN][${tfName}] Early stopping (no val_loss improvement for ${TRAIN_PATIENCE} epochs).`);
        break;
      }
    }

    // final save (best model already saved if improved)
    try {
      const savePathDir = path.join(MODEL_DIR, `trained_ccxt_ohlcv_tf_${tfName}_${stamp}`);
      ensureDirExists(savePathDir);
      const savePath = `file://${savePathDir}`;
      await model.save(savePath);
      console.log(`[TRAIN][${tfName}] Final model saved to ${savePath}`);
    } catch (e) {
      console.warn(`[TRAIN][${tfName}] final model.save failed:`, e && e.message ? e.message : e);
      if (!tf || !tf.io || !tf.io.getSaveHandlers) {
        console.warn('[TRAIN] save handler not found — likely @tensorflow/tfjs-node is not installed.');
      }
    }

    // validation preds export (optional)
    let predArr = [];
    try {
      const preds = model.predict(xValT);
      predArr = await (Array.isArray(preds) ? Promise.resolve([]) : preds.array());
      disposeMaybeTensor(preds);
    } catch (e) {
      console.warn('[TRAIN] predict failed:', e && e.message ? e.message : e);
    }

    if (EXPORT_VAL_PREDICTIONS) {
      const valExport = valSource.map((srcIdx, i) => ({
        original_index: srcIdx,
        timestamp: labeled[srcIdx] ? labeled[srcIdx].timestamp ?? null : null,
        features_raw: rawFeatures[srcIdx],
        true_label: labeled[srcIdx] ? labeled[srcIdx].label : null,
        true_onehot: Yval[i],
        pred_proba: predArr[i] || null
      }));
      const valFp = path.join(MODEL_DIR, `validation_preds_${tfName}_${stamp}.json`);
      saveJSON(valFp, valExport);
      console.log(`[TRAIN][${tfName}] validation predictions exported: ${valFp}`);
    }

    // optional platt calibrator on bull probs
    if (ENABLE_PLATT_CALIBRATION && predArr.length > 10) {
      const bullProbs = predArr.map(r => r[0]);
      const yValBinary = Yval.map(y => (y[0] === 1 ? 1 : 0));
      const platt = await trainPlattCalibrator(bullProbs, yValBinary, 200, 64);
      if (platt && platt.a !== undefined) {
        const plattFp = path.join(MODEL_DIR, `platt_calib_${tfName}_${stamp}.json`);
        saveJSON(plattFp, { type: 'platt', params: { a: platt.a, b: platt.b }, meta: { created_at: new Date().toISOString(), samples: bullProbs.length } });
        console.log(`[TRAIN][${tfName}] Platt calibrator saved: ${plattFp}`);
      }
    }

    // metadata
    if (SAVE_TRAIN_METADATA) {
      const meta = {
        timeframe: tfName,
        timestamp: new Date().toISOString(),
        stamp,
        samples: { total: N, train: Xtrain.length, val: Xval.length },
        scaler: scalerFp,
        best_model_dir: bestModelDir
      };
      const metaFp = path.join(MODEL_DIR, `train_metadata_${tfName}_${stamp}.json`);
      saveJSON(metaFp, meta);
      console.log(`[TRAIN][${tfName}] metadata saved: ${metaFp}`);
    }

    // cleanup tensors
    try { xTrainT.dispose(); yTrainT.dispose(); xValT.dispose(); yValT.dispose(); } catch (_) {}
    try { model.dispose(); } catch (_) {}
    try { tf.engine().disposeVariables(); } catch (_) {}
  } catch (err) {
    console.error(`[TRAIN][${tfName}] error:`, err && err.stack ? err.stack : err && err.message ? err.message : err);
  }
}

// Orchestrator
let running = false;
async function trainAndReportMultiTimeframe() {
  if (running) { console.log('[TRAIN] previous still running, skipping'); return; }
  running = true;
  try {
    ensureDirExists(MODEL_DIR);
    for (const tf of TIMEFRAMES) {
      await trainForTimeframe(tf);
    }
  } finally { running = false; }
}

trainAndReportMultiTimeframe();
setInterval(trainAndReportMultiTimeframe, TRAIN_INTERVAL_MS);

module.exports = { trainForTimeframe, trainAndReportMultiTimeframe };
