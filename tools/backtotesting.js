/**
 * Backtesting module for microstructure/macrostructure bots.
 * Simulates bot logic on historical data for parameter optimization and earning potential estimation.
 * Usage: node backtotesting.js
 */

const fs = require('fs');
const path = require('path');
const { scoreTrade } = require('./tradeQualityScore');

// --- CONFIG ---
const TIMEFRAMES = ['1m', '5m', '15m', '1h'];
const DATA_DIR = path.resolve(__dirname, 'logs/json/ohlcv');
const OUTPUT_PATH = path.resolve(__dirname, 'backtest_results.json');

// Modular indicator config
const INDICATOR_CONFIGS = [
  { name: "RSI", module: require('./evaluation/indicator/RSI'), param: { interval: 14 } },
  { name: "ADX", module: require('./evaluation/indicator/ADX'), param: { period: 14 } },
  { name: "DX",  module: require('./evaluation/indicator/DX'),  param: { period: 14 } },
  { name: "ATR", module: require('./evaluation/indicator/ATR'), param: { period: 14 } },
  { name: "SMA", module: require('./evaluation/indicator/SMA'), param: { interval: 14 } }
  // Add more indicators here as needed
];

// Parameter sets to test (expand for parallel sweeps)
const paramSets = [
  { profit_pct: 0.004, loss_pct: 0.002, trade_quality: 55, min_hold: 10, name: "Conservative" },
  { profit_pct: 0.006, loss_pct: 0.003, trade_quality: 60, min_hold: 10, name: "Aggressive" },
  { profit_pct: 0.005, loss_pct: 0.0025, trade_quality: 58, min_hold: 12, name: "Balanced" }
];

// --- INDICATOR EVALUATION ---
function getIndicatorScores(candles) {
  const scores = {};
  for (const cfg of INDICATOR_CONFIGS) {
    const ind = new cfg.module(cfg.param);
    const values = [];
    for (const candle of candles) {
      // Use .update signature as expected
      // Most indicators accept the full candle, but RSI/SMA expect close
      if (cfg.name === "RSI" || cfg.name === "SMA") ind.update(candle.close);
      else ind.update(candle);
      // Use .value, fallback to .result if not present
      values.push(ind.value ?? ind.result ?? null);
    }
    scores[cfg.name] = values;
  }
  return scores;
}

// --- BACKTEST CORE ---
function backtest(data, params) {
  let position = null;
  let trades = [];
  let pnl = 0, wins = 0, losses = 0;
  let tradeQualities = [];
  let maxDrawdown = 0;
  let equityCurve = [];
  let equity = 0;

  // --- Evaluate indicators for this backtest
  const indicatorScores = getIndicatorScores(data);

  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    const signalLabel = point.ensemble_label;
    const volatility = +point.volatility || 10;
    const close = +point.close;
    const win_rate = typeof point.win_rate === 'number' ? point.win_rate : 0.5;

    // You can use indicatorScores in your signals/tradeQuality if desired:
    // Example: const rsiVal = indicatorScores.RSI[i];
    // const adxVal = indicatorScores.ADX[i];
    // const dxVal = indicatorScores.DX[i];
    // const atrVal = indicatorScores.ATR[i];
    // const smaVal = indicatorScores.SMA[i];

    const tradeQuality = scoreTrade({
      signalStrength: getSignalScore(signalLabel),
      modelWinRate: win_rate,
      riskReward: params.profit_pct / params.loss_pct,
      executionQuality: 90,
      volatility,
      tradeOutcome: null,
      // rsi: rsiVal, adx: adxVal, dx: dxVal, atr: atrVal, sma: smaVal // <== advanced scoring
    });

    // Entry logic
    if (!position && tradeQuality.totalScore >= params.trade_quality &&
        (signalLabel === 'strong_bull' || signalLabel === 'strong_bear')) {
      position = {
        type: signalLabel === 'strong_bull' ? 'long' : 'short',
        entry: close,
        entryIdx: i,
        quality: tradeQuality.totalScore,
        indicators: Object.fromEntries(
          Object.entries(indicatorScores).map(([k, arr]) => [k, arr[i]])
        )
      };
      tradeQualities.push(tradeQuality.totalScore);
    }

    // Exit logic
    if (position) {
      const holdTime = i - position.entryIdx;
      let exit = false;
      let reason = '';
      if (position.type === 'long') {
        if (close >= position.entry * (1 + params.profit_pct)) {
          exit = true; reason = 'TP';
        } else if (close <= position.entry * (1 - params.loss_pct)) {
          exit = true; reason = 'SL';
        } else if (holdTime >= params.min_hold) {
          exit = true; reason = 'Timeout';
        }
      } else if (position.type === 'short') {
        if (close <= position.entry * (1 - params.profit_pct)) {
          exit = true; reason = 'TP';
        } else if (close >= position.entry * (1 + params.loss_pct)) {
          exit = true; reason = 'SL';
        } else if (holdTime >= params.min_hold) {
          exit = true; reason = 'Timeout';
        }
      }
      if (exit) {
        const tradePNL = position.type === 'long'
          ? close - position.entry
          : position.entry - close;
        pnl += tradePNL;
        equity += tradePNL;
        if (tradePNL > 0) wins++; else losses++;
        trades.push({
          ...position,
          exit: close,
          exitIdx: i,
          pnl: tradePNL,
          reason,
          signalLabel,
          tradeQuality: position.quality
        });
        position = null;
      }
    }
    equityCurve.push(equity);
    // Drawdown calculation
    const peak = Math.max(...equityCurve);
    const dd = peak - equity;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const avgQuality = tradeQualities.length ? tradeQualities.reduce((a, b) => a + b, 0) / tradeQualities.length : 0;

  return {
    params,
    trades,
    indicatorScores, // Save for diagnostics/analytics
    stats: {
      totalPNL: pnl,
      winRate: trades.length ? wins / trades.length : 0,
      numTrades: trades.length,
      avgTradeQuality: avgQuality,
      maxDrawdown,
      equityCurve
    }
  };
}

// --- UTILS ---
function getSignalScore(signalLabel) {
  return signalLabel === 'strong_bull' ? 90 : signalLabel === 'strong_bear' ? 90 : 50;
}

// --- MAIN ---
function main() {
  let allResults = [];
  for (const tf of TIMEFRAMES) {
    const DATA_PATH = path.join(DATA_DIR, `ohlcv_ccxt_data_${tf}_prediction.json`);
    if (!fs.existsSync(DATA_PATH)) {
      console.error(`[ERROR] Data file not found: ${DATA_PATH}`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const results = paramSets.map(params => backtest(data, params));
    allResults.push({ timeframe: tf, results });

    // Summary for this timeframe
    console.log(`=== [${tf}] ===`);
    results.forEach((r, idx) => {
      const s = r.stats;
      console.log(
        `[${r.params.name || idx}] Trades:${s.numTrades}` +
        ` WinRate:${(s.winRate * 100).toFixed(2)}%` +
        ` PNL:${s.totalPNL.toFixed(4)}` +
        ` MaxDD:${s.maxDrawdown.toFixed(4)}` +
        ` AvgQuality:${s.avgTradeQuality.toFixed(2)}`
      );
    });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allResults, null, 2));
  console.log('Multi-timeframe backtest complete. Results saved to', OUTPUT_PATH);
}

// --- EXPORTS for integration ---
module.exports = {
  backtest,
  paramSets
};

const INTERVAL_MS = 60 * 1000; // 1 minute, change as needed

function continuousMain() {
  main();
  setTimeout(continuousMain, INTERVAL_MS);
}

if (require.main === module) {
  main();
  // Uncomment to enable continuous run:
  continuousMain();
}
