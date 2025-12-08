// tools/lib/pvvm-policy.js
// PVVM policy helper: conservative mapping of pvvm.finalDecision -> local decision.
//
// Modes (controlled via env or options):
//  - 'log'    : never change decision (default) — only for visibility/audit
//  - 'veto'   : PVVM can only veto into HOLD when pvvm.finalDecision.side === 'hold'
//              and pvvm.confidence >= PVVM_OVERRIDE_CONF (default 0.90)
//  - 'confirm': PVVM must confirm local open/close. If local says 'open' or 'close',
//              then require pvvm.side to match and pvvm.confidence >= PVVM_APPLY_CONF (default 0.25).
//              Otherwise convert to 'hold' (conservative).
//  - 'augment': If PVVM agrees with local decision, keep it. If PVVM disagrees, only override
//              when pvvm.confidence >= PVVM_OVERRIDE_CONF.
//
// Recommended environment knobs:
//  PVVM_POLICY_MODE         -> 'log'|'veto'|'confirm'|'augment'       (default: 'log')
//  PVVM_OVERRIDE_CONF       -> 0..1 (default: 0.9)  (used for veto/strong override)
//  PVVM_APPLY_CONF          -> 0..1 (default: 0.25) (used for confirm mode)
//  PVVM_MIN_SCORE           -> absolute score threshold to require, default 0.01
//
// Usage:
//  const policy = require('./pvvm-policy');
//  decision = policy.applyPvvmPolicy(decision, pvvmResult);
//

const PVVM_POLICY_MODE = (process.env.PVVM_POLICY_MODE || process.env.PVVM_MODE || 'log').toLowerCase();
const PVVM_OVERRIDE_CONF = Number(process.env.PVVM_OVERRIDE_CONF ?? process.env.PVVM_OVERRIDE_CONF ?? 0.9);
const PVVM_APPLY_CONF = Number(process.env.PVVM_APPLY_CONF ?? 0.25);
const PVVM_MIN_SCORE = Number(process.env.PVVM_MIN_SCORE ?? 0.01);

function _sideToAction(side) {
  if (!side) return null;
  const s = String(side).toLowerCase();
  if (s === 'buy' || s === 'long') return 'open';
  if (s === 'sell' || s === 'short') return 'close';
  if (s === 'hold' || s === 'none') return 'hold';
  return null;
}

// Applies PVVM to the local decision and returns the possibly modified local decision.
// decision: { type: 'open'|'close'|'hold', reason: '...' }
// pvvmResult: { aggregated, finalDecision, microResults, macroDecision }
function applyPvvmPolicy(decision, pvvmResult, opts = {}) {
  const mode = (opts.mode || PVVM_POLICY_MODE || 'log').toLowerCase();

  if (!pvvmResult || !pvvmResult.finalDecision) {
    return decision; // nothing to do
  }

  // simple normalized values
  const final = pvvmResult.finalDecision;
  const pvSide = _sideToAction(final.side);
  const pvScore = Number(final.score || 0);
  const pvConf = Number(final.confidence || 0);
  const absScore = Math.abs(pvScore);

  // quick guard: if pv score is extremely small and confidence tiny, treat as no-op
  if (absScore < (opts.minScore ?? PVVM_MIN_SCORE) && pvConf < 0.05) {
    return decision;
  }

  // Mode handling
  switch (mode) {
    case 'log':
      // do not change decision — just leave pvvm for auditing
      return decision;

    case 'veto':
      // only allow PVVM to veto -> force hold when PVVM strongly recommends HOLD
      if (pvSide === 'hold' && pvConf >= (opts.overrideConf ?? PVVM_OVERRIDE_CONF)) {
        return { type: 'hold', reason: `pvvm_veto_hold(conf=${pvConf.toFixed(3)})` };
      }
      return decision;

    case 'confirm':
      // If local decision is open/close, require PVVM agreement to proceed.
      if (decision.type === 'open' || decision.type === 'close') {
        // require PVVM side to match and sufficient confidence & optionally minimum score
        if (pvSide === decision.type && pvConf >= (opts.applyConf ?? PVVM_APPLY_CONF) && absScore >= (opts.minScore ?? PVVM_MIN_SCORE)) {
          // PVVM confirms -> keep decision but annotate reason
          return { ...decision, reason: `${decision.reason};pvvm_confirm(conf=${pvConf.toFixed(3)},score=${pvScore.toFixed(3)})` };
        } else {
          // PVVM did not confirm -> conservative hold
          return { type: 'hold', reason: `pvvm_no_confirm(conf=${pvConf.toFixed(3)},pvSide=${final.side})` };
        }
      }
      // If local is hold, leave as-is (or we could special-case pvvm strong sell to close when position open)
      return decision;

    case 'augment':
      // If PVVM agrees and has any confidence above applyConf, keep or strengthen
      if ((pvSide === decision.type) && pvConf >= (opts.applyConf ?? PVVM_APPLY_CONF)) {
        return { ...decision, reason: `${decision.reason};pvvm_agree(conf=${pvConf.toFixed(3)},score=${pvScore.toFixed(3)})` };
      }
      // If PVVM strongly disagrees (e.g., pvvm says hold with high conf), allow override to hold
      if (pvSide === 'hold' && pvConf >= (opts.overrideConf ?? PVVM_OVERRIDE_CONF)) {
        return { type: 'hold', reason: `pvvm_override_hold(conf=${pvConf.toFixed(3)})` };
      }
      // Otherwise keep decision
      return decision;

    default:
      return decision;
  }
}

module.exports = { applyPvvmPolicy, _sideToAction, PVVM_POLICY_MODE, PVVM_OVERRIDE_CONF, PVVM_APPLY_CONF, PVVM_MIN_SCORE };
