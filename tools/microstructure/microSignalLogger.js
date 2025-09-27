/**
 * microSignalLogger.js
 * Robust, efficient logger for microstructure signals.
 * - Supports both single signal object and array of signals.
 * - Ensures log directory and file exist.
 * - Handles errors gracefully.
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'micro_signal.log');

/**
 * Ensure log directory exists
 */
function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

/**
 * Write signals to log file (accepts array or single object)
 * @param {Array|Object} signals
 */
function log(signals) {
    ensureLogDir();
    const entries = Array.isArray(signals) ? signals : [signals];
    try {
        for (const signal of entries) {
            fs.appendFileSync(LOG_FILE, JSON.stringify(signal) + "\n");
        }
    } catch (err) {
        console.error(`[microSignalLogger] Failed to write log:`, err);
    }
}

module.exports = { log };
