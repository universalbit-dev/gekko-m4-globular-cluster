// tools/train/label_ohlcv.js
const EPSILON = 1; // Adjust as needed for your instrument (e.g., 1 for BTC/EUR)

function labelCandle(candle, epsilon = EPSILON) {
  const diff = candle.close - candle.open;
  let label;
  if (Math.abs(diff) < epsilon) label = 2; // idle
  else if (diff > 0) label = 0;            // bull
  else label = 1;                          // bear
  return { ...candle, label };
}

function labelCandles(candles, epsilon = EPSILON) {
  return candles.map(c => labelCandle(c, epsilon));
}

module.exports = { labelCandle, labelCandles, EPSILON };
