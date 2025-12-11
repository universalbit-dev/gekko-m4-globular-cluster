// tools/lib/pvvm-micros.js
// Example PVVM micro registrations for the microstructure strategy.
// - Idempotent: safe to require multiple times.
// - Defensive: tolerates different signal shapes (chosenSignal passed as "candle" in pvvm.evaluate).
// - Returns either {score, confidence} or {side, strength} or number.
//
// Micros included:
// - spread_body: score proportional to candle body (close - open) relative to price (percent scaled).
// - volume_pulse: confidence boost when volume exceeds baseline (meta.avgVolumeBaseline or env).
// - trend_ema_simple: looks for slope/label hints in raw payload and returns trend signal.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pvvm = require('./pvvm');
const { DEBUG = false } = require('./runtime_flags');

function _log(...a) { if (DEBUG) console.debug('[PVVM-MICROS]', ...a); }

function safeNumber(v, fallback = 0) {
  if (v === undefined || v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// guard to avoid double registration
const registered = pvvm.list?.().micros ?? [];

if (!registered.includes('spread_body')) {
  pvvm.registerMicro('spread_body', ({ candle, meta }) => {
    // candle is expected to be the chosenSignal from your micro runner (formatSignalForDecision output)
    if (!candle) return null;
    // Try to read open/close from candle.raw or fallback to price
    const raw = candle.raw || {};
    const price = safeNumber(candle.price || raw.close || raw.price, 0);
    const open = safeNumber(raw.open, price);
    const close = safeNumber(raw.close, candle.price || price);
    const body = close - open;
    if (!price || Math.abs(body) < 1e-8) return null;
    // score in [-1,1] as percent body (capped)
    const pct = (body / price) * 100; // percent units
    // scale percent to -1..1 roughly mapping +/-2% -> +/-1
    const SCALE_PCT_TO_1 = Number(process.env.PVVM_SPREAD_SCALE_PCT || 2.0);
    let score = pct / SCALE_PCT_TO_1;
    score = Math.max(-1, Math.min(1, score));
    // confidence grows with absolute body size, capped
    const confidence = Math.max(0.01, Math.min(1, Math.abs(pct) / (SCALE_PCT_TO_1)));
    _log('spread_body', { price, open, close, body, pct, score, confidence });
    return { score, confidence };
  }, { weight: 3 });
}

if (!registered.includes('volume_pulse')) {
  pvvm.registerMicro('volume_pulse', ({ candle, meta }) => {
    // Non-scoring micro: returns neutral score (0) but confidence proportional to volume
    if (!candle || !candle.raw) return null;
    const raw = candle.raw;
    const vol = safeNumber(raw.volume ?? raw.vb ?? raw.vol ?? 0);
    if (vol <= 0) return null;
    // baseline: from meta.avgVolumeBaseline or env PVVM_VOL_BASELINE else small default
    const baseline = safeNumber(meta?.avgVolumeBaseline ?? process.env.PVVM_VOL_BASELINE ?? 0.2, 0.2);
    const conf = Math.min(1, vol / Math.max(1e-6, baseline));
    const confidence = Math.max(0.02, Math.min(1, conf));
    _log('volume_pulse', { vol, baseline, confidence });
    return { score: 0, confidence };
  }, { weight: 1 });
}

if (!registered.includes('trend_ema_simple')) {
  pvvm.registerMicro('trend_ema_simple', ({ candle, meta }) => {
    // Attempts to infer trend from raw fields:
    // - numeric slope: raw.slope or raw.ema_slope
    // - label: ensemble_label or recent_win.winner_label
    if (!candle || !candle.raw) return null;
    const raw = candle.raw;
    const slope = safeNumber(raw.slope ?? raw.ema_slope ?? raw.emaSlope ?? 0);
    const label = String(candle.ensemble_label ?? raw.ensemble_label ?? raw.recent_win?.winner_label ?? '').toLowerCase();
    if (Math.abs(slope) > 1e-9) {
      // scale slope into -1..1; assume slope is small e.g. 0.0001..0.01 so scale factor configurable
      const SCALE = Number(process.env.PVVM_SLOPE_SCALE ?? 0.001);
      let score = slope / SCALE;
      score = Math.max(-1, Math.min(1, score));
      const confidence = Math.min(1, Math.abs(slope) / Math.max(1e-9, SCALE));
      _log('trend_ema_simple(slope)', { slope, score, confidence });
      return { score, confidence: Math.max(0.01, confidence) };
    }
    if (label.includes('bull')) return { side: 'buy', strength: 0.6 };
    if (label.includes('bear')) return { side: 'sell', strength: 0.6 };
    return null;
  }, { weight: 2 });
}

_log('pvvm-micros registered', pvvm.list?.().micros);
