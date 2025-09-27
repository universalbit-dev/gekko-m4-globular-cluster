/**
 * Orchestrator for microstructure pipeline.
 * - Multi-timeframe aggregation and prediction-labeled candles.
 * - Logs all steps for dashboard, traceability, and advanced model context.
 * - Integrates challenge/model_winner fields for enriched signals.
 * - Modular feature extraction, inference, and signal logging.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');

const aggregator = require('./aggregator');
const featureExtractor = require('./featureExtractor');
const trainer_tf = require('./trainer_tf');
const microSignalLogger = require('./microSignalLogger');
const { getAggregatedPredictionCandles } = require('./microOHLCV');

const PAIR = process.env.PAIR || 'BTC/EUR';
const TIMEFRAMES = (process.env.MICRO_OHLCV_CANDLE_SIZE || '1m,5m,15m,1h')
    .split(',')
    .map(tf => tf.trim());
const MICRO_INTERVAL_MS = parseInt(process.env.MICRO_INTERVAL_MS, 10) || 60000;
const AGG_LOG = path.join(__dirname, 'aggregated.log');

let running = false;

/**
 * Main microstructure pipeline.
 * Loads prediction-labeled candles, aggregates, extracts features (with challenge context), infers, and logs signals for all selected timeframes.
 */
async function runMicrostructure() {
    if (running) {
        console.log('[Microstructure] Previous run still in progress. Skipping this interval.');
        return;
    }
    running = true;
    try {
        const aggregatedByTf = {};
        const featuresByTf = {};
        const signalsByTf = {};

        for (const tf of TIMEFRAMES) {
            // 1. Load and aggregate prediction-labeled candles for this timeframe
            const aggregatedCandles = getAggregatedPredictionCandles(PAIR, tf, '1m', 120);
            if (!aggregatedCandles.length) {
                console.log(`[Microstructure] No prediction-labeled candles available for TF ${tf}.`);
                continue;
            }

            // 2. Aggregate candles for this timeframe (if not already aggregated)
            const aggregated = aggregator.aggregateCandles(aggregatedCandles);
            if (!aggregated) {
                console.log(`[Microstructure] No candles to aggregate for TF ${tf}.`);
                continue;
            }
            aggregatedByTf[tf] = aggregated;

            // 3. Log aggregated for dashboard
            fs.appendFileSync(AGG_LOG, `[${tf}] ` + JSON.stringify(aggregated) + '\n');

            // 4. Enhanced feature extraction (with challenge/model_winner context)
            const features = featureExtractor.extractCandleFeatures(aggregated, tf);
            featuresByTf[tf] = features;

            // 5. Inference
            const signals = trainer_tf.infer([features]);
            let signal = signals[0];

            // 6. Attach challenge/model_winner fields to the signal
            const challengeData = featureExtractor.loadChallengeModelResults(tf);
            const enrichedSignal = { ...signal, ...challengeData };

            signalsByTf[tf] = enrichedSignal;

            console.log(`[Microstructure] TF=${tf} Aggregated:`, aggregated);
            console.log(`[Microstructure] TF=${tf} Features:`, features);
            console.log(`[Microstructure] TF=${tf} Signals:`, enrichedSignal);
        }

        // 7. Decision logic: choose best signal (highest score, or majority buy/sell)
        let chosenTf = null;
        let chosenSignal = null;
        if (Object.keys(signalsByTf).length) {
            // Choose signal with highest score (or customize logic)
            chosenTf = Object.keys(signalsByTf).reduce((a, b) =>
                signalsByTf[a].score > signalsByTf[b].score ? a : b);
            chosenSignal = signalsByTf[chosenTf];
        }

        // 8. Log all signals and chosen decision
        microSignalLogger.log({
            timeframes: signalsByTf,
            chosen: { timeframe: chosenTf, signal: chosenSignal }
        });

        console.log('[Microstructure] Final signals by timeframe:', signalsByTf);
        if (chosenSignal)
            console.log('[Microstructure] Chosen decision:', chosenTf, chosenSignal);

    } catch (err) {
        console.error('[Microstructure] Pipeline error:', err);
    }
    running = false;
}

// Run once at startup
runMicrostructure();
// Then continuously at interval
setInterval(runMicrostructure, MICRO_INTERVAL_MS);

module.exports = { runMicrostructure };
