# ccxtMarketData.js Documentation

## Overview

The `ccxtMarketData.js` module is a Node.js utility for periodically fetching OHLCV (Open, High, Low, Close, Volume) candlestick market data from a cryptocurrency exchange using the [ccxt](https://github.com/ccxt/ccxt) library. It supports configurable symbols, candle sizes, and fetch intervals, storing data in both CSV and JSON formats with robust file handling and atomic updates.

## Features

- Fetches OHLCV data using `ccxt` from a configurable exchange (default: Kraken).
- Stores data in rotating CSV files (one file per day, up to 30 files).
- Stores data in JSON files, with atomic writes and backup creation.
- Prevents duplicate data entries.
- Supports environment-based configuration.
- Graceful shutdown handling.

## Environment Variables

- `EXCHANGE_MARKET_DATA_ID`: Exchange ID for ccxt (e.g., `kraken`, `binance`). Default: `kraken`.
- `SYMBOL`: Trading pair symbol to fetch (e.g., `BTC/EUR`). Default: `BTC/EUR`.
- `OHLCV_CANDLE_SIZE`: Candle time frame (e.g., `1h`, `5m`). Default: `1h`.
- `INTERVAL_FETCH_DATA`: Fetch interval in milliseconds. Default: `3600000` (1 hour).

## File Structure

- **CSV Output:** `logs/csv/ohlcv_ccxt_data.csv` (rotated daily, up to 30 files)
- **JSON Output:** `logs/csv/ohlcv_ccxt_data.json` (main JSON file)
- **Destination JSON:** `logs/json/ohlcv/ohlcv_ccxt_data.json` (aggregated, atomic writes)

## Main Class: `CCXTMarketData`

### Constructor

```js
new CCXTMarketData({ symbol, ohlcvCandleSize })
```

- `symbol`: Trading pair string (e.g., 'BTC/EUR')
- `ohlcvCandleSize`: Candle interval (e.g., '1h')

**Initializes:**
- Exchange connection (via ccxt)
- Output directories and files (CSV and JSON)
- File streams for logging

### Methods

- **`async fetchAndAppendOHLCV()`**
  - Loads market data from the configured exchange and symbol.
  - Filters new (non-duplicate) OHLCV rows.
  - Appends new data to the CSV and JSON files.
  - Backs up existing JSON files before overwriting.
  - Updates destination JSON file for aggregated data.
  - Logs activity and errors to the console.

- **`appendJsonToDest(newEntries)`**
  - Appends new JSON entries to the destination JSON file, ensuring no duplicates and atomic file writing.

- **`close()`**
  - Closes the CSV file stream (called on graceful shutdown).

## Main Script

- Instantiates `CCXTMarketData` with environment or default parameters.
- Runs an initial fetch at startup.
- Sets an interval to fetch and append OHLCV data as per `INTERVAL_FETCH_DATA`.
- Handles `SIGINT` (Ctrl+C) for graceful shutdown and file closure.

## Usage

1. Install dependencies:
   ```bash
   npm install ccxt fs-extra rotating-file-stream dotenv
   ```
2. Configure your `.env` file with desired parameters (see above).
3. Run the script:
   ```bash
   node plugins/ccxtMarketData/ccxtMarketData.js
   ```

## Example .env

```
EXCHANGE_MARKET_DATA_ID=kraken
SYMBOL=BTC/EUR
OHLCV_CANDLE_SIZE=1h
INTERVAL_FETCH_DATA=3600000
```

## Exports

- The `CCXTMarketData` class is exported for use in other modules.

---

**Note:** All output files are created and managed automatically. Ensure the process has permission to write to the `logs/` directories.

---
