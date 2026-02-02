#!/usr/bin/env node
/**
 * tools/backtest/backtotesting.js
 *
 * Optimized for the exact files present in tools/logs/json/ohlcv:
 *  - ohlcv_ccxt_data_1m.json
 *  - ohlcv_ccxt_data_1m_prediction.json
 *  - ohlcv_ccxt_data_5m.json
 *  - ohlcv_ccxt_data_5m_prediction.json
 *  - ohlcv_ccxt_data_15m.json
 *  - ohlcv_ccxt_data_15m_prediction.json
 *  - ohlcv_ccxt_data_1h.json
 *  - ohlcv_ccxt_data_1h_prediction.json
 *
 * This version purposely narrows discovery and handling to only those timeframes
 * and plain .json files to reduce overhead and avoid unexpected filenames.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { scoreTrade } = require('../tradeQualityScore');

const DATA_DIR = path.resolve(__dirname, '../logs/json/ohlcv');
const OUTPUT_PATH = path.resolve(__dirname, 'backtest_results.json');
const CSV_PATH = path.resolve(__dirname, 'backtest_trades.csv');
const BAD_DIR = path.resolve(__dirname, 'bad_examples'); // dumped dirty points
if (!fs.existsSync(BAD_DIR)) fs.mkdirSync(BAD_DIR, { recursive: true });

const TRAINED_DIR = path.resolve(__dirname, '../trained'); // load model metadata from here

const FEE_PCT = parseFloat(process.env.BACKTEST_FEE_PCT || "0.0001");
const SLIPPAGE_PCT = parseFloat(process.env.BACKTEST_SLIPPAGE_PCT || "0.00005");
const VERBOSE = process.env.BACKTEST_VERBOSE === "1" || /--verbose/.test(process.argv.join(' '));
// Fixed TIMEFRAMES for this repository's inputs (ignore TIMEFRAMES env)
const TIMEFRAMES = ['1m', '5m', '15m', '1h'];
const BACKTEST_INTERVAL_MS = parseInt(process.env.BACKTEST_INTERVAL_MS || "10000", 10);
const BACKTEST_ONCE = !!(process.env.BACKTEST_ONCE === "1" || process.env.BACKTEST_ONCE === "true");
const MAX_LOOKBACK = parseInt(process.env.BACKTEST_MAX_LOOKBACK || '0', 10); // 0 means full
const SAVE_GZIP = !!(process.env.SAVE_GZIP === "1" || process.env.SAVE_GZIP === "true");

// diagnostics limit: don't create endless sanitized dumps
const MAX_SANITIZE_DUMPS = parseInt(process.env.MAX_SANITIZE_DUMPS || '5', 10);
let _sanitizeDumpCounter = 0;

const paramSets = [
  { profit_pct: 0.005, loss_pct: 0.002, trade_quality: 50, min_hold: 8, name: "Conservative+" },
  { profit_pct: 0.008, loss_pct: 0.003, trade_quality: 50, min_hold: 7, name: "Aggressive+" },
  { profit_pct: 0.007, loss_pct: 0.0025, trade_quality: 50, min_hold: 10, name: "Balanced+" }
];

function log(...args) { if (VERBOSE) console.log('[BACKTEST]', ...args); }

/*
 * Robust JSON reader with lightweight repair attempts.
 */
function safeReadJSON(fp) {
  try {
    if (!fs.existsSync(fp)) return null;
    const raw = fs.readFileSync(fp, 'utf8');
    if (!raw || !raw.trim()) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      // attempt simple repairs
      let text = raw;
      text = text.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ''); // remove control chars except \n,\r,\t
      text = text.replace(/\\\r?\n/g, ' ');
      text = text.replace(/,\s*(}|])/g, '$1');
      try {
        return JSON.parse(text);
      } catch (e2) {
        const m = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/m);
        if (m && m[1]) {
          try {
            return JSON.parse(m[1]);
          } catch (e3) {
            console.error('[ERROR] safeReadJSON: fallback extraction failed for', fp, e3 && e3.message ? e3.message : e3);
            return null;
          }
        }
        console.error('[ERROR] safeReadJSON parse failed for', fp, 'original error:', e && e.message ? e.message : e);
        return null;
      }
    }
  } catch (err) {
    console.error('[ERROR] safeReadJSON failed for', fp, err && err.message ? err.message : err);
    return null;
  }
}

// Load trained model metadata (normalize aliases to lower-case for robust matching)
let trainedModels = []; // { name, weight (0-100), aliases: [], meta: {} }
function loadTrainedModels() {
  trainedModels = [];
  if (!fs.existsSync(TRAINED_DIR)) return;
  try {
    const list = fs.readdirSync(TRAINED_DIR).filter(f => f.endsWith('.json'));
    for (const fname of list) {
      const fp = path.join(TRAINED_DIR, fname);
      const meta = safeReadJSON(fp);
      if (!meta) {
        if (VERBOSE) log(`Skipping unreadable trained metadata: ${fname}`);
        continue;
      }
      const base = path.basename(fname, '.json');
      // infer weight (0-100)
      let weight = 50;
      const maybeWin = (typeof meta.win_rate === 'number') ? meta.win_rate
        : (meta.validation && typeof meta.validation.winRate === 'number' ? meta.validation.winRate
          : (typeof meta.validation_win_rate === 'number' ? meta.validation_win_rate : null));
      if (typeof maybeWin === 'number') {
        const w = maybeWin <= 1 ? Math.round(maybeWin * 100) : Math.round(maybeWin);
        weight = Math.max(1, Math.min(100, w));
      }
      const aliases = new Set([base.toLowerCase()]);
      if (typeof meta.model_name === 'string') aliases.add(meta.model_name.toLowerCase());
      if (Array.isArray(meta.aliases)) meta.aliases.forEach(a => { if (a) aliases.add(String(a).toLowerCase()); });
      trainedModels.push({ name: base, weight, aliases: Array.from(aliases), meta });
    }
  } catch (e) {
    if (VERBOSE) console.warn('[BACKTEST] loadTrainedModels failed:', e && e.message ? e.message : e);
  }
}
loadTrainedModels();

if (process.argv.includes('--trained-dryrun')) {
  console.log('Loaded trained models:');
  for (const m of trainedModels) console.log(` - ${m.name}: weight=${m.weight} aliases=${m.aliases.join(',')}`);
  // continue running after listing
}

// discover OHLCV files (predictions & raw)
// Optimized for the exact, plain .json filenames present in this repo's DATA_DIR.
function discoverExchangeDataFiles() {
  if (!fs.existsSync(DATA_DIR)) return {};
  const files = fs.readdirSync(DATA_DIR).filter(f => typeof f === 'string');
  const fileSet = new Set(files);

  const found = {};
  for (const tf of TIMEFRAMES) {
    const pred = `ohlcv_ccxt_data_${tf}_prediction.json`;
    const raw = `ohlcv_ccxt_data_${tf}.json`;
    const hasPred = fileSet.has(pred);
    const hasRaw = fileSet.has(raw);
    if (hasPred || hasRaw) {
      found[tf] = {};
      if (hasPred) found[tf].prediction = pred;
      if (hasRaw) found[tf].raw = raw;
    }
  }

  // Keep supporting the aggregate file if present (not expected, but harmless)
  const agg = 'ohlcv_ccxt_data.json';
  if (fileSet.has(agg)) found.multi = { aggregate: agg };

  return found;
}

function extractTimeframesFromAggregate(data) {
  if (!data || typeof data !== 'object') return {};
  return Object.fromEntries(
    TIMEFRAMES.map(tf => [tf, Array.isArray(data[tf]) ? data[tf] : []])
  );
}

// sanitize helpers
function normalizeMissingScalar(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === '' || s === 'n/a' || s === 'na' || s === 'none' || s === 'null' || s === 'nil') return null;
    return v.trim();
  }
  return v;
}

function sanitizePoint(rawPoint, index = 0) {
  if (!rawPoint || typeof rawPoint !== 'object') return rawPoint;
  const p = Object.assign({}, rawPoint);
  let changed = false;

  // map weird prediction keys to canonical ones
  for (const key of Object.keys(rawPoint)) {
    if (/prediction/i.test(key) && !['prediction','prediction_tf','prediction_convnet','prediction_tf_raw','prediction_convnet_raw'].includes(key)) {
      const low = key.toLowerCase();
      let target = 'prediction';
      if (/convnet/i.test(low)) target = 'prediction_convnet';
      else if (/\btf\b/i.test(low) || /tensorflow/i.test(low)) target = 'prediction_tf';
      if (p[target] === undefined) {
        p[target] = rawPoint[key];
        changed = true;
        if (VERBOSE) log(`sanitizePoint: mapped "${key}" -> "${target}"`);
      }
    }
  }

  // normalize prediction-like fields
  const predKeys = Object.keys(p).filter(k => /prediction/i.test(k));
  for (const k of predKeys) {
    p[k] = normalizeMissingScalar(p[k]);
  }

  // normalize ensemble_confidence if string
  if (p.ensemble_confidence !== undefined && typeof p.ensemble_confidence === 'string') {
    const n = Number(p.ensemble_confidence);
    if (!isNaN(n)) { p.ensemble_confidence = n; changed = true; }
  }

  // coerce timestamps
  if ((p.signal_timestamp === undefined || p.signal_timestamp === null) && p.timestamp) p.signal_timestamp = p.timestamp;
  if (p.signal_timestamp && typeof p.signal_timestamp === 'string' && /^\d+$/.test(p.signal_timestamp.trim())) {
    p.signal_timestamp = parseInt(p.signal_timestamp.trim(), 10);
    changed = true;
  }

  // clean noisy labels like '<== prediction_tf":"bear' by extracting last token
  ['prediction_tf','prediction_convnet','prediction'].forEach(k => {
    if (p[k] && typeof p[k] === 'string') {
      const s = p[k].trim();
      if (/[:<>=]/.test(s) && !/^[a-z0-9_\-+]+$/i.test(s)) {
        const m = s.match(/([a-z0-9_+\-]+)['"]?$/i);
        if (m && m[1]) {
          p[k] = m[1];
          changed = true;
          if (VERBOSE) log(`sanitizePoint: cleaned ${k} -> ${p[k]} (orig="${s}")`);
        }
      }
    }
  });

  if (changed && _sanitizeDumpCounter < MAX_SANITIZE_DUMPS) {
    // sample dump for inspection (avoid flooding)
    try {
      const fname = path.join(BAD_DIR, `sanitized_${Date.now()}_${index}.json`);
      fs.writeFileSync(fname, JSON.stringify({ original: rawPoint, sanitized: p }, null, 2));
      _sanitizeDumpCounter++;
      if (VERBOSE) log(`sanitizePoint: dumped sample to ${fname}`);
    } catch (e) { /* ignore */ }
  }

  return p;
}

// label normalization (handles arrays, numbers, strings)
function normalizeLabel(raw) {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw)) {
    const mapped = raw.map(r => normalizeLabel(r)).filter(Boolean);
    if (!mapped.length) return null;
    const counts = mapped.reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc; }, {});
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
  }
  if (typeof raw === 'object') {
    if (raw.label !== undefined) return normalizeLabel(raw.label);
    if (raw.prediction !== undefined) return normalizeLabel(raw.prediction);
    if (raw.ensemble_label !== undefined) return normalizeLabel(raw.ensemble_label);
    return null;
  }
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (s === '' || s === 'n/a' || s === 'na' || s === 'none' || s === 'null') return null;
    if (/^(strong[_-]?bull|1|\+1)$/i.test(s)) return 'strong_bull';
    if (/^(strong[_-]?bear|-1|2)$/i.test(s)) return 'strong_bear';
    if (/^(bull|up|buy)$/i.test(s)) return 'bull';
    if (/^(bear|down|sell)$/i.test(s)) return 'bear';
    if (/^(flat|neutral|other|0)$/i.test(s)) return 'other';
    return 'other';
  }
  if (typeof raw === 'number') {
    if (raw === 1) return 'strong_bull';
    if (raw === 2) return 'strong_bear';
    if (raw === 0) return 'other';
    return raw < 0 ? 'strong_bear' : 'other';
  }
  return null;
}

/*
 * Utility: collect prediction-like values from a point once to avoid repeated scans.
 * Returns:
 *  - values: array of values (for generic voting)
 *  - keyMap: Map of lowerKey -> originalValue (for model alias matching)
 */
function collectPredictionValues(point) {
  const values = [];
  const keyMap = new Map();
  for (const k of Object.keys(point)) {
    if (/prediction/i.test(k) || /model_/i.test(k)) {
      const v = point[k];
      if (v !== undefined && v !== null) {
        values.push(v);
        keyMap.set(k.toLowerCase(), v);
      }
    } else {
      // also capture fields that match trained model aliases (they might not include 'prediction' in key)
      keyMap.set(k.toLowerCase(), point[k]);
    }
  }
  return { values, keyMap };
}

/*
 * deriveEnsembleFromPredictions:
 * - uses trainedModels (if any) to prefer predictions produced by known classifiers.
 * - performs weighted voting: each model contributes a vote weighted by its validation/win rate.
 * - falls back to simple majority among prediction_* fields if no trained-model votes found.
 */
function deriveEnsembleFromPredictions(point) {
  const { values, keyMap } = collectPredictionValues(point);

  if (trainedModels && trainedModels.length) {
    const votes = new Map(); // label -> weighted sum
    let totalWeight = 0;

    for (const m of trainedModels) {
      let matchedVal;
      for (const alias of m.aliases) {
        // try lower-case forms on point keys
        if (keyMap.has(alias)) { matchedVal = keyMap.get(alias); break; }
        const predKey = `prediction_${alias}`;
        if (keyMap.has(predKey)) { matchedVal = keyMap.get(predKey); break; }
        const modelKey = `model_${alias}`;
        if (keyMap.has(modelKey)) { matchedVal = keyMap.get(modelKey); break; }
      }
      if (matchedVal !== undefined) {
        const label = normalizeLabel(matchedVal);
        if (!label) continue;
        const cur = votes.get(label) || 0;
        votes.set(label, cur + (m.weight || 50));
        totalWeight += (m.weight || 50);
        if (VERBOSE) log(`deriveEnsemble: model vote ${m.name} -> ${label} (w=${m.weight})`);
      }
    }

    // also include any generic prediction fields (non-model) as low-weight votes
    for (const v of values) {
      const label = normalizeLabel(v);
      if (!label) continue;
      const cur = votes.get(label) || 0;
      votes.set(label, cur + 25);
      totalWeight += 25;
    }

    if (votes.size > 0 && totalWeight > 0) {
      // find top label
      let topLabel = null, topWeight = -1;
      for (const [lbl, w] of votes.entries()) {
        if (w > topWeight) { topWeight = w; topLabel = lbl; }
      }
      if (VERBOSE) {
        const obj = {};
        for (const [k,v] of votes.entries()) obj[k]=v;
        log(`deriveEnsemble: weighted votes: ${JSON.stringify(obj)} totalW=${totalWeight}`);
      }
      point.ensemble_confidence = Math.min(100, Math.round((topWeight / Math.max(1, totalWeight)) * 100));
      return topLabel;
    }
  }

  // fallback (original behavior): majority simple voting
  const labels = values.map(c => normalizeLabel(c)).filter(Boolean);
  if (!labels.length) return null;
  const counts = labels.reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc; }, {});
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  if (top && top[1] > 1) return top[0];
  for (const l of labels) if (typeof l === 'string' && l.startsWith('strong_')) return l;
  return labels[0] || null;
}

/*
 * computeEnsembleConfidence(point):
 * - respects point.ensemble_confidence if already set
 * - otherwise compute a weighted agreement score using trainedModels (if available) and generic predictions.
 */
function computeEnsembleConfidence(point) {
  if (typeof point.ensemble_confidence === 'number') return point.ensemble_confidence;

  const { values, keyMap } = collectPredictionValues(point);
  const votes = new Map();
  let totalWeight = 0;

  for (const m of trainedModels) {
    let matchedVal;
    for (const alias of m.aliases) {
      if (keyMap.has(alias)) { matchedVal = keyMap.get(alias); break; }
      const predKey = `prediction_${alias}`;
      if (keyMap.has(predKey)) { matchedVal = keyMap.get(predKey); break; }
    }
    if (matchedVal !== undefined) {
      const label = normalizeLabel(matchedVal);
      if (!label) continue;
      const cur = votes.get(label) || 0;
      votes.set(label, cur + (m.weight || 50));
      totalWeight += (m.weight || 50);
    }
  }

  for (const v of values) {
    const label = normalizeLabel(v);
    if (!label) continue;
    const cur = votes.get(label) || 0;
    votes.set(label, cur + 20);
    totalWeight += 20;
  }

  if (!totalWeight) return 50;
  // pick top
  let topLabel = null, topWeight = -1;
  for (const [lbl, w] of votes.entries()) {
    if (w > topWeight) { topWeight = w; topLabel = lbl; }
  }
  if (!topLabel) return 50;
  return Math.min(100, Math.round((topWeight / totalWeight) * 100));
}

function computeSignalAge(point, now) {
  let ts = point.signal_timestamp || point.timestamp;
  if (!ts) return 0;
  if (typeof ts === "string") ts = /^\d+$/.test(ts) ? parseInt(ts, 10) : Date.parse(ts);
  return (typeof ts === "number" && !isNaN(ts)) ? Math.max(0, Math.round((now - ts) / 1000)) : 0;
}
function logNoTrade(i, signalLabel, tq, threshold, reasons, point) {
  if (VERBOSE) console.log(`[NO-TRADE][${i}] label:${signalLabel} tq:${(tq||0).toFixed(2)}/${threshold} reasons:${reasons.join('; ')} close:${point.close}`);
}
function getSignalScore(label) {
  if (label === 'strong_bull' || label === 'strong_bear') return 95;
  if (label === 'bull' || label === 'bear') return 80;
  return 60;
}
function clampPnlPct(pnl, entry) { return entry ? Math.max(-100, Math.min(100, (pnl / entry) * 100)) : 0; }

// getMappedSignalLabel used by backtest loop
function getMappedSignalLabel(point = {}) {
  if (point && point.ensemble_label !== undefined && point.ensemble_label !== null) {
    const v = normalizeLabel(point.ensemble_label);
    if (v) return v;
  }
  try {
    const derived = deriveEnsembleFromPredictions(point);
    if (derived) return derived;
  } catch (e) { if (VERBOSE) console.warn('[BACKTEST] deriveEnsemble failed:', e && e.message ? e.message : e); }
  if (point && point.challenge_label !== undefined && point.challenge_label !== null) {
    const v = normalizeLabel(point.challenge_label);
    if (v) return v;
  }
  if (point && point.label !== undefined && point.label !== null) {
    const v = normalizeLabel(point.label);
    if (v) return v;
  }
  if (point && point.is_bull === true) return 'strong_bull';
  if (point && point.is_bear === true) return 'strong_bear';
  return 'other';
}

/* MAIN BACKTEST ENGINE */
function backtest(data, params, label = '', regimeAlignFn = null) {
  let position = null;
  let trades = [];
  let pnl = 0, wins = 0, losses = 0;
  let tradeQualities = [], maxDrawdown = 0, equityCurve = [], equity = 0;
  let signalCount = { strong_bull: 0, strong_bear: 0, bull: 0, bear: 0, other: 0 };
  let holdTimes = [], noTradeReasons = {};
  const now = Date.now();

  if (MAX_LOOKBACK > 0 && data.length > MAX_LOOKBACK) {
    data = data.slice(Math.max(0, data.length - MAX_LOOKBACK));
  }

  for (let i = 0; i < data.length; i++) {
    const rawPoint = data[i];
    const point = sanitizePoint(rawPoint, i);

    try {
      // compute a better win_rate estimate using model metadata if available
      let win_rate = (typeof point.win_rate === 'number') ? point.win_rate : (typeof point.summary?.winRate === 'number' ? point.summary.winRate : 0.5);
      // augment win_rate by averaging weights from matched trained models (if any)
      try {
        const matchedModelWeights = [];
        const lowerKeys = new Set(Object.keys(point).map(k => k.toLowerCase()));
        for (const m of trainedModels) {
          for (const alias of m.aliases) {
            if (lowerKeys.has(alias) || lowerKeys.has(`prediction_${alias}`)) {
              matchedModelWeights.push(m.weight / 100.0); // convert to 0-1
              break;
            }
          }
        }
        if (matchedModelWeights.length) {
          const avgModelWin = matchedModelWeights.reduce((a,b)=>a+b,0) / matchedModelWeights.length;
          // blend with existing win_rate by giving moderate weight to model's validation (0.6 model, 0.4 point)
          win_rate = (0.4 * win_rate) + (0.6 * avgModelWin);
        }
      } catch (_) {}

      const signalLabel = getMappedSignalLabel(point) || 'other';
      const volatility = Number(point.volatility) || 10;
      const close = Number(point.close) || 0;
      const winRateUsed = win_rate;

      signalCount[signalLabel] = (signalCount[signalLabel] || 0) + 1;

      // compute ensemble confidence using trained models
      const ensembleConfidence = computeEnsembleConfidence(point);
      point.ensemble_confidence = ensembleConfidence;

      const signalAge = computeSignalAge(point, now);
      const regimeAlign = typeof point.regime_align === 'number'
        ? point.regime_align
        : (regimeAlignFn ? regimeAlignFn(point, i, data) : 50);

      const tradeQuality = (() => {
        try {
          return scoreTrade({
            signalStrength: getSignalScore(signalLabel),
            modelWinRate: winRateUsed,
            riskReward: params.profit_pct / Math.max(1e-9, params.loss_pct),
            executionQuality: 95,
            volatility,
            tradeOutcome: null,
            ensembleConfidence,
            signalAge,
            regimeAlign
          });
        } catch (e) {
          if (VERBOSE) console.warn('[WARN] scoreTrade threw error', e && e.message ? e.message : e);
          return { totalScore: 0, breakdown: {} };
        }
      })();

      let entryReasons = [];
      if (position) entryReasons.push('already_in_position');
      if (!(signalLabel === 'strong_bull' || signalLabel === 'strong_bear')) entryReasons.push('not_strong_signal');
      if (tradeQuality == null || typeof tradeQuality.totalScore !== 'number' || tradeQuality.totalScore < params.trade_quality) entryReasons.push('low_trade_quality');
      if (!position && entryReasons.length > 0) {
        logNoTrade(i, signalLabel, tradeQuality && tradeQuality.totalScore || 0, params.trade_quality, entryReasons, point);
        entryReasons.forEach(r => noTradeReasons[r] = (noTradeReasons[r] || 0) + 1);
      }

      if (!position && tradeQuality && tradeQuality.totalScore >= params.trade_quality &&
        (signalLabel === 'strong_bull' || signalLabel === 'strong_bear')) {
        position = {
          type: signalLabel === 'strong_bull' ? 'long' : 'short',
          entry: close,
          entryIdx: i,
          quality: tradeQuality.totalScore,
          qualityBreakdown: tradeQuality.breakdown,
          mlStats: {
            win_rate: winRateUsed,
            volatility,
            challenge_model: point.challenge_model,
            ensemble_model: point.ensemble_model,
            ensemble_confidence: ensembleConfidence,
            signalAge,
            regimeAlign
          }
        };
        tradeQualities.push(tradeQuality.totalScore);
        log(`[ENTRY][${label}][${i}] ${position.type} @${close} tq:${tradeQuality.totalScore.toFixed(1)} ec:${ensembleConfidence}`);
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
          const fee = FEE_PCT * (position.entry + close);
          const slippage = SLIPPAGE_PCT * position.entry;
          let tradePNL = position.type === 'long'
            ? close - position.entry - fee - slippage
            : position.entry - close - fee - slippage;
          pnl += tradePNL;
          equity += tradePNL;
          if (tradePNL > 0) wins++; else losses++;
          holdTimes.push(holdTime);

          const outcomeScore = (() => {
            try {
              return scoreTrade({
                signalStrength: getSignalScore(signalLabel),
                modelWinRate: winRateUsed,
                riskReward: params.profit_pct / Math.max(1e-9, params.loss_pct),
                executionQuality: 95,
                volatility,
                tradeOutcome: clampPnlPct(tradePNL, position.entry),
                ensembleConfidence,
                signalAge,
                regimeAlign
              });
            } catch (e) {
              if (VERBOSE) console.warn('[WARN] outcome scoreTrade threw', e && e.message ? e.message : e);
              return { totalScore: 0, breakdown: {} };
            }
          })();

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
      const peak = Math.max(...equityCurve, 0);
      const dd = peak - equity;
      if (dd > maxDrawdown) maxDrawdown = dd;

    } catch (errPoint) {
      console.warn(`[WARN] Skipping bad data point at index ${i}:`, errPoint && errPoint.message ? errPoint.message : errPoint);
      try {
        const fname = path.join(BAD_DIR, `badpoint_${Date.now()}_${i}.json`);
        fs.writeFileSync(fname, JSON.stringify({ index: i, raw: rawPoint, error: errPoint && errPoint.message ? errPoint.message : String(errPoint) }, null, 2));
      } catch (e) {}
      continue;
    }
  } // end data loop

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

/* CSV streaming export with headers, safe quoting */
function exportTradesCSV(allResults) {
  const writeStream = fs.createWriteStream(CSV_PATH, { encoding: 'utf8' });
  const headerColumns = [
    'source','variant','strategy','entryIdx','exitIdx','entry','exit','pnl','reason',
    'tradeQuality','realizedQuality','holdTime','win_rate','volatility','ensemble_confidence',
    'signal_age','regime_align','challenge_model','ensemble_model'
  ];
  writeStream.write(headerColumns.join(',') + '\n');

  for (const frame of allResults) {
    for (const res of frame.results) {
      for (const t of res.trades) {
        const r = {
          source: frame.source,
          variant: frame.variant,
          strategy: res.params?.name || '',
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
        };
        const row = headerColumns.map(k => {
          const v = (r[k] === null || r[k] === undefined) ? '' : String(r[k]);
          if (v.includes(',') || v.includes('"') || v.includes('\n')) {
            return '"' + v.replace(/"/g, '""') + '"';
          }
          return v;
        }).join(',');
        writeStream.write(row + '\n');
      }
    }
  }
  writeStream.end();

  if (SAVE_GZIP) {
    const inp = fs.createReadStream(CSV_PATH);
    const out = fs.createWriteStream(CSV_PATH + '.gz');
    inp.pipe(zlib.createGzip()).pipe(out);
  }
}

/* Print nice summary */
function printSummaryAndPick(r, idx) {
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

/* Run a single pass: returns allResults array */
async function runOnce() {
  const allResults = [];
  const files = discoverExchangeDataFiles();

  for (const tf of TIMEFRAMES) {
    if (!files[tf]) continue;

    if (files[tf].prediction) {
      const pfile = path.join(DATA_DIR, files[tf].prediction);
      const data = safeReadJSON(pfile) || [];
      if (Array.isArray(data) && data.length > 0) {
        const results = paramSets.map(params => backtest(data, params, files[tf].prediction));
        allResults.push({ source: files[tf].prediction, variant: 'PREDICTION', results });
        console.log(`=== [${files[tf].prediction}: PREDICTION] ===`);
        results.forEach((r, idx) => printSummaryAndPick(r, idx));
      } else {
        if (VERBOSE) log(`Skipping prediction file ${pfile} — no usable array data`);
      }
    }

    if (files[tf].raw) {
      const rfile = path.join(DATA_DIR, files[tf].raw);
      const data = safeReadJSON(rfile) || [];
      if (Array.isArray(data) && data.length > 0) {
        const results = paramSets.map(params => backtest(data, params, files[tf].raw));
        allResults.push({ source: files[tf].raw, variant: 'RAW', results });
        console.log(`=== [${files[tf].raw}: RAW] ===`);
        results.forEach((r, idx) => printSummaryAndPick(r, idx));
      } else {
        if (VERBOSE) log(`Skipping raw file ${rfile} — no usable array data`);
      }
    }
  }

  try {
    const json = JSON.stringify(allResults, null, 2);
    if (SAVE_GZIP) {
      const gz = zlib.gzipSync(Buffer.from(json, 'utf8'));
      fs.writeFileSync(OUTPUT_PATH + '.gz', gz);
      console.log(`Results saved to ${OUTPUT_PATH}.gz`);
    } else {
      fs.writeFileSync(OUTPUT_PATH, json, 'utf8');
      console.log(`Results saved to ${OUTPUT_PATH}`);
    }
  } catch (e) {
    console.error('[ERROR] Failed to save backtest results:', e && e.message ? e.message : e);
  }

  try {
    exportTradesCSV(allResults);
    console.log(`CSV exported to ${CSV_PATH}${SAVE_GZIP ? ' (+gz)' : ''}`);
  } catch (e) {
    console.error('[ERROR] Failed to export trades CSV:', e && e.message ? e.message : e);
  }

  return allResults;
}

async function runBacktestLoop() {
  do {
    try {
      await runOnce();
    } catch (e) {
      console.error('[ERROR] runOnce failed:', e && e.message ? e.message : e);
    }
    if (BACKTEST_ONCE) break;
    console.log(`[INFO][BACKTEST] Sleeping for ${BACKTEST_INTERVAL_MS / 1000}s...`);
    await new Promise(res => setTimeout(res, BACKTEST_INTERVAL_MS));
  } while (true);
}

/* expose functions for unit tests / other modules */
module.exports = { backtest, paramSets, runOnce, runBacktestLoop, loadTrainedModels };

if (require.main === module) {
  runBacktestLoop().catch(err => {
    console.error('[FATAL] Backtest runner crashed:', err && err.stack ? err.stack : err);
    process.exit(1);
  });
}
