/**
 * explorer.js
 * Optimized multi-timeframe/single-timeframe OHLCV fetcher with exchange/source metadata.
 * - Updates ohlcv_ccxt_data.json (multi-timeframe, all entries)
 * - Updates/creates ohlcv_ccxt_data_<timeframe>.json (single timeframe, for fast access)
 * - Handles missing files, deduplication, and flexible config via .env
 * Usage:
 *   node explorer.js          # normal fetch/update mode
 *   node explorer.js clean    # resets all ohlcv_ccxt_data*.json files to empty arrays
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const ccxt = require('ccxt');

const DATA_DIR = path.resolve(__dirname, './logs/json/ohlcv');
const EXCHANGE_NAME = process.env.EXCHANGE || 'kraken';
const PAIR = process.env.PAIR || 'BTC/EUR';
const TIMEFRAMES = (process.env.OHLCV_CANDLE_SIZE || '1m').split(',').map(s => s.trim()).filter(Boolean); // e.g. '1m,5m,15m,1h'
const FETCH_LIMIT = parseInt(process.env.FETCH_LIMIT) || 60;

// --- Ensure directory exists ---
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// --- CLEAN MODE ---
if (process.argv[2] === 'clean') {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => /^ohlcv_ccxt_data.*\.json$/.test(f))
    .map(f => path.join(DATA_DIR, f));

  if (files.length === 0) {
    console.log('[Explorer] No OHLCV data files found to clean.');
    process.exit(0);
  }

  for (const file of files) {
    try {
      fs.writeFileSync(file, '[]');
      console.log(`[Explorer] Cleaned file: ${file}`);
    } catch (err) {
      console.error(`[Explorer] Error cleaning file: ${file}`, err);
    }
  }
  console.log('[Explorer] All OHLCV files reset to empty arrays.');
  process.exit(0);
}

// --- Utility Functions ---
function loadJsonArray(file) {
  try {
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Explorer] Could not read ${file}, starting fresh.`, err);
    return [];
  }
}

function saveJsonArray(file, arr) {
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

function dedup(arr) {
  const seen = new Set();
  return arr.filter(row => {
    const key = [row.symbol, row.exchange, row.ohlcvCandleSize, row.timestamp].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Main Fetch/Update Routine ---
async function fetchAndUpdateOHLCV() {
  // Load multi-timeframe file
  const MULTI_FILE = path.join(DATA_DIR, 'ohlcv_ccxt_data.json');
  let multi = loadJsonArray(MULTI_FILE);

  let exchange;
  try {
    exchange = new ccxt[EXCHANGE_NAME]({ enableRateLimit: true });
  } catch (err) {
    console.error(`[Explorer] Exchange "${EXCHANGE_NAME}" not supported by ccxt.`, err);
    return;
  }

  for (const tf of TIMEFRAMES) {
    // Load single timeframe file
    const tfFile = path.join(DATA_DIR, `ohlcv_ccxt_data_${tf}.json`);
    let tfArr = loadJsonArray(tfFile);

    // Find latest timestamp for this pair/timeframe/exchange
    const lastTsMulti = multi
      .filter(row => row.symbol === PAIR && row.ohlcvCandleSize === tf && row.exchange === EXCHANGE_NAME)
      .map(row => row.timestamp).sort((a, b) => b - a)[0] || 0;

    const lastTsTF = tfArr
      .filter(row => row.symbol === PAIR && row.ohlcvCandleSize === tf && row.exchange === EXCHANGE_NAME)
      .map(row => row.timestamp).sort((a, b) => b - a)[0] || 0;

    const since = Math.max(lastTsMulti, lastTsTF) ? Math.max(lastTsMulti, lastTsTF) + 1 : undefined;

    let newRows = [];
    try {
      const candles = await exchange.fetchOHLCV(PAIR, tf, since, FETCH_LIMIT);

      newRows = candles
        .filter(([ts]) =>
          !multi.some(row => row.symbol === PAIR && row.ohlcvCandleSize === tf && row.exchange === EXCHANGE_NAME && row.timestamp === ts) &&
          !tfArr.some(row => row.symbol === PAIR && row.ohlcvCandleSize === tf && row.exchange === EXCHANGE_NAME && row.timestamp === ts)
        )
        .map(([timestamp, open, high, low, close, volume]) => ({
          symbol: PAIR,
          exchange: EXCHANGE_NAME,
          timestamp,
          open, high, low, close, volume,
          ohlcvCandleSize: tf,
          source_timeframe: tf
        }));

      if (newRows.length > 0) {
        multi.push(...newRows);
        tfArr.push(...newRows);

        multi = dedup(multi);
        tfArr = dedup(tfArr);

        saveJsonArray(MULTI_FILE, multi);
        saveJsonArray(tfFile, tfArr);

        console.log(`[Explorer] Appended ${newRows.length} new rows for ${PAIR} [${tf}] to multi/single files (${EXCHANGE_NAME})`);
      } else {
        console.log(`[Explorer] No new data for ${PAIR} [${tf}] from ${EXCHANGE_NAME}`);
      }
    } catch (err) {
      console.error(`[Explorer][${tf}] Fetch error:`, err);
    }
  }
}

// --- Run Fetch/Update Once and then at intervals ---
fetchAndUpdateOHLCV();
setInterval(fetchAndUpdateOHLCV, 60 * 1000); // every minute

