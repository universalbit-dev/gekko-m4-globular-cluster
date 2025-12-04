# 📦 Environment Variable Reference (`.env`)

For the full Environment Configuration Reference, see: [Environment Configuration Reference](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/Environment.md)

## 🌱 What Is a `.env` File?

A `.env` file manages your configuration — like API keys, exchange names, time intervals, and model settings — outside your code. This keeps sensitive info safe and lets you switch environments (development, testing, production) easily.

Most Node.js projects use [dotenv](https://www.npmjs.com/package/dotenv):

```js
require('dotenv').config(); // Loads variables from .env
```

Or, for script-specific configs:

```js
require('dotenv').config({ path: './tools/.env' });
```

---

## 📂 Project Structure for `.env` Files

Your repository uses `.env` files in several locations:

```
gekko-m4-globular-cluster/
├── .env                       # 🌍 Main project config
├── tools/
│   ├── .env                   # 🛠️ Tool-specific config for scripts
├── plugins/
│   └── ccxtMarketData/
│       ├── .env               # 🔌 Plugin-specific config
```

Each `.env` is loaded by its respective scripts or modules to keep configs modular and safe.

---

## ⚙️ Detailed Environment Variable Reference

### 1️⃣ Exchange Simulator Mode & Core Asset/Currency

For simulation/testing/training (no real trades):

```env
exchange=exchangesimulator
SIMULATOR_DATA_ID=exchangesimulator
currency=GaiaNut
asset=GaiaBolt
```

### 2️⃣ Chart Recognition & Output

Configure chart recognition scripts and output files:

```env
INTERVAL_SIMULATOR=3600000              
MODEL_DIR=./trained_ohlcv
OUT_CSV_PATH=./ohlcv_data_prediction.csv
SIGNAL_LOG_PATH=./exchangesimulator_signal.log
```

### 3️⃣ CCXT Market Data & Trading

Settings for working with live or historical data from exchanges via [CCXT](https://github.com/ccxt/ccxt):

```env
EXCHANGE=kraken
KEY= 
SECRET=
PAIR=BTC/EUR
ORDER_AMOUNT=0.0001
MIN_ALLOWED_ORDER_AMOUNT=0.0001
MAX_ORDER_AMOUNT=0.01

OHLCV_CANDLE_SIZE=1m,5m,15m,1h
INTERVAL_MS=3600000  # 1 hour
MULTI_INTERVAL_MS=60000 # 1 minute
INTERVAL_HIGH=60000
INTERVAL_DEFAULT=300000
INTERVAL_LOW=780000
```

### 4️⃣ Trainers

Settings for training models on OHLCV data:

```env
TRAIN_OHLCV_TIMEFRAMES=1m,5m,15m,1h
TRAIN_OHLCV_JSON_DIR=tools/logs/json/ohlcv

PVVM_THRESHOLDS=8,13,21,34,55
PVD_THRESHOLDS=8,13,21,34,55
DYNAMIC_WINDOWS=5,8,13,21
DYNAMIC_FACTORS=0.8,1.0,1.13,1.21
```

### 5️⃣ Challenge/Analysis

Variables for model challenges and analysis:

```env
WINDOW_SIZE=20
CHALLENGE_MODEL_LIST=convnet,tf
CHALLENGE_INTERVAL_MS=900000
CHALLENGE_WINDOW_SIZE=50
CHALLENGE_MIN_WIN_RATE=0.618
CHALLENGE_DOMINANCE_THRESHOLD=0.618
CHALLENGE_DOMINANCE_MIN_LENGTH=13

CHLOG_INTERVAL_MS=900000          
CHLOG_WIN_OFFSET=2        
CHLOG_MODEL_LIST=convnet,tf
MIN_WIN_RATE=0.3
```

### 6️⃣ Microstructure Settings

Settings for microstructure trading logic — fast/short timeframes and small orders:

```env
MICRO_EXCHANGE=kraken
MICRO_KEY= 
MICRO_SECRET=
MICRO_PAIR=BTC/EUR
MICRO_ORDER_AMOUNT=0.0001
MICRO_MIN_ALLOWED_ORDER_AMOUNT=0.0001
MICRO_MAX_ORDER_AMOUNT=0.002
MICRO_RSI_PERIOD=3
MICRO_PVVM_WINDOW=3
MICRO_PVD_WINDOW=3
MICRO_OHLCV_CANDLE_SIZE='1m'
MICRO_INTERVAL_MS=300000 # 5 min
MAX_ACTIVE_POSITIONS=3
MICRO_MAX_TRADES_PER_DAY=10
MICRO_TIMEFRAME='1m'
BASE_PROFIT_PCT=0.003
BASE_LOSS_PCT=0.003
FIB_HOLD_INDEX=10
FIB_HOLD_INDEX=2   # (Possible typo: two FIB_HOLD_INDEX values)
MICRO_TRADE_QUALITY_THRESHOLD=70
```

### 7️⃣ Macrostructure Settings

Settings for macrostructure trading — longer timeframes, larger orders:

```env
EXCHANGE=kraken
KEY= 
SECRET=
PAIR=BTC/EUR
ORDER_AMOUNT=0.0001
MIN_ALLOWED_ORDER_AMOUNT=0.0001
MAX_ORDER_AMOUNT=0.01
INTERVAL_AFTER_TRADE=30000
INTERVAL_AFTER_SKIP=90000
INTERVAL_AFTER_HOLD=180000
INTERVAL_AFTER_ERROR=60000
SYMBOL=BTC/EUR
MACRO_TRADE_QUALITY_THRESHOLD=70

OHLCV_JSON_DIR=tools/logs/json/ohlcv
OHLCV_JSON_PATH=tools/logs/json/ohlcv/ohlcv_ccxt_data.json
FETCH_LIMIT=60

STOP_LOSS_PCT=0.003
TAKE_PROFIT_PCT=0.006

MODEL_LIST=convnet,tf

SIGNAL_LOG_PATH=tools/logs/ccxt_signal_comparative.log
ORDER_LOG_PATH=tools/logs/ccxt_order.log
MACRO_MIN_WIN_RATE=0.2
MACRO_MAX_VOLATILITY=100
```

### 8️⃣ Evaluate & AutoTune

Settings for evaluation and auto-tuning scripts:

```env
EVALUATE_INTERVAL_MS=900000     # 15 min
AUTOTUNE_INTERVAL_MS=900000     # 15 min
```

### 9️⃣ Strategy Settings (Simulator)

Config for technical indicators and strategies:

```env
# BOLLINGER BAND
BBANDS_TIMEPERIOD=20
BBANDS_NBDEVUP=2.25
BBANDS_NBDEVDN=2
BBANDS_SMA=200
BBANDS_DEMA=200
BBANDS_GANN_ANGLES=1,2,3

# RSIBULLBEARADX
RSIBULLBEARADX_SMA_LONG=200
RSIBULLBEARADX_SMA_SHORT=50
RSIBULLBEARADX_BULL_RSI=10
RSIBULLBEARADX_BULL_RSI_HIGH=80
RSIBULLBEARADX_BULL_RSI_LOW=60
RSIBULLBEARADX_BEAR_RSI=15
RSIBULLBEARADX_BEAR_RSI_HIGH=50
RSIBULLBEARADX_BEAR_RSI_LOW=20
RSIBULLBEARADX_BULL_MOD_HIGH=5
RSIBULLBEARADX_BULL_MOD_LOW=-5
RSIBULLBEARADX_BEAR_MOD_HIGH=15
RSIBULLBEARADX_BEAR_MOD_LOW=-5
RSIBULLBEARADX_RSI=13
RSIBULLBEARADX_ADX=8
RSIBULLBEARADX_ADX_HIGH=70
RSIBULLBEARADX_ADX_LOW=50

# INVERTER
INVERTER_DI=13
INVERTER_DX=3

# SUPERTREND
SUPERTREND_ATR=7
SUPERTREND_BAND_FACTOR=3

# NEURALNET REFINEMENTS & NEURALNET
NEURALNET_SMA_LONG=987
NEURALNET_SMA_SHORT=50
NEURALNET_THRESHOLD_BUY=0.2
NEURALNET_THRESHOLD_SELL=-0.2
NEURALNET_LEARNING_RATE=0.01
NEURALNET_LIMIT_ORDER=0.01
NEURALNET_MOMENTUM=0.1
NEURALNET_DECAY=0.01
NEURALNET_HODL_THRESHOLD=1
NEURALNET_PRICE_BUFFER_LEN=1597
NEURALNET_MIN_PREDICTIONS=1597

# NN (Neural Network)
NN_THRESHOLD_BUY=0.2
NN_THRESHOLD_SELL=-0.2
NN_METHOD=adadelta
NN_LEARNING_RATE=0.01
NN_MOMENTUM=0.0
NN_L1_DECAY=0.001
NN_L2_DECAY=0.001
NN_PRICE_BUFFER_LEN=987
NN_MIN_PREDICTIONS=144
NN_HODL_THRESHOLD=1
NN_SCALE=1
NN_BATCH_SIZE=1
NN_RSI=13
NN_DEMA=1

# STOCHRSI
STOCHRSI_INTERVAL=10
STOCHRSI_HIGH=70
STOCHRSI_LOW=30
STOCHRSI_PERSISTENCE=5
STOCHRSI_RSI=21
STOCHRSI_STOCH=21

# CCI
CCI_THRESHOLDS_UP=100
CCI_THRESHOLDS_DOWN=-100
CCI_THRESHOLDS_PERSISTENCE=0
CCI_CONSTANT=0.015
CCI_HISTORY=987
```

---

## ⏱️ Interval & Time Window Reference

Keep intervals in sync for correct time-series analysis (OHLCV, trainers, challenge, etc.):

| Interval Label   | Value (ms)   | Human Time |
|------------------|--------------|------------|
| INTERVAL_MS      | 60000        | 1 min      |
|                  | 300000       | 5 min      |
|                  | 900000       | 15 min     |
|                  | 1800000      | 30 min     |
|                  | 3600000      | 1 hour     |
|                  | 21600000     | 6 hours    |
|                  | 43200000     | 12 hours   |
|                  | 86400000     | 24 hours   |

---

## 🖥️ Running Scripts with Custom Environment Variables

You can override variables for a single run (without changing .env files):

```bash
export INTERVAL_MS=3600000
node tools/backtotesting.js
```

---

## 🚀 Tips for Reliable Data Analysis

- 📚 Use this reference to check what each variable does
- 🧩 Keep sensitive and tool-specific settings in their own `.env` files
- 🔄 Synchronize intervals, exchanges, and asset pairs across scripts and plugins
- 🧪 Experiment with simulator settings before going live
- ⚡ For more, see [dotenv docs](https://www.npmjs.com/package/dotenv) and [CCXT docs](https://github.com/ccxt/ccxt)

---

**Happy coding and analyzing! 😊**
