/**
 * challenge_log_writer.js
 * Reads signal data from ccxt_signal_comparative.log and appends formatted entries to challenge.log.
 * Each entry includes contextualized label and price based on the dynamically selected winner model.
 * The winner_label represents the model currently selected by auto-tuning (see model_winner.json).
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const CCXT_SIGNAL_PATH = path.resolve(__dirname, './ccxt_signal_comparative.log');
const CHALLENGE_LOG_PATH = path.resolve(__dirname, './challenge.log');
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS, 10) || 15 * 60 * 1000; // Default 15 min

/**
 * Gets the label name for the model currently selected as winner by challenge_analysis.js
 * Returns: 'label_convnet', 'label_tf', or 'ensemble_label'
 */
function getWinnerLabelColumn() {
  const MODEL_WINNER_PATH = path.resolve(__dirname, './model_winner.json');
  try {
    const data = fs.readFileSync(MODEL_WINNER_PATH, 'utf8');
    const parsed = JSON.parse(data);
    if (parsed.active_model === 'convnet') return 'label_convnet';
    if (parsed.active_model === 'tf') return 'label_tf';
    return 'ensemble_label';
  } catch (err) {
    // Fallback: use tf if analysis is not available
    return 'label_tf';
  }
}

/**
 * Formats a log entry for challenge.log using the winner label logic.
 * winner_label_value is taken from the currently selected model column.
 */
function formatChallengeLogEntry(line, header, winnerLabelCol) {
  const parts = line.trim().split('\t');
  const idx = col => header.indexOf(col);

  const timestamp = parts[idx('timestamp')];
  const convnet_pred = parts[idx('prediction_convnet')];
  const tf_pred = parts[idx('prediction_tf')];
  const entry_price = Number(parts[idx('price')]);
  // Winner label value from appropriate column
  const winner_label_value = parts[idx(winnerLabelCol)];
  // Winner price: you may update if you ever log a different winner price
  const winner_price = entry_price;

  function getResult(prediction, entry, winner) {
    if (prediction === 'bull') return winner > entry ? 'win' : 'loss';
    if (prediction === 'bear') return winner < entry ? 'win' : 'loss';
    return 'loss';
  }

  const convnet_result = getResult(convnet_pred, entry_price, winner_price);
  const tf_result = getResult(tf_pred, entry_price, winner_price);

  // The field "winner_label" now represents the label value of the selected winner model (auto-tuned).
  return [
    timestamp,
    convnet_pred,
    tf_pred,
    entry_price,
    winner_price,
    convnet_result,
    tf_result,
    winner_label_value 
  ].join('\t') + '\n';
}

function getLatestSignalLine() {
  try {
    const lines = fs.readFileSync(CCXT_SIGNAL_PATH, 'utf-8').trim().split('\n');
    if (lines.length < 2) return null;
    const header = lines[0].split('\t');
    const lastLine = lines[lines.length - 1];
    return { line: lastLine, header };
  } catch (err) {
    console.error(`[ERROR] Reading ${CCXT_SIGNAL_PATH}:`, err);
    return null;
  }
}

function writeChallengeLogEntry() {
  const latest = getLatestSignalLine();
  if (!latest) {
    console.warn(`[WARN] No valid signal line found.`);
    return;
  }
  const winnerLabelCol = getWinnerLabelColumn();
  const formattedEntry = formatChallengeLogEntry(latest.line, latest.header, winnerLabelCol);
  fs.appendFile(CHALLENGE_LOG_PATH, formattedEntry, err => {
    if (err) {
      console.error(`[ERROR] Writing to challenge.log:`, err);
    } else {
      console.log(`[LOG] Appended challenge entry: ${formattedEntry.trim()}`);
    }
  });
}

// Initial write
writeChallengeLogEntry();
// Repeat every INTERVAL_MS (from .env if present)
setInterval(writeChallengeLogEntry, INTERVAL_MS);
