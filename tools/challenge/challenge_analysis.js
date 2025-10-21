/**
 * challenge_analysis.js
 * - Rolling win-rate / dominance detector (single-model optimized)
 * - Uses last-N resolved events (non-pending) for robust live activation
 * - Atomic writes and non-overlap guard
 *
 * New behaviour:
 * - CHALLENGE_RECENT_EVENTS controls how many resolved events to examine (default 20)
 * - Analyzer activates winner if:
 *     a) dominant period detected, OR
 *     b) last-N resolved events >= MIN_EVENTS AND recent_win_rate >= MIN_WIN_RATE
 */
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const CHALLENGE_LOG_DIR = path.resolve(__dirname, './');
const MODEL_WINNER_PATH = path.resolve(__dirname, './model_winner.json');

const CHALLENGE_INTERVAL_MS = parseInt(process.env.CHALLENGE_INTERVAL_MS, 10) || 15 * 60 * 1000;
const WINDOW_SIZE = Math.max(3, parseInt(process.env.WINDOW_SIZE, 10) || 50);
const MIN_WIN_RATE = parseFloat(process.env.CHALLENGE_MIN_WIN_RATE) || 0.55;
const DOMINANCE_THRESHOLD = parseFloat(process.env.CHALLENGE_DOMINANCE_THRESHOLD) || 0.618;
const DOMINANCE_MIN_LENGTH = Math.max(3, parseInt(process.env.CHALLENGE_DOMINANCE_MIN_LENGTH, 10) || 8);
const ATR_PERIOD = Math.max(2, parseInt(process.env.CHALLENGE_ATR_PERIOD, 10) || 14);
const MIN_EVENTS = Math.max(1, parseInt(process.env.CHALLENGE_MIN_EVENTS, 10) || 5);

// NEW: how many resolved (win/loss) events to inspect for recent_win_rate
const CHALLENGE_RECENT_EVENTS = Math.max(1, parseInt(process.env.CHALLENGE_RECENT_EVENTS, 10) || 20);

const SINGLE_MODEL = (process.env.CHALLENGE_SINGLE_MODEL || 'tf').trim();
const MODEL_LIST = [SINGLE_MODEL];

const TIMEFRAMES = (process.env.CHALLENGE_TIMEFRAMES
  ? process.env.CHALLENGE_TIMEFRAMES.split(',').map(tf => tf.trim()).filter(Boolean)
  : ['1m','5m','15m','1h']);

// parse
function parseChallengeLogFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return [];
    const lines = raw.split('\n');
    if (lines.length < 2) return [];
    const header = lines[0].split('\t').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      const obj = {};
      for (let j = 0; j < header.length; j++) {
        const key = header[j] || `col${j}`;
        obj[key] = (parts[j] === undefined) ? '' : parts[j].trim();
      }
      ['open','high','low','close','volume','entry_price','next_price'].forEach(k => {
        if (typeof obj[k] === 'string' && obj[k] !== '') {
          const n = Number(obj[k]);
          if (!Number.isNaN(n)) obj[k] = n;
        }
      });
      rows.push(obj);
    }
    return rows;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error reading/parsing log file: ${filePath}:`, err && err.message);
    return [];
  }
}

// ATR fast
function calculateATRFast(candles, period = 14) {
  if (!Array.isArray(candles) || candles.length < 2) return new Array(candles.length).fill(null);
  const trs = new Array(candles.length).fill(0);
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    const high = Number(cur.high || 0);
    const low = Number(cur.low || 0);
    const prevClose = Number(prev.close || 0);
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trs[i] = tr;
  }
  const csum = new Array(trs.length).fill(0);
  for (let i = 1; i < trs.length; i++) csum[i] = csum[i - 1] + trs[i];
  const atrs = new Array(candles.length).fill(null);
  for (let i = 1; i < candles.length; i++) {
    const start = Math.max(1, i - period + 1);
    const totalTR = csum[i] - csum[start - 1];
    const count = i - start + 1;
    atrs[i] = count > 0 ? (totalTR / count) : null;
  }
  return atrs;
}

// rolling win rate (window)
function rollingWinRateSingle(results, model, windowSize) {
  const winRates = new Array(results.length).fill(null);
  let wins = 0;
  let denom = 0;
  const queue = [];
  for (let i = 0; i < results.length; i++) {
    const res = String(results[i][`${model}_result`] || '').toLowerCase();
    queue.push(res);
    if (res === 'win') wins++;
    if (res === 'win' || res === 'loss') denom++;
    if (queue.length > windowSize) {
      const old = queue.shift();
      if (old === 'win') wins--;
      if (old === 'win' || old === 'loss') denom--;
    }
    winRates[i] = denom > 0 ? (wins / denom) : null;
  }
  return winRates;
}

// find dominant periods
function findDominantPeriods(winRates, results, threshold, minLength) {
  const periods = [];
  let start = -1;
  for (let i = 0; i < winRates.length; i++) {
    if (winRates[i] !== null && winRates[i] > threshold) {
      if (start === -1) start = i;
    } else {
      if (start !== -1 && (i - start) >= minLength) {
        periods.push({ start, end: i - 1 });
      }
      start = -1;
    }
  }
  if (start !== -1 && (winRates.length - start) >= minLength) {
    periods.push({ start, end: winRates.length - 1 });
  }
  return periods.map(p => ({
    start_ts: results[p.start].timestamp,
    end_ts: results[p.end].timestamp,
    length: p.end - p.start + 1
  }));
}

// look back and compute recent win rate using resolved events (non-pending)
function computeRecentResolvedStats(rows, model, maxEvents) {
  let wins = 0, losses = 0, pending = 0;
  const resolved = [];
  for (let i = rows.length - 1; i >= 0 && resolved.length < maxEvents; i--) {
    const v = String(rows[i][`${model}_result`] || '').toLowerCase();
    if (v === 'win' || v === 'loss') {
      resolved.push(v);
      if (v === 'win') wins++;
      else losses++;
    } else {
      pending++;
    }
  }
  const totalResolved = wins + losses;
  const recentWinRate = totalResolved > 0 ? (wins / totalResolved) : 0;
  return { wins, losses, pending, totalResolved, recentWinRate, resolvedCount: totalResolved };
}

function findRecentWinEntry(rows, model) {
  const col = `${model}_result`;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][col]).toLowerCase() === 'win') return rows[i];
  }
  return null;
}

function printAnalysisPerTimeframe(tf, counts, active_model, win_rate, dominantPeriods, lastLogTs) {
  const nowIso = new Date().toISOString();
  console.log(`[${nowIso}] [${tf}] Model winner: ${active_model} | Win rate: ${(win_rate || 0).toFixed(3)}`);
  console.log(`Log timestamp: ${lastLogTs || 'N/A'}`);
  console.log(`Counts (wins/losses/pending in recent window): ${counts.wins}/${counts.losses}/${counts.pending} (resolved:${counts.totalResolved})`);
  console.log(`--- Dominant Periods (win rate > ${DOMINANCE_THRESHOLD}, minLen=${DOMINANCE_MIN_LENGTH}) ---`);
  if (!dominantPeriods || dominantPeriods.length === 0) {
    console.log('  None');
  } else {
    dominantPeriods.forEach(p => {
      console.log(`  ${p.start_ts} - ${p.end_ts} (len=${p.length})`);
    });
  }
}

function writeModelWinnerAtomic(targetPath, dataObj) {
  try {
    const tmp = `${targetPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(dataObj, null, 2), { encoding: 'utf8' });
    fs.renameSync(tmp, targetPath);
    console.log(`[${new Date().toISOString()}] model_winner.json updated.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error writing ${targetPath}:`, err && err.message);
  }
}

function analyzeAndWriteMultiFrame() {
  const out = {};
  for (const tf of TIMEFRAMES) {
    try {
      const filePath = path.join(CHALLENGE_LOG_DIR, `challenge_${tf}.log`);
      const rows = parseChallengeLogFile(filePath);
      if (!rows || rows.length === 0) {
        console.log(`[${new Date().toISOString()}] [${tf}] No challenge log data found.`);
        continue;
      }

      const atrs = calculateATRFast(rows, ATR_PERIOD);
      const winRates = rollingWinRateSingle(rows, SINGLE_MODEL, WINDOW_SIZE);
      const dominantPeriods = findDominantPeriods(winRates, rows, DOMINANCE_THRESHOLD, DOMINANCE_MIN_LENGTH);

      // NEW: compute recent resolved event stats (non-pending)
      const stats = computeRecentResolvedStats(rows, SINGLE_MODEL, CHALLENGE_RECENT_EVENTS);

      // selection: prefer dominant periods; else check recent resolved events
      let active_model = 'no_winner';
      let final_win_rate = 0;
      if (dominantPeriods.length > 0) {
        active_model = SINGLE_MODEL;
        final_win_rate = winRates[winRates.length - 1] || 0;
      } else {
        if (stats.resolvedCount >= MIN_EVENTS && stats.recentWinRate >= MIN_WIN_RATE) {
          active_model = SINGLE_MODEL;
          final_win_rate = stats.recentWinRate;
        }
      }

      // recent win or fallback
      let recentWin = null;
      if (active_model !== 'no_winner') recentWin = findRecentWinEntry(rows, SINGLE_MODEL);
      if (!recentWin) recentWin = rows[rows.length - 1];
      const idx = rows.findIndex(r => r.timestamp === recentWin.timestamp);
      const volatility = (idx >= 0) ? (atrs[idx] || null) : null;

      out[tf] = {
        summary: {
          active_model,
          win_rate: final_win_rate,
          dominant_periods: active_model !== 'no_winner' ? dominantPeriods : [],
          analysis_timestamp: new Date().toISOString(),
          log_timestamp: rows[rows.length - 1].timestamp
        },
        recent_win: Object.assign({}, recentWin, { volatility })
      };

      printAnalysisPerTimeframe(tf, stats, active_model, final_win_rate, dominantPeriods, out[tf].summary.log_timestamp);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error analyzing timeframe ${tf}:`, err && err.message);
    }
  }

  writeModelWinnerAtomic(MODEL_WINNER_PATH, out);
}

let _running = false;
function startContinuousAnalysis() {
  async function tick() {
    if (_running) {
      console.log(`[${new Date().toISOString()}] Previous analysis still running, skipping this interval.`);
      return;
    }
    _running = true;
    try {
      analyzeAndWriteMultiFrame();
    } finally {
      _running = false;
    }
  }

  tick();
  setInterval(tick, CHALLENGE_INTERVAL_MS);
}

startContinuousAnalysis();
