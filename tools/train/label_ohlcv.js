// tools/train/label_ohlcv.js
// Improved epsilon handling:
// - If EPSILON >= 1: treated as absolute price difference (legacy behavior).
// - If 0 < EPSILON < 1: treated as fraction of price (relative threshold).
// - Can override via env: LABEL_EPSILON (numeric).
const DEFAULT_EPSILON = 1; // legacy default (absolute)

// Read env override if present
const EPSILON = (() => {
  const v = process.env.LABEL_EPSILON;
  if (v !== undefined && v !== null && String(v).trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n) && !Number.isNaN(n) && n > 0) return n;
    // fallthrough to default on invalid value
  }
  return DEFAULT_EPSILON;
})();

function getEpsilonForCandle(candle, epsilonParam) {
  // epsilonParam may be passed directly to labelCandle
  let eps = (epsilonParam !== undefined && epsilonParam !== null) ? Number(epsilonParam) : Number(EPSILON);
  if (!isFinite(eps) || eps <= 0) eps = Number(DEFAULT_EPSILON) || 1;

  // If eps < 1 treat as relative fraction of price (e.g. 0.001 => 0.1%)
  if (Math.abs(eps) < 1) {
    const price = Number(candle.close ?? candle.open ?? 0);
    // avoid zero price; ensure tiny positive threshold
    const computed = Math.max(1e-12, Math.abs(price) * Math.abs(eps));
    return computed;
  }
  // otherwise eps >= 1 is absolute threshold (legacy)
  return Math.abs(eps);
}

function labelCandle(candle, epsilon = undefined) {
  const eps = getEpsilonForCandle(candle, epsilon);
  const diff = Number(candle.close) - Number(candle.open);
  let label;
  if (!isFinite(diff)) {
    label = 2; // idle for invalid numeric values
  } else if (Math.abs(diff) < eps) {
    label = 2; // idle
  } else if (diff > 0) {
    label = 0; // bull
  } else {
    label = 1; // bear
  }
  return { ...candle, label };
}

function labelCandles(candles, epsilon = undefined) {
  return candles.map(c => labelCandle(c, epsilon));
}

module.exports = { labelCandle, labelCandles, EPSILON };
