/**
 * trainer_tf.js
 * 
 * Microstructure inference engine.
 * - Uses 'momentum' if present, else 'priceChange'.
 * - Score is the absolute value of the driving feature.
 * - Adds 'price' and 'prediction' fields if available.
 * - Supports configurable thresholds for buy/sell decision.
 * - Easily expandable for real ML or TensorFlow.js models.
 */

const BUY_THRESHOLD = parseFloat(process.env.MICRO_BUY_THRESHOLD) || 0.0;
const SELL_THRESHOLD = parseFloat(process.env.MICRO_SELL_THRESHOLD) || 0.0;

module.exports = {
    /**
     * Infers signals from feature array.
     * @param {Array} featuresArr - Array of feature objects.
     * @returns {Array} Array of signal objects with timestamp, signal, score, price, prediction (optional).
     */
    infer(featuresArr) {
        return featuresArr.map(f => {
            // Prioritize momentum, then priceChange, then prediction, else 0
            let drive = typeof f.momentum === 'number'
                ? f.momentum
                : (typeof f.priceChange === 'number' ? f.priceChange : 
                    (typeof f.prediction === 'number' ? f.prediction : 0));

            // Log warning if all are missing
            if (typeof f.momentum !== 'number' && typeof f.priceChange !== 'number' && typeof f.prediction !== 'number') {
                console.warn('Warning: Feature object missing "momentum", "priceChange", and "prediction". Defaulting to 0.');
            }

            // Decision logic: threshold-based buy/sell signal
            let signal = 'hold';
            if (drive > BUY_THRESHOLD) signal = 'buy';
            else if (drive < SELL_THRESHOLD) signal = 'sell';

            return {
                timestamp: Date.now(),
                signal,
                score: Math.abs(drive),
                price: typeof f.price === 'number' ? f.price : null,
                prediction: typeof f.prediction === 'number' ? f.prediction : undefined,
                probability: typeof f.probability === 'number' ? f.probability : undefined,
                // Optionally include more ML fields (confidence, etc.)
            };
        });
    },

    // For future ML/TensorFlow.js integration:
    // loadModel: async function(modelPath) { ... },
    // train: async function(trainData, params) { ... },
};
