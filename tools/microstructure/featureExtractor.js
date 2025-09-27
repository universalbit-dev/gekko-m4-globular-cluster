/**
 * featureExtractor.js
 * Enhanced feature extraction for microstructure ML and signal analysis.
 * - Supports aggregated OHLCV candles (raw or prediction-labeled).
 * - Supports micro_signal.log entries ({timestamp, signal, score, price, ...}).
 * - Integrates challenge log/model_winner.json fields for richer features.
 * - Returns feature vector for ML/model or comparative analysis.
 */

const fs = require('fs');
const path = require('path');

/**
 * Load challenge model results for a given timeframe.
 * @param {string} timeframe 
 * @returns {Object} {convnet_result, tf_result, prediction_convnet, prediction_tf, winner_label, entry_price, next_price, volatility, ...}
 */
function loadChallengeModelResults(timeframe = "15m") {
  try {
    const winnerPath = path.resolve(__dirname, '../challenge/model_winner.json');
    if (!fs.existsSync(winnerPath)) return {};
    const winnerData = JSON.parse(fs.readFileSync(winnerPath, 'utf8'));
    if (winnerData[timeframe] && winnerData[timeframe].recent_win) {
      return winnerData[timeframe].recent_win;
    }
  } catch (e) {
    console.error(`[Microstructure] Failed to load challenge model results:`, e);
  }
  return {};
}

/**
 * Extract features from an aggregated OHLCV candle + challenge context.
 * @param {Object} aggregatedCandle
 * @param {string} timeframe
 * @returns {Object|null}
 */
function extractCandleFeatures(aggregatedCandle, timeframe = "15m") {
  if (!aggregatedCandle) return null;
  const {
    open, high, low, close, volume, length, prediction, labels,
    // These may be present from challenge logs
    convnet_result, tf_result, prediction_convnet, prediction_tf, winner_label, entry_price, next_price, volatility
  } = aggregatedCandle;

  const priceChange = close - open;
  const priceChangePct = open ? (close - open) / open : 0;
  const volatilityCalc = high - low;
  const volumePerMinute = (length > 0) ? volume / length : 0;

  // Attach challenge model context if available
  const challengeData = loadChallengeModelResults(timeframe);

  return {
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
    prediction: typeof prediction === 'number' ? prediction : undefined,
    labels: Array.isArray(labels) ? labels : undefined,
    // Challenge/model_winner fields
    ...challengeData,
    // Directly from candle if present
    convnet_result, tf_result, prediction_convnet, prediction_tf, winner_label, entry_price, next_price, volatility
  };
}

/**
 * Extract features from a micro_signal.log entry.
 * @param {Object} microSignalEntry
 * @returns {Object|null}
 */
function extractMicroSignalFeatures(microSignalEntry) {
  if (!microSignalEntry) return null;
  const { timestamp, signal, score, price, prediction, probability } = microSignalEntry;

  const MAX_SCORE = typeof process.env.MICRO_MAX_SCORE === 'number' ? process.env.MICRO_MAX_SCORE : 100;
  const normalizedScore = score / MAX_SCORE;

  let signalCode = 0;
  if (signal === 'buy') signalCode = 1;
  if (signal === 'sell') signalCode = -1;
  if (signal === 'hold') signalCode = 0;

  return {
    timestamp,
    signal,
    score,
    normalizedScore,
    signalCode,
    price: typeof price === 'number' ? price : null,
    prediction: typeof prediction === 'number' ? prediction : undefined,
    probability: typeof probability === 'number' ? probability : undefined
    // Challenge fields could be added here as well if needed
  };
}

/**
 * Main entry: Accepts either candle or micro_signal entry
 * Returns a combined feature vector for contextualized analysis
 * Automatically detects type, and attaches challenge/model context.
 * @param {Object} entry
 * @param {string} timeframe
 * @returns {Object|null}
 */
function extractFeatures(entry, timeframe = "15m") {
  if (!entry) return null;
  if ('open' in entry && 'close' in entry) {
    return extractCandleFeatures(entry, timeframe);
  }
  if ('signal' in entry && 'score' in entry) {
    return extractMicroSignalFeatures(entry);
  }
  return null;
}

module.exports = {
  extractFeatures,
  extractCandleFeatures,
  extractMicroSignalFeatures,
  loadChallengeModelResults
};
