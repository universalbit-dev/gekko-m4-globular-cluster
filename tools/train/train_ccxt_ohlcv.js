#!/usr/bin/env node
/**
 * train_ccxt_ohlcv.js
 *
 * Multi-timeframe trainer with robust handling and convnet fallback.
 * Enhanced save/rotation/indexing behavior:
 *  - Saves models per-timeframe under tools/trained/trained_ccxt_ohlcv/<tf>/
 *  - Writes a companion metadata JSON next to each model
 *  - Maintains a "latest" copy per timeframe (trained_ccxt_ohlcv_<tf>_latest.json)
 *  - Optionally gzips model files (SAVE_GZIP=1)
 *  - Keeps only KEEP_MODELS newest files per timeframe (default 5)
 *  - Writes a global models_index.json in tools/trained
 *
 * Usage:
 *   npm install convnetjs    # if you don't have local core/convnet.js available
 *   node tools/train/train_ccxt_ohlcv.js
 *
 * Env:
 *   KEEP_MODELS (default 5)
 *   SAVE_GZIP (1 to gzip saved models)
 *   KEEP_META (1 to keep .meta.json files, default 1)
 *   ... and existing envs (EPOCHS, BATCH_SIZE, etc.)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// ConvNet loader: prefer local core/convnet.js, fallback to npm convnetjs
let ConvNet;
try {
  ConvNet = require('../../core/convnet.js');
  console.log('[TRAIN] Using local core/convnet.js');
} catch (errLocal) {
  try {
    ConvNet = require('convnetjs');
    console.log('[TRAIN] Local core/convnet.js not available — using npm convnetjs');
  } catch (errNpm) {
    console.error('[TRAIN] Failed to load convnet implementation: tried local core/convnet.js and npm convnetjs.');
    console.error('Error (local):', errLocal && errLocal.message ? errLocal.message : errLocal);
    console.error('Error (npm):', errNpm && errNpm.message ? errNpm.message : errNpm);
    console.error('Install convnetjs with: npm install convnetjs');
    process.exit(1);
  }
}

const BASE_LOG_DIR = path.resolve(__dirname, '../logs/json/ohlcv');
const TRAINED_ROOT = path.resolve(__dirname, '../trained');
const BY_TF_DIR = path.join(TRAINED_ROOT, 'trained_ccxt_ohlcv');
if (!fs.existsSync(TRAINED_ROOT)) fs.mkdirSync(TRAINED_ROOT, { recursive: true });
if (!fs.existsSync(BY_TF_DIR)) fs.mkdirSync(BY_TF_DIR, { recursive: true });

const TRAIN_INTERVAL_MS = parseInt(process.env.TRAIN_INTERVAL_MS || '3600000', 10);
const TIMEFRAMES = (process.env.TIMEFRAMES || '1m,5m,15m,1h').split(',').map(s => s.trim()).filter(Boolean);

const DEFAULT_EPOCHS = parseInt(process.env.EPOCHS || '10', 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || process.env.BATCH || '10', 10);
const L2_DECAY = parseFloat(process.env.L2_DECAY || '0.001');
const SHUFFLE = !/^0|false$/i.test(String(process.env.SHUFFLE || 'true'));

const EXPECTED_INPUT_DEPTH = 5;
const MAX_ERRORS_PER_EPOCH = parseInt(process.env.MAX_ERRORS_PER_EPOCH || '100', 10);

// Save/rotation config
const KEEP_MODELS = parseInt(process.env.KEEP_MODELS || '5', 10);
const SAVE_GZIP = !!process.env.SAVE_GZIP && String(process.env.SAVE_GZIP) !== '0';
const KEEP_META = process.env.KEEP_META === undefined ? true : !!process.env.KEEP_META;

function candidateFilesForTf(tf) {
  return [
    path.join(BASE_LOG_DIR, `ohlcv_ccxt_data_${tf}_prediction.json`),
    path.join(BASE_LOG_DIR, `ohlcv_ccxt_data_${tf}.json`),
    path.join(BASE_LOG_DIR, `ohlcv_ccxt_data.json`)
  ];
}

function loadOhlcvForTf(tf) {
  const candidates = candidateFilesForTf(tf);
  for (const fp of candidates) {
    try {
      if (fs.existsSync(fp)) {
        const raw = fs.readFileSync(fp, 'utf8');
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) {
          console.log(`[TRAIN][${tf}] Loaded ${arr.length} rows from ${path.basename(fp)}`);
          return arr;
        }
      }
    } catch (err) {
      console.warn(`[TRAIN][${tf}] Failed to load ${fp}:`, err && err.message ? err.message : err);
    }
  }
  console.warn(`[TRAIN][${tf}] No data found (checked ${candidates.map(p => path.basename(p)).join(', ')})`);
  return [];
}

function candleToFeatures(candle) {
  const open = Number(candle.open ?? candle.o ?? 0) || 0;
  const high = Number(candle.high ?? candle.h ?? 0) || 0;
  const low = Number(candle.low ?? candle.l ?? 0) || 0;
  const close = Number(candle.close ?? candle.c ?? 0) || 0;
  const volume = Number(candle.volume ?? candle.v ?? 0) || 0;
  const base = open || close || 1;
  const ret = (close - open) / base;
  const highLow = (high - low) / base;
  const highOpen = (high - open) / base;
  const lowOpen = (low - open) / base;
  const volNorm = Math.log1p(volume);
  return [ret, highLow, highOpen, lowOpen, volNorm];
}

function normalizeFeatureVector(vec) {
  if (!Array.isArray(vec)) return [];
  return vec.map(x => {
    if (!isFinite(x)) return 0;
    if (x > 10) return 10;
    if (x < -10) return -10;
    return x;
  });
}

function prepareTrainingSet(rawData) {
  const examples = [];
  for (const candle of rawData) {
    let label;
    if (typeof candle.label !== 'undefined') label = candle.label;
    else if (typeof candle.ensemble_label !== 'undefined') label = candle.ensemble_label;
    else if (typeof candle.prediction !== 'undefined') label = candle.prediction;
    else if (typeof candle.prediction_tf !== 'undefined') label = candle.prediction_tf;
    else if (typeof candle.prediction_convnet !== 'undefined') label = candle.prediction_convnet;
    if (typeof label === 'undefined' || label === null) continue;
    let mapped = null;
    if (typeof label === 'number') mapped = Number.isFinite(label) ? Math.trunc(label) : null;
    else {
      const s = String(label).toLowerCase();
      if (s.includes('strong_bull') || s.includes('strong-bull') || s === '1' || s === '+1' || s.includes('bull')) mapped = 1;
      else if (s.includes('strong_bear') || s.includes('strong-bear') || s === '2' || s === '-1' || s.includes('bear')) mapped = 2;
      else mapped = 0;
    }
    if (mapped === null || !Number.isFinite(mapped)) continue;
    const rawFeat = candleToFeatures(candle);
    if (!Array.isArray(rawFeat) || rawFeat.length !== EXPECTED_INPUT_DEPTH) continue;
    const feat = normalizeFeatureVector(rawFeat);
    if (!Array.isArray(feat) || feat.length !== EXPECTED_INPUT_DEPTH) continue;
    const safeFeat = feat.map(v => (Number.isFinite(v) ? v : 0));
    examples.push({ input: safeFeat, output: mapped, raw: candle });
  }
  return examples;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildNetwork(inputDepth = EXPECTED_INPUT_DEPTH, numClasses = 3, hidden = 16) {
  const net = new ConvNet.Net();
  const layer_defs = [
    { type: 'input', out_sx: 1, out_sy: 1, out_depth: inputDepth },
    { type: 'fc', num_neurons: hidden, activation: 'relu' },
    { type: 'fc', num_neurons: hidden, activation: 'relu' },
    { type: 'softmax', num_classes: numClasses }
  ];
  net.makeLayers(layer_defs);
  return net;
}

function gzipAndWrite(filePath, contentBuffer) {
  return new Promise((resolve, reject) => {
    zlib.gzip(contentBuffer, { level: 6 }, (err, gz) => {
      if (err) return reject(err);
      fs.writeFile(filePath, gz, err2 => {
        if (err2) return reject(err2);
        resolve();
      });
    });
  });
}

function rotateModels(tfDir, keep = KEEP_MODELS) {
  try {
    const files = fs.readdirSync(tfDir).filter(f => f.endsWith('.json') && !f.includes('_latest')).map(f => ({
      name: f,
      path: path.join(tfDir, f),
      mtime: fs.statSync(path.join(tfDir, f)).mtimeMs
    }));
    files.sort((a, b) => b.mtime - a.mtime);
    const toDelete = files.slice(keep);
    for (const f of toDelete) {
      try { fs.unlinkSync(f.path); } catch {}
      // also remove .meta.json and .json.gz if present
      try { fs.unlinkSync(f.path + '.gz'); } catch {}
      try { fs.unlinkSync(f.path.replace(/\.json$/, '.meta.json')); } catch {}
    }
  } catch (e) {
    console.warn('[TRAIN] rotateModels error:', e && e.message ? e.message : e);
  }
}

function writeModelsIndex() {
  const models = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir);
    for (const e of entries) {
      const p = path.join(dir, e);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (st.isFile() && e.endsWith('.json')) {
        models.push({
          path: path.relative(TRAINED_ROOT, p).replace(/\\/g, '/'),
          size: st.size,
          mtime: st.mtime.toISOString()
        });
      }
    }
  }
  walk(TRAINED_ROOT);
  const index = { generated: new Date().toISOString(), models };
  fs.writeFileSync(path.join(TRAINED_ROOT, 'models_index.json'), JSON.stringify(index, null, 2));
}

async function saveModelForTfEnhanced(net, tf, meta) {
  const tfDir = path.join(BY_TF_DIR, tf);
  if (!fs.existsSync(tfDir)) fs.mkdirSync(tfDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `trained_ccxt_ohlcv_${tf}_${timestamp}.json`;
  const filePath = path.join(tfDir, baseName);
  const json = JSON.stringify(net.toJSON());

  // write main JSON
  fs.writeFileSync(filePath, json, 'utf8');

  // write metadata
  const metaPath = filePath.replace(/\.json$/, '.meta.json');
  const metaObj = Object.assign({ saved: new Date().toISOString(), tf }, meta || {});
  fs.writeFileSync(metaPath, JSON.stringify(metaObj, null, 2), 'utf8');

  // optionally gzip
  if (SAVE_GZIP) {
    try {
      await gzipAndWrite(filePath + '.gz', Buffer.from(json, 'utf8'));
    } catch (e) {
      console.warn('[TRAIN] gzip write failed', e && e.message ? e.message : e);
    }
  }

  // write a "latest" copy (overwrite)
  const latestPath = path.join(TRAINED_ROOT, `trained_ccxt_ohlcv_${tf}_latest.json`);
  try {
    fs.writeFileSync(latestPath, json, 'utf8');
  } catch (e) {
    console.warn('[TRAIN] write latest failed:', e && e.message ? e.message : e);
  }

  // maintain rotation
  rotateModels(tfDir, KEEP_MODELS);

  // update global index
  writeModelsIndex();

  return { filePath, metaPath, latestPath };
}

async function trainForTf(tf) {
  console.log(`[TRAIN][${tf}] Starting training pass`);
  const raw = loadOhlcvForTf(tf);
  if (!raw || raw.length === 0) {
    console.warn(`[TRAIN][${tf}] No raw data; skipping`);
    return;
  }

  let examples = prepareTrainingSet(raw);
  if (!Array.isArray(examples) || examples.length < 30) {
    console.warn(`[TRAIN][${tf}] Not enough labeled examples (${examples.length}) to train reliably. Need >=30. Skipping.`);
    return;
  }

  examples = examples.filter((e, idx) => {
    if (!e || !Array.isArray(e.input) || e.input.length !== EXPECTED_INPUT_DEPTH) {
      console.warn(`[TRAIN][${tf}] Dropping invalid example at initial index ${idx}`);
      return false;
    }
    if (!Number.isFinite(e.output)) {
      console.warn(`[TRAIN][${tf}] Dropping invalid label for example at index ${idx}`);
      return false;
    }
    return true;
  });

  if (examples.length < 30) {
    console.warn(`[TRAIN][${tf}] Too few clean examples after filtering (${examples.length}). Skipping.`);
    return;
  }

  if (SHUFFLE) shuffleArray(examples);

  const epochs = parseInt(process.env[`EPOCHS_${tf.replace(/[^\w]/g,'')}`] || process.env.EPOCHS || DEFAULT_EPOCHS, 10) || DEFAULT_EPOCHS;
  const inputDepth = examples[0].input.length;
  const net = buildNetwork(inputDepth, 3, parseInt(process.env.HIDDEN_NEURONS || '16', 10));
  const trainer = new ConvNet.Trainer(net, {
    method: process.env.TRAIN_METHOD || 'adadelta',
    batch_size: BATCH_SIZE,
    l2_decay: L2_DECAY
  });

  console.log(`[TRAIN][${tf}] Examples: ${examples.length}, epochs: ${epochs}, batch_size: ${BATCH_SIZE}, inputDepth: ${inputDepth}`);

  const dumpDir = path.join(BY_TF_DIR, 'bad_examples');
  if (!fs.existsSync(dumpDir)) fs.mkdirSync(dumpDir, { recursive: true });

  for (let epoch = 0; epoch < epochs; epoch++) {
    if (SHUFFLE) shuffleArray(examples);
    let epochErrors = 0;
    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      if (!ex || !Array.isArray(ex.input) || ex.input.length !== inputDepth || !Number.isFinite(ex.output)) {
        epochErrors++;
        if (epochErrors > MAX_ERRORS_PER_EPOCH) {
          console.error(`[TRAIN][${tf}] Too many malformed examples in epoch ${epoch} - aborting epoch.`);
          break;
        }
        continue;
      }

      let inputVol;
      try {
        inputVol = new ConvNet.Vol(ex.input);
      } catch (vErr) {
        epochErrors++;
        const dumpFile = path.join(dumpDir, `vol_fail_${tf}_epoch${epoch}_idx${i}.json`);
        try { fs.writeFileSync(dumpFile, JSON.stringify({ epoch, idx: i, example: ex, error: vErr && vErr.message ? vErr.message : String(vErr) }, null, 2)); } catch {}
        if (epochErrors > MAX_ERRORS_PER_EPOCH) {
          console.error(`[TRAIN][${tf}] Too many Vol construction errors - aborting epoch.`);
          break;
        }
        continue;
      }

      try {
        trainer.train(inputVol, ex.output);
      } catch (err) {
        epochErrors++;
        const dumpFile = path.join(dumpDir, `bad_example_${tf}_epoch${epoch}_idx${i}.json`);
        try { fs.writeFileSync(dumpFile, JSON.stringify({ example: ex, epoch, idx: i, error: err && err.message ? err.message : String(err) }, null, 2)); } catch {}
        if (epochErrors > MAX_ERRORS_PER_EPOCH) {
          console.error(`[TRAIN][${tf}] Too many errors in epoch ${epoch} - aborting remaining training of this epoch.`);
          break;
        }
      }
    }
    console.log(`[TRAIN][${tf}] Epoch ${epoch + 1}/${epochs} complete (errors this epoch: ${epochErrors})`);
  }

  // Save model + metadata + rotate + index update
  const meta = {
    examples: examples.length,
    epochs,
    batch_size: BATCH_SIZE,
    inputDepth,
    timeframe: tf
  };
  try {
    const saved = await saveModelForTfEnhanced(net, tf, meta);
    console.log(`[TRAIN][${tf}] Model saved to ${saved.filePath} (latest: ${saved.latestPath})`);
  } catch (e) {
    console.error(`[TRAIN][${tf}] Failed to save model:`, e && e.message ? e.message : e);
  }
}

function trainAllTimeframes() {
  console.log(`[TRAIN] Running multi-timeframe training for: ${TIMEFRAMES.join(', ')}`);
  for (const tf of TIMEFRAMES) {
    try {
      trainForTf(tf);
    } catch (err) {
      console.error(`[TRAIN][${tf}] Unexpected error:`, err && err.message ? err.message : err);
    }
  }
  console.log('[TRAIN] Multi-timeframe training pass complete');
}

// initial run
trainAllTimeframes();
// schedule repeats
setInterval(() => {
  try { trainAllTimeframes(); } catch (err) { console.error('[TRAIN] Error in scheduled training pass:', err && err.message ? err.message : err); }
}, TRAIN_INTERVAL_MS);
