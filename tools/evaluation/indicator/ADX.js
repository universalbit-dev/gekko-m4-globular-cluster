// url: (local file) - optimized ADX indicator
// Lean, incremental ADX implementation optimized for per-candle update throughput.

class ADXIndicator {
  constructor(period = 14) {
    this.period = Math.max(1, Math.floor(period));
    // internal DX object — keep required rolling components
    this.prevHigh = null;
    this.prevLow = null;
    this.prevClose = null;

    // smoothed directional movement and true range trackers
    this.smoothedPlusDM = 0;
    this.smoothedMinusDM = 0;
    this.smoothedTR = 0;

    // ADX values
    this.adx = NaN; // current ADX result
    this._dxSum = 0; // used during initialization
    this._dxCount = 0; // count of DX samples collected for init

    // convenience ratio (used in update)
    this._alpha = (this.period - 1) / this.period;
  }

  // safe numeric helper
  _num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }

  // reset to empty state
  reset() {
    this.prevHigh = this.prevLow = this.prevClose = null;
    this.smoothedPlusDM = 0;
    this.smoothedMinusDM = 0;
    this.smoothedTR = 0;
    this.adx = NaN;
    this._dxSum = 0;
    this._dxCount = 0;
  }

  // warmup using an array of candles: faster than calling update repeatedly from outside
  warmup(candles) {
    if (!Array.isArray(candles)) return;
    for (let i = 0; i < candles.length; i++) {
      this.update(candles[i]);
    }
  }

  // update with a single candle {high, low, close}
  update(candle) {
    if (!candle) return;
    const high = this._num(candle.high);
    const low = this._num(candle.low);
    const close = this._num(candle.close);

    // need previous candle to compute differences
    if (this.prevHigh === null || this.prevLow === null || this.prevClose === null) {
      this.prevHigh = high;
      this.prevLow = low;
      this.prevClose = close;
      return;
    }

    // compute directional movement
    const upMove = high - this.prevHigh;
    const downMove = this.prevLow - low;

    let plusDM = 0;
    let minusDM = 0;
    if (upMove > downMove && upMove > 0) plusDM = upMove;
    else if (downMove > upMove && downMove > 0) minusDM = downMove;

    // true range components
    const tr1 = high - low;
    const tr2 = Math.abs(high - this.prevClose);
    const tr3 = Math.abs(low - this.prevClose);
    const trueRange = Math.max(tr1, tr2, tr3);

    // initialize smoothed sums if still in warm-up
    if (this._dxCount < this.period) {
      // accumulate smoothed values to compute initial averages
      this.smoothedPlusDM += plusDM;
      this.smoothedMinusDM += minusDM;
      this.smoothedTR += trueRange;
    } else {
      // Wilder smoothing: smoothed = prev_smoothed - (prev_smoothed/period) + current
      this.smoothedPlusDM = this.smoothedPlusDM - (this.smoothedPlusDM / this.period) + plusDM;
      this.smoothedMinusDM = this.smoothedMinusDM - (this.smoothedMinusDM / this.period) + minusDM;
      this.smoothedTR = this.smoothedTR - (this.smoothedTR / this.period) + trueRange;
    }

    // if we are still collecting initial samples
    if (this._dxCount < this.period) {
      this._dxCount++;
      if (this._dxCount === this.period) {
        // finalize initial smoothed values by averaging
        this.smoothedPlusDM = this.smoothedPlusDM / this.period;
        this.smoothedMinusDM = this.smoothedMinusDM / this.period;
        this.smoothedTR = this.smoothedTR / this.period;
        // first DX & ADX calculation
        const plusDI = (this.smoothedPlusDM / this.smoothedTR) * 100;
        const minusDI = (this.smoothedMinusDM / this.smoothedTR) * 100;
        const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
        this._dxSum = dx;
        this.adx = dx; // initial ADX approximated as first DX
      }
    } else {
      // compute DX for this period
      const plusDI = (this.smoothedPlusDM / this.smoothedTR) * 100;
      const minusDI = (this.smoothedMinusDM / this.smoothedTR) * 100;
      const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI || 1)) * 100;

      // Wilder smoothing for ADX: ADX = (prev_ADX*(period-1) + dx) / period
      this.adx = ((this.adx * (this.period - 1)) + dx) / this.period;
    }

    // rotate previous candle
    this.prevHigh = high;
    this.prevLow = low;
    this.prevClose = close;
  }

  // expose result as 'result' for compatibility or .value
  get result() {
    return Number.isFinite(this.adx) ? this.adx : null;
  }

  get value() {
    return this.result;
  }
}

module.exports = ADXIndicator;
