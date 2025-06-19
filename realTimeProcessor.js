/**
 * realTimeProcessor.js
 * Streams JSON log lines from stdin, skips noisy/repetitive messages, and writes relevant logs to output.json.
 * Intended for structured log collection for charting or analytics.
 * 
 * Usage:
 *   pm2 logs --json | node realTimeProcessor.js
 */

const fs = require('fs');
const OUTPUT_FILE = 'logs/json/simulator.json';
const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

let logs = [];
let buffer = '';

// Patterns for noisy/repetitive messages you want to skip
const NOISE_PATTERNS = [
  /\[INFO\]/,
  /\[DEBUG\]/,
  /\[WARNING\]/,
  /\[ERROR\]/,
  /\[EXCHANGE SIMULATOR\]/,
  /Wohoo!/,
  /Emitted candles event/,
  /\(DEBUG\)/,
  /Using cached Sky Source Data/,
  /Requested GaiaBolt\/GaiaNut trade data/,
  /--------------------------------------------/
];

// If you want to filter by strategy name, add them here
const STRATEGY_WHITELIST = null; 
// ['rsibullbearadx_simulator','neuralnet_simulator'];

/**
 * Loads existing log file if valid, else resets to empty array.
 */
function loadLogs() {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const data = fs.readFileSync(OUTPUT_FILE, 'utf8');
      logs = JSON.parse(data);
      if (!Array.isArray(logs)) logs = [];
    }
  } catch {
    logs = [];
  }
}

/**
 * Reduces logs to fit within the max file size.
 */
function trimLogsToFitSize() {
  let json = JSON.stringify(logs, null, 2);
  while (Buffer.byteLength(json, 'utf8') > MAX_SIZE_BYTES && logs.length > 0) {
    logs.shift();
    json = JSON.stringify(logs, null, 2);
  }
}

/**
 * Writes log array to disk as JSON.
 */
function writeLogs() {
  trimLogsToFitSize();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(logs, null, 2));
}

/**
 * Returns true if the line is "noise" to skip.
 */
function isNoiseLine(line) {
  return NOISE_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * Filters by strategy if whitelist is set.
 */
function isStrategyAllowed(entry) {
  if (!STRATEGY_WHITELIST) return true;
  if (entry.strategy && STRATEGY_WHITELIST.includes(entry.strategy)) return true;
  return false;
}

/**
 * Processes a single line of log input.
 */
function processLine(line) {
  line = line.trim();
  if (!line || isNoiseLine(line)) return;
  try {
    const entry = JSON.parse(line);
    if (!isStrategyAllowed(entry)) return;
    // Optionally, filter or transform the entry here.
    logs.push(entry);
  } catch (e) {
    // Not valid JSON, skip
  }
}

// Initialize
loadLogs();

process.stdin.on('data', chunk => {
  buffer += chunk;
  let lines = buffer.split('\n');
  buffer = lines.pop(); // Save incomplete line for next chunk
  lines.forEach(processLine);
  writeLogs();
});

function flush() {
  processLine(buffer);
  writeLogs();
}

process.on('exit', flush);
process.on('SIGINT', () => { flush(); process.exit(); });
process.on('SIGTERM', () => { flush(); process.exit(); });
