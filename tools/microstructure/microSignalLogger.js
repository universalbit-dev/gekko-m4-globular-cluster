/**
 * microSignalLogger.js
 * Robust, efficient logger for microstructure signals.
 * - Supports both single signal object and array of signals.
 * - Ensures log directory and file exist.
 * - Prevents unbounded log-file growth by rotating when file size limit is reached.
 * - Short-term deduplication to avoid repeated identical writes.
 * - Exposes runtime configuration via environment variables or configure().
 *
 * Environment variables:
 * - MICRO_LOG_MAX_BYTES (default 5MB)
 * - MICRO_LOG_MAX_BACKUPS (default 5)
 * - MICRO_LOG_DEDUP_MS (default 1000 ms)
 *
 * Behavior changes vs original:
 * - Will NOT blindly append forever. When file size would exceed the configured
 *   max, the logger rotates the current log (renames it with a timestamp) and
 *   starts a fresh log file. Old rotated files are pruned to keep only a limited
 *   number of backups.
 * - Uses a short deduplication window so identical signals repeated in quick
 *   succession are not written repeatedly.
 * - Appends all entries in a single append call for efficiency.
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '../logs');
const LOG_FILE_BASE = 'micro_signal.log';
const LOG_FILE = path.join(LOG_DIR, LOG_FILE_BASE);

let MAX_FILE_SIZE = parseInt(process.env.MICRO_LOG_MAX_BYTES, 10) || 5 * 1024 * 1024; // 5 MB
let MAX_BACKUPS = parseInt(process.env.MICRO_LOG_MAX_BACKUPS, 10) || 5;
let DEDUP_WINDOW_MS = parseInt(process.env.MICRO_LOG_DEDUP_MS, 10) || 1000; // 1s

// In-memory dedup map: JSON-string -> lastWrittenTimestamp
// Note: it's intentionally simple and bounded by time window.
const dedupMap = new Map();

/**
 * Ensure log directory exists
 */
function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

/**
 * Get size of the current log file (0 if not exists)
 */
function getCurrentLogSize() {
    try {
        const st = fs.statSync(LOG_FILE);
        return st.size || 0;
    } catch (err) {
        return 0;
    }
}

/**
 * Rotate current log file by renaming it with a timestamp suffix.
 * After rotation, prune old backups leaving only MAX_BACKUPS.
 */
function rotateLogs() {
    try {
        if (!fs.existsSync(LOG_FILE)) return;

        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedName = `${LOG_FILE_BASE}.${ts}`;
        const rotatedPath = path.join(LOG_DIR, rotatedName);

        fs.renameSync(LOG_FILE, rotatedPath);

        // Prune older backups (keep newest MAX_BACKUPS)
        const files = fs.readdirSync(LOG_DIR)
            .filter(f => f.startsWith(`${LOG_FILE_BASE}.`))
            .map(f => ({ name: f, mtime: fs.statSync(path.join(LOG_DIR, f)).mtime.getTime() }))
            .sort((a, b) => b.mtime - a.mtime);

        for (let i = MAX_BACKUPS; i < files.length; i++) {
            try {
                fs.unlinkSync(path.join(LOG_DIR, files[i].name));
            } catch (err) {
                // ignore individual delete errors
            }
        }
    } catch (err) {
        // If rotation fails, print a controlled error and continue (avoids crashing host)
        console.error('[microSignalLogger] Failed to rotate logs:', err);
    }
}

/**
 * Write signals to log file (accepts array or single object)
 * - Adds an ISO timestamp to each record under "ts" key.
 * - Performs short-term deduplication to avoid identical writes within DEDUP_WINDOW_MS.
 */
function log(signals) {
    ensureLogDir();

    const entries = Array.isArray(signals) ? signals : [signals];
    const now = Date.now();

    // Build lines to write, respecting dedup window
    const lines = [];
    for (const signal of entries) {
        // Defensive: if signal is null/undefined, skip
        if (signal === null || typeof signal === 'undefined') continue;

        // Keep the original signal but attach timestamp (non-destructive clone)
        const record = {
            ts: new Date().toISOString(),
            data: signal
        };

        const json = JSON.stringify(record);
        const key = json; // simple key; if needed hashing can be used

        const last = dedupMap.get(key) || 0;
        if (now - last < DEDUP_WINDOW_MS) {
            // skip duplicate within dedup window
            continue;
        }

        dedupMap.set(key, now);
        lines.push(json + '\n');
    }

    if (lines.length === 0) {
        return; // nothing to write
    }

    const payload = lines.join('');
    const payloadBytes = Buffer.byteLength(payload, 'utf8');

    try {
        const currentSize = getCurrentLogSize();

        // If writing the payload would exceed the max file size, rotate first
        if (currentSize + payloadBytes > MAX_FILE_SIZE) {
            rotateLogs();
        }

        // Append in one call for efficiency
        fs.appendFileSync(LOG_FILE, payload, { encoding: 'utf8', mode: 0o600 });
    } catch (err) {
        console.error('[microSignalLogger] Failed to write log:', err);
    } finally {
        // Cleanup stale entries from dedupMap to avoid memory growth.
        // Remove keys older than 2 * DEDUP_WINDOW_MS
        const cutoff = Date.now() - (DEDUP_WINDOW_MS * 2);
        for (const [k, v] of dedupMap) {
            if (v < cutoff) dedupMap.delete(k);
        }
    }
}

function configure(opts = {}) {
    if (typeof opts.maxBytes === 'number' && opts.maxBytes > 0) MAX_FILE_SIZE = opts.maxBytes;
    if (typeof opts.maxBackups === 'number' && opts.maxBackups >= 0) MAX_BACKUPS = opts.maxBackups;
    if (typeof opts.dedupMs === 'number' && opts.dedupMs >= 0) DEDUP_WINDOW_MS = opts.dedupMs;
}

module.exports = { log, configure };
