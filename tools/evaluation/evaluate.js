/**
 * evaluate.js
 * Modular evaluation script for indicator scoring.
 * Runs ONCE or continuously, controlled by EVALUATE_INTERVAL_MS (.env), with INTERVAL_MS as fallback.
 * Reads .env at the top for robust environment variable loading.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');
const RSI = require('./indicator/RSI.js');
const ATR = require('./indicator/ATR.js');
// Add other indicators as needed

// --- Interval config ---
const EVALUATE_INTERVAL_MS = process.env.EVALUATE_INTERVAL_MS
  ? parseInt(process.env.EVALUATE_INTERVAL_MS, 10)
  : (process.env.INTERVAL_MS ? parseInt(process.env.INTERVAL_MS, 10) : 0);

// --- Scoring helpers ---
function absScore(values) { return values.reduce((acc, v) => acc + (v == null ? 0 : Math.abs(v)), 0); }
function profitScore(ohlcvArr, signals, params) {
  let position = 0;
  let entry = 0;
  let profit = 0;
  for (let i = 1; i < signals.length; ++i) {
    if (!position && params.buyLevel !== undefined && signals[i] < params.buyLevel) {
      position = 1;
      entry = ohlcvArr[i].close;
    }
    if (position && params.sellLevel !== undefined && signals[i] > params.sellLevel) {
      profit += ohlcvArr[i].close - entry;
      position = 0;
    }
  }
  if (position) profit += ohlcvArr[ohlcvArr.length - 1].close - entry;
  return profit;
}
function sharpeScore(returns) {
  if (!returns.length) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const stddev = Math.sqrt(variance);
  return stddev === 0 ? 0 : mean / stddev;
}
function hitRateScore(trades) {
  if (!trades.length) return 0;
  const wins = trades.filter(t => t > 0).length;
  return wins / trades.length;
}
function simulateTrades(ohlcvArr, signals, params) {
  let position = 0;
  let entry = 0;
  let trades = [];
  for (let i = 1; i < signals.length; ++i) {
    if (!position && params.buyLevel !== undefined && signals[i] < params.buyLevel) {
      position = 1;
      entry = ohlcvArr[i].close;
    }
    if (position && params.sellLevel !== undefined && signals[i] > params.sellLevel) {
      trades.push(ohlcvArr[i].close - entry);
      position = 0;
    }
  }
  if (position) trades.push(ohlcvArr[ohlcvArr.length - 1].close - entry);
  return trades;
}

// --- Scoring dispatcher ---
const scoringMethods = {
  abs: (candles, values, params) => absScore(values),
  profit: (candles, values, params) => profitScore(candles, values, params),
  sharpe: (candles, values, params) => {
    let returns = [];
    for (let i = 1; i < candles.length; ++i)
      returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
    return sharpeScore(returns);
  },
  'hit-rate': (candles, values, params) => {
    const trades = simulateTrades(candles, values, params);
    return hitRateScore(trades);
  }
};

// --- Main evaluation logic ---
function runEvaluate() {
  const configPath = path.join(__dirname, 'evaluate.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`evaluate.json config not found at ${configPath}`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!config.dataPath || typeof config.dataPath !== 'string') {
    throw new Error("Missing or invalid 'dataPath' in evaluate.json");
  }
  const dataPath = path.resolve(__dirname, config.dataPath);
  if (!fs.existsSync(dataPath)) {
    throw new Error(`OHLCV file not found at: ${dataPath}`);
  }
  const candles = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const results = config.tests.map(test => {
    const { indicator: indName, params, scoring = "abs" } = test;
    let indicator, values = [], result = {};
    switch (indName.toLowerCase()) {
      case 'rsi':
        indicator = new RSI(params);
        candles.forEach(c => { indicator.update(c.close); values.push(indicator.result); });
        break;
      case 'atr':
        indicator = new ATR(params);
        candles.forEach(c => { indicator.update(c); values.push(indicator.result); });
        break;
      // Add more indicators here
      default:
        throw new Error(`Unknown indicator: ${indName}`);
    }

    const scorer = scoringMethods[scoring.toLowerCase()] || scoringMethods.abs;
    const score = scorer(candles, values, params);

    let extra = {};
    if (scoring.toLowerCase() === 'hit-rate') {
      const trades = simulateTrades(candles, values, params);
      extra = {
        totalTrades: trades.length,
        wins: trades.filter(t => t > 0).length,
        losses: trades.filter(t => t <= 0).length
      };
    }

    result = {
      indicator: indName,
      params,
      scoring,
      score,
      lastValue: values[values.length - 1],
      timestamp: candles[candles.length - 1]?.timestamp,
      ...extra
    };
    return result;
  });

  if (config.outputPath) {
    fs.writeFileSync(path.resolve(__dirname, config.outputPath), JSON.stringify(results, null, 2));
    console.log(`[EVALUATE] Evaluation complete. Results saved to ${config.outputPath}`);
  } else {
    console.log(JSON.stringify(results, null, 2));
  }
}

// --- Run once or continuously based on interval ---
if (EVALUATE_INTERVAL_MS > 0) {
  console.log(`[EVALUATE] Running continuously every ${EVALUATE_INTERVAL_MS / 1000}s`);
  (async function loop() {
    runEvaluate();
    setTimeout(loop, EVALUATE_INTERVAL_MS);
  })();
} else {
  runEvaluate();
}
