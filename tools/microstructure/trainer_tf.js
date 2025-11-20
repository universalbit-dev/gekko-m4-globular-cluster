/**
 * trainer_tf.js
 *
 * Microstructure inference engine.
 * - Uses 'momentum' if present, else 'priceChange'.
 * - Score is the absolute value of the driving feature.
 * - Adds 'price' and 'prediction' fields if available.
 * - Supports configurable thresholds for buy/sell decision.
 * - Adds gating: hysteresis (deadband), min probability and min_score to reduce noise.
 * - Adds optional probability/confidence computation strategies:
 *     MICRO_PROB_STRATEGY = none|sigmoid|normalize|calibrated (default: sigmoid)
 *     MICRO_PROB_SCALE    = scale factor for sigmoid (default: 1.0)
 *     MICRO_MAX_SCORE     = max score for normalize strategy (default: 100)
 *     MICRO_PROB_CALIB_PATH = path to JSON calibration bins for calibrated strategy
 *     MICRO_HYSTERESIS    = deadband applied to thresholds (default: 0.0)
 *     MICRO_MIN_PROB      = minimum probability required to act (default: 0.0)
 *     MICRO_MIN_SCORE     = minimum absolute score required to act (default: 0.0)
 *
 * Neural network enhancements:
 * - Supports optional model-based inference via:
 *     MICRO_MODEL_ENABLE (default: false)
 *     MICRO_MODEL_PATH   (path to model file or JSON)
 *     MICRO_MODEL_TYPE   'json'|'tfjs' (default: 'json')
 *     MICRO_MODEL_INPUT_KEYS (comma separated list of feature keys to feed the model, default: 'momentum,priceChange,prediction')
 *     MICRO_MODEL_OUTPUT_KEY (if model returns object, key to use)
 *     MICRO_MODEL_PROB_AS_LOGIT (if true, model output is treated as logit -> sigmoid to get prob)
 *
 * - Two model options:
 *   1) Simple JSON MLP: a lightweight JSON representation that can be shipped without tfjs.
 *      Format example:
 *      {
 *        "type":"mlp",
 *        "inputOrder":["momentum","priceChange"],
 *        "layers":[
 *           { "weights": [[...],[...]], "biases":[...], "activation":"relu" },
 *           { "weights": [[...]], "biases":[...], "activation":"linear" }
 *        ]
 *      }
 *
 *   2) TFJS model: a tfjs LayersModel or SavedModel (if tfjs-node available). If tfjs isn't installed,
 *      trainer will fall back to non-model (or JSON) behavior and log a helpful warning.
 *
 * - New async functions:
 *     loadModelIfEnabled() - loads the configured model if any
 *     inferAsync(featuresArr) - performs inference using the model if loaded, otherwise falls back
 *
 * Safe behaviour:
 * - If model cannot be loaded or an error occurs, we log and fall back to legacy logic.
 * - Existing infer() synchronous method preserved (calls legacy logic) so consumers are not broken.
 *
 * Notes:
 * - This file aims for safe optional TFJS usage. It does not require tfjs to be installed.
 * - The JSON-MLP evaluator is intentionally small/simple.
 */

const fs = require('fs');
const path = require('path');

const BUY_THRESHOLD = Number(process.env.MICRO_BUY_THRESHOLD || 0.0);
const SELL_THRESHOLD = Number(process.env.MICRO_SELL_THRESHOLD || 0.0);

// gating / hysteresis
const HYSTERESIS = Number(process.env.MICRO_HYSTERESIS || 0.0); // deadband around thresholds
const MIN_PROB = Number(process.env.MICRO_MIN_PROB || 0.0); // require probability >= MIN_PROB for buys, and 1-prob >= MIN_PROB for sells
const MIN_SCORE = Number(process.env.MICRO_MIN_SCORE || 0.0); // ignore signals with absolute score < MIN_SCORE

// probability config
const PROB_STRATEGY = (process.env.MICRO_PROB_STRATEGY || 'sigmoid').toLowerCase();
const PROB_SCALE = Number(process.env.MICRO_PROB_SCALE || 1.0);
const MAX_SCORE = Number(process.env.MICRO_MAX_SCORE || 100);
const CALIB_PATH = process.env.MICRO_PROB_CALIB_PATH || null;

// model config
const MODEL_ENABLE = (process.env.MICRO_MODEL_ENABLE || 'false').toLowerCase() === 'true';
const MODEL_PATH = process.env.MICRO_MODEL_PATH || null;
const MODEL_TYPE = (process.env.MICRO_MODEL_TYPE || 'json').toLowerCase(); // 'json' or 'tfjs'
const MODEL_INPUT_KEYS = (process.env.MICRO_MODEL_INPUT_KEYS || 'momentum,priceChange,prediction').split(',').map(s => s.trim()).filter(Boolean);
const MODEL_OUTPUT_KEY = process.env.MICRO_MODEL_OUTPUT_KEY || null; // optional if model returns dict
const MODEL_PROB_AS_LOGIT = (process.env.MICRO_MODEL_PROB_AS_LOGIT || 'true').toLowerCase() === 'true';

let _calibration = null;
let _effectiveProbStrategy = PROB_STRATEGY;

// model holders
let _jsonModel = null; // simple JSON-MLP
let _tf = null; // optional tfjs instance
let _tfModel = null; // loaded tfjs model
let _modelLoaded = false;

if (PROB_STRATEGY === 'calibrated') {
  if (!CALIB_PATH) {
    console.warn('[trainer_tf] MICRO_PROB_CALIB_PATH is not set; "calibrated" strategy disabled. Falling back to "sigmoid".');
    _effectiveProbStrategy = 'sigmoid';
  } else {
    try {
      const raw = fs.readFileSync(path.resolve(CALIB_PATH), 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        _calibration = parsed;
        _effectiveProbStrategy = 'calibrated';
      } else {
        console.warn('[trainer_tf] Calibration file parsed but is not an array. Falling back to "sigmoid".');
        _effectiveProbStrategy = 'sigmoid';
      }
    } catch (e) {
      console.warn('[trainer_tf] Failed to load/parse calibration file:', CALIB_PATH, e && e.message);
      console.warn('[trainer_tf] Falling back to "sigmoid" strategy.');
      _calibration = null;
      _effectiveProbStrategy = 'sigmoid';
    }
  }
} else {
  _effectiveProbStrategy = PROB_STRATEGY;
}

function clamp01(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return undefined;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function sigmoid(x, k = 1.0) {
  if (!isFinite(x)) return undefined;
  const z = -k * x;
  if (z > 700) return 0;
  if (z < -700) return 1;
  return 1.0 / (1.0 + Math.exp(z));
}

function probFromCalibration(pred) {
  if (!Array.isArray(_calibration) || pred === null || pred === undefined || Number.isNaN(Number(pred))) return undefined;
  const n = Number(pred);
  for (const b of _calibration) {
    const min = (typeof b.min === 'number') ? b.min : -Infinity;
    const max = (typeof b.max === 'number') ? b.max : Infinity;
    if (n >= min && n < max) return clamp01(b.p);
  }
  return undefined;
}

function computeProbability(rawPred) {
  if (rawPred === null || rawPred === undefined || Number.isNaN(Number(rawPred))) return undefined;

  switch (_effectiveProbStrategy) {
    case 'none':
      return undefined;

    case 'sigmoid': {
      const p = sigmoid(Number(rawPred), PROB_SCALE);
      return clamp01(p);
    }

    case 'normalize': {
      const n = Number(rawPred);
      if (n >= 0 && MAX_SCORE > 0) return clamp01(n / MAX_SCORE);
      return clamp01(sigmoid(n, PROB_SCALE));
    }

    case 'calibrated': {
      const p = probFromCalibration(rawPred);
      if (p !== undefined) return p;
      return clamp01(sigmoid(Number(rawPred), PROB_SCALE));
    }

    default:
      return clamp01(sigmoid(Number(rawPred), PROB_SCALE));
  }
}

/**
 * Simple JSON-MLP evaluator.
 * Very small runtime-only evaluator: expects model to have
 * { type: 'mlp', inputOrder: ['momentum','priceChange'], layers: [ {weights: 2d array, biases: 1d array, activation: 'relu'|'tanh'|'sigmoid'|'linear' }, ... ] }
 */
function evalJsonMlp(model, inputArray) {
  if (!model || model.type !== 'mlp' || !Array.isArray(model.layers)) {
    throw new Error('Invalid json-mlp model');
  }
  let x = inputArray.slice(); // copy
  for (const layer of model.layers) {
    const W = layer.weights; // expected shape [out][in]
    const b = layer.biases || [];
    const activation = (layer.activation || 'linear').toLowerCase();
    const out = new Array(W.length);
    for (let i = 0; i < W.length; i++) {
      let s = (b[i] || 0);
      const Wi = W[i];
      for (let j = 0; j < Wi.length; j++) {
        s += (Wi[j] || 0) * (x[j] || 0);
      }
      // activation
      switch (activation) {
        case 'relu': s = Math.max(0, s); break;
        case 'tanh': s = Math.tanh(s); break;
        case 'sigmoid': s = 1 / (1 + Math.exp(-s)); break;
        case 'linear':
        default:
          break;
      }
      out[i] = s;
    }
    x = out;
  }
  return x; // final output array
}

/**
 * Try loading model if configured. This will attempt to load JSON models synchronously
 * and TFJS models asynchronously if tfjs-node is available.
 * Returns a Promise which resolves with a status object.
 */
async function loadModelIfEnabled() {
  if (!MODEL_ENABLE) {
    _modelLoaded = false;
    return { ok: false, reason: 'disabled' };
  }
  if (!MODEL_PATH) {
    _modelLoaded = false;
    return { ok: false, reason: 'missing_path' };
  }

  const resolved = path.resolve(MODEL_PATH);
  if (MODEL_TYPE === 'json') {
    try {
      const raw = fs.readFileSync(resolved, 'utf8');
      const parsed = JSON.parse(raw);
      // basic validation
      if (parsed && parsed.type === 'mlp' && Array.isArray(parsed.layers) && Array.isArray(parsed.inputOrder)) {
        _jsonModel = parsed;
        _modelLoaded = true;
        console.info('[trainer_tf] Loaded JSON-MLP model from', resolved);
        return { ok: true, type: 'json' };
      } else {
        _jsonModel = null;
        _modelLoaded = false;
        return { ok: false, reason: 'invalid_json_model' };
      }
    } catch (e) {
      console.warn('[trainer_tf] Failed to load JSON model:', resolved, e && e.message);
      _jsonModel = null;
      _modelLoaded = false;
      return { ok: false, reason: 'json_load_error', error: e && e.message };
    }
  } else if (MODEL_TYPE === 'tfjs') {
    // try to require tfjs-node lazily
    try {
      // prefer @tensorflow/tfjs-node if available
      _tf = require('@tensorflow/tfjs-node');
    } catch (e1) {
      try {
        _tf = require('@tensorflow/tfjs');
        console.warn('[trainer_tf] tfjs-node not available; falling back to pure tfjs. Performance may be poor.');
      } catch (e2) {
        console.warn('[trainer_tf] tfjs is not installed. Cannot load tfjs model. Install @tensorflow/tfjs-node or @tensorflow/tfjs.');
        _tf = null;
        _modelLoaded = false;
        return { ok: false, reason: 'tfjs_missing' };
      }
    }

    try {
      // Try to load as a layers model (file://). tf.loadLayersModel accepts 'file://.../model.json' for node.
      let model;
      if (fs.statSync(resolved).isDirectory()) {
        // maybe a saved model (saved_model) for node: tf.node.loadSavedModel exists in tfjs-node
        if (_tf && typeof _tf.node === 'object' && typeof _tf.node.loadSavedModel === 'function') {
          model = _tf.node.loadSavedModel(resolved);
          // loadSavedModel returns a model-like object for tfjs-node
        } else {
          // try to locate model.json inside the directory
          const possible = path.join(resolved, 'model.json');
          if (fs.existsSync(possible)) {
            model = await _tf.loadLayersModel('file://' + possible);
          } else {
            throw new Error('No recognizable tfjs model found in directory');
          }
        }
      } else {
        // file is likely model.json or a URL path
        if (resolved.endsWith('model.json')) {
          model = await _tf.loadLayersModel('file://' + resolved);
        } else {
          // try as a single file (not typical)
          model = await _tf.loadLayersModel('file://' + resolved);
        }
      }
      _tfModel = model;
      _modelLoaded = true;
      console.info('[trainer_tf] Loaded TFJS model from', resolved);
      return { ok: true, type: 'tfjs' };
    } catch (e) {
      console.warn('[trainer_tf] Failed to load TFJS model from', resolved, e && e.message);
      _tfModel = null;
      _modelLoaded = false;
      return { ok: false, reason: 'tfjs_load_error', error: e && e.message };
    }
  } else {
    return { ok: false, reason: 'unsupported_model_type' };
  }
}

/**
 * Run model inference for a single feature object. Returns:
 *  - numeric value(s) (array) from model output or undefined on error.
 */
async function runModelOnFeature(feature) {
  if (!_modelLoaded) return undefined;

  // construct input vector following MODEL_INPUT_KEYS
  const input = MODEL_INPUT_KEYS.map(k => {
    const v = feature[k];
    return (typeof v === 'number' && Number.isFinite(v)) ? v : 0;
  });

  try {
    if (_jsonModel) {
      // If json model has inputOrder, ensure mapping by name (legacy support)
      if (Array.isArray(_jsonModel.inputOrder) && _jsonModel.inputOrder.length === input.length) {
        // Our input already in order MODEL_INPUT_KEYS; if model expects different keys, attempt to reorder
        if (JSON.stringify(_jsonModel.inputOrder) !== JSON.stringify(MODEL_INPUT_KEYS)) {
          const reordered = _jsonModel.inputOrder.map(k => {
            const v = feature[k];
            return (typeof v === 'number' && Number.isFinite(v)) ? v : 0;
          });
          const out = evalJsonMlp(_jsonModel, reordered);
          return out;
        }
      }
      const out = evalJsonMlp(_jsonModel, input);
      return out;
    } else if (_tfModel && _tf) {
      // create tensor of shape [1, inputLen]
      const inputTensor = _tf.tensor2d([input], [1, input.length], 'float32');
      const result = _tfModel.predict(inputTensor);
      // result may be tensor or array of tensors
      const outArr = [];
      if (Array.isArray(result)) {
        for (const t of result) {
          const vals = await t.data();
          for (const v of vals) outArr.push(v);
        }
      } else {
        const vals = await result.data();
        for (const v of vals) outArr.push(v);
      }
      // dispose tf tensors if tfjs-node supports it
      if (typeof inputTensor.dispose === 'function') inputTensor.dispose();
      if (Array.isArray(result)) {
        for (const t of result) if (t && typeof t.dispose === 'function') t.dispose();
      } else if (result && typeof result.dispose === 'function') {
        result.dispose();
      }
      return outArr;
    }
  } catch (e) {
    console.warn('[trainer_tf] Model inference error:', e && e.message);
    return undefined;
  }

  return undefined;
}

/**
 * inferAsync - asynchronous inference that will use a loaded model if available.
 * If model is not loaded, falls back to legacy sync infer() logic.
 * Returns Promise<Array<signal objects>>.
 */
async function inferAsync(featuresArr) {
  if (_modelLoaded) {
    // model-driven inference
    const ts = Date.now();
    const signals = [];
    for (const f of featuresArr) {
      // run model
      const out = await runModelOnFeature(f);
      // Interpret model output:
      // - If array length >=1, use first element as raw prediction/logit
      // - If MODEL_OUTPUT_KEY is set and model returns object (not typical for our outputs), pick that key
      let rawModelPred = undefined;
      if (out === undefined) {
        rawModelPred = undefined;
      } else if (Array.isArray(out) && out.length > 0) {
        rawModelPred = out[0];
      } else if (typeof out === 'number') {
        rawModelPred = out;
      } else {
        rawModelPred = undefined;
      }

      // driving value (signed): prefer momentum/priceChange as before but allow modelPred to be used for probability & prediction
      const hasMomentum = typeof f.momentum === 'number';
      const hasPriceChange = typeof f.priceChange === 'number';
      const hasPrediction = typeof f.prediction === 'number';
      let drive = hasMomentum ? f.momentum : (hasPriceChange ? f.priceChange : (hasPrediction ? f.prediction : 0));

      // Optionally, if JSON model contains "drive_from_model": true, use model output as drive (not enforced here)
      if (typeof f._forceModelDrive === 'boolean' && f._forceModelDrive && typeof rawModelPred === 'number') {
        drive = rawModelPred;
      }

      // signed thresholds with hysteresis (deadband)
      const buyGate = BUY_THRESHOLD + Math.abs(HYSTERESIS);
      const sellGate = SELL_THRESHOLD - Math.abs(HYSTERESIS);

      let candidate = 'hold';
      if (drive > buyGate) candidate = 'buy';
      else if (drive < sellGate) candidate = 'sell';
      else candidate = 'hold';

      const score = Math.abs(drive);

      // probability: prefer provided feature f.probability; else try model output, else compute from rawPredForProb
      let probability = (typeof f.probability === 'number') ? clamp01(f.probability) : undefined;

      if (probability === undefined) {
        // if model output exists and MODEL_PROB_AS_LOGIT true, convert via sigmoid
        if (rawModelPred !== undefined && typeof rawModelPred === 'number') {
          if (MODEL_PROB_AS_LOGIT) {
            probability = clamp01(sigmoid(rawModelPred, PROB_SCALE));
          } else {
            // treat raw output as already a probability
            probability = clamp01(rawModelPred);
          }
        } else {
          // fallback to computeProbability using prediction or drive
          const rawPredForProb = hasPrediction ? f.prediction : drive;
          probability = computeProbability(rawPredForProb);
        }
      }

      // gating: min_score + min_probability checks
      let allowed = true;
      if (score < MIN_SCORE) allowed = false;

      if (typeof probability === 'number' && MIN_PROB > 0) {
        if (candidate === 'buy' && probability < MIN_PROB) allowed = false;
        if (candidate === 'sell' && (1 - probability) < MIN_PROB) allowed = false;
      }

      // final signal after gating
      const signal = allowed ? candidate : 'hold';

      signals.push({
        timestamp: ts,
        signal,
        score,
        price: typeof f.price === 'number' ? f.price : null,
        prediction: hasPrediction ? f.prediction : undefined,
        probability: (typeof probability === 'number') ? probability : undefined,
        _probability_strategy: _effectiveProbStrategy,
        _model: _jsonModel ? 'json-mlp' : (_tfModel ? 'tfjs' : undefined)
      });
    }
    return signals;
  } else {
    // fallback to legacy synchronous infer behavior
    return Promise.resolve(module.exports.infer(featuresArr));
  }
}

/**
 * Legacy synchronous infer kept for compatibility.
 * If you want model-driven inference, call inferAsync after calling loadModelIfEnabled().
 */
function infer(featuresArr) {
  return featuresArr.map(f => {
    const hasMomentum = typeof f.momentum === 'number';
    const hasPriceChange = typeof f.priceChange === 'number';
    const hasPrediction = typeof f.prediction === 'number';

    // driving value (signed)
    let drive = hasMomentum ? f.momentum : (hasPriceChange ? f.priceChange : (hasPrediction ? f.prediction : 0));

    if (!hasMomentum && !hasPriceChange && !hasPrediction) {
      console.warn('Warning: Feature object missing "momentum", "priceChange", and "prediction". Defaulting to 0.');
    }

    // signed thresholds with hysteresis (deadband)
    const buyGate = BUY_THRESHOLD + Math.abs(HYSTERESIS);
    const sellGate = SELL_THRESHOLD - Math.abs(HYSTERESIS);

    let candidate = 'hold';
    if (drive > buyGate) candidate = 'buy';
    else if (drive < sellGate) candidate = 'sell';
    else candidate = 'hold';

    const score = Math.abs(drive);

    // probability: prefer provided feature f.probability; else compute from rawPredForProb
    const rawPredForProb = hasPrediction ? f.prediction : drive;
    let probability = (typeof f.probability === 'number') ? clamp01(f.probability) : undefined;
    if (probability === undefined) probability = computeProbability(rawPredForProb);

    // gating: min_score + min_probability checks
    let allowed = true;
    if (score < MIN_SCORE) allowed = false;

    if (typeof probability === 'number' && MIN_PROB > 0) {
      if (candidate === 'buy' && probability < MIN_PROB) allowed = false;
      if (candidate === 'sell' && (1 - probability) < MIN_PROB) allowed = false;
    }

    // final signal after gating
    const signal = allowed ? candidate : 'hold';

    return {
      timestamp: Date.now(),
      signal,
      score,
      price: typeof f.price === 'number' ? f.price : null,
      prediction: hasPrediction ? f.prediction : undefined,
      probability: (typeof probability === 'number') ? probability : undefined,
      _probability_strategy: _effectiveProbStrategy
    };
  });
}

module.exports = {
  /**
   * Synchronous infer kept for backward compatibility: use inferAsync for model-driven behavior.
   */
  infer,

  /**
   * Asynchronous inference: will use loaded model if present.
   * Usage:
   *   await loadModelIfEnabled();
   *   const signals = await inferAsync(featuresArr);
   */
  inferAsync,

  /**
   * Loads configured model (if MICRO_MODEL_ENABLE=true). Returns Promise result.
   */
  loadModelIfEnabled,

  // expose some internal state for debugging
  _internal: {
    modelEnabled: MODEL_ENABLE,
    modelPath: MODEL_PATH,
    modelType: MODEL_TYPE,
    modelInputKeys: MODEL_INPUT_KEYS,
    modelOutputKey: MODEL_OUTPUT_KEY,
    modelProbAsLogit: MODEL_PROB_AS_LOGIT,
    modelLoaded: () => _modelLoaded,
    jsonModel: () => _jsonModel,
    tfModel: () => _tfModel
  }

  // For future ML/TensorFlow.js integration:
  // train: async function(trainData, params) { ... },
};
