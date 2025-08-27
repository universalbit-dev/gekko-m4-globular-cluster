/**
 * challenge_analysis.js
 * Periodically analyzes challenge.log and updates model_winner.json with the best performing model.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');

const CHALLENGE_LOG_PATH = path.resolve(__dirname, './challenge.log');
const MODEL_WINNER_PATH = path.resolve(__dirname, './model_winner.json');
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS, 10) || 15 * 60 * 1000; // default 15min
const WINDOW_SIZE = parseInt(process.env.WINDOW_SIZE, 10) || 50;
const MIN_WIN_RATE = parseFloat(process.env.MIN_WIN_RATE) || 0.55;
const DOMINANCE_THRESHOLD = parseFloat(process.env.DOMINANCE_THRESHOLD) || 0.6;
const DOMINANCE_MIN_LENGTH = parseInt(process.env.DOMINANCE_MIN_LENGTH, 10) || 10;

function parseChallengeLine(line) {
  if (!line.trim() || line.startsWith('#')) return null;
  const parts = line.split('\t');
  // Fill missing columns with default values
  while (parts.length < 8) parts.push('neutral');
  return {
    timestamp: parts[0],
    convnet_pred: parts[1],
    tf_pred: parts[2],
    entry_price: Number(parts[3]),
    next_price: Number(parts[4]),
    convnet_result: parts[5],
    tf_result: parts[6],
    winner_label: parts[7]
  };
}

function loadChallengeLog(logPath) {
  try {
    if (!fs.existsSync(logPath)) return [];
    return fs.readFileSync(logPath, 'utf8')
      .trim()
      .split('\n')
      .map(parseChallengeLine)
      .filter(Boolean);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error reading log file: ${err}`);
    return [];
  }
}

function rollingWinRate(results, model, windowSize) {
  const winRates = [];
  let wins = 0, total = 0;
  for (let i = 0; i < results.length; i++) {
    if (i >= windowSize) {
      const old = results[i - windowSize][`${model}_result`];
      if (old === 'win') wins--;
      if (old === 'win' || old === 'loss') total--;
    }
    const cur = results[i][`${model}_result`];
    if (cur === 'win') wins++;
    if (cur === 'win' || cur === 'loss') total++;
    winRates.push(total > 0 ? wins / total : null);
  }
  return winRates;
}

function findDominantPeriods(winRates, results, threshold = DOMINANCE_THRESHOLD, minLength = DOMINANCE_MIN_LENGTH) {
  let periods = [];
  let start = null;
  for (let i = 0; i < winRates.length; i++) {
    if (winRates[i] !== null && winRates[i] > threshold) {
      if (start === null) start = i;
    } else {
      if (start !== null && (i - start) >= minLength) {
        periods.push({ start, end: i - 1 });
      }
      start = null;
    }
  }
  if (start !== null && (winRates.length - start) >= minLength) {
    periods.push({ start, end: winRates.length - 1 });
  }
  return periods.map(p => ({
    start_ts: results[p.start].timestamp,
    end_ts: results[p.end].timestamp,
    length: p.end - p.start + 1
  }));
}

function printAnalysis(results, convnetWinRate, tfWinRate, active_model, win_rate) {
  const lastIdx = results.length - 1;
  const nowIso = new Date().toISOString();

  console.log(`[${nowIso}] Model winner written to: ${MODEL_WINNER_PATH}`);
  console.log(
    JSON.stringify({
      active_model,
      win_rate,
      analysis_timestamp: nowIso,
      log_timestamp: results[lastIdx]?.timestamp || null
    }, null, 2)
  );
  console.log(`--- Rolling Win Rates (Window: ${WINDOW_SIZE}) ---`);

  const convnetPeriods = findDominantPeriods(convnetWinRate, results);
  const tfPeriods = findDominantPeriods(tfWinRate, results);

  console.log('ConvNet Dominant Periods (win rate > 60%):');
  convnetPeriods.forEach(p =>
    console.log(`  ${p.start_ts} - ${p.end_ts}, length: ${p.length}`)
  );
  console.log('TensorFlow Dominant Periods (win rate > 60%):');
  tfPeriods.forEach(p =>
    console.log(`  ${p.start_ts} - ${p.end_ts}, length: ${p.length}`)
  );
}

function analyzeAndWrite() {
  const results = loadChallengeLog(CHALLENGE_LOG_PATH);
  if (results.length === 0) {
    console.log(`[${new Date().toISOString()}] No challenge data found.`);
    return;
  }

  const convnetWinRate = rollingWinRate(results, 'convnet', WINDOW_SIZE);
  const tfWinRate = rollingWinRate(results, 'tf', WINDOW_SIZE);

  const lastIdx = results.length - 1;
  const lastConvnetWinRate = convnetWinRate[lastIdx];
  const lastTfWinRate = tfWinRate[lastIdx];

  let active_model, win_rate;
  if ((lastTfWinRate || 0) > (lastConvnetWinRate || 0)) {
    active_model = 'tf';
    win_rate = lastTfWinRate;
  } else {
    active_model = 'convnet';
    win_rate = lastConvnetWinRate;
  }

  if ((win_rate || 0) < MIN_WIN_RATE) {
    active_model = 'tf';
  }

  const winnerObj = {
    active_model,
    win_rate,
    timestamp: results[lastIdx].timestamp
  };

  try {
    fs.writeFileSync(MODEL_WINNER_PATH, JSON.stringify(winnerObj, null, 2));
    console.log(`[${new Date().toISOString()}] model_winner.json updated: ${MODEL_WINNER_PATH}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error writing model_winner.json:`, err);
  }

  printAnalysis(results, convnetWinRate, tfWinRate, active_model, win_rate);
}

function startContinuousAnalysis() {
  analyzeAndWrite();
  setInterval(analyzeAndWrite, INTERVAL_MS);
}

startContinuousAnalysis();
