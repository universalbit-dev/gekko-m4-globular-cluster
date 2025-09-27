/**
 * Trade Quality Scoring Module
 * Contextualized for Macrostructure and Microstructure Trading Bots
 */

function normalize(val, min, max) {
  if (max === min) return 100;
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
}

function scoreTrade({
  signalStrength,    // 0-100 (e.g., strong_bull=90, weak_bull=50)
  modelWinRate,      // 0-1 (e.g., 0.75)
  riskReward,        // TP/SL ratio, typically >1
  executionQuality,  // 0-100 (slippage, fill, fees)
  volatility,        // e.g., ATR or stddev, normalized
  tradeOutcome,      // % profit/loss after close, -100 to +100
  weights = {
    signalStrength: 0.20,
    modelWinRate: 0.20,
    riskReward: 0.15,
    executionQuality: 0.10,
    volatility: 0.10,
    tradeOutcome: 0.25,
  }
}) {
  const winRateScore = normalize(modelWinRate, 0.2, 1.0);
  const rrScore = normalize(riskReward, 1, 3);
  const volScore = normalize(volatility, 5, 150);
  const outcomeScore = normalize(tradeOutcome, -10, 10);

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
