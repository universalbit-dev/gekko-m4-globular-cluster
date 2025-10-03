/**
 * RSI Bull and Bear + ADX modifier with Fibonacci Analysis
 * Functional version for macro/microstructure integration.
 * (CC-BY-SA 4.0) Tommie Hansen, enhanced by universalbit-dev
 */

const RSI = require('../indicator/RSI.js');
const ADX = require('../indicator/ADX.js');
const SMA = require('../indicator/SMA.js');

const FIB_LEVELS = [0.236, 0.382, 0.5, 0.618, 1.0];

// Pure function: calculates Fibonacci levels from candle high/low
const calculateFibonacciLevels = (high, low) =>
  FIB_LEVELS.map(level => low + (high - low) * level);

/**
 * Evaluate strategy on candles with parameters.
 * Returns array of evaluation results per candle.
 */
const rsibullbearadx = (candles, params = {}) => {
  // Destructure/default parameters
  const {
    SMA_short = 10, SMA_long = 21,
    RSI_period = 14, ADX_period = 14
  } = params;

  // Initialize indicators
  const smaFast = new SMA(SMA_short);
  const smaSlow = new SMA(SMA_long);
  const rsi = new RSI({ interval: RSI_period });
  const adx = new ADX(ADX_period);

  // Evaluate candles in a pure, functional way
  return candles.map(candle => {
    smaFast.update(candle.close);
    smaSlow.update(candle.close);
    rsi.update(candle.close);
    adx.update(candle);

    const fibLevels = calculateFibonacciLevels(candle.high, candle.low);

    // Decision logic: no side effects, uses only current indicator values
    let advice = 'wait';
    const ready = (
      smaFast.value !== null &&
      smaSlow.value !== null &&
      rsi.value !== null &&
      adx.value !== null
    );

    if (ready) {
      if (smaFast.value > smaSlow.value && rsi.value > 50 && adx.value > 20) {
        advice = 'long';
      } else if (smaFast.value < smaSlow.value && rsi.value < 50 && adx.value > 20) {
        advice = 'short';
      }
    }

    // Output only what’s needed for macro/microstructure logic
    return {
      time: candle.start,
      price: candle.close,
      indicators: {
        smaFast: smaFast.value,
        smaSlow: smaSlow.value,
        rsi: rsi.value,
        adx: adx.value
      },
      advice,
      fibLevels
    };
  });
};

module.exports = rsibullbearadx;
