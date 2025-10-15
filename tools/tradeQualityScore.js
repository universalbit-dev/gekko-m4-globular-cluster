/**
 * Trade Quality Scoring Module (Advanced+)
 * Optimized for Macrostructure and Microstructure Trading Bots
 * Integrates with multi-timeframe ensemble prediction signals (TensorFlow+ConvNetJS), advanced OHLCV features, and market context.
 *
 * Enhancements:
 * - Incorporates ensemble confidence and model diversity
 * - Considers recent volatility regime alignment (macro/micro regime context)
 * - Supports reward for prediction (signal age penalty, dynamic decay)
 * - All normalization and weights are customizable per strategy or timeframe
 */

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function normalize(val, min, max) {
  // Prevent division by zero, return midpoint if range is 0
  if (max === min) return 50;
  return clamp(((val - min) / (max - min)) * 100, 0, 100);
}

/**
 * Advanced trade scoring for macro/microstructure bots.
 * @param {Object} params
 * @param {number} params.signalStrength - 0-100 (e.g. strong_bull=90, neutral=50)
 * @param {number} params.modelWinRate - 0-1
 * @param {number} params.riskReward - TP/SL ratio (>=1 is good)
 * @param {number} params.executionQuality - 0-100
 * @param {number} params.volatility - e.g., ATR or stddev, normalized
 * @param {number|null} params.tradeOutcome - realized % profit/loss, -100 to +100 (null if open)
 * @param {number} [params.ensembleConfidence] - 0-100 (agreement between models, e.g., both bull=100, split=50)
 * @param {number} [params.modelDiversity] - 0-100 (models disagree = 100, agree = 0, for mean-reversion bonus)
 * @param {number} [params.signalAge] - seconds since signal generated (freshness, lower is better)
 * @param {number} [params.regimeAlign] - 0-100 (macro regime alignment with signal, e.g. strong bull regime & bull signal = 100)
 * @param {number} [params.marketChoppiness] - 0-100 (high = choppy market, penalize)
 * @param {number} [params.liquidityScore] - 0-100 (low = illiquid, penalize)
 * @param {Object} [params.context] - any additional context (for future expansion)
 * @param {function} [params.customPenaltyFn] - optional custom penalty/bonus function
 * @param {Object} [params.weights]
 * @returns {Object}
 */
function scoreTrade({
  signalStrength = 50,
  modelWinRate = 0.445,
  riskReward = 1,
  executionQuality = 90,
  volatility = 15,
  tradeOutcome = null,
  ensembleConfidence = 50,
  modelDiversity = 0, // New: bonus for mean-reversion if models disagree
  signalAge = 0,      // seconds, lower is fresher
  regimeAlign = 50,
  marketChoppiness = 0,
  liquidityScore = 100,
  context = {},
  customPenaltyFn = null,
  weights = {
    signalStrength: 0.13,
    modelWinRate: 0.12,
    riskReward: 0.09,
    executionQuality: 0.09,
    volatility: 0.08,
    tradeOutcome: 0.18,
    ensembleConfidence: 0.09,
    modelDiversity: 0.03,
    signalFreshness: 0.06,
    regimeAlign: 0.07,
    choppiness: 0.03,
    liquidity: 0.03
  }
}) {
  // Win rate: allow lower model win rates to still score > 0
  const winRateScore = normalize(modelWinRate, 0.2, 1.0);

  // Risk-reward: 1:1 = 50, 2:1 = 100, <1 scales down
  const rrScore = riskReward >= 2
    ? 100
    : riskReward >= 1
      ? 50 + (riskReward - 1) * 50
      : clamp(riskReward * 50, 0, 49);

  // Volatility: favor moderate, penalize extremes (centered at 30)
  const volScore = volatility > 150
    ? 0
    : volatility < 5
      ? 0
      : 100 - Math.abs(volatility - 30) * 2.5;

  // Outcome score: wider range, default to midpoint if null
  const outcomeScore = tradeOutcome === null
    ? 50
    : clamp(normalize(tradeOutcome, -20, 20), 0, 100);

  // Ensemble confidence: higher model agreement = better
  const ensembleScore = normalize(ensembleConfidence, 50, 100); // 50 (split) to 100 (full agreement)

  // Model diversity: bonus for mean-reversion or confirmation, e.g. if models strongly disagree, may be useful for certain strategies
  const diversityScore = clamp(modelDiversity, 0, 100);

  // Signal freshness: newer signal gets higher score, >15min old = 0, immediate = 100
  const freshnessScore = signalAge <= 0
    ? 100
    : signalAge >= 900 // 15 min
      ? 0
      : 100 - (signalAge / 900) * 100;

  // Regime alignment: macro regime matches signal = 100, mismatch = 0
  const regimeScore = clamp(regimeAlign, 0, 100);

  // Market choppiness: high choppiness penalizes, low is good for trending
  const choppinessScore = marketChoppiness >= 80 ? 0 : 100 - marketChoppiness;

  // Liquidity: low liquidity (e.g., <30) penalizes, high is good
  const liquidityAdj = clamp(liquidityScore, 0, 100);

  // Weighted sum for total score (before custom penalty/bonus)
  let totalScore =
    weights.signalStrength * signalStrength +
    weights.modelWinRate * winRateScore +
    weights.riskReward * rrScore +
    weights.executionQuality * executionQuality +
    weights.volatility * volScore +
    weights.tradeOutcome * outcomeScore +
    weights.ensembleConfidence * ensembleScore +
    weights.modelDiversity * diversityScore +
    weights.signalFreshness * freshnessScore +
    weights.regimeAlign * regimeScore +
    weights.choppiness * choppinessScore +
    weights.liquidity * liquidityAdj;

  // Apply optional custom penalty/bonus/adjustment
  let customAdjustment = 0;
  if (typeof customPenaltyFn === "function") {
    customAdjustment = customPenaltyFn({
      signalStrength, winRateScore, rrScore, executionQuality, volScore, outcomeScore,
      ensembleConfidence, ensembleScore, modelDiversity, diversityScore, signalAge, freshnessScore,
      regimeAlign, regimeScore, marketChoppiness, choppinessScore, liquidityScore, liquidityAdj, context
    });
    totalScore += customAdjustment;
  }

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    breakdown: {
      signalStrength,
      winRateScore,
      rrScore,
      executionQuality,
      volScore,
      outcomeScore,
      ensembleConfidence,
      ensembleScore,
      modelDiversity,
      diversityScore,
      signalAge,
      freshnessScore,
      regimeAlign,
      regimeScore,
      marketChoppiness,
      choppinessScore,
      liquidityScore,
      liquidityAdj,
      weights,
      customAdjustment
    }
  };
}

module.exports = { scoreTrade };
