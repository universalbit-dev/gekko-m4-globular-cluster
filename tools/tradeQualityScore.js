/**
 * Trade Quality Scoring Module
 * Optimized for Macrostructure and Microstructure Trading Bots
 * Improvements:
 * - More forgiving win rate and risk/reward scoring (patch for low-frequency)
 * - Outcome scoring supports wider range for aggressive strategies
 * - Volatility scoring centered on typical crypto ranges
 * - All normalization and weights are adjustable for tuning
 */

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function normalize(val, min, max) {
  // Prevent division by zero, return midpoint if range is 0
  if (max === min) return 50;
  return clamp(((val - min) / (max - min)) * 100, 0, 100);
}

function scoreTrade({
  signalStrength = 50,    // 0-100 (e.g., strong_bull=90, weak_bull=50)
  modelWinRate = 0.5,     // 0-1 (e.g., 0.75)
  riskReward = 1,         // TP/SL ratio, typically >=1
  executionQuality = 90,  // 0-100 (slippage, fill, fees)
  volatility = 15,        // e.g., ATR or stddev, normalized
  tradeOutcome = null,    // % profit/loss after close, -100 to +100
  weights = {
    signalStrength: 0.20,
    modelWinRate: 0.20,
    riskReward: 0.15,
    executionQuality: 0.10,
    volatility: 0.10,
    tradeOutcome: 0.25,
  }
}) {
  // Win rate: allow lower model win rates to still score > 0
  const winRateScore = normalize(modelWinRate, 0.2, 1.0); // 0.2 = minimum acceptable win rate
  // Risk-reward: patch so 1:1 ratio scores 50, 2:1 scores 100, <1 scores >0
  const rrScore = riskReward >= 2
    ? 100
    : riskReward >= 1
      ? 50 + (riskReward - 1) * 50
      : clamp(riskReward * 50, 0, 49); // e.g., 0.5 ratio scores 25

  // Volatility: favor moderate volatility, penalize extremes
  const volScore = volatility > 150
    ? 0
    : volatility < 5
      ? 0
      : 100 - Math.abs(volatility - 30) * 2.5; // peak at 30, fades away from center

  // Outcome score: allow wider range, default to midpoint if null
  const outcomeScore = tradeOutcome === null
    ? 50
    : clamp(normalize(tradeOutcome, -20, 20), 0, 100); // -20% to +20% is full scale

  // Weighted sum for total score
  const totalScore =
    weights.signalStrength * signalStrength +
    weights.modelWinRate * winRateScore +
    weights.riskReward * rrScore +
    weights.executionQuality * executionQuality +
    weights.volatility * volScore +
    weights.tradeOutcome * outcomeScore;

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    breakdown: {
      signalStrength,
      winRateScore,
      rrScore,
      executionQuality,
      volScore,
      outcomeScore,
      weights,
    }
  };
}

module.exports = { scoreTrade };
