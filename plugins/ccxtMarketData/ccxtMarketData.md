# `ccxtMarketData.js` Documentation

## Overview

The `ccxtMarketData.js` module is a Node.js utility designed to periodically fetch OHLCV (Open, High, Low, Close, Volume) candlestick market data from a cryptocurrency exchange using the [ccxt](https://github.com/ccxt/ccxt) library. It offers flexible configuration for trading pairs, candle intervals, and fetch frequency. Data is stored in both CSV and JSON formats with robust file handling, atomic updates, and rotation.

---

## Features

- Fetches OHLCV data from a configurable exchange (default: Kraken) via `ccxt`
- Supports custom trading pairs and candle intervals
- Stores data in daily-rotated CSV files (up to 30 days)
- Stores data in JSON files with atomic writes and backup creation
- Prevents duplicate entries
- Environment-based configuration
- Graceful shutdown with proper file closure

---

## Environment Configuration

This module uses environment variables to control its behavior.  
**No sensitive credentials are stored—only public/default settings.**

| Variable                  | Description                                  | Example Value         |
|---------------------------|----------------------------------------------|-----------------------|
| `EXCHANGE_MARKET_DATA_ID` | Exchange name for CCXT                       | `kraken`              |
| `SYMBOL`                  | Trading pair                                 | `BTC/EUR`             |
| `OHLCV_CANDLE_SIZE`       | Candle interval (`1m`, `1h`, `1d`, etc.)     | `1h`                  |
| `INTERVAL_FETCH_DATA`     | Fetch interval (milliseconds)                | `3600000`             |

**Suggested Settings:**

| Use Case         | Candle Size   | Fetch Interval (ms) |
|------------------|--------------|---------------------|
| High Frequency   | 1m / 5m      | 60000               |
| Moderate         | 15m / 30m    | 900000 / 1800000    |
| Long Term        | 1h / 1d      | 3600000 / 86400000  |

**Sample .env:**
```
EXCHANGE_MARKET_DATA_ID=kraken
SYMBOL=BTC/EUR
OHLCV_CANDLE_SIZE=1h
INTERVAL_FETCH_DATA=3600000
```

---

## File Structure

- **CSV Output:**  
  `logs/csv/ohlcv_ccxt_data.csv`  
  (rotated daily, retains up to 30 files)

- **JSON Output:**  
  `logs/csv/ohlcv_ccxt_data.json`  
  (main JSON log file)

- **Destination JSON:**  
  `logs/json/ohlcv/ohlcv_ccxt_data.json`  
  (aggregated, atomic writes)

---

## Main Class: `CCXTMarketData`

### Constructor

```js
new CCXTMarketData({ symbol, ohlcvCandleSize })
```
- `symbol`: Trading pair (string, e.g., `'BTC/EUR'`)
- `ohlcvCandleSize`: Candle interval (string, e.g., `'1h'`)

**Initializes:**
- Exchange connection via `ccxt`
- Output directories and file streams for CSV and JSON logging

---

### Methods

#### `async fetchAndAppendOHLCV()`
- Fetches new OHLCV data from the exchange
- Filters out duplicate records
- Appends new entries to CSV and JSON files
- Creates backups before overwriting JSON
- Updates destination (aggregated) JSON file
- Logs actions and errors to the console

#### `appendJsonToDest(newEntries)`
- Appends new JSON entries to the destination file
- Ensures no duplicates and uses atomic file writing

#### `close()`
- Closes the CSV file stream—for use during graceful shutdown

---

## Main Script Workflow

1. Instantiates `CCXTMarketData` with environment or default settings
2. Performs an initial data fetch on startup
3. Sets an interval to fetch and append OHLCV data as per `INTERVAL_FETCH_DATA`
4. Handles `SIGINT` (Ctrl+C) for graceful shutdown and stream closure

---

## Usage

1. **Install dependencies:**
   ```bash
   npm install ccxt fs-extra rotating-file-stream dotenv
   ```

2. **Configure your `.env` file:**
   (Use the sample above or your preferred settings)
```env
######################################################################
#               CCXTMarketData Environment File               	     #
#                                                                    #
# This file contains only public/default configuration values. 	     #
# No sensitive or private credentials are present.             	     #
#                                                              	     # 
# - EXCHANGE_MARKET_DATA_ID: Exchange name for CCXT                  #
# - SYMBOL: Trading pair (e.g., BTC/EUR, ETH/USDT)                   #
# - OHLCV_CANDLE_SIZE: Candle interval (e.g., 1m,1h, 1d)	     #
# - INTERVAL_FETCH_DATA: Data fetch interval in milliseconds 	     #
######################################################################
#   Suggested settings:
# High Frequency:  OHLCV_CANDLE_SIZE=1m   INTERVAL_FETCH_DATA=60000
# High Frequency:  OHLCV_CANDLE_SIZE=5m   INTERVAL_FETCH_DATA=60000
# Moderate:        OHLCV_CANDLE_SIZE=15m  INTERVAL_FETCH_DATA=900000
# Moderate:        OHLCV_CANDLE_SIZE=30m  INTERVAL_FETCH_DATA=1800000
# Long Term:       OHLCV_CANDLE_SIZE=1h   INTERVAL_FETCH_DATA=3600000
# Long Term:       OHLCV_CANDLE_SIZE=1d   INTERVAL_FETCH_DATA=86400000
######################################################################

EXCHANGE_MARKET_DATA_ID=kraken
SYMBOL=BTC/EUR
OHLCV_CANDLE_SIZE=1h
INTERVAL_FETCH_DATA=3600000
```

4. **Run the script:**
   ```bash
   node plugins/ccxtMarketData/ccxtMarketData.js
   ```

---

## Exports

- Exports the `CCXTMarketData` class for use in other modules

---

> **Note:**  
> All output files and directories are managed automatically.  
> Ensure your process has write permissions to the `logs/` directories.

---
