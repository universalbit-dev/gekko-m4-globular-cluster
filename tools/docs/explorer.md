# 🗺️ `explorer.js` — Multi-Timeframe OHLCV Data Explorer & Fetcher

---

## Overview

This script is an optimized tool for fetching, updating, and storing OHLCV (Open, High, Low, Close, Volume) data across multiple timeframes from any ccxt-supported exchange. It creates and maintains both multi-timeframe and single-timeframe JSON files for rapid access and downstream analysis.

---

## 🧩 Features

- **Multi-Timeframe Fetch & Update:**  
  Fetches OHLCV data for arbitrary timeframes (e.g., `1m`, `5m`, `15m`, `1h`) in a single run.

- **Flexible Configuration:**  
  All key options (exchange, pair, timeframes, fetch limits) are configurable via `.env`.

- **Exchange Metadata:**  
  Each row includes exchange and symbol metadata for robust downstream processing.

- **Deduplication:**  
  Ensures no duplicate entries by symbol/timeframe/exchange/timestamp.

- **Auto File Handling:**  
  Handles missing files gracefully; creates directories and files as needed.

- **Clean Mode:**  
  `node explorer.js clean` will reset all OHLCV data files to empty arrays (quick data wipe).

- **Continuous Operation:**  
  Runs fetch/update every minute by default.

---

## ⚙️ Environment Variables

| Variable           | Default      | Description                                    |
|--------------------|--------------|------------------------------------------------|
| `EXCHANGE`         | kraken       | Exchange name (any ccxt-supported)             |
| `PAIR`             | BTC/EUR      | Trading pair                                   |
| `OHLCV_CANDLE_SIZE`| 1m           | Comma-separated candle sizes                   |
| `FETCH_LIMIT`      | 60           | Number of candles to fetch per call            |

---

## 🧑‍💻 Main Components

### 1. **Initialization & Clean Mode**
- Ensures data directory exists.
- If run with `clean`, wipes all OHLCV data files in target directory.

### 2. **Utility Functions**
- **loadJsonArray(file):**  
  Loads JSON array from file, returns empty array if missing.
- **saveJsonArray(file, arr):**  
  Saves array as pretty JSON.
- **dedup(arr):**  
  Removes duplicate candle entries based on symbol, exchange, timeframe, and timestamp.

### 3. **Fetch & Update Routine**
For each timeframe:
- Loads current multi-timeframe and single-timeframe files.
- Determines the latest timestamp for incremental fetches.
- Fetches new OHLCV data from the exchange via ccxt.
- Deduplicates and appends new rows to both files.
- Saves updated files.

### 4. **Continuous Execution**
- Fetches on startup and every 1 minute thereafter.

---

## 📂 File Structure

- `tools/explorer.js` — This script
- `tools/logs/json/ohlcv/ohlcv_ccxt_data.json` — Multi-timeframe data
- `tools/logs/json/ohlcv/ohlcv_ccxt_data_<timeframe>.json` — Per-timeframe data files

---

## 📝 Data Format

Each OHLCV entry:
```json
{
  "symbol": "BTC/EUR",
  "exchange": "kraken",
  "timestamp": 1695826800000,
  "open": 39000,
  "high": 39200,
  "low": 38950,
  "close": 39100,
  "volume": 5.2,
  "ohlcvCandleSize": "1m",
  "source_timeframe": "1m"
}
```

---

## 🏆 Best Practices

- **Use `clean` mode** to reset data before new experiments or model retraining.
- **Adjust timeframes and fetch limits** in `.env` to optimize for your strategy or hardware.
- **Monitor logs** for fetch errors or data gaps.

---

## 📘 Further Reading

- [CCXT Documentation](https://github.com/ccxt/ccxt)
- [OHLCV Data Structure](https://www.investopedia.com/terms/o/ohlc-chart.asp)
- [Deduplication Strategies](https://en.wikipedia.org/wiki/Data_deduplication)

---

## 🖼️ Icon

```
🗺️
```

---

## ⚠️ Disclaimer

This script does not execute trades; it is for data collection and preparation only. Ensure your API keys and `.env` are correctly set for your chosen exchange.
