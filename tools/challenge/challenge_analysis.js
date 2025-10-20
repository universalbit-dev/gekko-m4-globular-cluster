/**
 * challenge_analysis.js
 * - Multi-timeframe, rolling win rate, dominance detection, robust output.
 * - Volatility (ATR) calculation and reporting.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const CHALLENGE_LOG_DIR = path.resolve(__dirname, './');
const MODEL_WINNER_PATH = path.resolve(__dirname, './model_winner.json');
const CHALLENGE_INTERVAL_MS = parseInt(process.env.CHALLENGE_INTERVAL_MS, 10) || 15 * 60 * 1000;
const WINDOW_SIZE = parseInt(process.env.WINDOW_SIZE, 10) || 50;
const MIN_WIN_RATE = parseFloat(process.env.CHALLENGE_MIN_WIN_RATE) || 0.618;
const DOMINANCE_THRESHOLD = parseFloat(process.env.CHALLENGE_DOMINANCE_THRESHOLD) || 0.618;
const DOMINANCE_MIN_LENGTH = parseInt(process.env.CHALLENGE_DOMINANCE_MIN_LENGTH, 10) || 13;
const ATR_PERIOD = parseInt(process.env.CHALLENGE_ATR_PERIOD, 10) || 14;

const MODEL_LIST = (process.env.CHALLENGE_MODEL_LIST
  ? process.env.CHALLENGE_MODEL_LIST.split(',').map(m => m.trim()).filter(Boolean)
  : ['tf']).filter(m => ['tf'].includes(m));
const TIMEFRAMES = (process.env.CHALLENGE_TIMEFRAMES
  ? process.env.CHALLENGE_TIMEFRAMES.split(',').map(tf => tf.trim()).filter(Boolean)
  : ['1m','5m','15m','1h']);

// --- Parse .log file into array of row objects ---
function parseChallengeLogFile(filePath, modelList) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
    if (lines.length < 2) return [];
    const header = lines[0].split('\t');
    return lines.slice(1).map(line => {
      const parts = line.split('\t');
      const obj = {};
      header.forEach((col, idx) => { obj[col] = parts[idx]; });
      return obj;
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error reading log file: ${filePath}: ${err}`);
    return [];
  }
}

// --- ATR calculation ---
function calculateATR(candles, period = 14) {
  if (!Array.isArray(candles) || candles.length < 2) return [];
  let atrs = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      atrs.push(null); // ATR not defined for first candle
      continue;
    }
    let trs = [];
    for (let j = Math.max(1, i - period + 1); j <= i; j++) {
      const cur = candles[j];
      const prev = candles[j-1];
      const high = Number(cur.high);
      const low = Number(cur.low);
      const prevClose = Number(prev.close);
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trs.push(tr);
    }
    const atr = trs.reduce((a, b) => a + b, 0) / trs.length;
    atrs.push(atr);
  }
  return atrs;
}

// --- Rolling win rate calculation ---
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

// --- Detect dominant periods (above threshold for min length) ---
function findDominantPeriods(winRates, results, threshold, minLength) {
  let periods = [], start = null;
  for (let i = 0; i < winRates.length; i++) {
    if (winRates[i] !== null && winRates[i] > threshold) {
      if (start === null) start = i;
    } else {
      if (start !== null && (i - start) >= minLength)
        periods.push({ start, end: i - 1 });
      start = null;
    }
  }
  if (start !== null && (winRates.length - start) >= minLength)
    periods.push({ start, end: winRates.length - 1 });
  // Merge contiguous/overlapping periods
  const merged = [];
  for (const p of periods) {
    if (merged.length && merged[merged.length - 1].end >= p.start - 1) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, p.end);
    } else {
      merged.push({ ...p });
    }
  }
  return merged.map(p => ({
    start_ts: results[p.start].timestamp,
    end_ts: results[p.end].timestamp,
    length: p.end - p.start + 1
  }));
}

// --- Find most recent 'win' for the winner model ---
function findRecentWinEntry(rows, winner_model) {
  const result_col = `${winner_model}_result`;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i][result_col] === 'win') return rows[i];
  }
  return null;
}

// --- Print analysis ---
function printAnalysisPerTimeframe(tf, results, winRateMap, active_model, win_rate, dominantPeriods) {
  const lastIdx = results.length - 1;
  const nowIso = new Date().toISOString();
  console.log(`[${nowIso}] [${tf}] Model winner: ${active_model} | Win rate: ${(win_rate || 0).toFixed(3)}`);
  console.log(`Log timestamp: ${results[lastIdx]?.timestamp || 'N/A'}`);
  console.log(`--- Rolling Win Rates (Window: ${WINDOW_SIZE}) ---`);
  for (const model of MODEL_LIST) {
    const periods = dominantPeriods[model];
    console.log(`[${tf}] ${model.toUpperCase()} Dominant Periods (win rate > ${DOMINANCE_THRESHOLD}):`);
    if (periods.length === 0) {
      console.log('  None');
    } else {
      const seen = new Set();
      periods.forEach(p => {
        const key = `${p.start_ts}|${p.end_ts}`;
        if (!seen.has(key)) {
          console.log(`  ${p.start_ts} - ${p.end_ts}, length: ${p.length}`);
          seen.add(key);
        }
      });
    }
  }
}

// --- Main analysis and output ---
function analyzeAndWriteMultiFrame() {
  const winnerObj = {};
  for (const tf of TIMEFRAMES) {
    const filePath = path.join(CHALLENGE_LOG_DIR, `challenge_${tf}.log`);
    const results = parseChallengeLogFile(filePath, MODEL_LIST);
    if (results.length === 0) {
      console.log(`[${new Date().toISOString()}] [${tf}] No challenge log data found.`);
      continue;
    }
    // Calculate ATR volatility for this timeframe
    const atrs = calculateATR(results, ATR_PERIOD);

    // Rolling win rates and dominant periods for all models
    const winRateMap = {};
    const dominantPeriods = {};
    for (const model of MODEL_LIST) {
      winRateMap[model] = rollingWinRate(results, model, WINDOW_SIZE);
      dominantPeriods[model] = findDominantPeriods(winRateMap[model], results, DOMINANCE_THRESHOLD, DOMINANCE_MIN_LENGTH);
    }

    // Winner model selection.
    // 1. Priority: dominant period
    // 2. Otherwise: highest win rate above threshold
    // 3. Otherwise: flag as 'no_winner'
    let active_model = null;
    let win_rate = 0;
    let dominance_found = false;
    for (const model of MODEL_LIST) {
      if (dominantPeriods[model].length > 0) {
        active_model = model;
        win_rate = winRateMap[model][results.length - 1] || 0;
        dominance_found = true;
        break;
      }
    }
    if (!dominance_found) {
      // fallback: use highest win rate above threshold
      for (const model of MODEL_LIST) {
        const wr = winRateMap[model][results.length - 1] || 0;
        if (wr > win_rate && wr >= MIN_WIN_RATE) {
          win_rate = wr;
          active_model = model;
        }
      }
    }
    // If no model meets MIN_WIN_RATE, flag as 'no_winner'
    if (!active_model) {
      active_model = 'no_winner';
      win_rate = 0;
    }

    // Find most recent win entry for the active_model (if there is a winner)
    let recentWin = null;
    let volatility = null;
    if (active_model !== 'no_winner') {
      recentWin = findRecentWinEntry(results, active_model);
      if (recentWin) {
        const idx = results.findIndex(r => r.timestamp === recentWin.timestamp);
        volatility = atrs[idx] || null;
      }
    }
    // For fallback, use latest candle
    if (!recentWin) {
      recentWin = results[results.length - 1];
      volatility = atrs[results.length - 1] || null;
    }

    winnerObj[tf] = {
      summary: {
        active_model,
        win_rate,
        dominant_periods: active_model !== 'no_winner' ? dominantPeriods[active_model] : [],
        analysis_timestamp: new Date().toISOString(),
        log_timestamp: results[results.length - 1].timestamp
      },
      recent_win: Object.assign({}, recentWin, { volatility })
    };

    printAnalysisPerTimeframe(tf, results, winRateMap, active_model, win_rate, dominantPeriods);
  }

  try {
    fs.writeFileSync(MODEL_WINNER_PATH, JSON.stringify(winnerObj, null, 2));
    console.log(`[${new Date().toISOString()}] model_winner.json updated.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error writing model_winner.json:`, err);
  }
}

function startContinuousAnalysis() {
  analyzeAndWriteMultiFrame();
  setInterval(analyzeAndWriteMultiFrame, CHALLENGE_INTERVAL_MS);
}

startContinuousAnalysis();
