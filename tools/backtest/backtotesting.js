/**
 * Optimized Enhanced Backtesting: Fast, robust, and clear.
 * Advanced: Integrates advanced tradeQualityScore with ensemble confidence, regime alignment, and signal age.
 * Usage: node backtotesting.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { scoreTrade } = require('../tradeQualityScore');

const DATA_DIR = path.resolve(__dirname, '../logs/json/ohlcv');
const OUTPUT_PATH = path.resolve(__dirname, 'backtest_results.json');
const CSV_PATH = path.resolve(__dirname, 'backtest_trades.csv');
const FEE_PCT = 0.0001;
const SLIPPAGE_PCT = 0.00005;
const VERBOSE = process.env.BACKTEST_VERBOSE === "1";
const TIMEFRAMES = ['1m', '5m', '15m', '1h'];
const BACKTEST_INTERVAL_MS = parseInt(process.env.BACKTEST_INTERVAL_MS || "10000", 10);

// Allow per-timeframe paramSets
const paramSetsByTf = {
  '1m': [
    { profit_pct: 0.005, loss_pct: 0.002, trade_quality: 60, min_hold: 8, name: "1m Conservative+" },
    { profit_pct: 0.008, loss_pct: 0.003, trade_quality: 60, min_hold: 7, name: "1m Aggressive+" },
    { profit_pct: 0.007, loss_pct: 0.0025, trade_quality: 60, min_hold: 10, name: "1m Balanced+" }
  ],
  '5m': [
    { profit_pct: 0.005, loss_pct: 0.002, trade_quality: 50, min_hold: 8, name: "5m Conservative+" },
    { profit_pct: 0.008, loss_pct: 0.003, trade_quality: 50, min_hold: 7, name: "5m Aggressive+" },
    { profit_pct: 0.007, loss_pct: 0.0025, trade_quality: 50, min_hold: 10, name: "5m Balanced+" }
  ],
  '15m': [
    { profit_pct: 0.005, loss_pct: 0.002, trade_quality: 50, min_hold: 8, name: "15m Conservative+" },
    { profit_pct: 0.008, loss_pct: 0.003, trade_quality: 50, min_hold: 7, name: "15m Aggressive+" },
    { profit_pct: 0.007, loss_pct: 0.0025, trade_quality: 50, min_hold: 10, name: "15m Balanced+" }
  ],
  '1h': [
    { profit_pct: 0.005, loss_pct: 0.002, trade_quality: 65, min_hold: 8, name: "1h Conservative+" },
    { profit_pct: 0.008, loss_pct: 0.003, trade_quality: 65, min_hold: 7, name: "1h Aggressive+" },
    { profit_pct: 0.007, loss_pct: 0.0025, trade_quality: 65, min_hold: 10, name: "1h Balanced+" }
  ]
};

function discoverExchangeDataFiles() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('ohlcv_ccxt_data') && f.endsWith('.json'));
  const found = {};
  for (const tf of TIMEFRAMES) {
    found[tf] = {};
    const pred = `ohlcv_ccxt_data_${tf}_prediction.json`;
    const raw = `ohlcv_ccxt_data_${tf}.json`;
    if (files.includes(pred)) found[tf].prediction = pred;
    if (files.includes(raw)) found[tf].raw = raw;
  }
  if (files.includes('ohlcv_ccxt_data.json')) found['multi'] = { aggregate: 'ohlcv_ccxt_data.json' };
  return found;
}

function extractTimeframesFromAggregate(data) {
  if (!data || typeof data !== 'object') return {};
  return Object.fromEntries(
    TIMEFRAMES.map(tf => [tf, Array.isArray(data[tf]) ? data[tf] : []])
  );
}

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

function computeEnsembleConfidence(point) {
  return (!point.prediction_convnet || !point.prediction_tf) ? 50
    : (point.prediction_convnet === point.prediction_tf ? 100 : 50);
}

function computeSignalAge(point, now) {
  let ts = point.signal_timestamp || point.timestamp;
  if (!ts) return 0;
  if (typeof ts === "string") ts = /^\d+$/.test(ts) ? parseInt(ts, 10) : new Date(ts).getTime();
  return (typeof ts === "number" && !isNaN(ts)) ? Math.max(0, Math.round((now - ts) / 1000)) : 0;
}

function logNoTrade(i, signalLabel, tq, threshold, reasons, point) {
  if (VERBOSE) console.log(`[NO-TRADE][${i}] label:${signalLabel} tq:${tq.toFixed(2)}/${threshold} reasons:${reasons.join('; ')} close:${point.close}`);
}

function getSignalScore(label) {
  if (label === 'strong_bull' || label === 'strong_bear') return 95;
  if (label === 'bull' || label === 'bear') return 80;
  return 60;
}

function clampPnlPct(pnl, entry) {
  return entry ? Math.max(-100, Math.min(100, (pnl / entry) * 100)) : 0;
}

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
    ` Signals: strong_bull:${s.signalCount.strong_bull} strong_bear:${s.signalCount.strong_bear} bull:${s.signalCount.bull} bear:${s.signalCount.bear} other:${s.signalCount.other}` +
    `\nNoTradeReasons: ${JSON.stringify(s.noTradeReasons)}\x1b[0m`
  );
}

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
          realizedQuality: t.realizedQuality,
          holdTime: t.holdTime,
          win_rate: t.mlStats?.win_rate || "",
          volatility: t.mlStats?.volatility || "",
          ensemble_confidence: t.mlStats?.ensemble_confidence || "",
          signal_age: t.mlStats?.signalAge || "",
          regime_align: t.mlStats?.regimeAlign || "",
          challenge_model: t.mlStats?.challenge_model || "",
          ensemble_model: t.mlStats?.ensemble_model || ""
        });
      }
    }
  }
  if (!allTrades.length) return;
  const header = Object.keys(allTrades[0]).join(',');
  const rows = allTrades.map(x => Object.values(x).join(',')).join('\n');
  fs.writeFileSync(CSV_PATH, header + '\n' + rows);
}

function backtest(data, params, label = '', regimeAlignFn = null) {
  let position = null, trades = [], pnl = 0, wins = 0, losses = 0, tradeQualities = [],
    maxDrawdown = 0, equityCurve = [], equity = 0, signalCount = { strong_bull: 0, strong_bear: 0, bull: 0, bear: 0, other: 0 }, holdTimes = [],
    noTradeReasons = {};
  const now = Date.now();

  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    const signalLabel = getMappedSignalLabel(point);
    const volatility = +point.volatility || 10;
    const close = +point.close;
    const win_rate = typeof point.win_rate === 'number' ? point.win_rate : 0.5;

    if (signalLabel in signalCount) signalCount[signalLabel]++;
    else signalCount.other++;

    const ensembleConfidence = typeof point.ensemble_confidence === 'number'
      ? point.ensemble_confidence
      : computeEnsembleConfidence(point);
    const signalAge = computeSignalAge(point, now);
    const regimeAlign = typeof point.regime_align === 'number'
      ? point.regime_align
      : regimeAlignFn
        ? regimeAlignFn(point, i, data)
        : 50;

    const tradeQuality = scoreTrade({
      signalStrength: getSignalScore(signalLabel),
      modelWinRate: win_rate,
      riskReward: params.profit_pct / params.loss_pct,
      executionQuality: 95,
      volatility,
      tradeOutcome: null,
      ensembleConfidence,
      signalAge,
      regimeAlign
    });

    let entryReasons = [];
    if (position) entryReasons.push('already_in_position');
    if (!(signalLabel === 'strong_bull' || signalLabel === 'strong_bear')) entryReasons.push('not_strong_signal');
    if (tradeQuality.totalScore < params.trade_quality) entryReasons.push('low_trade_quality');
    if (!position && entryReasons.length > 0) {
      logNoTrade(i, signalLabel, tradeQuality.totalScore, params.trade_quality, entryReasons, point);
      entryReasons.forEach(r => noTradeReasons[r] = (noTradeReasons[r] || 0) + 1);
    }

    if (!position && tradeQuality.totalScore >= params.trade_quality &&
        (signalLabel === 'strong_bull' || signalLabel === 'strong_bear')) {
      position = {
        type: signalLabel === 'strong_bull' ? 'long' : 'short',
        entry: close,
        entryIdx: i,
        quality: tradeQuality.totalScore,
        qualityBreakdown: tradeQuality.breakdown,
        mlStats: {
          win_rate,
          volatility,
          challenge_model: point.challenge_model,
          ensemble_model: point.ensemble_model,
          ensemble_confidence: ensembleConfidence,
          signalAge,
          regimeAlign
        }
      };
      tradeQualities.push(tradeQuality.totalScore);
      if (VERBOSE) console.log(`[TRADE-ENTRY][${label}][${i}] Entered ${position.type} tq:${tradeQuality.totalScore.toFixed(2)} close:${close}`);
    }

    if (position) {
      const holdTime = i - position.entryIdx;
      let exit = false, reason = '';
      if (position.type === 'long') {
        if (close >= position.entry * (1 + params.profit_pct)) { exit = true; reason = 'TP'; }
        else if (close <= position.entry * (1 - params.loss_pct)) { exit = true; reason = 'SL'; }
        else if (holdTime >= params.min_hold) { exit = true; reason = 'Timeout'; }
      } else {
        if (close <= position.entry * (1 - params.profit_pct)) { exit = true; reason = 'TP'; }
        else if (close >= position.entry * (1 + params.loss_pct)) { exit = true; reason = 'SL'; }
        else if (holdTime >= params.min_hold) { exit = true; reason = 'Timeout'; }
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

        const outcomeScore = scoreTrade({
          signalStrength: getSignalScore(signalLabel),
          modelWinRate: win_rate,
          riskReward: params.profit_pct / params.loss_pct,
          executionQuality: 95,
          volatility,
          tradeOutcome: clampPnlPct(tradePNL, position.entry),
          ensembleConfidence,
          signalAge,
          regimeAlign
        });

        trades.push({
          ...position,
          exit: close,
          exitIdx: i,
          pnl: tradePNL,
          reason,
          signalLabel,
          tradeQuality: position.quality,
          qualityBreakdown: position.qualityBreakdown,
          realizedQuality: outcomeScore.totalScore,
          realizedBreakdown: outcomeScore.breakdown,
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
  const avgPNL = trades.length ? trades.reduce((a, b) => a + b.pnl, 0) / trades.length : 0;
  const avgHoldTime = holdTimes.length ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length : 0;

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
      signalCount,
      noTradeReasons
    }
  };
}

async function runBacktestLoop() {
  let lastResultsHash = '';
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
          const results = (paramSetsByTf[tf] || []).map(params => backtest(arr, params, `aggregate:${tf}`));
          allResults.push({ source: `aggregate:${tf}`, variant: 'AGGREGATE', results });
          console.log(`=== [aggregate:${tf}: AGGREGATE] ===`);
          results.forEach((r, idx) => printSummary(r, idx));
        }
      }

      for (const tf of TIMEFRAMES) {
        if (!files[tf]) continue;
        if (files[tf].prediction) {
          let data;
          try { data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[tf].prediction), 'utf8')); }
          catch { console.error(`[ERROR] Could not parse: ${files[tf].prediction}`); data = []; }
          if (Array.isArray(data) && data.length > 0) {
            const results = (paramSetsByTf[tf] || []).map(params => backtest(data, params, files[tf].prediction));
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
            const results = (paramSetsByTf[tf] || []).map(params => backtest(data, params, files[tf].raw));
            allResults.push({ source: files[tf].raw, variant: 'RAW', results });
            console.log(`=== [${files[tf].raw}: RAW] ===`);
            results.forEach((r, idx) => printSummary(r, idx));
          }
        }
      }

      // Only write if results changed (simple hash)
      const resultsString = JSON.stringify(allResults);
      const resultsHash = require('crypto').createHash('md5').update(resultsString).digest('hex');
      if (resultsHash !== lastResultsHash) {
        fs.writeFileSync(OUTPUT_PATH, resultsString);
        exportTradesCSV(allResults);
        lastResultsHash = resultsHash;
        console.log('Full backtest complete. Results saved to', OUTPUT_PATH, 'and', CSV_PATH);
      }

    } catch (err) {
      console.error('[ERROR][BACKTEST] Exception in main loop:', err);
    }

    console.log(`[INFO][BACKTEST] Sleeping for ${BACKTEST_INTERVAL_MS / 1000}s...`);
    await new Promise(res => setTimeout(res, BACKTEST_INTERVAL_MS));
  }
}

module.exports = { backtest, paramSetsByTf };

if (require.main === module) {
  runBacktestLoop();
}
