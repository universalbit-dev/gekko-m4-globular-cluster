#!/usr/bin/env node
/**
 * Optimized Enhanced Backtesting: Fast, robust, and clear.
 * Enhanced version with defensive cleaning of incoming prediction records.
 *
 * Improvements in this patch:
 * - sanitizePoint(point): normalizes malformed keys (e.g. "<== prediction_tf"),
 *   normalizes 'N/A', 'n/a', 'none', 'NA' strings to null, trims strings, collects
 *   any prediction* fields into canonical fields (prediction_convnet, prediction_tf).
 * - normalizeLabel updated to treat 'n/a' / 'none' as null.
 * - deriveEnsembleFromPredictions now examines multiple candidate prediction fields
 *   (including any prediction keys discovered by sanitizePoint).
 * - Bad/dirty points optionally dumped to tools/backtest/bad_examples for inspection.
 * - Minimal logging when sanitization changes a point (BACKTEST_VERBOSE=1).
 *
 * Usage:
 *   BACKTEST_ONCE=1 BACKTEST_VERBOSE=1 node tools/backtest/backtotesting.js
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

const FEE_PCT = parseFloat(process.env.BACKTEST_FEE_PCT || "0.0001");
const SLIPPAGE_PCT = parseFloat(process.env.BACKTEST_SLIPPAGE_PCT || "0.00005");
const VERBOSE = process.env.BACKTEST_VERBOSE === "1";
const TIMEFRAMES = (process.env.TIMEFRAMES || '1m,5m,15m,1h').split(',').map(s=>s.trim()).filter(Boolean);
const BACKTEST_INTERVAL_MS = parseInt(process.env.BACKTEST_INTERVAL_MS || "10000", 10);
const BACKTEST_ONCE = !!(process.env.BACKTEST_ONCE === "1" || process.env.BACKTEST_ONCE === "true");
const MAX_LOOKBACK = parseInt(process.env.BACKTEST_MAX_LOOKBACK || '0', 10); // 0 means full
const SAVE_GZIP = !!(process.env.SAVE_GZIP === "1" || process.env.SAVE_GZIP === "true");

const paramSets = [
  { profit_pct: 0.005, loss_pct: 0.002, trade_quality: 50, min_hold: 8, name: "Conservative+" },
  { profit_pct: 0.008, loss_pct: 0.003, trade_quality: 50, min_hold: 7, name: "Aggressive+" },
  { profit_pct: 0.007, loss_pct: 0.0025, trade_quality: 50, min_hold: 10, name: "Balanced+" }
];

function log(...args) { if (VERBOSE) console.log(...args); }

function safeReadJSON(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    if (!text || text.trim().length === 0) return null;
    return JSON.parse(text);
  } catch (e) {
    console.error(`[ERROR] Failed to parse JSON ${file}:`, e && e.message ? e.message : e);
    return null;
  }
}

function discoverExchangeDataFiles() {
  if (!fs.existsSync(DATA_DIR)) return {};
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => typeof f === 'string' && f.startsWith('ohlcv_ccxt_data') && f.endsWith('.json'));
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

// Helper: canonicalize common "missing" marker strings to null
function normalizeMissingScalar(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === '' || s === 'n/a' || s === 'na' || s === 'none' || s === 'null' || s === 'nil' || s === 'n\a' || s === 'n\\a') return null;
    return v.trim();
  }
  return v;
}

// sanitizePoint: normalize malformed keys and prediction fields
function sanitizePoint(rawPoint, index = 0) {
  if (!rawPoint || typeof rawPoint !== 'object') return rawPoint;
  const p = Object.assign({}, rawPoint); // shallow copy to avoid mutating original
  let changed = false;

  // 1) normalize keys that accidentally include prefixes like "<== prediction_tf": "bear"
  // Map any key that contains 'prediction' (case-insensitive) to normalized name.
  for (const key of Object.keys(rawPoint)) {
    if (/prediction/i.test(key) && key !== 'prediction' && key !== 'prediction_tf' && key !== 'prediction_convnet' && key !== 'prediction_tf_raw' && key !== 'prediction_convnet_raw') {
      // extract suffix if exists (e.g. 'prediction_tf', 'prediction_convnet') otherwise map to 'prediction'
      const m = key.match(/prediction[_\-\s]?([a-z0-9_]+)/i);
      let target = 'prediction';
      if (m && m[1]) {
        target = `prediction_${m[1].toLowerCase()}`;
      } else if (/convnet/i.test(key)) {
        target = 'prediction_convnet';
      } else if (/tf/i.test(key)) {
        target = 'prediction_tf';
      } else {
        // fallback: use plain prediction or preserve original key as last resort
        target = 'prediction';
      }
      // Only set if not already present (preserve explicit)
      if (p[target] === undefined) {
        p[target] = rawPoint[key];
        changed = true;
        if (VERBOSE) log(`[SANITIZE] mapped malformed key "${key}" -> "${target}" (idx=${index})`);
      }
    }
  }

  // 2) Trim and normalize common scalar fields
  // Normalize prediction_convnet/prediction_tf/prediction fields if present
  const candidatePreds = [];
  if (p.prediction_convnet !== undefined) candidatePreds.push({k:'prediction_convnet', v:p.prediction_convnet});
  if (p.prediction_convnet_raw !== undefined) candidatePreds.push({k:'prediction_convnet_raw', v:p.prediction_convnet_raw});
  if (p.prediction_tf !== undefined) candidatePreds.push({k:'prediction_tf', v:p.prediction_tf});
  if (p.prediction_tf_raw !== undefined) candidatePreds.push({k:'prediction_tf_raw', v:p.prediction_tf_raw});
  if (p.prediction !== undefined) candidatePreds.push({k:'prediction', v:p.prediction});
  // also include any other keys that contain "prediction"
  for (const key of Object.keys(p)) {
    if (/prediction/i.test(key) && !candidatePreds.some(x => x.k === key)) {
      candidatePreds.push({k:key, v:p[key]});
    }
  }

  // Normalize candidate predictions: trim strings, convert 'N/A' -> null
  for (const c of candidatePreds) {
    const val = normalizeMissingScalar(c.v);
    if (val === null) {
      // set canonical field if exists
      if (c.k.startsWith('prediction')) {
        p[c.k] = null;
        changed = true;
      }
    } else if (typeof val === 'string') {
      p[c.k] = val; // keep trimmed string
    } else {
      p[c.k] = val; // numeric etc
    }
  }

  // If prediction_convnet is a placeholder like "N/A" or "n/a", ensure it's null
  if (p.prediction_convnet && typeof p.prediction_convnet === 'string') {
    const t = p.prediction_convnet.trim();
    if (t.toLowerCase() === 'n/a' || t.toLowerCase() === 'n\\a' || t.toLowerCase() === 'na') {
      p.prediction_convnet = null;
      changed = true;
    }
  }

  // If prediction_tf exists but is something like '<== prediction_tf":"bear' (malformed),
  // attempt to coerce by looking at any string that contains a subfield.
  // This is defensive and will attempt to extract the last token after colon or quote.
  ['prediction_tf', 'prediction_convnet', 'prediction'].forEach(k => {
    if (p[k] && typeof p[k] === 'string') {
      const s = p[k].trim();
      // if it contains non-alphanumeric noise, try to extract the last word token
      if (/[:<>=]/.test(s) && !/^[a-z0-9_\-+]+$/i.test(s)) {
        const m = s.match(/([a-z0-9_+\-]+)['"]?$/i);
        if (m && m[1]) {
          p[k] = m[1];
          changed = true;
          if (VERBOSE) log(`[SANITIZE] cleaned noisy ${k} -> ${p[k]} (orig="${s}")`);
        }
      }
    }
  });

  // 3) Normalize ensemble_confidence if string numeric
  if (p.ensemble_confidence !== undefined && typeof p.ensemble_confidence === 'string') {
    const num = Number(p.ensemble_confidence);
    if (!isNaN(num)) { p.ensemble_confidence = num; changed = true; }
  }

  // 4) Coerce timestamp if string numeric
  if ((p.signal_timestamp === undefined || p.signal_timestamp === null) && p.timestamp) {
    p.signal_timestamp = p.signal_timestamp || p.timestamp;
  }
  if (p.signal_timestamp && typeof p.signal_timestamp === 'string' && /^\d+$/.test(p.signal_timestamp.trim())) {
    p.signal_timestamp = parseInt(p.signal_timestamp.trim(), 10);
    changed = true;
  }

  // If we made changes and the point looks suspicious, save a sample for later inspection (avoid flooding)
  if (changed) {
    try {
      const fname = path.join(BAD_DIR, `sanitized_${Date.now()}_${index}.json`);
      fs.writeFileSync(fname, JSON.stringify({ original: rawPoint, sanitized: p }, null, 2));
      if (VERBOSE) log(`[SANITIZE] dumped sanitized sample to ${fname}`);
    } catch (e) {
      // ignore dump failures
    }
  }

  return p;
}

function normalizeLabel(raw) {
  // treat common "missing" strings as null
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (s === '' || s === 'n/a' || s === 'na' || s === 'none' || s === 'null') return null;
  }
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
    if (raw.challenge_label !== undefined) return normalizeLabel(raw.challenge_label);
    return null;
  }
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (/^-?\d+$/.test(s)) return normalizeLabel(Number(s));
    if (s === 'strong_bull' || s === 'strong-bull' || s === 'strongbull' || s === '1' || s === '+1') return 'strong_bull';
    if (s === 'strong_bear' || s === 'strong-bear' || s === 'strongbear' || s === '-1' || s === '2') return 'strong_bear';
    if (s === 'bull' || s === 'up' || s === 'buy') return 'bull';
    if (s === 'bear' || s === 'down' || s === 'sell') return 'bear';
    if (s === 'flat' || s === 'neutral' || s === 'other' || s === '0' || s === 'none') return 'other';
    return 'other';
  }
  if (typeof raw === 'number') {
    if (raw === 1) return 'strong_bull';
    if (raw === 2) return 'strong_bear';
    if (raw === 0) return 'other';
    if (raw < 0) return 'strong_bear';
    return 'other';
  }
  return null;
}

function deriveEnsembleFromPredictions(point) {
  // gather candidate prediction fields (prefer canonical names, but also any 'prediction*' keys)
  const candidates = [];
  ['prediction_convnet', 'prediction_convnet_raw', 'prediction_tf', 'prediction_tf_raw', 'prediction'].forEach(k => {
    if (point[k] !== undefined) candidates.push(point[k]);
  });
  // also include any other keys containing 'prediction'
  for (const k of Object.keys(point)) {
    if (/prediction/i.test(k) && !['prediction_convnet','prediction_convnet_raw','prediction_tf','prediction_tf_raw','prediction'].includes(k)) {
      candidates.push(point[k]);
    }
  }
  // normalize all candidate values to labels
  const labels = candidates.map(c => normalizeLabel(c)).filter(Boolean);
  if (!labels.length) return null;
  // if majority agrees, return that
  const counts = labels.reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc; }, {});
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  if (top && top[1] > 1) return top[0]; // clear majority
  // if one strong and another mild, pick strong
  const isStrong = l => typeof l === 'string' && l.startsWith('strong_');
  for (const l of labels) if (isStrong(l)) return l;
  // fallback to first
  return labels[0] || null;
}

function computeEnsembleConfidence(point) {
  if (typeof point.ensemble_confidence === 'number') return point.ensemble_confidence;
  const labels = [];
  ['prediction_convnet', 'prediction_convnet_raw', 'prediction_tf', 'prediction_tf_raw', 'prediction'].forEach(k => {
    if (point[k] !== undefined) labels.push(normalizeLabel(point[k]));
  });
  // include any prediction* keys
  for (const k of Object.keys(point)) if (/prediction/i.test(k)) labels.push(normalizeLabel(point[k]));
  const clean = labels.filter(Boolean);
  if (!clean.length) return 50;
  const uniq = new Set(clean);
  if (uniq.size === 1) return 100;
  const isStrong = l => typeof l === 'string' && l.startsWith('strong_');
  if (clean.some(isStrong)) return 75;
  return 50;
}

function computeSignalAge(point, now) {
  let ts = point.signal_timestamp || point.timestamp;
  if (!ts) return 0;
  if (typeof ts === "string") ts = /^\d+$/.test(ts) ? parseInt(ts, 10) : new Date(ts).getTime();
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

function clampPnlPct(pnl, entry) {
  return entry ? Math.max(-100, Math.min(100, (pnl / entry) * 100)) : 0;
}

// Insert this function into tools/backtest/backtotesting.js (place it above `function backtest(...)`)
function getMappedSignalLabel(point = {}) {
  // 1) explicit ensemble_label has highest precedence
  if (point && point.ensemble_label !== undefined && point.ensemble_label !== null) {
    const v = normalizeLabel(point.ensemble_label);
    if (v) return v;
  }

  // 2) try deriving from multiple model prediction fields
  try {
    const derived = deriveEnsembleFromPredictions(point);
    if (derived) return derived;
  } catch (e) {
    // defensive: if deriveEnsembleFromPredictions throws, log and continue to other fallbacks
    if (VERBOSE) console.warn('[BACKTEST] deriveEnsembleFromPredictions threw:', e && e.message ? e.message : e);
  }

  // 3) challenge_label fallback
  if (point && point.challenge_label !== undefined && point.challenge_label !== null) {
    const v = normalizeLabel(point.challenge_label);
    if (v) return v;
  }

  // 4) legacy label
  if (point && point.label !== undefined && point.label !== null) {
    const v = normalizeLabel(point.label);
    if (v) return v;
  }

  // 5) boolean flags
  if (point && point.is_bull === true) return 'strong_bull';
  if (point && point.is_bear === true) return 'strong_bear';

  // default
  return 'other';
}

/* MAIN BACKTEST ENGINE - uses sanitizePoint before processing */
function backtest(data, params, label = '', regimeAlignFn = null) {
  let position = null;
  let trades = [];
  let pnl = 0, wins = 0, losses = 0;
  let tradeQualities = [], maxDrawdown = 0, equityCurve = [], equity = 0;
  let signalCount = { strong_bull: 0, strong_bear: 0, bull: 0, bear: 0, other: 0 };
  let holdTimes = [], noTradeReasons = {};
  const now = Date.now();

  // apply lookback trimming if requested
  if (MAX_LOOKBACK > 0 && data.length > MAX_LOOKBACK) {
    data = data.slice(Math.max(0, data.length - MAX_LOOKBACK));
  }

  for (let i = 0; i < data.length; i++) {
    let rawPoint = data[i];
    // sanitize/normalize incoming record (fix malformed keys/values)
    const point = sanitizePoint(rawPoint, i);

    try {
      const signalLabel = getMappedSignalLabel(point) || 'other';
      const volatility = Number(point.volatility) || 10;
      const close = Number(point.close) || 0;
      const win_rate = (typeof point.win_rate === 'number') ? point.win_rate : 0.5;

      signalCount[signalLabel] = (signalCount[signalLabel] || 0) + 1;

      const ensembleConfidence = computeEnsembleConfidence(point);
      const signalAge = computeSignalAge(point, now);
      const regimeAlign = typeof point.regime_align === 'number'
        ? point.regime_align
        : (regimeAlignFn ? regimeAlignFn(point, i, data) : 50);

      const tradeQuality = (() => {
        try {
          return scoreTrade({
            signalStrength: getSignalScore(signalLabel),
            modelWinRate: win_rate,
            riskReward: params.profit_pct / Math.max(1e-9, params.loss_pct),
            executionQuality: 95,
            volatility,
            tradeOutcome: null,
            ensembleConfidence,
            signalAge,
            regimeAlign
          });
        } catch (e) {
          console.warn('[WARN] scoreTrade threw error, defaulting quality 0', e && e.message ? e.message : e);
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
        log(`[ENTRY][${label}][${i}] ${position.type} @${close} tq:${tradeQuality.totalScore.toFixed(1)}`);
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
                modelWinRate: win_rate,
                riskReward: params.profit_pct / Math.max(1e-9, params.loss_pct),
                executionQuality: 95,
                volatility,
                tradeOutcome: clampPnlPct(tradePNL, position.entry),
                ensembleConfidence,
                signalAge,
                regimeAlign
              });
            } catch (e) {
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
      // dump the raw point for inspection, limited rate
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
  // stream to avoid big memory spikes
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

  if (files.multi && files.multi.aggregate) {
    const aggFile = path.join(DATA_DIR, files.multi.aggregate);
    const data = safeReadJSON(aggFile) || {};
    const tfs = extractTimeframesFromAggregate(data);
    for (const tf of TIMEFRAMES) {
      const arr = tfs[tf];
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const results = paramSets.map(params => backtest(arr, params, `aggregate:${tf}`));
      allResults.push({ source: `aggregate:${tf}`, variant: 'AGGREGATE', results });
      console.log(`=== [aggregate:${tf}: AGGREGATE] ===`);
      results.forEach((r, idx) => printSummaryAndPick(r, idx));
    }
  }

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
module.exports = { backtest, paramSets, runOnce, runBacktestLoop };

if (require.main === module) {
  runBacktestLoop().catch(err => {
    console.error('[FATAL] Backtest runner crashed:', err && err.stack ? err.stack : err);
    process.exit(1);
  });
}
