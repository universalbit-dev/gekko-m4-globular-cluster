/**
 * Microstructure trading bot: Modular, auto-tuned, multi-indicator, multi-timeframe.
 * Features: Trailing stops, adaptive thresholds, partial exits, multi-frame confirmation, adaptive sizing, smart re-entry logic.
 * Uses explorer.js OHLCV multi-timeframe prediction files from ../logs/json/ohlcv.
 * WARNING: Executes real trades if credentials are set!
 */

const path = require('path');
const fs = require('fs');
const ccxt = require('ccxt');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { scoreTrade } = require('../tradeQualityScore');

// --- Modular Indicator Integration ---
const indicatorModules = {
  RSI: require('../evaluation/indicator/RSI'),
  ADX: require('../evaluation/indicator/ADX'),
  DX: require('../evaluation/indicator/DX'),
  ATR: require('../evaluation/indicator/ATR'),
  SMA: require('../evaluation/indicator/SMA'),
};

// --- Load Auto-Tune Results ---
const AUTOTUNE_PATH = path.resolve(__dirname, '../evaluation/autoTune_results.json');
let autoTuneParams = {};
function loadAutoTuneParams() {
  try {
    if (fs.existsSync(AUTOTUNE_PATH)) {
      autoTuneParams = JSON.parse(fs.readFileSync(AUTOTUNE_PATH));
      console.log('[INFO] Loaded auto-tuned indicator params:', autoTuneParams);
    }
  } catch (err) {
    console.warn('[WARN] Error loading autoTune_results.json:', err.message);
  }
}
loadAutoTuneParams();
fs.watchFile(AUTOTUNE_PATH, { interval: 60000 }, loadAutoTuneParams);

// --- Helper to get best param for each indicator ---
function getBestIndicatorParams() {
  // You can pick metric: 'profit', 'sharpe', 'hit-rate', etc.
  // Here 'profit' is chosen for earning potential
  return {
    RSI: { interval: autoTuneParams?.rsi?.profit ?? 14 },
    ADX: { period: autoTuneParams?.adx?.profit ?? 14 },
    DX:  { period: autoTuneParams?.dx?.profit ?? 14 },
    ATR: { period: autoTuneParams?.atr?.profit ?? 14 },
    SMA: { interval: autoTuneParams?.sma?.profit ?? 14 }
  };
}

// --- Dynamic indicator configs using auto-tuned params ---
function buildIndicatorConfigs() {
  const best = getBestIndicatorParams();
  return [
    { name: "RSI", params: best.RSI },
    { name: "ADX", params: best.ADX },
    { name: "DX",  params: best.DX },
    { name: "ATR", params: best.ATR },
    { name: "SMA", params: best.SMA },
  ];
}

// === CONFIG: Set Timeframe ===
const TIMEFRAME = process.env.MICRO_TIMEFRAME || '1m';

// === Load Best Backtest Parameters for This Timeframe (Hot-reload) ===
let bestParams = null;
let strategyName = null;

function loadBestParams() {
  try {
    const BACKTEST_PATH = path.resolve(__dirname, '../backtest_results.json');
    if (fs.existsSync(BACKTEST_PATH)) {
      const allResults = JSON.parse(fs.readFileSync(BACKTEST_PATH));
      const tfResults = Array.isArray(allResults)
        ? allResults.find(r => r.timeframe === TIMEFRAME)
        : null;
      if (tfResults && Array.isArray(tfResults.results) && tfResults.results.length > 0) {
        const best = tfResults.results.reduce((best, curr) =>
          curr.stats.totalPNL > best.stats.totalPNL ? curr : best, tfResults.results[0]
        );
        bestParams = best.params;
        strategyName = bestParams.name || 'Unnamed';
        console.log(`[INFO] Loaded best params for ${TIMEFRAME} from backtest_results.json:`, bestParams);
      } else {
        console.warn(`[WARN] No backtest params found for timeframe ${TIMEFRAME}, using .env/defaults.`);
      }
    } else {
      console.warn('[WARN] backtest_results.json not found, using .env/defaults.');
    }
  } catch (err) {
    console.warn('[WARN] Error loading backtest_results.json:', err.message, 'Using .env/defaults.');
  }
}
loadBestParams();
fs.watchFile(path.resolve(__dirname, '../backtest_results.json'), { interval: 5000 }, () => {
  const prevStrategy = strategyName;
  loadBestParams();
  if (strategyName !== prevStrategy) {
    console.log(`[ALERT] Strategy switched to ${strategyName} for ${TIMEFRAME}. Params:`, bestParams);
  }
});

// === Bot Config ===
const cfg = {
  EXCHANGE: process.env.EXCHANGE || 'kraken',
  API_KEY: process.env.KEY || '',
  API_SECRET: process.env.SECRET || '',
  PAIR: process.env.PAIR || 'BTC/EUR',
  MICRO_ORDER_AMOUNT: +process.env.MICRO_ORDER_AMOUNT || 0.0001,
  MICRO_MIN_ALLOWED_ORDER_AMOUNT: +process.env.MICRO_MIN_ALLOWED_ORDER_AMOUNT || 0.0001,
  MICRO_MAX_ORDER_AMOUNT: +process.env.MICRO_MAX_ORDER_AMOUNT || 0.002,
  INTERVAL_MS: +process.env.MICRO_INTERVAL_MS || 60000,
  BASE_PROFIT_PCT: bestParams?.profit_pct ?? +process.env.BASE_PROFIT_PCT ?? 0.003,
  BASE_LOSS_PCT: bestParams?.loss_pct ?? +process.env.BASE_LOSS_PCT ?? 0.003,
  TRAIL_STEP_PCT: 0.002,
  PARTIAL_EXIT_FRACTION: 0.5,
  MICRO_RSI_PERIOD: +process.env.MICRO_RSI_PERIOD || 3,
  MICRO_PVVM_WINDOW: +process.env.MICRO_PVVM_WINDOW || 3,
  MICRO_PVD_WINDOW: +process.env.MICRO_PVD_WINDOW || 3,
  FIB_HOLD_MS: [0, 10000, 16000, 26000, 42000, 68000, 110000, 178000, 288000, 466000, 754000, 1220000, 1974000, 3194000, 5168000],
  FIB_HOLD_INDEX: +process.env.FIB_HOLD_INDEX || 2,
  MIN_HOLD_MS: bestParams?.min_hold ?? (+process.env.MIN_HOLD_MS || undefined),
  OHLCV_DIR: path.resolve(__dirname, '../logs/json/ohlcv'),
  TIMEFRAME,
  MAX_TRADES_PER_DAY: +process.env.MICRO_MAX_TRADES_PER_DAY || 10,
  MICRO_TRADE_QUALITY_THRESHOLD: bestParams?.trade_quality ?? +process.env.MICRO_TRADE_QUALITY_THRESHOLD ?? 55,
};
cfg.MIN_HOLD_MS = cfg.MIN_HOLD_MS || cfg.FIB_HOLD_MS[cfg.FIB_HOLD_INDEX] || 16000;
const PREDICTION_FILE = path.join(cfg.OHLCV_DIR, `ohlcv_ccxt_data_${cfg.TIMEFRAME}_prediction.json`);
const MULTIFRAME_FILES = ['1m', '5m', '15m', '1h'].map(tf => path.join(cfg.OHLCV_DIR, `ohlcv_ccxt_data_${tf}_prediction.json`));
const ORDER_LOG_PATH = path.resolve(__dirname, '../logs/micro_order.log');

// === State ===
let tradesToday = 0, lastTradeDay = (new Date()).getUTCDate(), isRunning = false;
let lastTradeTimestamp = 0, positionOpen = false, entryPrice = null, entryTimestamp = null, trailingStopPrice = null, orderSize = cfg.MICRO_ORDER_AMOUNT;
let allowReentry = true, positionType = null, enteredThisCycle = false;

// === Exchange Init ===
const exchangeClass = ccxt[cfg.EXCHANGE];
if (!exchangeClass) {
  console.error(`[DEBUG] Exchange '${cfg.EXCHANGE}' not supported by ccxt.`);
  process.exit(1);
}
const exchange = new exchangeClass({ apiKey: cfg.API_KEY, secret: cfg.API_SECRET, enableRateLimit: true });

// === Utility Functions ===
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

function calcPVDPVVMFromPredictionFile(jsonFile, priceKey = 'close', windowPVVM = cfg.MICRO_PVVM_WINDOW, windowPVD = cfg.MICRO_PVD_WINDOW) {
  try {
    if (!fs.existsSync(jsonFile)) return { PVVM: 0, PVD: 0 };
    const arr = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    if (!Array.isArray(arr) || arr.length === 0) return { PVVM: 0, PVD: 0 };
    const recentPVVM = arr.slice(-windowPVVM).map(obj => +obj[priceKey]).filter(Number.isFinite);
    const recentPVD = arr.slice(-windowPVD).map(obj => +obj[priceKey]).filter(Number.isFinite);
    if (recentPVVM.length < windowPVVM || recentPVD.length < windowPVD) return { PVVM: 0, PVD: 0 };
    const meanPVVM = recentPVVM.reduce((a, b) => a + b, 0) / recentPVVM.length;
    const PVVM = recentPVVM.reduce((a, b) => a + Math.abs(b - meanPVVM), 0) / recentPVVM.length;
    const PVD = recentPVD.length > 1 ? recentPVD.slice(1).reduce((sum, v, i) => sum + Math.abs(v - recentPVD[i]), 0) / (recentPVD.length - 1) : 0;
    return { PVVM, PVD };
  } catch (e) {
    console.debug(`[DEBUG] Failed to parse prediction file: ${jsonFile}`, e.message);
    return { PVVM: 0, PVD: 0 };
  }
}

// --- Modular Indicator Scoring ---
function getIndicatorScores(candles) {
  const configs = buildIndicatorConfigs();
  const scores = {};
  for (const cfg of configs) {
    const Indicator = indicatorModules[cfg.name];
    const ind = new Indicator(cfg.params);
    const values = [];
    for (const candle of candles) {
      if (cfg.name === "RSI" || cfg.name === "SMA") ind.update(candle.close);
      else ind.update(candle);
      values.push(ind.value ?? ind.result ?? null);
    }
    scores[cfg.name] = values;
  }
  return scores;
}

// --- Other utility functions remain unchanged ---
// ... (rest of your file as before)

