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
 * - Sanitizes challenge.recent_win fields (priceChange, candleSize, priceChangePct)
 *   converting empty strings to numeric values where possible, or null otherwise.
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
    const parsed = raw ? JSON.parse(raw) : null;

    // Local helpers (do not rely on outer toNumberSafe which is declared later)
    const _isObject = v => v && typeof v === 'object' && !Array.isArray(v);
    const _toNumLocal = v => {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    // sanitize a single challenge object (ensure recent_win numeric fields are numbers or null,
    // and compute priceChange, priceChangePct, candleSize when they are empty)
    const _sanitizeChallengeObject = (obj) => {
      if (!_isObject(obj)) return;
      const rw = obj.recent_win;
      if (!_isObject(rw)) return;

      const open = _toNumLocal(rw.open);
      const close = _toNumLocal(rw.close);
      const high = _toNumLocal(rw.high);
      const low = _toNumLocal(rw.low);
      const entry = _toNumLocal(rw.entry_price);
      const next = _toNumLocal(rw.next_price);
      const volume = _toNumLocal(rw.volume);
      const volatility = _toNumLocal(rw.volatility);

      // Overwrite raw fields with numeric or null to make downstream consumers safer
      if (open !== null) rw.open = open;
      if (close !== null) rw.close = close;
      if (high !== null) rw.high = high;
      if (low !== null) rw.low = low;
      if (entry !== null) rw.entry_price = entry;
      if (next !== null) rw.next_price = next;
      if (volume !== null) rw.volume = volume;
      if (volatility !== null) rw.volatility = volatility;

      // priceChange: prefer next - entry if available, otherwise close - open
      if (rw.priceChange === '' || rw.priceChange === null || rw.priceChange === undefined) {
        let pc = null;
        if (entry !== null && next !== null) pc = next - entry;
        else if (open !== null && close !== null) pc = close - open;
        rw.priceChange = pc;
      } else {
        rw.priceChange = _toNumLocal(rw.priceChange);
      }

      // priceChangePct: prefer (next-entry)/entry, otherwise (close-open)/open
      if (rw.priceChangePct === '' || rw.priceChangePct === null || rw.priceChangePct === undefined) {
        let pcp = null;
        if (entry !== null && next !== null && entry !== 0) pcp = (next - entry) / entry;
        else if (open !== null && close !== null && open !== 0) pcp = (close - open) / open;
        rw.priceChangePct = pcp;
      } else {
        rw.priceChangePct = _toNumLocal(rw.priceChangePct);
      }

      // candleSize: prefer high - low, otherwise absolute close - open
      if (rw.candleSize === '' || rw.candleSize === null || rw.candleSize === undefined) {
        let cs = null;
        if (high !== null && low !== null) cs = high - low;
        else if (open !== null && close !== null) cs = Math.abs(close - open);
        rw.candleSize = cs;
      } else {
        rw.candleSize = _toNumLocal(rw.candleSize);
      }
    };

    // Recursively sanitize either a single object or a timeframe map { "1m": {...}, "5m": {...} }
    const _sanitizeAll = (node) => {
      if (!_isObject(node)) return;
      // If node looks like a timeframe object (has recent_win), sanitize it
      if (node.recent_win) {
        _sanitizeChallengeObject(node);
        return;
      }
      // Otherwise, it might be a map of timeframe => object, sanitize children
      for (const k of Object.keys(node)) {
        try {
          if (_isObject(node[k])) _sanitizeAll(node[k]);
        } catch (e) {
          // ignore any malformed entries
        }
      }
    };

    // sanitize parsed data to ensure numeric fields are normalized
    if (parsed) _sanitizeAll(parsed);

    _challengeCache = parsed;
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
  // This loader returns a normalized, defensive structure so callers never receive undefined shapes.
  const cache = _loadChallengeCache(Boolean(opts.reload));
  if (!cache) {
    return {
      summary: { active_model: 'no_winner', win_rate: 0, dominant_periods: [] },
      recent_win: {}
    };
  }

  // Accept both shapes: map by timeframe or single-object for a timeframe
  let obj = null;
  if (cache[timeframe]) obj = cache[timeframe];
  else if (cache.timeframe && String(cache.timeframe) === String(timeframe)) obj = cache;
  else {
    return {
      summary: { active_model: 'no_winner', win_rate: 0, dominant_periods: [] },
      recent_win: {}
    };
  }

  // Local helpers (avoid reliance on the later exported helpers)
  const _isObject = v => v && typeof v === 'object' && !Array.isArray(v);
  const _toNum = v => {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const normalized = {};
  // Ensure we always have a summary object
  if (_isObject(obj.summary)) {
    normalized.summary = Object.assign({}, obj.summary);
  } else {
    normalized.summary = {
      active_model: obj.active_model || 'no_winner',
      win_rate: (obj.win_rate !== undefined && obj.win_rate !== null) ? Number(obj.win_rate) : 0,
      dominant_periods: Array.isArray(obj.dominant_periods) ? obj.dominant_periods.slice() : []
    };
  }

  // Normalize dominant_periods to always be an array of enriched objects
  const rawDps = Array.isArray(normalized.summary.dominant_periods) ? normalized.summary.dominant_periods : (Array.isArray(obj.dominant_periods) ? obj.dominant_periods : []);
  normalized.summary.dominant_periods = rawDps.map(p => {
    if (!p || typeof p !== 'object') return { start_ts: null, end_ts: null, start_ts_ms: null, end_ts_ms: null, start_iso: null, end_iso: null, length: null };
    const startRaw = (p.start_ts ?? p.start_ts_ms ?? p.start ?? p.start_ms) ?? null;
    const endRaw = (p.end_ts ?? p.end_ts_ms ?? p.end ?? p.end_ms) ?? null;
    const startMs = startRaw !== null ? _toNum(startRaw) : null;
    const endMs = endRaw !== null ? _toNum(endRaw) : null;
    return {
      start_ts: startRaw,
      end_ts: endRaw,
      start_ts_ms: startMs,
      end_ts_ms: endMs,
      start_iso: (startMs !== null) ? new Date(startMs).toISOString() : null,
      end_iso: (endMs !== null) ? new Date(endMs).toISOString() : null,
      length: (p.length ?? p.len ?? null)
    };
  });

  // recent_win: ensure object
  normalized.recent_win = _isObject(obj.recent_win) ? obj.recent_win : (obj.recent_win || {});

  return normalized;
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
