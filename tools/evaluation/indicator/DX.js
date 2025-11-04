#!/usr/bin/env node
/**
 * tools/indicators/DX.js
 *
 * Directional Movement Index (DX) core calculation:
 * - Computes DX = 100 * (|+DI - -DI| / (+DI + -DI))
 * - Requires smoothed +DI and -DI inputs (from smoothed True Range & directional movement).
 * - This module provides a per-step incremental compute given smoothed +DM, -DM and ATR.
 *
 * Usage:
 *   const dx = new DX();
 *   dx.update(smoothedPlusDM, smoothedMinusDM, atr) -> dxValue or null
 *   dx.reset()
 */

class DX {
  constructor() {
    this.value = null;
  }

  reset() {
    this.value = null;
  }

  /**
   * smPlus, smMinus: smoothed directional movements (same smoothing as ATR's TR smoothing)
   * atr: average true range (non-zero)
   */
  update(smPlus, smMinus, atr) {
    const p = Number(smPlus || 0);
    const m = Number(smMinus || 0);
    const a = Number(atr || 0);
    if (!isFinite(p) || !isFinite(m) || !isFinite(a) || a <= 0) return this.value = null;
    const plusDI = (p / a) * 100;
    const minusDI = (m / a) * 100;
    const denom = plusDI + minusDI;
    if (denom === 0) { this.value = 0; return this.value; }
    this.value = (Math.abs(plusDI - minusDI) / denom) * 100;
    return this.value;
  }
}

module.exports = DX;
