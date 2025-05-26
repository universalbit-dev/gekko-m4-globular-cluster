/**
 * realTimeProcessor.js
 * 
 * Streams JSON log lines from stdin, filters out lines containing [INFO] or [DEBUG], 
 * and accumulates valid log entries into a JSON array saved in simulator.json.
 * 
 * Features:
 * - Maintains a rolling log file capped at 4 MB (oldest entries removed as needed)
 * - Batches writes for efficiency (writes every 2 seconds)
 * - Performs atomic writes using a temp file and backup for data integrity
 * - Restores from backup if the output file becomes corrupted
 * - Handles incomplete log lines at the end of input
 * 
 * Usage Example:
 *   pm2 logs --json | node realTimeProcessor.js
 * 
 * Output files:
 *   - simulator.json        Main log array
 *   - simulator_backup.json Latest backup (before each write)
 *   - simulator_tmp.json    Temporary file for atomic writes
 *
 * On exit or termination, processes any remaining log line and ensures valid JSON output.
 * 
 * Author: universalbit-dev
 * Repository: https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/realTimeProcessor.js
 */

const fs = require('fs-extra');

const outputFile = 'simulator.json';
const backupFile = 'simulator_backup.json';
const tempFile = 'simulator_tmp.json';
const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
let buffer = '';

let logs = [];
if (fs.existsSync(outputFile)) {
  try {
    logs = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  } catch (err) {
    console.error('Error parsing existing JSON file:', err.message);
    if (fs.existsSync(backupFile)) {
      try {
        logs = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        console.warn('Recovered logs from backup.');
      } catch (backupErr) {
        console.error('Failed to recover from backup:', backupErr.message);
        logs = [];
      }
    } else {
      logs = [];
    }
  }
}

function trimLogsToFitSize(logs) {
  let json = JSON.stringify(logs, null, 2);
  while (Buffer.byteLength(json, 'utf8') > MAX_SIZE_BYTES && logs.length > 0) {
    logs.shift();
    json = JSON.stringify(logs, null, 2);
  }
  return logs;
}

let writeScheduled = false;
function scheduleWrite() {
  if (writeScheduled) return;
  writeScheduled = true;
  setTimeout(() => {
    writeScheduled = false;
    writeLogsToFile();
  }, 2000); // Write every 2 seconds
}

function writeLogsToFile() {
  // Backup current file
  if (fs.existsSync(outputFile)) {
    fs.copySync(outputFile, backupFile);
  }
  // Enforce 4MB size limit
  logs = trimLogsToFitSize(logs);

  // Write to temp file first
  const jsonString = JSON.stringify(logs, null, 2);
  fs.writeFileSync(tempFile, jsonString);

  // Validate written file
  try {
    JSON.parse(fs.readFileSync(tempFile, 'utf8'));
    // If valid, rename to outputFile (atomic replace)
    fs.moveSync(tempFile, outputFile, { overwrite: true });
  } catch (validateErr) {
    if (fs.existsSync(backupFile)) {
      fs.copySync(backupFile, outputFile);
      console.error('Write caused invalid JSON, restored from backup.');
    }
  }
}

// FLUSH LOGIC: process any remaining buffer before exit
function flushBuffer() {
  if (buffer.trim() !== '') {
    if (!buffer.includes('[INFO]') && !buffer.includes('[DEBUG]')) {
      try {
        const logEntry = JSON.parse(buffer);
        logs.push(logEntry);
      } catch (err) {
        console.error('Failed to parse last buffered log entry:', err.message);
      }
    }
    buffer = '';
  }
}

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop(); // keep incomplete line in buffer

  lines.forEach((line) => {
    if (line.trim() !== '') {
      // Skip lines containing [INFO] or [DEBUG] to reduce file size
      if (
        typeof line === 'string' &&
        (line.includes('[INFO]') || line.includes('[DEBUG]')
        )) {
        return;
      }
      try {
        const logEntry = JSON.parse(line);
        logs.push(logEntry);
        scheduleWrite();
      } catch (err) {
        console.error('Failed to parse log entry:', err.message);
      }
    }
  });
});

// On exit, flush remaining logs and the last buffer
function handleExit() {
  flushBuffer();
  writeLogsToFile();
}

process.on('exit', handleExit);
process.on('SIGINT', () => { handleExit(); process.exit(); });
process.on('SIGTERM', () => { handleExit(); process.exit(); });
