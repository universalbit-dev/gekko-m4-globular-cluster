#!/usr/bin/env node
/**
 * evaluate.js (resilient)
 *
 * Improvements:
 * - Defensive file reads (safe JSON parsing, helpful errors)
 * - Accepts single data file or a directory / glob-like fallback
 * - Continues evaluating tests even if some indicators fail
 * - Writes output atomically and only if results change (prevents churn)
 * - Handles missing files gracefully instead of throwing unhandled rejections
 * - Clean shutdown handlers for long-running mode
 *
 * Usage:
 *  - One-shot: node tools/evaluation/evaluate.js
 *  - Continuous: set EVALUATE_INTERVAL_MS in .env (ms) or use --watch <ms>
 *
 * Notes:
 *  - evaluate.json must contain 'dataPath' (file or directory) and 'tests' array.
 *  - Use ENV overrides: EVALUATE_CONFIG or EVALUATE_DATA to override config/data path.
 */
const path = require('path');
const fs = require('fs');
const util = require('util');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// indicators map (require lazily to avoid startup crash if a file missing)
const indicators = {
  rsi: () => require('./indicator/RSI.js'),
  atr: () => require('./indicator/ATR.js'),
  adx: () => require('./indicator/ADX.js'),
  dx:  () => require('./indicator/DX.js'),
  sma: () => require('./indicator/SMA.js'),
};

// --- Helpers ---
function nowIso() { return new Date().toISOString(); }
function log(...args) { console.log('[EVALUATE]', nowIso(), '-', ...args); }
function debug(...args) { if (process.env.DEBUG) console.debug('[EVALUATE][DEBUG]', nowIso(), '-', ...args); }
function warn(...args) { console.warn('[EVALUATE][WARN]', nowIso(), '-', ...args); }
function err(...args) { console.error('[EVALUATE][ERROR]', nowIso(), '-', ...args); }

function safeReadJson(fp) {
  try {
    if (!fp || !fs.existsSync(fp)) return null;
    const txt = fs.readFileSync(fp, 'utf8');
    if (!txt) return null;
    return JSON.parse(txt);
  } catch (e) {
    err('safeReadJson parse error for', fp, e && e.message ? e.message : e);
    return null;
  }
}

function safeWriteJson(fp, obj) {
  try {
    const tmp = fp + '.tmp';
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
    fs.renameSync(tmp, fp);
    return true;
  } catch (e) {
    err('safeWriteJson failed for', fp, e && e.message ? e.message : e);
    return false;
  }
}

function fileExists(fp) {
  try { return fs.existsSync(fp); } catch { return false; }
}

function loadEvaluateConfig(configPath) {
  const cfg = safeReadJson(configPath);
  if (!cfg) throw new Error(`evaluate.json config not found or invalid JSON at ${configPath}`);
  if (!cfg.tests || !Array.isArray(cfg.tests) || !cfg.tests.length) throw new Error("evaluate.json 'tests' missing or empty");
  if (!cfg.dataPath || typeof cfg.dataPath !== 'string') throw new Error("evaluate.json 'dataPath' missing or invalid");
  return cfg;
}

function findDataFiles(dataPath) {
  // If it's a file and exists, return it.
  if (fileExists(dataPath) && fs.statSync(dataPath).isFile()) return [dataPath];

  // If provided path is a directory, find JSON files in it (non-recursive).
  if (fileExists(dataPath) && fs.statSync(dataPath).isDirectory()) {
    return fs.readdirSync(dataPath)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(dataPath, f))
      .filter(p => fileExists(p));
  }

  // If direct path didn't exist, try default logs directory relative to repo root (common layout)
  const fallbackDir = path.resolve(__dirname, '../logs/json/ohlcv');
  if (fileExists(fallbackDir) && fs.statSync(fallbackDir).isDirectory()) {
    const candidates = fs.readdirSync(fallbackDir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(fallbackDir, f))
      .filter(p => fileExists(p));
    if (candidates.length) return candidates;
  }

  // nothing found
  return [];
}

// scoring helpers (kept compatible with previous logic)
function absScore(values) { return values.reduce((acc, v) => acc + (v == null ? 0 : Math.abs(v)), 0); }
function profitScore(ohlcvArr, signals, params) {
  let position = 0, entry = 0, profit = 0;
  for (let i = 1; i < signals.length; ++i) {
    if (!position && params.buyLevel !== undefined && signals[i] < params.buyLevel) { position = 1; entry = ohlcvArr[i].close; }
    if (position && params.sellLevel !== undefined && signals[i] > params.sellLevel) { profit += ohlcvArr[i].close - entry; position = 0; }
  }
  if (position) profit += ohlcvArr[ohlcvArr.length - 1].close - entry;
  return profit;
}
function sharpeScore(returns) {
  if (!returns.length) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const stddev = Math.sqrt(variance);
  return stddev === 0 ? 0 : mean / stddev;
}
function hitRateScore(trades) {
  if (!trades.length) return 0;
  const wins = trades.filter(t => t > 0).length;
  return wins / trades.length;
}
function simulateTrades(ohlcvArr, signals, params) {
  let position = 0, entry = 0, trades = [];
  for (let i = 1; i < signals.length; ++i) {
    if (!position && params.buyLevel !== undefined && signals[i] < params.buyLevel) { position = 1; entry = ohlcvArr[i].close; }
    if (position && params.sellLevel !== undefined && signals[i] > params.sellLevel) { trades.push(ohlcvArr[i].close - entry); position = 0; }
  }
  if (position) trades.push(ohlcvArr[ohlcvArr.length - 1].close - entry);
  return trades;
}

const scoringMethods = {
  abs: (candles, values, params) => absScore(values),
  profit: (candles, values, params) => profitScore(candles, values, params),
  sharpe: (candles, values, params) => {
    let returns = [];
    for (let i = 1; i < candles.length; ++i) returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
    return sharpeScore(returns);
  },
  'hit-rate': (candles, values, params) => {
    const trades = simulateTrades(candles, values, params);
    return hitRateScore(trades);
  }
};

// Evaluate single file with configured tests
function evaluateFile(candles, config, outPrefix = '') {
  if (!Array.isArray(candles) || candles.length === 0) {
    warn(`${outPrefix} no candles to evaluate`);
    return [];
  }

  const results = [];
  for (const test of config.tests) {
    const indName = (test.indicator || '').toLowerCase();
    const params = test.params || {};
    const scoring = (test.scoring || 'abs').toLowerCase();
    const label = test.label || `${indName}:${JSON.stringify(params)}`;

    try {
      const indFactory = indicators[indName];
      if (!indFactory) {
        warn(`${outPrefix} unknown indicator '${indName}', skipping test`);
        continue;
      }
      const IndClass = indFactory();
      const indicator = new IndClass(params);

      const values = [];
      for (const c of candles) {
        // update indicator according to expected interface
        if (indName === 'rsi' || indName === 'sma') {
          indicator.update && indicator.update(c.close);
        } else {
          indicator.update && indicator.update(c);
        }
        const v = indicator.value ?? indicator.result ?? null;
        values.push(v);
      }

      const scorer = scoringMethods[scoring] || scoringMethods.abs;
      const score = scorer(candles, values, params);

      const extra = {};
      if (scoring === 'hit-rate') {
        const trades = simulateTrades(candles, values, params);
        extra.totalTrades = trades.length;
        extra.wins = trades.filter(t => t > 0).length;
        extra.losses = trades.filter(t => t <= 0).length;
      }

      results.push({
        indicator: indName,
        label,
        params,
        scoring,
        score,
        lastValue: values[values.length - 1],
        timestamp: candles[candles.length - 1]?.timestamp ?? Date.now(),
        ...extra
      });
    } catch (e) {
      warn(`${outPrefix} test failed for ${indName} ${util.inspect(test.params)}:`, e && e.message ? e.message : e);
      // continue to other tests
    }
  }
  return results;
}

function mergeResults(allResults) {
  // allResults is array of {file, results: [...]}
  // flatten with file reference
  const flat = [];
  for (const r of allResults) {
    for (const item of r.results) flat.push(Object.assign({}, item, { source: r.file }));
  }
  return flat;
}

// Main evaluate runner (single invocation)
function runEvaluateOnce(configPath) {
  try {
    const cfgPath = configPath || process.env.EVALUATE_CONFIG || path.join(__dirname, 'evaluate.json');
    if (!fileExists(cfgPath)) { warn('evaluate.json not found at', cfgPath); return null; }
    const config = loadEvaluateConfig(cfgPath);

    // allow override of data source via env
    const dataPath = path.resolve(process.env.EVALUATE_DATA || path.resolve(__dirname, config.dataPath));
    const dataFiles = findDataFiles(dataPath);
    if (!dataFiles.length) { warn('No OHLCV data files found at', dataPath); return null; }

    const allResults = [];
    for (const f of dataFiles) {
      let candles = null;
      try {
        candles = safeReadJson(f);
        if (!Array.isArray(candles) || !candles.length) { debug('file has no candles or not an array:', f); continue; }
      } catch (e) {
        warn('Failed to parse candles from', f, e && e.message ? e.message : e);
        continue;
      }
      const prefix = `[file ${path.basename(f)}]`;
      const res = evaluateFile(candles, config, prefix);
      allResults.push({ file: f, results: res });
    }

    const merged = mergeResults(allResults);

    // write output if requested in config
    const outPath = config.outputPath ? path.resolve(__dirname, config.outputPath) : null;
    if (outPath) {
      // only write if changed to reduce churn
      const existing = safeReadJson(outPath) || [];
      const changed = JSON.stringify(existing) !== JSON.stringify(merged);
      if (changed) {
        const ok = safeWriteJson(outPath, merged);
        if (ok) log('Evaluation complete. Results saved to', outPath);
        else warn('Evaluation completed but failed to write output to', outPath);
      } else {
        debug('Evaluation results unchanged; not writing', outPath);
      }
    } else {
      // print to stdout in verbose mode
      log('Evaluation results (stdout):');
      console.log(JSON.stringify(merged, null, 2));
    }
    return merged;
  } catch (e) {
    err('runEvaluateOnce error:', e && e.message ? e.message : e);
    return null;
  }
}

// Runner: either single run or interval-driven
async function main() {
  try {
    const intervalFromEnv = process.env.EVALUATE_INTERVAL_MS ? parseInt(process.env.EVALUATE_INTERVAL_MS, 10) : 0;
    const watchArg = parseInt(getArgVal('--watch', 0) || '0', 10);
    const interval = watchArg || intervalFromEnv || 0;

    if (interval > 0) {
      log(`Running continuously every ${interval}ms`);
      // first run immediately
      runEvaluateOnce();
      const iv = setInterval(() => {
        try { runEvaluateOnce(); } catch (e) { err('Interval run error:', e && e.message ? e.message : e); }
      }, interval);

      // graceful shutdown
      process.on('SIGINT', () => { log('SIGINT received, stopping'); clearInterval(iv); process.exit(0); });
      process.on('SIGTERM', () => { log('SIGTERM received, stopping'); clearInterval(iv); process.exit(0); });
    } else {
      // one-shot
      runEvaluateOnce();
    }
  } catch (e) {
    err('main error:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

// small CLI helper
function getArgVal(name, def = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return def;
  return process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}

if (require.main === module) main();

module.exports = { runEvaluateOnce, evaluateFile };
