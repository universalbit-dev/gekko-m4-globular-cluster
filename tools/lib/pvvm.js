// tools/lib/pvvm.js
// Minimal PVVM (PVD/PVVM) singleton suitable for use by tools/microstructure/micro_ccxt_orders.js
// - No external deps
// - Lightweight, defensive, safe to require even if not used
// - Exposes registerMicro, unregisterMicro, registerMacro, unregisterMacro, evaluate, list, setOptions
//
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { DEBUG: DEBUG_FLAG = false } = require('./runtime_flags');

// local debug helper
function _dbg(...args) {
  if (DEBUG_FLAG) console.debug('[PVVM]', ...args);
}

function _clamp(v, a = -1, b = 1) {
  if (typeof v !== 'number' || isNaN(v)) return 0;
  return Math.max(a, Math.min(b, v));
}

// Normalize micro function return into { score: -1..1, confidence: 0..1 } or null
function _normalizeMicroResult(res) {
  if (res === undefined || res === null) return null;
  if (typeof res === 'number') {
    return { score: _clamp(res), confidence: 1.0 };
  }
  if (typeof res === 'object') {
    // direct { score, confidence }
    if ('score' in res) {
      const score = _clamp(Number(res.score) || 0);
      const confidence = Math.max(0, Math.min(1, Number(res.confidence) || 0));
      return { score, confidence };
    }
    // { side, strength/confidence }
    if ('side' in res) {
      const side = String(res.side || '').toLowerCase();
      let base = 0;
      if (side === 'buy' || side === 'long') base = 1;
      else if (side === 'sell' || side === 'short') base = -1;
      else base = 0;
      const strength = Number(res.strength ?? res.confidence ?? 1) || 0;
      const score = _clamp(base * strength);
      const confidence = Math.max(0, Math.min(1, strength));
      return { score, confidence };
    }
    // fallback: try to coerce numeric-ish
    if ('value' in res && typeof res.value === 'number') {
      return { score: _clamp(res.value), confidence: Math.max(0, Math.min(1, Number(res.confidence) || 1)) };
    }
  }
  return null;
}

class PVVM {
  constructor(opts = {}) {
    this.micros = Object.create(null); // name -> { fn, weight }
    this.macros = Object.create(null); // name -> fn
    this.options = Object.assign({
      decisionThreshold: 0.05, // abs score below this -> hold
      minConfidence: 0.2, // below this -> low confidence handling
    }, opts);
    _dbg('initialized PVVM', this.options);
  }

  registerMicro(name, fn, opts = {}) {
    if (!name || typeof fn !== 'function') throw new Error('registerMicro(name, fn, opts) requires a name and function');
    if (this.micros[name]) throw new Error(`micro '${name}' already registered`);
    this.micros[name] = { fn, weight: Number(opts.weight) || 1 };
    _dbg('registered micro', name, 'weight', this.micros[name].weight);
    return name;
  }

  unregisterMicro(name) {
    delete this.micros[name];
    _dbg('unregistered micro', name);
  }

  registerMacro(name, fn) {
    if (!name || typeof fn !== 'function') throw new Error('registerMacro(name, fn) requires a name and function');
    if (this.macros[name]) throw new Error(`macro '${name}' already registered`);
    this.macros[name] = fn;
    _dbg('registered macro', name);
    return name;
  }

  unregisterMacro(name) {
    delete this.macros[name];
    _dbg('unregistered macro', name);
  }

  list() {
    return {
      micros: Object.keys(this.micros),
      macros: Object.keys(this.macros),
      options: this.options
    };
  }

  setOptions(opts = {}) {
    Object.assign(this.options, opts);
    _dbg('options updated', this.options);
  }

  // Evaluate micros and run macros; returns final decision structure.
  // candle/meta are passed to micro/macro functions.
  async evaluate(candle, meta = {}) {
    const microEntries = Object.entries(this.micros);

    // Run micros in parallel (best-effort)
    const microPromises = microEntries.map(([name, { fn, weight }]) => {
      return Promise.resolve()
        .then(() => fn({ candle, meta }))
        .then(raw => {
          const norm = _normalizeMicroResult(raw);
          if (!norm) return null;
          const weightedScore = norm.score * (weight || 1);
          return {
            name,
            score: norm.score,
            confidence: Number(norm.confidence || 0),
            weight: Number(weight || 1),
            weightedScore
          };
        })
        .catch(err => {
          // Catch errors in user-supplied micro to avoid breaking evaluation
          if (DEBUG_FLAG) console.error('[PVVM] micro error', name, err && err.stack ? err.stack : err);
          return null;
        });
    });

    const rawMicroResults = await Promise.all(microPromises);
    const microResults = rawMicroResults.filter(Boolean);

    // Aggregate: weighted average of scores, weighted average of confidences
    let totalWeight = 0;
    let scoreSum = 0;
    let confSum = 0;
    for (const m of microResults) {
      totalWeight += Math.abs(m.weight) || 0;
      scoreSum += (m.weight || 0) * (m.score || 0);
      confSum += (m.confidence || 0) * (m.weight || 0);
    }
    const rawScore = (totalWeight > 0) ? (scoreSum / totalWeight) : 0;
    const avgConfidence = (totalWeight > 0) ? (confSum / totalWeight) : 0;
    const normalizedScore = _clamp(rawScore, -1, 1);

    const aggregated = {
      rawScore,
      normalizedScore,
      totalWeight,
      confidence: avgConfidence
    };

    // Run macros sequentially; first non-null result wins (macros are expected to be small)
    let macroDecision = null;
    for (const [name, fn] of Object.entries(this.macros)) {
      try {
        const res = await Promise.resolve(fn({ aggregated, microResults, candle, meta }));
        if (res) {
          macroDecision = Object.assign({}, res, { by: name });
          _dbg('macro override by', name, macroDecision);
          break;
        }
      } catch (err) {
        if (DEBUG_FLAG) console.error('[PVVM] macro error', name, err && err.stack ? err.stack : err);
      }
    }

    // Build final decision
    let final = { side: 'hold', score: 0, confidence: aggregated.confidence, reason: 'aggregated' };

    if (macroDecision) {
      final = {
        side: macroDecision.side || 'hold',
        score: _clamp(Number(macroDecision.score) || aggregated.normalizedScore),
        confidence: _clamp(Number(macroDecision.confidence) || aggregated.confidence, 0, 1),
        reason: macroDecision.reason || `macro:${macroDecision.by}`
      };
    } else {
      const thr = Number(this.options.decisionThreshold) || 0;
      if (Math.abs(aggregated.normalizedScore) < thr) {
        final.side = 'hold';
        final.score = aggregated.normalizedScore;
        final.reason = `below_threshold(${thr})`;
      } else {
        final.side = (aggregated.normalizedScore > 0) ? 'buy' : 'sell';
        final.score = aggregated.normalizedScore;
        final.reason = 'aggregated';
      }
    }

    // Low confidence handling (flag and optionally force hold for weak signals)
    if ((final.confidence || 0) < (this.options.minConfidence || 0)) {
      final.reason = `low_confidence(${(final.confidence || 0).toFixed(3)})`;
      if (Math.abs(final.score) < 0.5) {
        final.side = 'hold';
      }
    }

    _dbg('evaluate =>', { aggregated, final, micros: microResults.map(m => ({ name: m.name, score: m.score, weight: m.weight, confidence: m.confidence })) });

    return {
      microResults,
      aggregated,
      macroDecision,
      finalDecision: final
    };
  }
}

// Export singleton
module.exports = new PVVM();
