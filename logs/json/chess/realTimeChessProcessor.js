/**
 * realTimeChessProcessor.js
 *
 * Filters and processes PM2 log stream for "Random Game Of Chess" entries,
 * maintaining a JSON array of game logs in randomchess.json, capped at 1MB.
 *
 * Description:
 * Designed to be used in a pipeline such as:
 *   pm2 logs --json | node realTimeChessProcessor.js
 *
 * - Reads JSON log entries from stdin.
 * - Filters for lines containing "Random Game Of Chess:".
 * - Maintains a rolling log of entries in randomchess.json, trimming the oldest data
 *   when the file exceeds 1MB.
 *
 * Requirements:
 * - Node.js (no external npm modules required)
 *
 * Usage:
 *   pm2 logs --json | node realTimeChessProcessor.js
 *
 * Notes:
 * - Ensures randomchess.json never exceeds 1MB for efficient handling and downstream upload.
 * - Intended for use with gekko-m4-globular-cluster or similar financial/chess analytics pipelines.
 *
 * Author: universalbit-dev
 * Date:   02-06-2025
 */

const fs = require('fs');
const OUTPUT_FILE = 'randomchess.json';
const MAX_SIZE_BYTES = 1 * 1024 * 1024; //1MB

let logs = [];
let buffer = '';

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

function trimLogsToFitSize() {
  let json = JSON.stringify(logs, null, 2);
  while (Buffer.byteLength(json, 'utf8') > MAX_SIZE_BYTES && logs.length > 0) {
    logs.shift();
    json = JSON.stringify(logs, null, 2);
  }
}

function writeLogs() {
  trimLogsToFitSize();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(logs, null, 2));
}

function processLine(line) {
  line = line.trim();
  // Only process lines containing "Random Game Of Chess:"
  if (
    !line ||
    !line.includes('Random Game Of Chess:')
  ) return;
  try {
    const entry = JSON.parse(line);
    logs.push(entry);
  } catch {}
}

loadLogs();

process.stdin.on('data', chunk => {
  buffer += chunk;
  let lines = buffer.split('\n');
  buffer = lines.pop();
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
