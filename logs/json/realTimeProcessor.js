/**
 * Simple realTimeProcessor.js
 * Streams JSON log lines from stdin, skips [INFO]/[DEBUG], and writes valid logs to generic.json.
 * Overwrites simulator.json entirely, ensuring only valid JSON is written.
 * If simulator.json contains invalid JSON, it is reset to an empty array.
 * 
 * Usage:
 *   pm2 logs --json | node realTimeProcessor.js
 */

const fs = require('fs');
const OUTPUT_FILE = 'generic.json';
const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB

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
//Exclude from Global Log This every line 
function processLine(line) {
  line = line.trim();
 if (
  !line ||
  line.includes('[INFO]') ||
  line.includes('[DEBUG]') ||
  line.includes('[WARNING]') ||
  line.includes('[EXCHANGE SIMULATOR]') ||
  line.includes('[ERROR]') ||
  line.includes('Wohoo!') ||
  line.includes('(DEBUG)') ||
  line.includes('Emitted candles event') ||
  line.includes('--------------------------------------------')
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
