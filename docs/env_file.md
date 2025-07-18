# 📦 Environment Variable (`env_file.md`)

## 🌱 Introduction: What Is a `.env` File?

A `.env` file lets you manage configuration settings (like API keys, exchange names, and intervals) outside your code for better safety and flexibility. In Node.js, you usually load these variables with the [dotenv](https://www.npmjs.com/package/dotenv) package — just include `require('dotenv').config()` at the top of your script.

**Why use `.env`?**
- 🔒 Keeps sensitive info out of your codebase
- 🔁 Makes switching environments (dev, test, prod) easy
- 🛠️ Helps with debugging and dynamic configuration

---

## 📂 Project Structure with `.env` Files

Your repository uses `.env` files in different locations for various purposes:

```
gekko-m4-globular-cluster/
├── .env                       # 🌍 Root config for main project
├── tools/
│   ├── .env                   # 🛠️ Tool-specific config (for scripts)
│   ├── chart_recognition.js
│   ├── chart_ccxt_recognition.js
│   ├── chat_ccxt_recognition_magnitude.js
│   ├── train_ccxt_ohlcv.js
│   ├── train_ohlcv.js
│   └── ccxt_orders.js
└── plugins/
    └── ccxtMarketData/
        ├── .env               # 🔌 Market data plugin config
        └── ccxtMarketData.js
```

---

## ⚙️ How the `.env` Files Work Together

- **Root `.env`**: Sets global/default environment variables for the whole project.
- **tools/.env**: Used by individual scripts in the `tools/` directory for **script-specific** configs.
- **plugins/ccxtMarketData/.env**: Configures the **market data plugin** (e.g., exchange and symbol details for data sync).

Each `.env` file is loaded in its respective context to keep settings organized and safe.

---

### 🧪 Simulation Environment (ExchangeSimulator)

Set up your `.env` for exchange simulator environment:

```env
exchange=exchangesimulator
SIMULATOR_DATA_ID=exchangesimulator
currency=GaiaNut
asset=GaiaBolt
```

**What this does:**
- Great for testing, training, or developing new strategies.

### 🌐 Public Exchange Data (CCXT Library)

To use live market data via [CCXT](https://github.com/ccxt/ccxt):

```env
EXCHANGE_MARKET_DATA_ID=kraken
SYMBOL=BTC/EUR
OHLCV_CANDLE_SIZE=1h
INTERVAL_FETCH_DATA=3600000
```

**What this does:**  
- Useful for simulator,live analysis, backtesting, or syncing historical data.

---

## 🏗️ Linking Environment Variables in Node.js

Add to the start of your JS scripts:

```js
require('dotenv').config(); // Loads variables from .env
```

Or, for custom paths:

```js
require('dotenv').config({ path: './tools/.env' });
```

---

## 🖥️ Running Standalone Scripts with Custom Environment Variables

You can override or set environment variables on the fly when running Node.js scripts. For example:

```bash
# Set env variable for this run only:
export INTERVAL_MS=3600000
node tools/training_ccxt_ohlcv.js
```

This helps with quick debugging or trying out new parameters **without editing your .env files**.

---

## 📊 Synchronizing Data & Interval Consistency

- ⏱️ Ensures all scripts and plugins use the same time window for data (e.g., 1-hour candles).
- 🔄 Prevents mismatched or out-of-sync data during analysis or training.
- 🛠️ Always set and synchronize `INTERVAL_MS` in `tools/.env` and related configs when working with time-series data.

**Example:**

```env
# INTERVAL_MS value table:
# ------------------------
# INTERVAL_MS=60000      # 1m
# INTERVAL_MS=300000     # 5m
# INTERVAL_MS=900000     # 15m
# INTERVAL_MS=1800000    # 30m
# INTERVAL_MS=3600000    # 1h
# INTERVAL_MS=21600000   # 6h
# INTERVAL_MS=43200000   # 12h
# INTERVAL_MS=86400000   # 24h (1 day)
```
---

## 🚀 Tips for Amazing Data Analysis

- 📚 **Read the Docs**: Learn about each script and plugin’s `.env` requirements.
- 🧩 **Modular Configs**: Keep sensitive and tool-specific settings in their respective `.env` files.
- 🧪 **Experiment Freely**: Use exchange simulator to test strategies.
- 🔄 **Keep Variables Synced**: Especially intervals, exchange names, and asset pairs across all `.env` files.

**For more examples and advanced usage, check out [dotenv documentation](https://www.npmjs.com/package/dotenv) and [CCXT docs](https://github.com/ccxt/ccxt).**

Happy coding and analyzing! 😊
