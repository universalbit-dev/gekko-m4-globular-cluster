/**
 * autoTune.js
 * Modular auto-tuning of indicator parameters with multiple scoring methods.
 * Runs ONCE or continuously, controlled by AUTOTUNE_INTERVAL_MS (.env), with INTERVAL_MS as fallback.
 * Reads .env at the top for robust environment variable loading.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// --- Import all indicators here ---
const indicators = {
  rsi: require('./indicator/RSI.js'),
  atr: require('./indicator/ATR.js'),
  adx: require('./indicator/ADX.js'),
  dx: require('./indicator/DX.js'),
  sma: require('./indicator/SMA.js')
};

// --- Interval config ---
const AUTOTUNE_INTERVAL_MS = parseInt(process.env.AUTOTUNE_INTERVAL_MS || process.env.INTERVAL_MS || '0', 10);

// --- Scoring helpers ---
function absScore(values) {
  return values.reduce((sum, v) => sum + (v == null ? 0 : Math.abs(v)), 0);
}

function profitScore(candles, signals, params) {
  let position = 0, entry = 0, profit = 0;
  for (let i = 1; i < signals.length; ++i) {
    if (!position && params.buyLevel !== undefined && signals[i] < params.buyLevel) {
      position = 1; entry = candles[i].close;
    }
    if (position && params.sellLevel !== undefined && signals[i] > params.sellLevel) {
      profit += candles[i].close - entry; position = 0;
    }
  }
  if (position) profit += candles[candles.length - 1].close - entry;
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

function simulateTrades(candles, signals, params) {
  let position = 0, entry = 0, trades = [];
  for (let i = 1; i < signals.length; ++i) {
    if (!position && params.buyLevel !== undefined && signals[i] < params.buyLevel) {
      position = 1; entry = candles[i].close;
    }
    if (position && params.sellLevel !== undefined && signals[i] > params.sellLevel) {
      trades.push(candles[i].close - entry); position = 0;
    }
  }
  if (position) trades.push(candles[candles.length - 1].close - entry);
  return trades;
}

// --- Configurable scoring logic per indicator ---
const config = {
  dataPath: '../logs/json/ohlcv/ohlcv_ccxt_data.json',
  resultsPath: './autoTune_results.json',
  indicators: [
    {
      name: 'rsi',
      class: indicators.rsi,
      paramName: 'interval',
      range: { from: 2, to: 30, step: 1 },
      scoringList: ['abs', 'profit', 'sharpe', 'hit-rate'],
      paramsTemplate: { buyLevel: 30, sellLevel: 70 }
    },
    {
      name: 'atr',
      class: indicators.atr,
      paramName: 'period',
      range: { from: 2, to: 30, step: 1 },
      scoringList: ['abs', 'profit', 'sharpe', 'hit-rate'],
      paramsTemplate: { buyLevel: 50, sellLevel: 200 }
    },
    {
      name: 'adx',
      class: indicators.adx,
      paramName: 'period',
      range: { from: 2, to: 30, step: 1 },
      scoringList: ['abs', 'profit', 'sharpe', 'hit-rate'],
      paramsTemplate: { buyLevel: 20, sellLevel: 50 }
    },
    {
      name: 'dx',
      class: indicators.dx,
      paramName: 'period',
      range: { from: 2, to: 30, step: 1 },
      scoringList: ['abs', 'profit', 'sharpe', 'hit-rate'],
      paramsTemplate: { buyLevel: 20, sellLevel: 50 }
    },
    {
      name: 'sma',
      class: indicators.sma,
      paramName: 'interval',
      range: { from: 2, to: 30, step: 1 },
      scoringList: ['abs'],
      paramsTemplate: {}
    }
    // Add more indicators here as needed...
  ],
};

// --- Load OHLCV data ---
function loadData(dataPath) {
  const fullPath = path.resolve(__dirname, dataPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function* paramRange({ from, to, step }) {
  for (let v = from; v <= to; v += step) yield v;
}

const scoringMethods = {
  abs: (candles, values, params) => absScore(values),
  profit: (candles, values, params) => profitScore(candles, values, params),
  sharpe: (candles, values, params) => {
    const returns = [];
    for (let i = 1; i < candles.length; ++i)
      returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
    return sharpeScore(returns);
  },
  'hit-rate': (candles, values, params) => {
    const trades = simulateTrades(candles, values, params);
    return hitRateScore(trades);
  }
};

function autoTuneIndicator(indConfig, candles) {
  const { name, class: IndicatorClass, paramName, range, scoringList, paramsTemplate } = indConfig;
  const bests = {};
  for (const scoring of scoringList) {
    let bestScore = null, bestParam = null, bestLastValue = null, bestTimestamp = null, bestDetails = {};
    for (const param of paramRange(range)) {
      const params = { ...paramsTemplate, [paramName]: param };
      const indicator = new IndicatorClass(params);
      const values = [];
      for (const c of candles) {
        try {
          // Use .update() signature as expected by indicator
          if (name === 'rsi' || name === 'sma') {
            indicator.update(c.close);
          } else {
            indicator.update(c);
          }
          values.push(indicator.value ?? indicator.result ?? null);
        } catch (e) { continue; }
      }
      const score = scoringMethods[scoring](candles, values, params);

      let extra = {};
      if (scoring === 'hit-rate') {
        const trades = simulateTrades(candles, values, params);
        extra = {
          totalTrades: trades.length,
          wins: trades.filter(t => t > 0).length,
          losses: trades.filter(t => t <= 0).length
        };
      }

      if (bestScore === null || score > bestScore) {
        bestScore = score;
        bestParam = param;
        bestLastValue = values.length ? values[values.length - 1] : null;
        bestTimestamp = candles.length ? candles[candles.length - 1].timestamp : null;
        bestDetails = extra;
      }
    }
    bests[scoring] = {
      indicator: name,
      paramName,
      bestParam,
      scoring,
      bestScore,
      bestLastValue,
      bestTimestamp,
      ...bestDetails
    };
  }
  return bests;
}

function runAutoTune() {
  const candles = loadData(config.dataPath);
  const results = [];
  for (const ind of config.indicators) {
    const bestByScoring = autoTuneIndicator(ind, candles);
    for (const scoring of ind.scoringList) {
      const res = bestByScoring[scoring];
      results.push(res);
      console.log(
        `[AUTOTUNE] Best ${ind.name} ${ind.paramName} for ${scoring}: ${res.bestParam} (score: ${res.bestScore})`
      );
    }
  }
  fs.writeFileSync(config.resultsPath, JSON.stringify(results, null, 2));
  console.log(`[AUTOTUNE] Auto-tune complete. Results saved to ${config.resultsPath}`);
}

// --- Run once or continuously based on interval ---
if (AUTOTUNE_INTERVAL_MS > 0) {
  console.log(`[AUTOTUNE] Running continuously every ${AUTOTUNE_INTERVAL_MS / 1000}s`);
  (async function loop() {
    runAutoTune();
    setTimeout(loop, AUTOTUNE_INTERVAL_MS);
  })();
} else {
  runAutoTune();
}
