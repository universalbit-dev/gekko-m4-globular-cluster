#!/usr/bin/env node
/**
 * EventEmitter-based orchestrator for microstructure pipeline (index.js).
 *
 * Rewrites the procedural orchestrator to an event-driven design using Node's EventEmitter.
 * - Emits events for run lifecycle and per-timeframe steps.
 * - Default listeners log to console and append JSONL to AGG_LOG.
 * - Producers/consumers can subscribe to events to extend behavior (UI, metrics, orderer).
 * - Loads prediction-labeled candles via microOHLCV
 * - Aggregates (using aggregator.aggregateCandles)
 * - Extracts features via featureExtractor
 * - Runs inference via trainer_tf
 * - Enriches signal with challenge/model_winner
 * - Emits decision / logs via microSignalLogger
 */

const EventEmitter = require('events');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');
const fsp = fs.promises;

const aggregator = require('./aggregator');
const featureExtractor = require('./featureExtractor');
const trainer_tf = require('./trainer_tf');
const microSignalLogger = require('./microSignalLogger');

// Defensive import for microOHLCV helper
const _microMod = require('./microOHLCV');
function resolveExport(mod, name) {
  if (!mod) return undefined;
  if (name && typeof mod[name] === 'function') return mod[name];
  if (typeof mod === 'function' && !name) return mod;
  if (mod.default) {
    if (name && typeof mod.default[name] === 'function') return mod.default[name];
    if (!name && typeof mod.default === 'function') return mod.default;
  }
  return undefined;
}
const getAggregatedPredictionCandles = resolveExport(_microMod, 'getAggregatedPredictionCandles') || resolveExport(_microMod, undefined);

// Config
const PAIR = process.env.PAIR || 'BTC/EUR';
const TIMEFRAMES = (process.env.INDEX_OHLCV_CANDLE_SIZE || '1m,5m')
    .split(',')
    .map(tf => tf.trim());
const MICRO_INTERVAL_MS = parseInt(process.env.MICRO_INTERVAL_MS, 10) || 60000;
const AGG_LOG = path.join(__dirname, 'aggregated.log');

class MicroOrchestrator extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.pair = opts.pair || PAIR;
    this.timeframes = opts.timeframes || TIMEFRAMES;
    this.intervalMs = typeof opts.intervalMs === 'number' ? opts.intervalMs : MICRO_INTERVAL_MS;
    this.aggLogPath = opts.aggLogPath || AGG_LOG;

    this._running = false;
    this._intervalHandle = null;

    // Default listeners: append JSONL lines to AGG_LOG and console log important events
    this.on('run_start', ev => this._appendLog(ev));
    this.on('tf_aggregated', ev => this._appendLog(ev));
    this.on('tf_features', ev => this._appendLog(ev));
    this.on('tf_signal', ev => this._appendLog(ev));
    this.on('decision', ev => this._appendLog(ev));
    this.on('run_end', ev => this._appendLog(ev));

    // Console summarizers
    this.on('tf_signal', ev => console.log(`[Microstructure] TF=${ev.tf} Signal:`, ev.signal));
    this.on('decision', ev => console.log('[Microstructure] Chosen decision:', ev.chosenTf, ev.chosenSignal));
    this.on('run_error', ev => console.error('[Microstructure] Pipeline error:', ev.error));
  }

  async _appendLog(obj) {
    try {
      const line = JSON.stringify(obj) + '\n';
      await fsp.mkdir(path.dirname(this.aggLogPath), { recursive: true }).catch(() => {});
      await fsp.appendFile(this.aggLogPath, line, { encoding: 'utf8' });
    } catch (e) {
      console.warn('[Microstructure] appendLog failed:', e && e.message ? e.message : e);
    }
  }

  // Validate a minimal candle-like shape
  _isValidCandle(c) {
    return c && typeof c === 'object' && typeof c.timestamp === 'number' && typeof c.open === 'number' && typeof c.close === 'number';
  }

  // Run a single pipeline iteration (one pass)
  async runOnce() {
    if (this._running) {
      console.log('[Microstructure] Previous run still in progress. Skipping this interval.');
      return;
    }
    this._running = true;
    const ts = new Date().toISOString();
    this.emit('run_start', { type: 'run_start', ts, pair: this.pair, timeframes: this.timeframes });

    try {
      const aggregatedByTf = {};
      const featuresByTf = {};
      const signalsByTf = {};

      for (const tf of this.timeframes) {
        try {
          // 1) Load prediction-labeled candles for this timeframe (targetFrame = tf)
          if (typeof getAggregatedPredictionCandles !== 'function') {
            const msg = `getAggregatedPredictionCandles not available for TF ${tf}`;
            this.emit('run_error', { type: 'missing_dependency', error: msg });
            console.warn('[Microstructure] ' + msg);
            continue;
          }

          const aggregatedCandles = await Promise.resolve(getAggregatedPredictionCandles(this.pair, tf, '1m', 120)) || [];
          if (!Array.isArray(aggregatedCandles) || aggregatedCandles.length === 0) {
            this.emit('tf_empty', { type: 'tf_empty', tf, ts: new Date().toISOString(), pair: this.pair });
            console.log(`[Microstructure] No prediction-labeled candles available for TF ${tf}.`);
            continue;
          }

          // 2) Aggregate candles for this timeframe with aggregator.aggregateCandles if present
          let aggregated = null;
          if (aggregator && typeof aggregator.aggregateCandles === 'function') {
            try {
              aggregated = aggregator.aggregateCandles(aggregatedCandles);
            } catch (aggErr) {
              this.emit('tf_error', { type: 'aggregate_failed', tf, error: String(aggErr) });
              console.warn(`[Microstructure] aggregator.aggregateCandles failed for TF ${tf}:`, aggErr && aggErr.message ? aggErr.message : aggErr);
              // fallback: use original array as aggregated if it's already aggregated
              aggregated = aggregatedCandles;
            }
          } else {
            aggregated = aggregatedCandles;
          }

          if (!aggregated || (Array.isArray(aggregated) && aggregated.length === 0)) {
            console.log(`[Microstructure] No candles to aggregate for TF ${tf}.`);
            continue;
          }

          aggregatedByTf[tf] = aggregated;
          this.emit('tf_aggregated', { type: 'tf_aggregated', tf, ts: new Date().toISOString(), pair: this.pair, aggregatedSummary: { length: Array.isArray(aggregated) ? aggregated.length : null } });

          // 3) Log aggregated for dashboard (emit event, handled by default listener)
          // done above

          // 4) Feature extraction (allow sync or async)
          let features;
          try {
            const maybe = featureExtractor.extractCandleFeatures(aggregated, tf);
            features = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
          } catch (feErr) {
            this.emit('tf_error', { type: 'feature_failed', tf, error: String(feErr) });
            console.error(`[Microstructure] Feature extraction failed for TF ${tf}:`, feErr && feErr.message ? feErr.message : feErr);
            continue;
          }
          featuresByTf[tf] = features;
          this.emit('tf_features', { type: 'tf_features', tf, ts: new Date().toISOString(), featuresSummary: Object.keys(features || {}).slice(0, 20) });

          // 5) Inference (support sync or async)
          let inferResult;
          try {
            const maybeSig = trainer_tf.infer([features]);
            inferResult = (maybeSig && typeof maybeSig.then === 'function') ? await maybeSig : maybeSig;
          } catch (infErr) {
            this.emit('tf_error', { type: 'inference_failed', tf, error: String(infErr) });
            console.error(`[Microstructure] Inference failed for TF ${tf}:`, infErr && infErr.message ? infErr.message : infErr);
            continue;
          }

          let signal = null;
          if (Array.isArray(inferResult)) signal = inferResult[0] || null;
          else if (inferResult && typeof inferResult === 'object') signal = inferResult;

          if (!signal) {
            this.emit('tf_no_signal', { type: 'tf_no_signal', tf, ts: new Date().toISOString() });
            console.log(`[Microstructure] No signal produced for TF ${tf}`);
            continue;
          }

          // 6) Attach challenge/model_winner fields to the signal, if available
          let challengeData = {};
          try {
            if (featureExtractor.loadChallengeModelResults) {
              const maybeCd = featureExtractor.loadChallengeModelResults(tf);
              challengeData = (maybeCd && typeof maybeCd.then === 'function') ? await maybeCd : maybeCd || {};
            }
          } catch (cdErr) {
            console.warn(`[Microstructure] Failed to load challenge/model results for TF ${tf}:`, cdErr && cdErr.message ? cdErr.message : cdErr);
          }

          const enrichedSignal = { ...signal, ...challengeData };
          signalsByTf[tf] = enrichedSignal;

          this.emit('tf_signal', { type: 'tf_signal', tf, ts: new Date().toISOString(), signal: enrichedSignal });

        } catch (tfErr) {
          // Per-timeframe protection so one TF's failure doesn't stop others
          this.emit('tf_error', { type: 'tf_exception', tf, error: String(tfErr) });
          console.error(`[Microstructure] Error processing timeframe ${tf}:`, tfErr && tfErr.message ? tfErr.message : tfErr);
        }
      } // end for each TF

      // 7) Decision logic
      let chosenTf = null;
      let chosenSignal = null;
      if (Object.keys(signalsByTf).length) {
        // pick highest score (defensive)
        try {
          const keys = Object.keys(signalsByTf);
          chosenTf = keys.reduce((a, b) => {
            const sa = signalsByTf[a] && typeof signalsByTf[a].score === 'number' ? signalsByTf[a].score : -Infinity;
            const sb = signalsByTf[b] && typeof signalsByTf[b].score === 'number' ? signalsByTf[b].score : -Infinity;
            return sa > sb ? a : b;
          });
          chosenSignal = signalsByTf[chosenTf];
        } catch (decErr) {
          this.emit('run_error', { type: 'decision_failed', error: String(decErr) });
          console.warn('[Microstructure] Decision logic failed:', decErr && decErr.message ? decErr.message : decErr);
        }
      }

      this.emit('decision', { type: 'decision', ts: new Date().toISOString(), chosenTf, chosenSignal, signalsByTf });

      // 8) Log all signals and chosen decision via microSignalLogger (support sync/async)
      try {
        const maybe = microSignalLogger.log({
          timeframes: signalsByTf,
          chosen: { timeframe: chosenTf, signal: chosenSignal }
        });
        if (maybe && typeof maybe.then === 'function') await maybe;
      } catch (logErr) {
        this.emit('run_error', { type: 'logger_failed', error: String(logErr) });
        console.warn('[Microstructure] microSignalLogger.log failed:', logErr && logErr.message ? logErr.message : logErr);
      }

      this.emit('run_end', { type: 'run_end', ts: new Date().toISOString(), chosenTf, chosenSignal, signalsByTf });
      console.log('[Microstructure] Final signals by timeframe:', signalsByTf);
      if (chosenSignal) console.log('[Microstructure] Chosen decision:', chosenTf, chosenSignal);

    } catch (err) {
      this.emit('run_error', { type: 'pipeline_error', error: String(err) });
      console.error('[Microstructure] Pipeline error:', err && err.message ? err.message : err);
    } finally {
      this._running = false;
    }
  } // runOnce()

  start() {
    if (this._intervalHandle) return;
    // Run once immediately, then schedule
    this.runOnce().catch(err => this.emit('run_error', { type: 'startup_failed', error: String(err) }));
    this._intervalHandle = setInterval(() => {
      this.runOnce().catch(err => this.emit('run_error', { type: 'scheduled_failed', error: String(err) }));
    }, this.intervalMs);
    // graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
    console.log('[Microstructure] Orchestrator started. Timeframes=', this.timeframes.join(','));
  }

  stop() {
    if (this._intervalHandle) {
      clearInterval(this._intervalHandle);
      this._intervalHandle = null;
    }
    console.log('[Microstructure] Orchestrator stopping.');
  }
}

// Backwards-compatible convenience: create default orchestrator and start if run directly
if (require.main === module) {
  const orch = new MicroOrchestrator();
  // optional extra listeners for operator visibility (already default logging to AGG_LOG)
  orch.on('tf_error', ev => console.warn('[Microstructure] TF error:', ev));
  orch.on('run_error', ev => console.error('[Microstructure] Run error event:', ev));
  orch.start();
}

module.exports = {
  MicroOrchestrator
};
