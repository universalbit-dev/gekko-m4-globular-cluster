/**
 * challenge_log_writer.js (future-price win/loss version, multi-timeframe, enhanced, robust, flexible models)
 * - Robust to missing data, supports any CHLOG_MODEL_LIST and dynamic timeframes
 * - Processes prediction logs for each timeframe and writes out challenge logs with win/loss per model
 * - Auto-creates missing input log file with header if needed
 * - Each entry includes contextualized label and price based on dynamically selected winner model
 * - After N steps, updates pending entries with win/loss based on price movement
 * - Output: challenge_{tf}.log for each timeframe
 * - Adds additional metadata to each entry, such as candle open, high, low, volume, volatility, as available
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const LOGS_DIR = path.resolve(__dirname, '../logs/json/ohlcv');
const CHALLENGE_LOG_DIR = path.resolve(__dirname, './');
const MODEL_WINNER_FILE = path.resolve(__dirname, './model_winner.json'); // now supports multiframe winner file!
const CHLOG_INTERVAL_MS = parseInt(process.env.CHLOG_INTERVAL_MS, 10) || 15 * 60 * 1000;
const FUTURE_OFFSET = parseInt(process.env.FUTURE_OFFSET, 10) || 2;

const MODEL_LIST = process.env.CHLOG_MODEL_LIST
  ? process.env.CHLOG_MODEL_LIST.split(',').map(m => m.trim()).filter(Boolean)
  : ['convnet', 'tf'];

const TIMEFRAMES = (process.env.CHLOG_TIMEFRAMES
  ? process.env.CHLOG_TIMEFRAMES.split(',').map(tf => tf.trim())
  : ['1m','5m','15m','1h']);

// --- Ensure prediction log file exists with proper header ---
function ensurePredictionLogFile(tf) {
  const filePath = path.join(LOGS_DIR, `ohlcv_ccxt_data_${tf}_prediction.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]');
    console.log(`[INFO] Created missing prediction log file: ${filePath}`);
  }
}

// --- Read all signals from prediction log ---
function readAllSignals(tf) {
  ensurePredictionLogFile(tf);
  const filePath = path.join(LOGS_DIR, `ohlcv_ccxt_data_${tf}_prediction.json`);
  try {
    const arr = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return arr;
  } catch {
    return [];
  }
}

// --- Get winner label column from model_winner_multiframe.json ---
function getWinnerLabelColumn(tf) {
  try {
    const modelData = JSON.parse(fs.readFileSync(MODEL_WINNER_FILE, 'utf8'));
    const frameData = modelData[tf]?.summary || modelData[tf]; // supports both enhanced and legacy formats
    const model = frameData ? frameData.active_model : null;
    if (model && MODEL_LIST.includes(model)) {
      return `label_${model}`;
    }
    return 'ensemble_label';
  } catch {
    return 'ensemble_label';
  }
}

// --- Enhanced: include more fields from original prediction logs if available
function getExtraFields(signal) {
  const extras = {};
  for (const key of ['open','high','low','close','volume','volatility','priceChange','candleSize','priceChangePct','timestamp']) {
    if (Object.prototype.hasOwnProperty.call(signal, key)) {
      extras[key] = signal[key];
    }
  }
  return extras;
}

// --- Format one challenge log entry ---
function formatChallengeLogEntry(signal, futureSignal, winnerLabelCol) {
  const timestamp = signal.timestamp;
  const entry_price = Number(signal.close ?? signal.price);
  const winner_label_value = signal[winnerLabelCol] ?? signal.ensemble_label ?? null;
  const winner_price = entry_price;

  let future_price = null;
  const model_preds = {};
  const model_results = {};

  // Get predictions for each model
  for (const model of MODEL_LIST) {
    model_preds[model] = signal[`prediction_${model}`] ?? null;
  }

  // Win/loss logic
  if (futureSignal) {
    future_price = Number(futureSignal.close ?? futureSignal.price);
    for (const model of MODEL_LIST) {
      const pred = model_preds[model];
      if (pred === 'bull') {
        model_results[model] = future_price > entry_price ? 'win' : 'loss';
      } else if (pred === 'bear') {
        model_results[model] = future_price < entry_price ? 'win' : 'loss';
      } else {
        model_results[model] = 'loss';
      }
    }
  } else {
    for (const model of MODEL_LIST) {
      model_results[model] = 'pending';
    }
  }

  const predsArr = MODEL_LIST.map(m => model_preds[m]);
  const resultsArr = MODEL_LIST.map(m => model_results[m]);
  const extraFields = getExtraFields(signal);

  // Build entry (tab-separated, with extras appended at the end for audit/debug)
  return [
    timestamp,
    ...predsArr,
    entry_price,
    future_price !== null ? future_price : winner_price,
    ...resultsArr,
    winner_label_value,
    ...Object.values(extraFields)
  ].join('\t') + '\n';
}

// --- Write challenge log for a single timeframe ---
function writeChallengeLog(tf) {
  const signals = readAllSignals(tf);
  const challengeLogFile = path.join(CHALLENGE_LOG_DIR, `challenge_${tf}.log`);
  // Build header
  const header = [
    'timestamp',
    ...MODEL_LIST.map(m => `prediction_${m}`),
    'entry_price',
    'next_price',
    ...MODEL_LIST.map(m => `${m}_result`),
    'winner_label',
    'open','high','low','close','volume','volatility','priceChange','candleSize','priceChangePct','timestamp_extra'
  ].join('\t') + '\n';

  if (signals.length === 0) {
    fs.writeFile(challengeLogFile, header, err => {
      if (err) {
        console.error(`[ERROR] Writing to challenge_${tf}.log:`, err);
      } else {
        console.log(`[LOG][${tf}] challenge_${tf}.log updated, no signal lines.`);
      }
    });
    return;
  }

  const winnerLabelCol = getWinnerLabelColumn(tf);
  const entries = signals.map((signal, i) => {
    const futureSignal = signals[i + FUTURE_OFFSET] || null;
    return formatChallengeLogEntry(signal, futureSignal, winnerLabelCol);
  });

  fs.writeFile(challengeLogFile, header + entries.join(''), err => {
    if (err) {
      console.error(`[ERROR] Writing to challenge_${tf}.log:`, err);
    } else {
      console.log(`[LOG][${tf}] challenge_${tf}.log updated with ${entries.length} entries`);
    }
  });
}

// --- Main run for all timeframes ---
function writeAllChallengeLogs() {
  for (const tf of TIMEFRAMES) {
    writeChallengeLog(tf);
  }
}

// --- Initial run and interval ---
for (const tf of TIMEFRAMES) ensurePredictionLogFile(tf);
writeAllChallengeLogs();
setInterval(writeAllChallengeLogs, CHLOG_INTERVAL_MS);
