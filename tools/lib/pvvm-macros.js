// tools/lib/pvvm-macros.js
// Example macro: daily loss circuit breaker. If day's loss exceeds threshold, return override hold.

const pvvm = require('./pvvm');
const { DEBUG = false } = require('./runtime_flags');

function _log(...args) { if (DEBUG) console.debug('[PVVM-MACROS]', ...args); }

if (!pvvm.list().macros.includes('daily_loss_breaker')) {
  pvvm.registerMacro('daily_loss_breaker', ({ aggregated, microResults, candle, meta }) => {
    try {
      const diagnostics = meta && meta.diagnostics;
      // meta may include diagnostics.history with realized PnL records
      const maxDailyLoss = Number(process.env.PVVM_MAX_DAILY_LOSS_EUR ?? process.env.MAX_DAILY_LOSS_EUR ?? 50);
      if (!diagnostics || !Array.isArray(diagnostics.history)) return null;
      const dayStart = Date.now() - (24 * 60 * 60 * 1000);
      let realized = 0;
      for (const h of diagnostics.history) {
        if ((h.when || 0) < dayStart) continue;
        if (typeof h.realizedPnL === 'number') realized += h.realizedPnL;
        if (h.action === 'SELL' && typeof h.pnl === 'number') realized += h.pnl;
      }
      if (realized <= -Math.abs(maxDailyLoss)) {
        _log('daily_loss_breaker triggered', { realized, maxDailyLoss });
        return { side: 'hold', confidence: 1, reason: `daily_loss(${realized.toFixed(2)})` };
      }
    } catch (e) {
      if (DEBUG) console.error('daily_loss_breaker error', e && e.message ? e.message : e);
    }
    return null;
  });
  _log('pvvm-macros registered', pvvm.list().macros);
}
