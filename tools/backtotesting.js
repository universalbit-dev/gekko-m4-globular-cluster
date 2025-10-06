/**
 * Enhanced Backtesting: Processes both prediction and raw market data from ohlcv_ccxt_data*.json files.
 * Supports mapping integer label fields to proper signal labels for backtesting.
 * Usage: node backtotesting.js
 * To run continuously: set BACKTEST_INTERVAL_MS in env, or default to 60s.
 */

const fs = require('fs');
const path = require('path');
const { scoreTrade } = require('./tradeQualityScore');

const DATA_DIR = path.resolve(__dirname, 'logs/json/ohlcv');
const OUTPUT_PATH = path.resolve(__dirname, 'backtest_results.json');
const CSV_PATH = path.resolve(__dirname, 'backtest_trades.csv');
const FEE_PCT = 0.0001; // Kraken fee: 0.01%
const SLIPPAGE_PCT = 0.00005;
const VERBOSE = process.env.BACKTEST_VERBOSE === "1";
const TIMEFRAMES = ['1m', '5m', '15m', '1h'];
const BACKTEST_INTERVAL_MS = parseInt(process.env.BACKTEST_INTERVAL_MS || "60000", 10);

// --- SCORE SYSTEMS/STRATEGY CONFIG ---
const paramSets = [
  { profit_pct: 0.005, loss_pct: 0.002, trade_quality: 60, min_hold: 8, name: "Conservative+" },
  { profit_pct: 0.008, loss_pct: 0.003, trade_quality: 65, min_hold: 7, name: "Aggressive+" },
  { profit_pct: 0.007, loss_pct: 0.0025, trade_quality: 62, min_hold: 10, name: "Balanced+" }
];

// --- Discover prediction and raw files for each timeframe ---
function discoverExchangeDataFiles() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f =>
      f.startsWith('ohlcv_ccxt_data') &&
      f.endsWith('.json')
    );
  const found = {};
  for (const tf of TIMEFRAMES) {
    const pred = `ohlcv_ccxt_data_${tf}_prediction.json`;
    const raw = `ohlcv_ccxt_data_${tf}.json`;
    found[tf] = {};
    if (files.includes(pred)) found[tf].prediction = pred;
    if (files.includes(raw)) found[tf].raw = raw;
  }
  // Aggregate file (multi-timeframe)
  if (files.includes('ohlcv_ccxt_data.json')) found['multi'] = { aggregate: 'ohlcv_ccxt_data.json' };
  return found;
}

// --- Handle aggregate file (multi-timeframe) ---
function extractTimeframesFromAggregate(data) {
  if (!data || typeof data !== 'object') return {};
  const result = {};
  for (const tf of TIMEFRAMES) {
    if (Array.isArray(data[tf])) result[tf] = data[tf];
  }
  return result;
}

// --- Map integer labels to signal labels ---
function getMappedSignalLabel(point) {
  if (point.ensemble_label) return point.ensemble_label;
  if (point.challenge_label) return point.challenge_label;
  if (typeof point.label !== "undefined") {
    if (point.label === 1) return "strong_bull";
    if (point.label === 2) return "strong_bear";
    return "other";
  }
  return "other";
}

// --- Backtest core ---
function backtest(data, params, label = '') {
  let position = null;
  let trades = [];
  let pnl = 0, wins = 0, losses = 0;
  let tradeQualities = [];
  let maxDrawdown = 0;
  let equityCurve = [];
  let equity = 0;
  let signalCount = { strong_bull: 0, strong_bear: 0, other: 0 };
  let holdTimes = [];

  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    const signalLabel = getMappedSignalLabel(point);
    const volatility = +point.volatility || 10;
    const close = +point.close;
    const win_rate = typeof point.win_rate === 'number' ? point.win_rate : 0.5;

    if (signalLabel === 'strong_bull') signalCount.strong_bull++;
    else if (signalLabel === 'strong_bear') signalCount.strong_bear++;
    else signalCount.other++;

    const tradeQuality = scoreTrade({
      signalStrength: getSignalScore(signalLabel),
      modelWinRate: win_rate,
      riskReward: params.profit_pct / params.loss_pct,
      executionQuality: 95,
      volatility,
      tradeOutcome: null
    });

    if (VERBOSE) {
      console.log(`[DEBUG][${label}][${i}] label:${signalLabel} tq:${tradeQuality.totalScore.toFixed(2)} close:${close}`);
    }

    // Entry logic (ML signals, trade quality threshold)
    if (!position && tradeQuality.totalScore >= params.trade_quality &&
        (signalLabel === 'strong_bull' || signalLabel === 'strong_bear')) {
      position = {
        type: signalLabel === 'strong_bull' ? 'long' : 'short',
        entry: close,
        entryIdx: i,
        quality: tradeQuality.totalScore,
        mlStats: {
          win_rate,
          volatility,
          challenge_model: point.challenge_model,
          ensemble_model: point.ensemble_model
        }
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
        const fee = FEE_PCT * position.entry + FEE_PCT * close;
        const slippage = SLIPPAGE_PCT * position.entry;
        let tradePNL = position.type === 'long'
          ? close - position.entry - fee - slippage
          : position.entry - close - fee - slippage;
        pnl += tradePNL;
        equity += tradePNL;
        if (tradePNL > 0) wins++; else losses++;
        holdTimes.push(holdTime);

        trades.push({
          ...position,
          exit: close,
          exitIdx: i,
          pnl: tradePNL,
          reason,
          signalLabel,
          tradeQuality: position.quality,
          holdTime
        });
        position = null;
      }
    }
    equityCurve.push(equity);
    const peak = Math.max(...equityCurve);
    const dd = peak - equity;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const avgQuality = tradeQualities.length ? tradeQualities.reduce((a, b) => a + b, 0) / tradeQualities.length : 0;
  const avgPNL = trades.length ? trades.reduce((a,b) => a + b.pnl, 0) / trades.length : 0;
  const avgHoldTime = holdTimes.length ? holdTimes.reduce((a,b) => a + b, 0) / holdTimes.length : 0;

  return {
    params,
    trades,
    stats: {
      totalPNL: pnl,
      winRate: trades.length ? wins / trades.length : 0,
      numTrades: trades.length,
      avgTradeQuality: avgQuality,
      maxDrawdown,
      avgPNL,
      avgHoldTime,
      equityCurve,
      wins,
      losses,
      signalCount
    }
  };
}

// --- UTILS ---
function getSignalScore(signalLabel) {
  return signalLabel === 'strong_bull' ? 95 : signalLabel === 'strong_bear' ? 95 : 60;
}

// --- CSV EXPORT ---
function exportTradesCSV(allResults) {
  let allTrades = [];
  for (const frame of allResults) {
    for (const res of frame.results) {
      for (const t of res.trades) {
        allTrades.push({
          source: frame.source,
          variant: frame.variant,
          strategy: res.params.name,
          entryIdx: t.entryIdx,
          exitIdx: t.exitIdx,
          entry: t.entry,
          exit: t.exit,
          pnl: t.pnl,
          reason: t.reason,
          tradeQuality: t.tradeQuality,
          holdTime: t.holdTime,
          win_rate: t.mlStats?.win_rate || "",
          volatility: t.mlStats?.volatility || "",
          challenge_model: t.mlStats?.challenge_model || "",
          ensemble_model: t.mlStats?.ensemble_model || ""
        });
      }
    }
  }
  const header = Object.keys(allTrades[0] || {
    source: '', variant: '', strategy: '', entryIdx: '', exitIdx: '', entry: '', exit: '', pnl: '', reason: '', tradeQuality: '', holdTime: '', win_rate: '', volatility: '', challenge_model: '', ensemble_model: ''
  }).join(',');
  const rows = allTrades.map(x => Object.values(x).join(',')).join('\n');
  fs.writeFileSync(CSV_PATH, header + '\n' + rows);
}

// --- Print summary helper ---
function printSummary(r, idx) {
  const s = r.stats;
  let color = "\x1b[0m";
  if (s.totalPNL < 0) color = "\x1b[31m";
  else if (s.totalPNL > 0) color = "\x1b[32m";
  const regime = s.totalPNL < -2000 ? "Bear" : s.totalPNL > 2000 ? "Bull" : "Flat";
  console.log(
    `${color}[${r.params.name || idx}] Trades:${s.numTrades}` +
    ` WinRate:${(s.winRate * 100).toFixed(2)}%` +
    ` PNL:${s.totalPNL.toFixed(4)}` +
    ` MaxDD:${s.maxDrawdown.toFixed(4)}` +
    ` AvgQuality:${s.avgTradeQuality.toFixed(2)}` +
    ` AvgPNL:${s.avgPNL.toFixed(4)}` +
    ` AvgHold:${s.avgHoldTime.toFixed(2)}` +
    ` W:${s.wins} L:${s.losses}` +
    ` Regime:${regime}` +
    ` Signals: bull:${s.signalCount.strong_bull} bear:${s.signalCount.strong_bear} other:${s.signalCount.other}\x1b[0m`
  );
}

// --- MAIN LOOP (continuous mode) ---
async function runBacktestLoop() {
  while (true) {
    try {
      let allResults = [];
      const files = discoverExchangeDataFiles();

      // Aggregate file
      if (files.multi && files.multi.aggregate) {
        let data;
        try { data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, files.multi.aggregate), 'utf8')); }
        catch { console.error(`[ERROR] Could not parse: ${files.multi.aggregate}`); data = {}; }
        const tfs = extractTimeframesFromAggregate(data);
        for (const tf of TIMEFRAMES) {
          const arr = tfs[tf];
          if (!Array.isArray(arr) || arr.length === 0) continue;
          const results = paramSets.map(params => backtest(arr, params, `aggregate:${tf}`));
          allResults.push({ source: `aggregate:${tf}`, variant: 'AGGREGATE', results });
          console.log(`=== [aggregate:${tf}: AGGREGATE] ===`);
          results.forEach((r, idx) => printSummary(r, idx));
        }
      }

      // Each timeframe prediction & raw
      for (const tf of TIMEFRAMES) {
        if (!files[tf]) continue;
        if (files[tf].prediction) {
          let data;
          try { data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[tf].prediction), 'utf8')); }
          catch { console.error(`[ERROR] Could not parse: ${files[tf].prediction}`); data = []; }
          if (Array.isArray(data) && data.length > 0) {
            const results = paramSets.map(params => backtest(data, params, files[tf].prediction));
            allResults.push({ source: files[tf].prediction, variant: 'PREDICTION', results });
            console.log(`=== [${files[tf].prediction}: PREDICTION] ===`);
            results.forEach((r, idx) => printSummary(r, idx));
          }
        }
        if (files[tf].raw) {
          let data;
          try { data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[tf].raw), 'utf8')); }
          catch { console.error(`[ERROR] Could not parse: ${files[tf].raw}`); data = []; }
          if (Array.isArray(data) && data.length > 0) {
            const results = paramSets.map(params => backtest(data, params, files[tf].raw));
            allResults.push({ source: files[tf].raw, variant: 'RAW', results });
            console.log(`=== [${files[tf].raw}: RAW] ===`);
            results.forEach((r, idx) => printSummary(r, idx));
          }
        }
      }

      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allResults, null, 2));
      exportTradesCSV(allResults);
      console.log('Full backtest complete. Results saved to', OUTPUT_PATH, 'and', CSV_PATH);

    } catch (err) {
      console.error('[ERROR][BACKTEST] Exception in main loop:', err);
    }

    // Wait for the interval before next run
    console.log(`[INFO][BACKTEST] Sleeping for ${BACKTEST_INTERVAL_MS / 1000}s...`);
    await new Promise(res => setTimeout(res, BACKTEST_INTERVAL_MS));
  }
}

// --- EXPORTS for integration ---
module.exports = {
  backtest,
  paramSets
};

// --- Entry ---
if (require.main === module) {
  runBacktestLoop();
}
