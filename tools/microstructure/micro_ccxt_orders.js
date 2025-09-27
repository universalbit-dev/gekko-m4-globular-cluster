/**
 * Microstructure trading bot: Advanced dynamic profit/loss management.
 * Features: Trailing stops, adaptive thresholds, partial exits, multi-frame confirmation, adaptive sizing, smart re-entry logic.
 * Uses explorer.js OHLCV multi-timeframe prediction files from logs/json/ohlcv.
 * WARNING: Executes real trades if credentials are set!
 * Optimized: DEBUG messages, daily trade limit, improved async flow, position type safety.
 * Further optimized: trade quality scoring integration.
 * Hold time optimized with Fibonacci values and .env override.
 * Additional: Improved exit logic, code cleanup, and parameterization.
 * Strict: Prevents exit in same cycle as entry.
 */

const path = require('path');
const fs = require('fs');
const ccxt = require('ccxt');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { scoreTrade } = require('../tradeQualityScore');

const EXCHANGE = process.env.EXCHANGE || 'kraken';
const API_KEY = process.env.KEY || '';
const API_SECRET = process.env.SECRET || '';
const PAIR = process.env.PAIR || 'BTC/EUR';
const MICRO_ORDER_AMOUNT = parseFloat(process.env.MICRO_ORDER_AMOUNT) || 0.00005;
const INTERVAL_MS = parseInt(process.env.MICRO_INTERVAL_MS, 10) || 60000;

const BASE_PROFIT_PCT = parseFloat(process.env.BASE_PROFIT_PCT) || 0.006138;
const BASE_LOSS_PCT = parseFloat(process.env.BASE_LOSS_PCT) || 0.006138;
const TRAIL_STEP_PCT = 0.002;
const PARTIAL_EXIT_FRACTION = 0.5;

// --- Fibonacci Hold Times (in ms) ---
const FIB_HOLD_MS = [0, 10000, 16000, 26000, 42000, 68000, 110000, 178000, 288000, 466000, 754000, 1220000, 1974000, 3194000, 5168000];
const FIB_HOLD_INDEX = parseInt(process.env.FIB_HOLD_INDEX, 10) || 10;
const MIN_HOLD_MS = process.env.MIN_HOLD_MS ? parseInt(process.env.MIN_HOLD_MS, 10) : FIB_HOLD_MS[FIB_HOLD_INDEX] || 754000;

const OHLCV_DIR = path.resolve(__dirname, '../logs/json/ohlcv');
const TIMEFRAME = process.env.MICRO_TIMEFRAME || '1m';
const PREDICTION_FILE = path.join(OHLCV_DIR, `ohlcv_ccxt_data_${TIMEFRAME}_prediction.json`);
const MULTIFRAME_FILES = ['1m','5m','15m','1h'].map(tf => path.join(OHLCV_DIR, `ohlcv_ccxt_data_${tf}_prediction.json`));
const ORDER_LOG_PATH = path.resolve(__dirname, '../logs/micro_order.log');

const MAX_TRADES_PER_DAY = parseInt(process.env.MICRO_MAX_TRADES_PER_DAY, 10) || 4;
let tradesToday = 0;
let lastTradeDay = (new Date()).getUTCDate();

let isRunning = false;
let lastTradeTimestamp = 0;
let positionOpen = false;
let entryPrice = null;
let entryTimestamp = null;
let trailingStopPrice = null;
let orderSize = MICRO_ORDER_AMOUNT;
let allowReentry = true;
let positionType = null; // 'long' or 'short'
let enteredThisCycle = false; // << Strict minimum hold enforcement

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

// --- Utility Functions ---
function calcPVDPVVMFromPredictionFile(jsonFile, priceKey = 'close', windowPVVM = 13, windowPVD = 8) {
  try {
    if (!fs.existsSync(jsonFile)) return { PVVM: 0, PVD: 0 };
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
  } catch (e) {
    console.debug(`[DEBUG] Failed to parse prediction file: ${jsonFile}`, e.message);
    return { PVVM: 0, PVD: 0 };
  }
}

function getAdaptiveThresholds(volatility) {
  const profit_pct = BASE_PROFIT_PCT * (1 + Math.min(volatility / 10, 1));
  const loss_pct = BASE_LOSS_PCT * (1 + Math.min(volatility / 10, 1));
  console.debug(`[DEBUG] Adaptive thresholds: profit_pct=${profit_pct}, loss_pct=${loss_pct}, volatility=${volatility}`);
  return { profit_pct, loss_pct };
}

function multiFrameConfirm() {
  const labels = [];
  for (const fp of MULTIFRAME_FILES) {
    try {
      if (!fs.existsSync(fp)) continue;
      const arr = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (arr.length > 0) labels.push(arr[arr.length - 1].ensemble_label);
    } catch (e) {
      console.debug(`[DEBUG] Failed to parse multi-frame file: ${fp}`, e.message);
    }
  }
  const agreed = labels.length > 0 && labels.every(l => l === labels[0]);
  console.debug(`[DEBUG] Multi-frame labels: ${labels.join(', ')} | Agreed: ${agreed}`);
  return agreed ? labels[0] : null;
}

function getAdaptiveOrderSize(volatility, baseSize = MICRO_ORDER_AMOUNT) {
  if (volatility > 20) return baseSize * 0.5;
  if (volatility < 5) return baseSize * 2;
  return baseSize;
}

function updateTrailingStop(entryPrice, currentPrice, origTrailingStopPrice, type) {
  const step = entryPrice * TRAIL_STEP_PCT;
  if (type === "long" && currentPrice > entryPrice) {
    return Math.max(origTrailingStopPrice, currentPrice - step);
  } else if (type === "short" && currentPrice < entryPrice) {
    return Math.min(origTrailingStopPrice, currentPrice + step);
  }
  return origTrailingStopPrice;
}

function resetPositionState() {
  positionOpen = false;
  entryPrice = null;
  entryTimestamp = null;
  trailingStopPrice = null;
  orderSize = MICRO_ORDER_AMOUNT;
  positionType = null;
  allowReentry = true;
}

// --- Main Trading Logic ---
async function main() {
  if (isRunning) {
    console.warn(`[DEBUG][${new Date().toISOString()}] Previous cycle still running, skipping.`);
    return;
  }
  isRunning = true;
  enteredThisCycle = false; // reset per main() run
  try {
    // --- Daily trade counter reset ---
    const nowDay = (new Date()).getUTCDate();
    if (nowDay !== lastTradeDay) {
      tradesToday = 0;
      lastTradeDay = nowDay;
      console.debug(`[DEBUG] Reset tradesToday for new day.`);
    }

    // --- Analysis ---
    const { PVVM, PVD } = calcPVDPVVMFromPredictionFile(PREDICTION_FILE, 'close', 13, 8);
    let arr;
    try { arr = JSON.parse(fs.readFileSync(PREDICTION_FILE, 'utf8')); }
    catch { console.warn(`[DEBUG] Error parsing: ${PREDICTION_FILE}`); isRunning = false; setTimeout(main, INTERVAL_MS); return; }
    if (!Array.isArray(arr) || arr.length === 0) {
      console.log('[DEBUG] No signals found in prediction file.');
      isRunning = false; setTimeout(main, INTERVAL_MS); return;
    }
    const lastSignal = arr[arr.length - 1];
    const ticker = await exchange.fetchTicker(PAIR);
    const balance = await exchange.fetchBalance();
    const currentPrice = ticker.last;
    const now = Date.now();

    // --- Volatility for adaptive thresholds ---
    const volatility = parseFloat(lastSignal.volatility) || PVVM || 10;
    const { profit_pct, loss_pct } = getAdaptiveThresholds(volatility);

    // --- Multi-frame confirmation ---
    const frameLabel = multiFrameConfirm();
    let signalLabel = lastSignal.ensemble_label;
    if (frameLabel && frameLabel === signalLabel) signalLabel = frameLabel;
    console.debug(`[DEBUG] Signal label selected: ${signalLabel}`);

    // --- Adaptive position sizing ---
    orderSize = getAdaptiveOrderSize(volatility);

    // --- Trade Quality Score (pre-trade) ---
    const tradeQuality = scoreTrade({
      signalStrength: signalLabel === 'strong_bull' ? 90 : signalLabel === 'strong_bear' ? 90 : 50,
      modelWinRate: typeof lastSignal.win_rate === 'number' ? lastSignal.win_rate : 0.5,
      riskReward: profit_pct / loss_pct,
      executionQuality: 90,
      volatility,
      tradeOutcome: null
    });

    console.log(`[DEBUG] Trade Quality Score (pre-trade): ${tradeQuality.totalScore}`, tradeQuality.breakdown);

    // --- Trade count enforcement ---
    if (tradesToday >= MAX_TRADES_PER_DAY) {
      console.warn(`[DEBUG] Trade limit reached for today (${tradesToday}/${MAX_TRADES_PER_DAY}).`);
      fs.appendFileSync(ORDER_LOG_PATH, `[${new Date().toISOString()}] TRADE_LIMIT_REACHED tradesToday=${tradesToday}\n`);
      isRunning = false;
      setTimeout(main, INTERVAL_MS);
      return;
    }

    // --- Entry logic (long/short) ---
    if (!positionOpen && allowReentry && PVVM > 10 && PVD > 10 && (signalLabel === 'strong_bull' || signalLabel === 'strong_bear')) {
      if (tradeQuality.totalScore < 70) {
        fs.appendFileSync(ORDER_LOG_PATH, `[${new Date().toISOString()}] SKIP_LOW_QUALITY SCORE=${tradeQuality.totalScore}\n`);
        isRunning = false; setTimeout(main, INTERVAL_MS); return;
      }
      if (signalLabel === 'strong_bull') {
        if ((balance.free[PAIR.split('/')[1].toUpperCase()] || 0) >= orderSize * currentPrice) {
          try {
            const result = await exchange.createMarketBuyOrder(PAIR, orderSize);
            fs.appendFileSync(ORDER_LOG_PATH, `[${new Date().toISOString()}] BUY ${orderSize} @ ${currentPrice} PVVM=${PVVM} PVD=${PVD} tradesToday=${tradesToday+1} SCORE=${tradeQuality.totalScore}\n`);
            lastTradeTimestamp = now;
            entryPrice = currentPrice;
            entryTimestamp = now;
            positionOpen = true;
            positionType = 'long';
            trailingStopPrice = entryPrice * (1 - loss_pct);
            allowReentry = false;
            tradesToday++;
            enteredThisCycle = true;
            console.log(`[DEBUG] LONG BUY order submitted. Adaptive size=${orderSize}, thresholds: TP=${profit_pct}, SL=${loss_pct}. tradesToday=${tradesToday}`);
          } catch (err) {
            console.error(`[DEBUG] Failed to submit BUY:`, err.message || err);
          }
        } else {
          console.warn(`[DEBUG] Insufficient quote balance for BUY (${orderSize * currentPrice} needed).`);
        }
      } else if (signalLabel === 'strong_bear') {
        if ((balance.free[PAIR.split('/')[0].toUpperCase()] || 0) >= orderSize) {
          try {
            const result = await exchange.createMarketSellOrder(PAIR, orderSize);
            fs.appendFileSync(ORDER_LOG_PATH, `[${new Date().toISOString()}] SHORT_SELL ${orderSize} @ ${currentPrice} PVVM=${PVVM} PVD=${PVD} tradesToday=${tradesToday+1} SCORE=${tradeQuality.totalScore}\n`);
            lastTradeTimestamp = now;
            entryPrice = currentPrice;
            entryTimestamp = now;
            positionOpen = true;
            positionType = 'short';
            trailingStopPrice = entryPrice * (1 + loss_pct);
            allowReentry = false;
            tradesToday++;
            enteredThisCycle = true;
            console.log(`[DEBUG] SHORT SELL order submitted. Adaptive size=${orderSize}, thresholds: TP=${profit_pct}, SL=${loss_pct}. tradesToday=${tradesToday}`);
          } catch (err) {
            console.error(`[DEBUG] Failed to submit SHORT SELL:`, err.message || err);
          }
        } else {
          console.warn(`[DEBUG] Insufficient base balance for SHORT SELL (${orderSize} needed).`);
        }
      }
    }

    // --- Position management ---
    if (positionOpen && !enteredThisCycle) {
      trailingStopPrice = updateTrailingStop(entryPrice, currentPrice, trailingStopPrice, positionType);
      let takeProfitPrice, stopLossPrice;
      const holdTime = entryTimestamp && (now - entryTimestamp);

      if (positionType === 'long') {
        takeProfitPrice = entryPrice * (1 + profit_pct);
        stopLossPrice = trailingStopPrice;
        // Partial take profit (long)
        if ((currentPrice >= takeProfitPrice) && (orderSize > MICRO_ORDER_AMOUNT * PARTIAL_EXIT_FRACTION) && holdTime >= MIN_HOLD_MS) {
          const partialSize = orderSize * PARTIAL_EXIT_FRACTION;
          if ((balance.free[PAIR.split('/')[0].toUpperCase()] || 0) >= partialSize) {
            try {
              const result = await exchange.createMarketSellOrder(PAIR, partialSize);
              fs.appendFileSync(ORDER_LOG_PATH, `[${new Date().toISOString()}] PARTIAL_TAKE_PROFIT SELL ${partialSize} @ ${currentPrice} Entry=${entryPrice}\n`);
              orderSize -= partialSize;
              console.log(`[DEBUG] Partial take profit sell submitted for ${partialSize}. Remaining size=${orderSize}`);
            } catch (err) {
              console.error(`[DEBUG] Failed to submit partial take profit SELL:`, err.message || err);
            }
          } else {
            console.warn(`[DEBUG] Insufficient base balance for partial SELL (${partialSize} needed).`);
          }
        }
        // Full exit (long)
        else if ((currentPrice <= stopLossPrice || holdTime > MIN_HOLD_MS)) {
          if ((balance.free[PAIR.split('/')[0].toUpperCase()] || 0) >= orderSize && holdTime >= MIN_HOLD_MS) {
            try {
              const result = await exchange.createMarketSellOrder(PAIR, orderSize);
              const actualOutcome = ((currentPrice - entryPrice) / entryPrice) * 100;
              const postTradeQuality = scoreTrade({
                signalStrength: signalLabel === 'strong_bull' ? 90 : 50,
                modelWinRate: typeof lastSignal.win_rate === 'number' ? lastSignal.win_rate : 0.5,
                riskReward: profit_pct / loss_pct,
                executionQuality: 90,
                volatility,
                tradeOutcome: actualOutcome
              });
              fs.appendFileSync(ORDER_LOG_PATH, `[${new Date().toISOString()}] EXIT SELL ${orderSize} @ ${currentPrice} Entry=${entryPrice} SCORE=${postTradeQuality.totalScore}\n`);
              resetPositionState();
              lastTradeTimestamp = now;
              console.log(`[DEBUG] EXIT SELL (long) order submitted. Trailing stop or timeout.`);
            } catch (err) {
              console.error(`[DEBUG] Failed to submit EXIT SELL (long):`, err.message || err);
            }
          } else {
            if (holdTime < MIN_HOLD_MS) {
              console.log(`[DEBUG] Hold time (${holdTime}ms) below minimum (${MIN_HOLD_MS}ms). Skipping exit.`);
            } else {
              console.warn(`[DEBUG] Insufficient base balance for EXIT SELL (${orderSize} needed).`);
            }
          }
        } else {
          fs.appendFileSync(ORDER_LOG_PATH, `[${new Date().toISOString()}] HOLD POSITION @ ${currentPrice} Entry=${entryPrice} TS=${trailingStopPrice} HOLDTIME=${holdTime}\n`);
          console.log(`[DEBUG] Holding long position. TP=${takeProfitPrice}, SL=${stopLossPrice}, holdTime=${holdTime}`);
        }
      } else if (positionType === 'short') {
        takeProfitPrice = entryPrice * (1 - profit_pct);
        stopLossPrice = trailingStopPrice;
        // Partial take profit (short)
        if ((currentPrice <= takeProfitPrice) && (orderSize > MICRO_ORDER_AMOUNT * PARTIAL_EXIT_FRACTION) && holdTime >= MIN_HOLD_MS) {
          const partialSize = orderSize * PARTIAL_EXIT_FRACTION;
          if ((balance.free[PAIR.split('/')[1].toUpperCase()] || 0) >= partialSize * currentPrice) {
            try {
              const result = await exchange.createMarketBuyOrder(PAIR, partialSize);
              fs.appendFileSync(ORDER_LOG_PATH, `[${new Date().toISOString()}] PARTIAL_TAKE_PROFIT BUY ${partialSize} @ ${currentPrice} Entry=${entryPrice}\n`);
              orderSize -= partialSize;
              console.log(`[DEBUG] Partial take profit buy (cover) submitted for ${partialSize}. Remaining size=${orderSize}`);
            } catch (err) {
              console.error(`[DEBUG] Failed to submit partial take profit BUY (short):`, err.message || err);
            }
          } else {
            console.warn(`[DEBUG] Insufficient quote balance for partial BUY (${partialSize * currentPrice} needed).`);
          }
        }
        // Full exit (short)
        else if ((currentPrice >= stopLossPrice || holdTime > MIN_HOLD_MS)) {
          if ((balance.free[PAIR.split('/')[1].toUpperCase()] || 0) >= orderSize * currentPrice && holdTime >= MIN_HOLD_MS) {
            try {
              const result = await exchange.createMarketBuyOrder(PAIR, orderSize);
              const actualOutcome = ((entryPrice - currentPrice) / entryPrice) * 100;
              const postTradeQuality = scoreTrade({
                signalStrength: signalLabel === 'strong_bear' ? 90 : 50,
                modelWinRate: typeof lastSignal.win_rate === 'number' ? lastSignal.win_rate : 0.5,
                riskReward: profit_pct / loss_pct,
                executionQuality: 90,
                volatility,
                tradeOutcome: actualOutcome
              });
              fs.appendFileSync(ORDER_LOG_PATH, `[${new Date().toISOString()}] EXIT BUY ${orderSize} @ ${currentPrice} Entry=${entryPrice} SCORE=${postTradeQuality.totalScore}\n`);
              resetPositionState();
              lastTradeTimestamp = now;
              console.log(`[DEBUG] EXIT BUY (short) order submitted. Trailing stop or timeout.`);
            } catch (err) {
              console.error(`[DEBUG] Failed to submit EXIT BUY (short):`, err.message || err);
            }
          } else {
            if (holdTime < MIN_HOLD_MS) {
              console.log(`[DEBUG] Hold time (${holdTime}ms) below minimum (${MIN_HOLD_MS}ms). Skipping exit.`);
            } else {
              console.warn(`[DEBUG] Insufficient quote balance for EXIT BUY (${orderSize * currentPrice} needed).`);
            }
          }
        } else {
          fs.appendFileSync(ORDER_LOG_PATH, `[${new Date().toISOString()}] HOLD SHORT POSITION @ ${currentPrice} Entry=${entryPrice} TS=${trailingStopPrice} HOLDTIME=${holdTime}\n`);
          console.log(`[DEBUG] Holding short position. TP=${takeProfitPrice}, SL=${stopLossPrice}, holdTime=${holdTime}`);
        }
      }
    } else if (positionOpen && enteredThisCycle) {
      // Prevent exit logic in the same cycle as entry
      const holdTime = entryTimestamp && (now - entryTimestamp);
      console.log(`[DEBUG] Entered this cycle, skipping exit logic. Hold time: ${holdTime}ms`);
      fs.appendFileSync(ORDER_LOG_PATH, `[${new Date().toISOString()}] SKIP_EXIT_SAME_CYCLE HOLDTIME=${holdTime}\n`);
    } else {
      fs.appendFileSync(ORDER_LOG_PATH, `[${new Date().toISOString()}] HOLD PVVM=${PVVM} PVD=${PVD}\n`);
      allowReentry = true;
      console.log(`[DEBUG] No position open. PVVM=${PVVM}, PVD=${PVD}`);
    }

    isRunning = false;
    setTimeout(main, INTERVAL_MS);

  } catch (e) {
    console.error('[DEBUG][MICRO UNCAUGHT EXCEPTION]', e);
    isRunning = false;
    setTimeout(main, INTERVAL_MS);
  }
}

// --- Startup ---
(async () => {
  console.log(`[DEBUG] Starting micro_ccxt_orders_optimized_v3.js ADVANCED for timeframe ${TIMEFRAME} using: ${PREDICTION_FILE} with Fibonacci MIN_HOLD_MS=${MIN_HOLD_MS}`);
  main();
})();

process.on('uncaughtException', (err) => {
  console.error('[DEBUG][MICRO UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[DEBUG][MICRO UNHANDLED REJECTION]', reason);
});
