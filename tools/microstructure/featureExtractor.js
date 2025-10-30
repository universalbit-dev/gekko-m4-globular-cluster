#!/usr/bin/env node
/**
 * featureExtractor.js
 * Enhanced feature extraction for microstructure ML and signal analysis.
 *
 * Enhancements made:
 * - Support multi-timeframe input: extractFeaturesForTimeframes accepts an object
 *   { "1m": entry, "5m": entry, ... } and returns a merged feature vector where
 *   timeframe-specific fields are namespaced (e.g. price_1m, volatility_5m).
 * - Adds ensemble features across timeframes: agreement, avgPrediction,
 *   avgProbability/ensemble_confidence, presentTFs, framesWithPrediction.
 * - Caches challenge/model_winner.json reads and exposes a reload helper.
 * - Safer numeric normalization and defensive parsing for missing/invalid fields.
 */

const fs = require('fs');
const path = require('path');

const CHALLENGE_WINNER_PATH = path.resolve(__dirname, '../challenge/model_winner.json');

// Simple cache for model_winner.json
let _challengeCache = null;
let _challengeCacheMTime = 0;
function _loadChallengeCache(force = false) {
  try {
    if (!force && _challengeCache) return _challengeCache;
    if (!fs.existsSync(CHALLENGE_WINNER_PATH)) { _challengeCache = null; _challengeCacheMTime = 0; return null; }
    const stat = fs.statSync(CHALLENGE_WINNER_PATH);
    if (!force && _challengeCache && stat.mtimeMs === _challengeCacheMTime) return _challengeCache;
    const raw = fs.readFileSync(CHALLENGE_WINNER_PATH, 'utf8');
    _challengeCache = raw ? JSON.parse(raw) : null;
    _challengeCacheMTime = stat.mtimeMs;
    return _challengeCache;
  } catch (e) {
    // swallow errors; caller will receive null
    _challengeCache = null;
    _challengeCacheMTime = 0;
    return null;
  }
}

function loadChallengeModelResults(timeframe = '15m', opts = { reload: false }) {
  const cache = _loadChallengeCache(Boolean(opts.reload));
  if (!cache) return {};
  // model_winner.json may be either a single object (winner) or a map by timeframe
  // Accept both shapes: { timeframe: {...} } or { timeframe: '15m', ... }.
  if (cache[timeframe]) return cache[timeframe];
  // If file describes a single winner, check fields
  if (cache.timeframe && String(cache.timeframe) === String(timeframe)) return cache;
  return {};
}

/**
 * Load challenge model results for multiple timeframes.
 */
function loadChallengeModelResultsMulti(timeframes = [], opts = { reload: false }) {
  const out = {};
  for (const tf of timeframes) out[tf] = loadChallengeModelResults(tf, opts) || {};
  return out;
}

// Helpers
const toNumberSafe = (v, fallback = null) => {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const isObject = v => v && typeof v === 'object' && !Array.isArray(v);

/**
 * Extract features from an aggregated OHLCV candle + challenge context.
 * Returns a plain object of features (timeframe-specific names are not applied here).
 * @param {Object} aggregatedCandle
 * @param {string} timeframe
 * @returns {Object|null}
 */
function extractCandleFeatures(aggregatedCandle, timeframe = '15m') {
  if (!isObject(aggregatedCandle)) return null;

  const open = toNumberSafe(aggregatedCandle.open, null);
  const high = toNumberSafe(aggregatedCandle.high, null);
  const low = toNumberSafe(aggregatedCandle.low, null);
  const close = toNumberSafe(aggregatedCandle.close, null);
  const volume = toNumberSafe(aggregatedCandle.volume, 0);
  const length = toNumberSafe(aggregatedCandle.length, 0);

  const priceChange = (open !== null && close !== null) ? close - open : null;
  const priceChangePct = (open && open !== 0) ? (close - open) / open : null;
  const volatilityCalc = (high !== null && low !== null) ? high - low : null;
  const volumePerMinute = length > 0 ? volume / length : 0;

  // attach challenge/model context if present
  const challenge = loadChallengeModelResults(timeframe) || {};

  // standard prediction fields; normalize numeric predictions if possible
  const prediction = aggregatedCandle.prediction !== undefined ? toNumberSafe(aggregatedCandle.prediction) : undefined;
  const prediction_convnet = aggregatedCandle.prediction_convnet ?? aggregatedCandle.prediction_convnet_raw ?? undefined;
  const prediction_tf = aggregatedCandle.prediction_tf ?? aggregatedCandle.prediction_tf_raw ?? undefined;
  const labels = Array.isArray(aggregatedCandle.labels) ? aggregatedCandle.labels : (aggregatedCandle.label ? [aggregatedCandle.label] : undefined);

  return {
    tf: timeframe,
    open,
    high,
    low,
    close,
    volume,
    length,
    priceChange,
    priceChangePct,
    volatility: volatilityCalc,
    volumePerMinute,
    price: close,
    prediction,
    prediction_convnet,
    prediction_tf,
    labels,
    // challenge/model info merged (possible fields depend on your model_winner.json)
    challenge,
    // expose raw for downstream consumers
    _raw: aggregatedCandle
  };
}

/**
 * Extract features from a micro_signal.log entry.
 * @param {Object} microSignalEntry
 * @returns {Object|null}
 */
function extractMicroSignalFeatures(microSignalEntry) {
  if (!isObject(microSignalEntry)) return null;

  const timestamp = toNumberSafe(microSignalEntry.timestamp, null);
  const signal = microSignalEntry.signal ?? null;
  const score = toNumberSafe(microSignalEntry.score, null);
  const price = toNumberSafe(microSignalEntry.price, null);
  const prediction = toNumberSafe(microSignalEntry.prediction, undefined);
  const probability = toNumberSafe(microSignalEntry.probability, undefined);

  const MAX_SCORE = process.env.MICRO_MAX_SCORE ? toNumberSafe(process.env.MICRO_MAX_SCORE, 100) : 100;
  const normalizedScore = score !== null ? (MAX_SCORE ? score / MAX_SCORE : 0) : null;

  let signalCode = 0;
  if (typeof signal === 'string') {
    const s = signal.toLowerCase();
    if (s.includes('buy')) signalCode = 1;
    else if (s.includes('sell')) signalCode = -1;
    else signalCode = 0;
  }

  return {
    timestamp,
    signal,
    score,
    normalizedScore,
    signalCode,
    price,
    prediction,
    probability,
    _raw: microSignalEntry
  };
}

/**
 * Auto-detects entry type and dispatches to appropriate extractor.
 * Supports aggregated candle entries and micro signal entries.
 * @param {Object} entry
 * @param {string} timeframe
 * @returns {Object|null}
 */
function extractFeatures(entry, timeframe = '15m') {
  if (!entry) return null;
  if (isObject(entry) && ('open' in entry || 'close' in entry) ) {
    return extractCandleFeatures(entry, timeframe);
  }
  if (isObject(entry) && ('signal' in entry || 'score' in entry)) {
    return extractMicroSignalFeatures(entry);
  }
  return null;
}

/**
 * Merge features from multiple timeframes into a single feature vector.
 * Input: map { tf1: entry1, tf2: entry2, ... } where each entry is a candle or signal object.
 * Output: merged flat object where keys are namespaced by timeframe, plus ensemble keys:
 *   - presentTFs: array of TFs with valid data
 *   - framesWithPrediction: TFs that include a numeric prediction
 *   - agreement: boolean (true if all non-null prediction strings/names match)
 *   - avgPrediction (numeric average across numeric predictions) or null
 *   - avgProbability (average probability if available)
 *
 * @param {Object} tfEntryMap
 * @param {Object} opts - { reloadChallengeCache: false }
 * @returns {Object} merged features
 */
function extractFeaturesForTimeframes(tfEntryMap = {}, opts = { reloadChallengeCache: false }) {
  if (!isObject(tfEntryMap)) return null;
  if (opts.reloadChallengeCache) _loadChallengeCache(true);

  const merged = {};
  const presentTFs = [];
  const preds = [];
  const predValues = []; // numeric predictions
  const probabilities = [];
  const labelStrings = [];

  for (const [tf, entry] of Object.entries(tfEntryMap)) {
    const feat = extractFeatures(entry, tf);
    if (!feat) continue;
    presentTFs.push(tf);

    // prefix all top-level numeric/string features with tf_
    for (const [k, v] of Object.entries(feat)) {
      if (k === '_raw' || k === 'challenge') {
        // keep raw and challenge nested under namespaced key
        merged[`${tf}__${k}`] = v;
        continue;
      }
      merged[`${tf}__${k}`] = v;
    }

    // aggregate prediction info
    if (feat.prediction !== undefined && feat.prediction !== null) {
      predValues.push(Number(feat.prediction));
      preds.push(String(feat.prediction));
    }
    // also check nested challenge prediction fields (e.g., ensemble)
    const challenge = feat.challenge || {};
    if (isObject(challenge)) {
      const chPred = (challenge.prediction !== undefined ? challenge.prediction : (challenge.ensemble_label ?? undefined));
      const chProb = (challenge.ensemble_confidence !== undefined ? toNumberSafe(challenge.ensemble_confidence, undefined) : undefined);
      if (chPred !== undefined && chPred !== null) {
        labelStrings.push(String(chPred));
      }
      if (chProb !== undefined) probabilities.push(chProb);
    }

    // micro-signal probability/prediction fields
    if (feat.probability !== undefined && feat.probability !== null) probabilities.push(Number(feat.probability));
    if (feat.prediction !== undefined && feat.prediction !== null) {
      // already added to predValues above
    }
  }

  // compute ensemble metrics
  const framesWithPrediction = presentTFs.filter(tf => merged[`${tf}__prediction`] !== undefined && merged[`${tf}__prediction`] !== null);
  const framesWithPredictionCount = framesWithPrediction.length;

  const avgPrediction = predValues.length ? predValues.reduce((a,b) => a + b, 0) / predValues.length : null;
  const avgProbability = probabilities.length ? probabilities.reduce((a,b) => a + b, 0) / probabilities.length : null;

  // agreement: if all non-empty labelStrings are identical
  let agreement = null;
  if (labelStrings.length) {
    const uniq = Array.from(new Set(labelStrings.map(s => String(s).toLowerCase())));
    agreement = uniq.length === 1;
  } else if (preds.length) {
    const uniqP = Array.from(new Set(preds.map(s => String(s))));
    agreement = uniqP.length === 1;
  }

  // Compose merged envelope
  const envelope = {
    tfCount: presentTFs.length,
    presentTFs,
    framesWithPredictionCount,
    framesWithPrediction,
    agreement,
    avgPrediction,
    avgProbability,
    // raw merged features prefixed with tf__
    ...merged
  };

  return envelope;
}

module.exports = {
  extractFeatures,
  extractCandleFeatures,
  extractMicroSignalFeatures,
  extractFeaturesForTimeframes,
  loadChallengeModelResults,
  loadChallengeModelResultsMulti,
  // helpers exported for testing
  _internal: {
    _loadChallengeCache,
    toNumberSafe
  }
};
