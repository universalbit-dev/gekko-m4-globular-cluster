// PVVM micro: ATR-based magnitude micro that reads recent OHLCV and computes z-score of ATR/body.
// - Exports as { micros: { atr_magnitude: fn } } so loaders that expect a micros object can consume it.
// - Safe: returns null if ATR implementation or OHLCV data is missing or insufficient.
// - Configurable via env: ATR_PERIOD (default 14), OHLCV_DIR (falls back to logs/json/ohlcv).
//
// Magnitude returned:
//   { atr, atrMean, atrStd, zScore, body, bodyToAtr }
//
// Score / confidence:
//   - score: directional (sign of body) scaled by body/price and amplified when ATR z-score is elevated.
//   - confidence: depends on bodyToAtr and magnitude of z (conservative defaults).
//
// Usage:
//   Place this file at tools/lib/pvvm-micros-atr.js. The micro loader in your micro runner will pick it up
//   when requiring tools/lib/pvvm-micros.js / tools/lib/pvvm-micros-atr.js.

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { DEBUG = false } = require('./runtime_flags');

function _log(...args) { if (DEBUG) console.debug('[PVVM-ATR]', ...args); }
function _clamp(v, a = -1, b = 1) { return Math.max(a, Math.min(b, Number(v) || 0)); }

let ATR = null;
try {
  // try to load ATR indicator from common repo locations
  const candidate = path.resolve(__dirname, '../evaluation/indicator/ATR.js');
  if (fs.existsSync(candidate)) ATR = require(candidate);
} catch (e) {
  if (DEBUG) _log('ATR require failed', e && e.message ? e.message : e);
  ATR = null;
}

// simple safe JSON reader
function safeJsonRead(fp) {
  try {
    if (!fp || !fs.existsSync(fp)) return null;
    const txt = fs.readFileSync(fp, 'utf8');
    if (!txt || !txt.trim()) return null;
    return JSON.parse(txt);
  } catch (e) {
    if (DEBUG) _log('safeJsonRead error', fp, e && e.message ? e.message : e);
    return null;
  }
}

// normalize various OHLCV row shapes into { open, high, low, close, volume }
function normalizeRow(r) {
  if (!r) return null;
  if (Array.isArray(r)) {
    // common shapes:
    // [ts, open, high, low, close, volume] or [open, high, low, close, volume]
    if (r.length >= 6) {
      return { open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]), volume: Number(r[5]) };
    }
    if (r.length >= 5) {
      return { open: Number(r[0]), high: Number(r[1]), low: Number(r[2]), close: Number(r[3]), volume: Number(r[4]) };
    }
  } else if (typeof r === 'object') {
    const open = r.open ?? r.o ?? r.O ?? r[0];
    const high = r.high ?? r.h ?? r.H ?? r[1];
    const low = r.low ?? r.l ?? r.L ?? r[2];
    const close = r.close ?? r.c ?? r.C ?? r[3];
    const volume = r.volume ?? r.vb ?? r.v ?? r.volume_ ?? r[4];
    return { open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume) };
  }
  return null;
}

// try to find OHLCV file for timeframe tf and return normalized rows
function loadOhlcvRowsForTf(tf) {
  const OHLCV_DIR = process.env.OHLCV_DIR || path.resolve(__dirname, '../logs/json/ohlcv');
  const candidates = [
    path.join(OHLCV_DIR, `ohlcv_ccxt_data_${tf}_prediction.json`),
    path.join(OHLCV_DIR, `ohlcv_ccxt_data_prediction_${tf}.json`),
    path.join(OHLCV_DIR, `ohlcv_ccxt_data_${tf}.json`)
  ];
  for (const fp of candidates) {
    try {
      if (!fs.existsSync(fp)) continue;
      const raw = safeJsonRead(fp);
      if (!raw) continue;
      const rowsRaw = Array.isArray(raw) ? raw : (Array.isArray(raw.data) ? raw.data : (Array.isArray(raw.ohlcv) ? raw.ohlcv : null));
      if (!rowsRaw || !rowsRaw.length) continue;
      const rows = rowsRaw.map(normalizeRow).filter(Boolean);
      if (rows.length) return rows;
    } catch (e) {
      if (DEBUG) _log('loadOhlcvRowsForTf error', fp, e && e.message ? e.message : e);
      continue;
    }
  }
  return null;
}

// helper: return first non-null/undefined value
function firstDefined(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

// Micro implementation
async function atr_magnitude({ candle, meta }) {
  try {
    if (!ATR) {
      if (DEBUG) _log('ATR class not available; atr_magnitude skipping');
      return null;
    }

    // determine timeframe string
    const tf = String((candle && (candle.tf || candle.timeframe)) || (meta && meta.chosenTf) || process.env.MICRO_PRIMARY_TF || '15m');

    // load OHLCV rows for timeframe
    const rows = loadOhlcvRowsForTf(tf);
    if (!rows || rows.length < 2) {
      if (DEBUG) _log('insufficient ohlcv rows for tf', tf);
      return null;
    }

    const period = Math.max(1, Number(process.env.ATR_PERIOD || 14));
    const atr = new ATR({ period });

    const atrSeries = [];
    for (const r of rows) {
      try {
        // ATR.update expects { high, low, close } (or array in some implementations)
        atr.update({ high: r.high, low: r.low, close: r.close });
        if (atr.value !== null && atr.value !== undefined) atrSeries.push(atr.value);
      } catch (e) {
        if (DEBUG) _log('ATR.update skipped invalid row', e && e.message ? e.message : e);
      }
    }

    if (!atrSeries.length) {
      if (DEBUG) _log('no atr values computed for tf', tf);
      return null;
    }

    const lastATR = atrSeries[atrSeries.length - 1];
    const mean = atrSeries.reduce((s, x) => s + x, 0) / atrSeries.length;
    const variance = atrSeries.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / atrSeries.length;
    const std = Math.sqrt(variance || 0);
    const z = std > 0 ? ((lastATR - mean) / std) : 0;

    // body from candle (prefer raw fields)
    // Use a safe helper to avoid mixing ?? and && in a single expression which can cause parse issues.
    const openVal = firstDefined(
      candle && candle.raw && candle.raw.open,
      candle && candle.raw && candle.raw.o,
      candle && candle.open,
      candle && candle.o,
      candle && candle[0]
    );
    const closeVal = firstDefined(
      candle && candle.raw && candle.raw.close,
      candle && candle.raw && candle.raw.c,
      candle && candle.close,
      candle && candle.c,
      candle && candle.price,
      candle && candle[3]
    );

    const open = Number(openVal ?? NaN);
    const close = Number(closeVal ?? NaN);

    if (!Number.isFinite(open) || !Number.isFinite(close)) {
      if (DEBUG) _log('candle open/close missing for atr_magnitude');
      return null;
    }
    const body = close - open;
    const absBody = Math.abs(body);

    // bodyToAtr ratio (safe)
    const bodyToAtr = lastATR > 0 ? (absBody / lastATR) : 0;

    const price = Number((candle && (candle.price ?? (candle.raw && (candle.raw.close ?? candle.raw.price)))) || close || 1);
    const baseScore = _clamp((absBody / Math.max(1, price)) * 100); // roughly percent scaled
    const amp = 1 + Math.max(0, Math.min(2, z / 3)); // amplify modestly when ATR elevated
    const directionalScore = _clamp(Math.sign(body) * Math.min(1, baseScore * amp));

    const confidence = Math.min(1, Math.max(0.01, 0.2 + Math.min(1, bodyToAtr / 2) + Math.min(1, Math.abs(z) / 4)));

    const magnitude = {
      atr: Number(lastATR),
      atrMean: Number(mean),
      atrStd: Number(std),
      zScore: Number(z),
      body: Number(absBody),
      bodyToAtr: Number(bodyToAtr)
    };

    if (DEBUG) _log('atr_magnitude', { tf, magnitude, score: directionalScore, confidence });

    return { score: directionalScore, confidence: Math.min(1, Math.max(0.01, confidence)), magnitude };
  } catch (e) {
    if (DEBUG) _log('atr_magnitude error', e && e.stack ? e.stack : e);
    return null;
  }
}

module.exports = {
  micros: {
    atr_magnitude
  }
};
