/**
 * Macrostructure trading bot: auto-tuned PVVM/PVD, robust signal updates.
 * Auto-selects best timeframe ('1m','5m','15m','1h') using model_winner.json.
 * Uses explorer.js OHLCV JSON multi-timeframe prediction files.
 * Executes real trades if credentials are set!
 * Optimized: Dynamic RSI/ATR per timeframe, granular debug logging, clear skip reasons, easier tuning.
 * Further optimized for readability, error handling, and performance.
 */

const path = require('path');
const fs = require('fs');
const ccxt = require('ccxt');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const scoreRSI = require('./evaluation/score/rsi_score');
const scoreATR = require('./evaluation/score/atr_score');
const { getBestParam } = require('./getBestParams');
const { scoreTrade } = require('./tradeQualityScore'); // <== Trade Quality Integration
const autoTuneResultsPath = path.resolve(__dirname, './evaluation/autoTune_results.json');

// --- Config from .env ---
const LOGS_DIR = path.resolve(__dirname, './logs');
const ORDER_LOG_PATH = path.join(LOGS_DIR, 'ccxt_order.log');
const OHLCV_DIR = path.resolve(__dirname, './logs/json/ohlcv');
const OHLCV_CANDLE_SIZES = (process.env.OHLCV_CANDLE_SIZE || '1m,5m,15m,1h').split(',').map(s => s.trim()).filter(Boolean);

const EXCHANGE = process.env.EXCHANGE || 'kraken';
const API_KEY = process.env.KEY || '';
const API_SECRET = process.env.SECRET || '';
const PAIR = process.env.PAIR || 'BTC/EUR';
const ORDER_AMOUNT = parseFloat(process.env.ORDER_AMOUNT) || 0.0001;
const MIN_ALLOWED_ORDER_AMOUNT = parseFloat(process.env.MIN_ALLOWED_ORDER_AMOUNT) || 0.0001;
const MAX_ORDER_AMOUNT = parseFloat(process.env.MAX_ORDER_AMOUNT) || 0.01;

const INTERVAL_AFTER_TRADE = parseInt(process.env.INTERVAL_AFTER_TRADE, 10) || 30000;
const INTERVAL_AFTER_SKIP = parseInt(process.env.INTERVAL_AFTER_SKIP, 10) || 90000;
const INTERVAL_AFTER_HOLD = parseInt(process.env.INTERVAL_AFTER_HOLD, 10) || 180000;
const INTERVAL_AFTER_ERROR = parseInt(process.env.INTERVAL_AFTER_ERROR, 10) || 60000;

const STOP_LOSS_PCT = parseFloat(process.env.STOP_LOSS_PCT) || 0.003;
const TAKE_PROFIT_PCT = parseFloat(process.env.TAKE_PROFIT_PCT) || 0.006;

const WINNER_MODEL_PATH = path.resolve(__dirname, './challenge/model_winner.json');

const MIN_WIN_RATE = parseFloat(process.env.MACRO_MIN_WIN_RATE) || 0.2;
const MAX_VOLATILITY = parseFloat(process.env.MACRO_MAX_VOLATILITY) || 100;

// --- Exchange Init ---
const exchangeClass = ccxt[EXCHANGE];
if (!exchangeClass) {
  console.error(`[DEBUG] Exchange '${EXCHANGE}' not supported by ccxt.`);
  process.exit(1);
}
const exchange = new exchangeClass({
  apiKey: API_KEY,
  secret: API_SECRET,
  enableRateLimit: true,
});

// --- State ---
let isRunning = false;
let positionOpen = false;
let entryPrice = null;
let lastTradeTimestamp = 0;

// --- Utility Functions ---
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

function getRSIInterval(tf) {
  if (tf === "1m") return 6;
  if (tf === "5m") return 12;
  if (tf === "15m") return 14;
  if (tf === "1h") return 21;
  return getBestParam('rsi', 'profit', autoTuneResultsPath) ?? 14;
}
function getATRInterval(tf) {
  if (tf === "1m") return 8;
  if (tf === "5m") return 14;
  if (tf === "15m") return 21;
  if (tf === "1h") return 28;
  return getBestParam('atr', 'profit', autoTuneResultsPath) ?? 14;
}

function calcPVDPVVMFromPredictionFile(jsonFile, priceKey = 'close', windowPVVM = 13, windowPVD = 8) {
  if (!fs.existsSync(jsonFile)) return { PVVM: 0, PVD: 0 };
  try {
    const arr = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    if (!Array.isArray(arr) || arr.length === 0) return { PVVM: 0, PVD: 0 };
    const recentPVVM = arr.slice(-windowPVVM).map(obj => parseFloat(obj[priceKey])).filter(Number.isFinite);
    const recentPVD = arr.slice(-windowPVD).map(obj => parseFloat(obj[priceKey])).filter(Number.isFinite);
    if (recentPVVM.length < windowPVVM || recentPVD.length < windowPVD) return { PVVM: 0, PVD: 0 };
    const meanPVVM = recentPVVM.reduce((a, b) => a + b, 0) / recentPVVM.length;
    const PVVM = recentPVVM.reduce((a, b) => a + Math.abs(b - meanPVVM), 0) / recentPVVM.length;
    let diffSum = 0;
    for (let i = 1; i < recentPVD.length; ++i) diffSum += Math.abs(recentPVD[i] - recentPVD[i - 1]);
    const PVD = recentPVD.length > 1 ? diffSum / (recentPVD.length - 1) : 0;
    return { PVVM, PVD };
  } catch {
    return { PVVM: 0, PVD: 0 };
  }
}

function loadProcessedSignals() {
  if (!fs.existsSync(ORDER_LOG_PATH)) return new Set();
  return new Set(fs.readFileSync(ORDER_LOG_PATH, 'utf8')
    .trim().split('\n')
    .map(line => line.split('\t'))
    .filter(parts => parts.length >= 4)
    .map(parts => parts[1] + '|' + parts[2] + '|' + (parts[3] || '')));
}

function loadLatestSignals(timeframes, dir) {
  return timeframes.map(tf => {
    const fp = path.join(dir, `ohlcv_ccxt_data_${tf}_prediction.json`);
    if (!fs.existsSync(fp)) return null;
    try {
      const arr = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (arr.length > 0) {
        const last = arr[arr.length - 1];
        last.timeframe = tf;
        return last;
      }
    } catch (err) {
      console.warn(`[DEBUG] [SIGNAL LOAD] Error reading ${fp}:`, err);
    }
    return null;
  }).filter(Boolean);
}

function loadWinnerAnalysis() {
  try { return JSON.parse(fs.readFileSync(WINNER_MODEL_PATH, 'utf8')); }
  catch { return {}; }
}

async function fetchTickerAndBalance() {
  const pair = PAIR.toUpperCase();
  const [ticker, balance] = await Promise.all([
    exchange.fetchTicker(pair),
    exchange.fetchBalance()
  ]);
  return { ticker, balance };
}

function hasEnoughBalance(balance, action, orderSize, currentPrice) {
  const [base, quote] = PAIR.split('/').map(s => s.toUpperCase());
  if (action === 'BUY') return (balance.free[quote] || 0) >= orderSize * currentPrice;
  if (action === 'SELL') return (balance.free[base] || 0) >= orderSize;
  return false;
}

function logOrder({
  timestamp, model, prediction, label, action, result, reason, error = null, fullSignal, rsiScores, atrScores,
  win_rate, dominant_periods, volatility, active_model, tradeQualityScore = null, tradeQualityBreakdown = null
}) {
  const logLine = [
    new Date().toISOString(),
    timestamp, model, prediction, label || '', action,
    error ? `ERROR: ${error}` : 'SUCCESS',
    error ? '' : JSON.stringify(result),
    reason || '', fullSignal ? JSON.stringify(fullSignal) : '',
    rsiScores ? JSON.stringify(rsiScores) : '', atrScores ? JSON.stringify(atrScores) : '',
    win_rate ?? '', volatility ?? '', active_model ?? '',
    dominant_periods ? JSON.stringify(dominant_periods) : '',
    tradeQualityScore !== null ? tradeQualityScore : '',
    tradeQualityBreakdown !== null ? JSON.stringify(tradeQualityBreakdown) : ''
  ].join('\t') + '\n';
  fs.appendFileSync(ORDER_LOG_PATH, logLine);
}

function canTradeNow(currentTimestamp) {
  return !lastTradeTimestamp || new Date(currentTimestamp).getTime() - lastTradeTimestamp > 120000;
}

async function syncPosition() {
  try {
    const balance = await exchange.fetchBalance();
    const base = PAIR.split('/')[0].toUpperCase();
    positionOpen = balance.total[base] > MIN_ALLOWED_ORDER_AMOUNT * 1.2;
    entryPrice = null;
    console.log(`[Startup] ${positionOpen ? "Detected open position in " + base : "No open position detected. Starting flat."}`);
  } catch (err) {
    console.error('[DEBUG] Error syncing position:', err.message || err);
  }
}

function scheduleNext(ms, reason = "") {
  if (reason) console.log(`[DEBUG] Scheduling next run in ${ms / 1000}s. Reason: ${reason}`);
  else console.log(`[DEBUG] Scheduling next run in ${ms / 1000}s`);
  setTimeout(main, ms);
}

function selectBestTimeframe(winnerAnalysis, candleSizes) {
  let bestTf = null, bestScore = -Infinity;
  for (const tf of candleSizes) {
    const info = winnerAnalysis[tf];
    if (!info || !info.summary) continue;
    const winRate = info.summary.win_rate || 0;
    const volatility = info.recent_win?.volatility || Infinity;
    if (info.summary.active_model === 'no_winner' || volatility > MAX_VOLATILITY) continue;
    if (winRate > bestScore) {
      bestScore = winRate;
      bestTf = tf;
    }
  }
  return bestTf || candleSizes[0];
}

// --- Main Trading Logic ---
async function main() {
  if (isRunning) {
    console.warn(`[DEBUG] Previous cycle still running, skipping at ${new Date().toISOString()}.`);
    return;
  }
  isRunning = true;
  let nextInterval = INTERVAL_AFTER_HOLD;
  try {
    // Batch PVVM/PVD calculations (future: use for optimization/scoring)
    const pvvmPvdByTf = Object.fromEntries(
      OHLCV_CANDLE_SIZES.map(tf => [
        tf,
        calcPVDPVVMFromPredictionFile(
          path.join(OHLCV_DIR, `ohlcv_ccxt_data_${tf}_prediction.json`),
          'close', 13, 8
        )
      ])
    );

    const signals = loadLatestSignals(OHLCV_CANDLE_SIZES, OHLCV_DIR);
    if (signals.length === 0) {
      scheduleNext(nextInterval, "No multi-timeframe prediction signals found.");
      isRunning = false; return;
    }

    const winnerAnalysis = loadWinnerAnalysis();
    const tf = selectBestTimeframe(winnerAnalysis, OHLCV_CANDLE_SIZES);
    const info = winnerAnalysis[tf] || {};
    const summary = info.summary || {};
    const recentWin = info.recent_win || {};

    let lastSignal = signals.find(s => s.timeframe === tf && s.ensemble_label === recentWin.winner_label)
      || signals.find(s => s.timeframe === tf)
      || signals[signals.length - 1];
    if (!lastSignal) {
      scheduleNext(nextInterval, "No valid signal selected.");
      isRunning = false; return;
    }

    const winnerModel = summary.active_model;
    const predCol = `prediction_${winnerModel}`;
    const labelCol = `label_${winnerModel}`;
    const prediction = lastSignal[predCol] || lastSignal.ensemble_label;
    const label = lastSignal[labelCol] || lastSignal.ensemble_label;
    const price = parseFloat(lastSignal.close);

    // --- Dynamic RSI/ATR scoring & thresholds ---
    const rsiInterval = getRSIInterval(tf);
    const atrInterval = getATRInterval(tf);
    const scoreParams = {
      symbol: PAIR, exchange: EXCHANGE, timeframes: [tf],
      interval: rsiInterval, period: atrInterval, dataDir: OHLCV_DIR
    };
    const rsiScores = scoreRSI(scoreParams), atrScores = scoreATR(scoreParams);
    const rsiTf = rsiScores[tf];
    const RSI_BUY = 30, RSI_SELL = 70;

    const win_rate = summary.win_rate, dominant_periods = summary.dominant_periods;
    const volatility = recentWin.volatility, active_model = summary.active_model;

    // --- Validate signal & log each skip reason ---
    if (!lastSignal.timestamp || isNaN(price) || !label) {
      scheduleNext(INTERVAL_AFTER_SKIP, `Skipping invalid signal: ${JSON.stringify(lastSignal)}`);
      isRunning = false; return;
    }
    const processedSignals = loadProcessedSignals();
    const signalKey = `${lastSignal.timestamp}|${prediction}|${label}`;
    if (processedSignals.has(signalKey)) {
      scheduleNext(INTERVAL_AFTER_SKIP, "Signal already processed.");
      isRunning = false; return;
    }
    if (!canTradeNow(lastSignal.timestamp)) {
      scheduleNext(INTERVAL_AFTER_SKIP, `Aggregation interval not met for trade. Last: ${lastTradeTimestamp}, Current: ${lastSignal.timestamp}`);
      isRunning = false; return;
    }
    if (winnerModel === "no_winner") {
      scheduleNext(INTERVAL_AFTER_SKIP, "No active winner model for this timeframe.");
      isRunning = false; return;
    }
    if (win_rate < MIN_WIN_RATE) {
      scheduleNext(INTERVAL_AFTER_SKIP, `Win rate too low (${win_rate}).`);
      isRunning = false; return;
    }
    if (volatility >= MAX_VOLATILITY) {
      scheduleNext(INTERVAL_AFTER_SKIP, `Volatility too high (${volatility}).`);
      isRunning = false; return;
    }

    const { ticker, balance } = await fetchTickerAndBalance();
    const currentPrice = ticker.last;
    let orderSize = clamp(ORDER_AMOUNT, MIN_ALLOWED_ORDER_AMOUNT, MAX_ORDER_AMOUNT);

    // --- Trade Quality Score (pre-trade) ---
    const tradeQuality = scoreTrade({
      signalStrength: label === 'strong_bull' ? 90 : label === 'strong_bear' ? 90 : 50,
      modelWinRate: win_rate,
      riskReward: TAKE_PROFIT_PCT / STOP_LOSS_PCT,
      executionQuality: 90, // refine based on your fee/slippage metrics
      volatility,
      tradeOutcome: null
    });

    console.log(`[DEBUG] Trade Quality Score (pre-trade): ${tradeQuality.totalScore}`, tradeQuality.breakdown);

    // Optionally skip low-quality trades
    if (tradeQuality.totalScore < 70) {
      logOrder({
        timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
        win_rate, dominant_periods, volatility, active_model, action: 'SKIP',
        result: null, reason: `Trade quality score too low (${tradeQuality.totalScore})`, fullSignal: lastSignal, rsiScores, atrScores,
        tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
      });
      scheduleNext(INTERVAL_AFTER_SKIP, `Trade quality score too low (${tradeQuality.totalScore})`);
      isRunning = false; return;
    }

    // --- BUY logic ---
    if (!positionOpen &&
      recentWin.winner_label === 'strong_bull' &&
      rsiTf !== null && rsiTf < RSI_BUY) {
      if (!hasEnoughBalance(balance, 'BUY', orderSize, currentPrice)) {
        logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
          win_rate, dominant_periods, volatility, active_model, action: 'BUY',
          result: null, reason: 'Insufficient balance for BUY', fullSignal: lastSignal, rsiScores, atrScores,
          tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        scheduleNext(INTERVAL_AFTER_SKIP, "Insufficient balance for BUY.");
        isRunning = false; return;
      }
      try {
        const result = await exchange.createMarketBuyOrder(PAIR, orderSize);
        positionOpen = true; entryPrice = result.price || result.average || currentPrice;
        logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
          win_rate, dominant_periods, volatility, active_model, action: 'BUY',
          result, reason: `Winner strong_bull & RSI < ${RSI_BUY} on ${tf} (RSI=${rsiTf}, interval=${rsiInterval})`, fullSignal: lastSignal, rsiScores, atrScores,
          tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        lastTradeTimestamp = Number(lastSignal.timestamp);
        console.log(`[DEBUG] [${lastSignal.timestamp}] BUY order submitted on ${tf}`);
        scheduleNext(INTERVAL_AFTER_TRADE, "BUY order submitted.");
      } catch (err) {
        logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
          win_rate, dominant_periods, volatility, active_model, action: 'BUY',
          result: null, reason: 'Failed to submit BUY', error: err.message || err, fullSignal: lastSignal, rsiScores, atrScores,
          tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        scheduleNext(INTERVAL_AFTER_ERROR, "Failed to submit BUY.");
      }
      isRunning = false; return;
    } else if (!positionOpen && recentWin.winner_label !== 'strong_bull') {
      scheduleNext(INTERVAL_AFTER_SKIP, `No strong_bull winner label for BUY. (Current=${recentWin.winner_label})`);
      isRunning = false; return;
    } else if (!positionOpen && (rsiTf === null || rsiTf >= RSI_BUY)) {
      scheduleNext(INTERVAL_AFTER_SKIP, `RSI threshold not met for BUY (RSI=${rsiTf}, interval=${rsiInterval}).`);
      isRunning = false; return;
    }
    if (positionOpen &&
      recentWin.winner_label === 'strong_bear' &&
      rsiTf !== null && rsiTf > RSI_SELL) {
      if (!hasEnoughBalance(balance, 'SELL', orderSize, currentPrice)) {
        logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
          win_rate, dominant_periods, volatility, active_model, action: 'SELL',
          result: null, reason: 'Insufficient balance for SELL', fullSignal: lastSignal, rsiScores, atrScores,
          tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        scheduleNext(INTERVAL_AFTER_SKIP, "Insufficient balance for SELL.");
        isRunning = false; return;
      }
      try {
        const result = await exchange.createMarketSellOrder(PAIR, orderSize);

        // --- Trade Quality Score (post-trade) ---
        const actualOutcome = ((currentPrice - entryPrice) / entryPrice) * 100;
        const postTradeQuality = scoreTrade({
          signalStrength: label === 'strong_bear' ? 90 : 50,
          modelWinRate: win_rate,
          riskReward: TAKE_PROFIT_PCT / STOP_LOSS_PCT,
          executionQuality: 90,
          volatility,
          tradeOutcome: actualOutcome
        });

        positionOpen = false;
        logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
          win_rate, dominant_periods, volatility, active_model, action: 'SELL',
          result, reason: `Winner strong_bear & RSI > ${RSI_SELL} on ${tf} (RSI=${rsiTf}, interval=${rsiInterval})`, fullSignal: lastSignal, rsiScores, atrScores,
          tradeQualityScore: postTradeQuality.totalScore, tradeQualityBreakdown: postTradeQuality.breakdown
        });
        lastTradeTimestamp = Number(lastSignal.timestamp);
        console.log(`[DEBUG] [${lastSignal.timestamp}] SELL order submitted on ${tf}`);
        scheduleNext(INTERVAL_AFTER_TRADE, "SELL order submitted.");
      } catch (err) {
        logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
          win_rate, dominant_periods, volatility, active_model, action: 'SELL',
          result: null, reason: 'Failed to submit SELL', error: err.message || err, fullSignal: lastSignal, rsiScores, atrScores,
          tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
        });
        scheduleNext(INTERVAL_AFTER_ERROR, "Failed to submit SELL.");
      }
      isRunning = false; return;
    } else if (positionOpen && recentWin.winner_label !== 'strong_bear') {
      scheduleNext(INTERVAL_AFTER_SKIP, `No strong_bear winner label for SELL. (Current=${recentWin.winner_label})`);
      isRunning = false; return;
    } else if (positionOpen && (rsiTf === null || rsiTf <= RSI_SELL)) {
      scheduleNext(INTERVAL_AFTER_SKIP, `RSI threshold not met for SELL (RSI=${rsiTf}, interval=${rsiInterval}).`);
      isRunning = false; return;
    }

    // --- SL/TP ---
    if (positionOpen && entryPrice) {
      const stopLossPrice = entryPrice * (1 - STOP_LOSS_PCT);
      const takeProfitPrice = entryPrice * (1 + TAKE_PROFIT_PCT);
      if (currentPrice <= stopLossPrice) {
        if (!hasEnoughBalance(balance, 'SELL', orderSize, currentPrice)) {
          logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
            win_rate, dominant_periods, volatility, active_model, action: 'STOP_LOSS',
            result: null, reason: 'Insufficient balance for STOP_LOSS', fullSignal: lastSignal, rsiScores, atrScores,
            tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
          });
          scheduleNext(INTERVAL_AFTER_SKIP, "Insufficient balance for STOP_LOSS.");
          isRunning = false; return;
        }
        try {
          const result = await exchange.createMarketSellOrder(PAIR, orderSize);
          const actualOutcome = ((currentPrice - entryPrice) / entryPrice) * 100;
          const postTradeQuality = scoreTrade({
            signalStrength: label === 'strong_bear' ? 90 : 50,
            modelWinRate: win_rate,
            riskReward: TAKE_PROFIT_PCT / STOP_LOSS_PCT,
            executionQuality: 90,
            volatility,
            tradeOutcome: actualOutcome
          });
          positionOpen = false;
          logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
            win_rate, dominant_periods, volatility, active_model, action: 'STOP_LOSS',
            result, reason: `SL at ${stopLossPrice} on ${tf}`, fullSignal: lastSignal, rsiScores, atrScores,
            tradeQualityScore: postTradeQuality.totalScore, tradeQualityBreakdown: postTradeQuality.breakdown
          });
          lastTradeTimestamp = Number(lastSignal.timestamp);
          console.log(`[DEBUG] [${lastSignal.timestamp}] STOP LOSS triggered at ${currentPrice} on ${tf}`);
          scheduleNext(INTERVAL_AFTER_TRADE, "STOP LOSS triggered.");
        } catch (err) {
          logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
            win_rate, dominant_periods, volatility, active_model, action: 'STOP_LOSS',
            result: null, reason: 'Failed to submit STOP_LOSS', error: err.message || err, fullSignal: lastSignal, rsiScores, atrScores,
            tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
          });
          scheduleNext(INTERVAL_AFTER_ERROR, "Failed to submit STOP_LOSS.");
        }
        isRunning = false; return;
      }
      if (currentPrice >= takeProfitPrice) {
        if (!hasEnoughBalance(balance, 'SELL', orderSize, currentPrice)) {
          logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
            win_rate, dominant_periods, volatility, active_model, action: 'TAKE_PROFIT',
            result: null, reason: 'Insufficient balance for TAKE_PROFIT', fullSignal: lastSignal, rsiScores, atrScores,
            tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
          });
          scheduleNext(INTERVAL_AFTER_SKIP, "Insufficient balance for TAKE_PROFIT.");
          isRunning = false; return;
        }
        try {
          const result = await exchange.createMarketSellOrder(PAIR, orderSize);
          const actualOutcome = ((currentPrice - entryPrice) / entryPrice) * 100;
          const postTradeQuality = scoreTrade({
            signalStrength: label === 'strong_bear' ? 90 : 50,
            modelWinRate: win_rate,
            riskReward: TAKE_PROFIT_PCT / STOP_LOSS_PCT,
            executionQuality: 90,
            volatility,
            tradeOutcome: actualOutcome
          });
          positionOpen = false;
          logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
            win_rate, dominant_periods, volatility, active_model, action: 'TAKE_PROFIT',
            result, reason: `TP at ${takeProfitPrice} on ${tf}`, fullSignal: lastSignal, rsiScores, atrScores,
            tradeQualityScore: postTradeQuality.totalScore, tradeQualityBreakdown: postTradeQuality.breakdown
          });
          lastTradeTimestamp = Number(lastSignal.timestamp);
          console.log(`[DEBUG] [${lastSignal.timestamp}] TAKE PROFIT triggered at ${currentPrice} on ${tf}`);
          scheduleNext(INTERVAL_AFTER_TRADE, "TAKE PROFIT triggered.");
        } catch (err) {
          logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
            win_rate, dominant_periods, volatility, active_model, action: 'TAKE_PROFIT',
            result: null, reason: 'Failed to submit TAKE_PROFIT', error: err.message || err, fullSignal: lastSignal, rsiScores, atrScores,
            tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
          });
          scheduleNext(INTERVAL_AFTER_ERROR, "Failed to submit TAKE_PROFIT.");
        }
        isRunning = false; return;
      }
    }

    // --- HOLD: No trade ---
    logOrder({ timestamp: lastSignal.timestamp, model: winnerModel, prediction, label,
      win_rate, dominant_periods, volatility, active_model,
      action: 'HOLD', result: null, reason: `No trade condition met on ${tf}`, fullSignal: lastSignal, rsiScores, atrScores,
      tradeQualityScore: tradeQuality.totalScore, tradeQualityBreakdown: tradeQuality.breakdown
    });
    scheduleNext(INTERVAL_AFTER_HOLD, `No trade condition met on ${tf}.`);
  } catch (e) {
    console.error('[DEBUG] UNCAUGHT EXCEPTION:', e);
    scheduleNext(INTERVAL_AFTER_ERROR, "Uncaught exception.");
  }
  isRunning = false;
}

// --- Startup ---
(async () => {
  await syncPosition();
  console.log(`[DEBUG] Starting macro_ccxt_orders_optimized_v2.js with multi-timeframe auto-selection and enhanced analysis`);
  main();
})();

process.on('uncaughtException', (err) => {
  console.error('[DEBUG] UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[DEBUG] UNHANDLED REJECTION:', reason);
});
