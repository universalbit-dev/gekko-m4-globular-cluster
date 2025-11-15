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
 * - Designed to be safe when calibration file is missing (falls back to sigmoid).
 * - Easily expandable for real ML or TensorFlow.js models.
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

// calibration structure (optional): array of { min: number, max: number, p: number }
// loaded once if provided and valid
let _calibration = null;
// effective strategy: might fall back to sigmoid if calibration file missing/invalid
let _effectiveProbStrategy = PROB_STRATEGY;

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

module.exports = {
  /**
   * Infers signals from feature array.
   * @param {Array} featuresArr - Array of feature objects.
   * @returns {Array} Array of signal objects with timestamp, signal, score, price, prediction, probability.
   */
  infer(featuresArr) {
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
  },

  // For future ML/TensorFlow.js integration:
  // loadModel: async function(modelPath) { ... },
  // train: async function(trainData, params) { ... },
};
