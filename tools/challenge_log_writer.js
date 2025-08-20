/**
 * challenge_log_writer.js
 * Continuously appends new dummy prediction data to challenge.log every INTERVAL_MS.
 * Place this file in the same directory as challenge_analysis.js.
 */

const fs = require('fs');
const path = require('path');

const CHALLENGE_LOG_PATH = path.resolve(__dirname, './challenge.log');
const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function randomPrice(base = 98000, range = 500) {
  return (base + Math.random() * range).toFixed(1);
}

function randomResult() {
  return Math.random() > 0.5 ? 'win' : 'loss';
}

function writeLogEntry() {
  const now = new Date().toISOString();
  const entry = [
    now,                 // timestamp
    'bear',              // convnet_pred (dummy)
    'bull',              // tf_pred (dummy)
    randomPrice(),       // entry_price
    randomPrice(),       // next_price
    randomResult(),      // convnet_result
    randomResult(),      // tf_result
    'neutral'            // ensemble_label (dummy)
  ].join('\t') + '\n';

  fs.appendFile(CHALLENGE_LOG_PATH, entry, err => {
    if (err) {
      console.error(`[${now}] Error writing to challenge.log:`, err);
    } else {
      console.log(`[${now}] Wrote to challenge.log: ${entry.trim()}`);
    }
  });
}

// Initial write
writeLogEntry();
// Repeat every INTERVAL_MS
setInterval(writeLogEntry, INTERVAL_MS);
