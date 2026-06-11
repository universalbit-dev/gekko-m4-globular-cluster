# 📦 Environment Variable Reference (`.env`)

## 🌱 What Is a `.env` File?

A `.env` file manages your environment configuration—such as API credentials, exchange profiles, analysis timeframes, and model thresholds—abstracted away from core logic layers. This decouples sensitive credentials from application code, protecting assets from source-control leaks and simplifying runtime context switching between development, simulation sandbox, and high-frequency live trading environments.

```text
  [ Runtime Environment Matrix ]
                │
                ├──► Local Terminal Execution (e.g., export ASSET=GaiaBolt)
                │
                └──► Module Scope Parsing Chain:
                        ├── Root Directory Config (.env) ───────► Global Base Framework
                        ├── Tools Directory Config (tools/.env) ──► Model Trainers & Sweepers
                        └── Plugin Directory Config (plugins/...) ► Execution Node Drivers

```

Standard Node.js modules read these variables into global memory spaces seamlessly using the `dotenv` parsing architecture:

```js
// Instantly hydrates process.env with root configuration keys
require('dotenv').config(); 

```

For domain-specific runtimes or separate worker routines, explicit file sub-paths ensure strict isolation:

```js
// Target specific script configuration matrices
require('dotenv').config({ path: './tools/.env' });

```

---

## 📂 Project Structure for `.env` Files

The Gekko M4 engine maintains a localized, modular configuration pattern. This prevents script processes from inadvertently polluting separate execution pools:

```text
gekko-m4-globular-cluster/
├── .env                       # 🌍 Global Default Framework Parameters
├── tools/
│   └── .env                   # 🛠️ Analytics, Model Optimization, & Training Contexts
└── plugins/
    └── ccxtMarketData/
        └── .env               # 🔌 CCXT Direct REST/WebSocket Target Configurations

```

Each contextual boundary extracts parameters scoped to its target sub-system, protecting underlying processes.

---

## ⚙️ Detailed Environment Variable Reference

### 1️⃣ Exchange Simulator Mode & Virtual Asset Profiles

Used to drive offline data simulations, engine dry runs, and local backtests without real exchange connectivity or financial exposure. It uses mock currency wrappers to benchmark pipeline workflows.

```env
exchange=exchangesimulator
SIMULATOR_DATA_ID=exchangesimulator
currency=GaiaNut
asset=GaiaBolt

```

### 2️⃣ Chart Recognition, Prediction Engines, & Telemetry Outputs

Configures mathematical trend-recognition layers and defines output files for logging system predictions.

```env
INTERVAL_SIMULATOR=3600000            # Frame rate interval step mapping (in milliseconds)
MODEL_DIR=./trained_ohlcv             # Local path to serialized model structures
OUT_CSV_PATH=./ohlcv_data_prediction.csv # Output destination for inference vectors
SIGNAL_LOG_PATH=./exchangesimulator_signal.log # Target destination for engine logs

```

### 3️⃣ CCXT Market Data Layer & Trading Desk Metrics

Manages exchange connections, API key tokens, and execution bounds across live order books via the CCXT protocol layer.

```env
EXCHANGE=kraken                       # Targeted CCXT exchange driver ID
KEY=your_production_public_api_key    # Exchange API public access string
SECRET=your_production_secret_key     # Exchange API signature encryption key
PAIR=BTC/EUR                          # Standardized currency asset pair representation
ORDER_AMOUNT=0.0001                   # Baseline positioning unit volume size
MIN_ALLOWED_ORDER_AMOUNT=0.0001       # Protective floor limit to prevent API order drops
MAX_ORDER_AMOUNT=0.01                 # Volatility safety limit cap per trade block

OHLCV_CANDLE_SIZE=1m,5m,15m,1h        # Enabled resolution arrays for stream managers
INTERVAL_MS=3600000                   # Coarse loop tracking state rate (1 Hour)
MULTI_INTERVAL_MS=60000               # Fine high-frequency telemetry scan rate (1 Minute)
INTERVAL_HIGH=60000                   # Aggressive monitoring thread loop delay bound
INTERVAL_DEFAULT=300000               # Nominal polling loop fallback delay bound
INTERVAL_LOW=780000                   # Passive low-priority background thread loop bound

```

### 4️⃣ Model Optimization & Feature Engineering Trainers

Configures parameters for training algorithms on historical OHLCV data structures.

```env
TRAIN_OHLCV_TIMEFRAMES=1m,5m,15m,1h   # Target scale resolutions for training loops
TRAIN_OHLCV_JSON_DIR=tools/logs/json/ohlcv # Target repository directory for JSON files

# Quantitative Threshold Arrays (Fibonacci Sequence Intervals for Feature Extraction)
PVVM_THRESHOLDS=8,13,21,34,55         # Price-Volume Volatility Momentum step bounds
PVD_THRESHOLDS=8,13,21,34,55          # Price-Volume Divergence trend tracking windows
DYNAMIC_WINDOWS=5,8,13,21             # Dynamic moving observation horizons
DYNAMIC_FACTORS=0.8,1.0,1.13,1.21     # Scaling coefficients matching historical volatility

```

### 5️⃣ Automated Challenges & Comparative Analytics

Manages candidate ranking processes, ensuring only model architectures matching baseline validation criteria earn live execution priority.

```env
WINDOW_SIZE=20                        # Observation count frame window for metrics
CHALLENGE_MODEL_LIST=convnet,tf        # Evaluated runtime framework combinations
CHALLENGE_INTERVAL_MS=900000          # Cross-validation comparison loop timer (15 min)
CHALLENGE_WINDOW_SIZE=50              # Evaluation history buffer length for challenges
CHALLENGE_MIN_WIN_RATE=0.618          # Minimum predictive hit-ratio requirement (Golden Ratio)
CHALLENGE_DOMINANCE_THRESHOLD=0.618   # Marginal scoring floor for architectural supremacy
CHALLENGE_DOMINANCE_MIN_LENGTH=13     # Minimum persistent periods required to beat a model

CHLOG_INTERVAL_MS=900000              # Diagnostic tracking write update interval
CHLOG_WIN_OFFSET=2                    # Verification confirmation window padding
CHLOG_MODEL_LIST=convnet,tf           # Log validation array mapping list
MIN_WIN_RATE=0.3                      # Emergency performance floor threshold limit

```

### 6️⃣ High-Frequency Order-Book Microstructure Configurations

Controls sub-interval order books, razor-thin scalp margins, micro-volatility scaling thresholds, and high-frequency risk exposure caps.

```env
MICRO_EXCHANGE=kraken                 # Target high-liquidity order platform
MICRO_KEY=your_micro_api_key_token    # Isolated API access key
MICRO_SECRET=your_micro_secret_token  # Isolated signature computation key
MICRO_PAIR=BTC/EUR                    # Target high-frequency currency cross
MICRO_ORDER_AMOUNT=0.0001             # Micro-lot sizing target
MICRO_MIN_ALLOWED_ORDER_AMOUNT=0.0001 # Operational API floor limit
MICRO_MAX_ORDER_AMOUNT=0.002          # Hard position size limit for high-frequency trading
MICRO_RSI_PERIOD=3                    # Ultra-fast micro RSI calculation window
MICRO_PVVM_WINDOW=3                   # Real-time velocity volume memory lookback frame
MICRO_PVD_WINDOW=3                    # Micro-scale divergence monitoring frame width
MICRO_OHLCV_CANDLE_SIZE='1m'          # Low-latency streaming resolution base unit
MICRO_INTERVAL_MS=300000              # Engine execution step rate (5 minutes)
MAX_ACTIVE_POSITIONS=3                # Strict simultaneous position count restriction cap
MICRO_MAX_TRADES_PER_DAY=10           # Over-trading protection circuit breaker trip level
MICRO_TIMEFRAME='1m'                  # Target tick bar processing frame resolution
BASE_PROFIT_PCT=0.003                 # Scalping take-profit target ratio (0.3%)
BASE_LOSS_PCT=0.003                   # Scalping strict stop-loss protection margin (0.3%)
FIB_HOLD_INDEX=2                      # Fibonacci-based order persistence hold value
MICRO_TRADE_QUALITY_THRESHOLD=70      # Quality evaluation cutoff score requirement

```

### 7️⃣ Long-Horizon Macrostructure Allocation Frameworks

Manages macroscopic macro-trend configurations, deep liquidity position pools, structural trailing margins, and long-horizon risk analysis tracking loops.

```env
# Macro Market Definitions
EXCHANGE=kraken                       
KEY=your_macro_api_key_token          
SECRET=your_macro_secret_token        
PAIR=BTC/EUR                          
SYMBOL=BTC/EUR                        
ORDER_AMOUNT=0.001                    # Large-lot base positioning allocation sizing
MIN_ALLOWED_ORDER_AMOUNT=0.0001       
MAX_ORDER_AMOUNT=0.05                 # Multi-lot maximum sizing boundary threshold

# Operational Cool-Down Restraints (Rate Limiters for Order-Execution Loops)
INTERVAL_AFTER_TRADE=30000            # Cooling lock window step after a completed fill (30s)
INTERVAL_AFTER_SKIP=90000             # Re-evaluation step delay after a signal skip (90s)
INTERVAL_AFTER_HOLD=180000            # Evaluation delay while executing a hold state (180s)
INTERVAL_AFTER_ERROR=60000            # Network recovery delay after an API connection drop (60s)
MACRO_TRADE_QUALITY_THRESHOLD=70     # Structural trend verification score barrier

# Analytics Pipeline Paths
OHLCV_JSON_DIR=tools/logs/json/ohlcv  
OHLCV_JSON_PATH=tools/logs/json/ohlcv/ohlcv_ccxt_data.json
FETCH_LIMIT=60                        # Historical candle count limit collected per query

# Structural Risk Safeguards
STOP_LOSS_PCT=0.03                    # Macro position exit protection buffer (3.0%)
TAKE_PROFIT_PCT=0.06                  # Macro systemic position profit-taking target (6.0%)

MODEL_LIST=convnet,tf                 # Injected evaluation architectures

SIGNAL_LOG_PATH=tools/logs/ccxt_signal_comparative.log # Path to diagnostic signal logs
ORDER_LOG_PATH=tools/logs/ccxt_order.log               # Path to ledger transaction files
MACRO_MIN_WIN_RATE=0.2                # Macro-trend base validation entry floor
MACRO_MAX_VOLATILITY=100              # Extreme volatility circuit-breaker filter index

```

### 8️⃣ Model Validation Evaluators & Evolutionary Auto-Tuning Engines

Configures loop frequencies for optimization scripts that run background parameter sweeps and execute performance tuning runs.

```env
EVALUATE_INTERVAL_MS=900000           # Performance calculation sweep frequency (15m)
AUTOTUNE_INTERVAL_MS=900000           # Parameter space search refresh window frequency (15m)

```

### 9️⃣ Multi-Strategy Algorithmic Configuration Profiles

Provides centralized parameter injection mappings for native mathematical models and structural technical analysis strategies.

```env
# ---------------------------------------------------------------------
# BOLLINGER BAND (Volatility-Squeezed Multi-Indicator Model)
# ---------------------------------------------------------------------
BBANDS_TIMEPERIOD=20                  # Moving average period width for bands calculation
BBANDS_NBDEVUP=2.25                   # Standard deviation envelope offset scale (Upper)
BBANDS_NBDEVDN=2                      # Standard deviation envelope offset scale (Lower)
BBANDS_SMA=200                        # Slow baseline trend structural support mapping 
BBANDS_DEMA=200                       # Fast Double Exponential Trend tracker window
BBANDS_GANN_ANGLES=1,2,3              # Gann fan vector parameters geometric matrix

# ---------------------------------------------------------------------
# RSIBULLBEARADX (Trend Strength-Filtered Momentum Strategy)
# ---------------------------------------------------------------------
RSIBULLBEARADX_SMA_LONG=200           # Macro baseline regime filter definition
RSIBULLBEARADX_SMA_SHORT=50           # Micro baseline regime filter definition
RSIBULLBEARADX_BULL_RSI=10            # Bullish relative strength tracking window
RSIBULLBEARADX_BULL_RSI_HIGH=80       # Bullish regime expansion envelope limit
RSIBULLBEARADX_BULL_RSI_LOW=60        # Bullish regime support consolidation bound
RSIBULLBEARADX_BEAR_RSI=15            # Bearish relative strength tracking window
RSIBULLBEARADX_BEAR_RSI_HIGH=50       # Bearish market ceiling boundary condition
RSIBULLBEARADX_BEAR_RSI_LOW=20        # Bearish structural capitulation envelope limit
RSIBULLBEARADX_BULL_MOD_HIGH=5        
RSIBULLBEARADX_BULL_MOD_LOW=-5       
RSIBULLBEARADX_BEAR_MOD_HIGH=15       
RSIBULLBEARADX_BEAR_MOD_LOW=-5        
RSIBULLBEARADX_RSI=13                 # Standard core momentum configuration lookback
RSIBULLBEARADX_ADX=8                  # Average Directional Index core trend configuration
RSIBULLBEARADX_ADX_HIGH=70            # Extreme directional exhaustion threshold
RSIBULLBEARADX_ADX_LOW=50             # Validation baseline trend confirmation barrier

# ---------------------------------------------------------------------
# INVERTER (Inverted Logic Defensive Hedging Engine)
# ---------------------------------------------------------------------
INVERTER_DI=13                        # Lookback period for underlying directional vectors
INVERTER_DX=3                         # Historical window calculation framework length

# ---------------------------------------------------------------------
# SUPERTREND (ATR-Based Volatility Trailing Channel Stop)
# ---------------------------------------------------------------------
SUPERTREND_ATR=7                      # Average True Range volatility tracker frame lookback
SUPERTREND_BAND_FACTOR=3              # Dynamic range multiplier width allocation factor

# ---------------------------------------------------------------------
# NEURALNET & NEURALNET REFINEMENTS (Deep Inference Layer Configuration Matrices)
# ---------------------------------------------------------------------
NEURALNET_SMA_LONG=987                # Fibonacci macro baseline trend verification filter
NEURALNET_SMA_SHORT=50                
NEURALNET_THRESHOLD_BUY=0.2           # Activation trigger score limit to fire buy orders
NEURALNET_THRESHOLD_SELL=-0.2         # Activation trigger score limit to fire sell orders
NEURALNET_LEARNING_RATE=0.01          # Optimization weight adaptation speed index
NEURALNET_LIMIT_ORDER=0.01            # Maximum target execution slip price constraint
NEURALNET_MOMENTUM=0.1                
NEURALNET_DECAY=0.01                  
NEURALNET_HODL_THRESHOLD=1            # Position enforcement duration index limiter
NEURALNET_PRICE_BUFFER_LEN=1597       # Deep input history array queue storage capacity
NEURALNET_MIN_PREDICTIONS=1597        # Minimum window fill required to clear warmup steps

# ---------------------------------------------------------------------
# NN (Agnostic Adaptive Neural Network Execution Parameters)
# ---------------------------------------------------------------------
NN_THRESHOLD_BUY=0.2                  
NN_THRESHOLD_SELL=-0.2                
NN_METHOD=adadelta                    # Underlying mathematical gradient optimization model
NN_LEARNING_RATE=0.01                 
NN_MOMENTUM=0.0                       
NN_L1_DECAY=0.001                     # Lasso structural regularization feature constraint
NN_L2_DECAY=0.001                     # Ridge structural regularization feature constraint
NN_PRICE_BUFFER_LEN=987               # Stream memory historical stack capacity limit
NN_MIN_PREDICTIONS=144                # Minimum activation bar constraint threshold
NN_HODL_THRESHOLD=1                   
NN_SCALE=1                            # Input feature data transformation scale factor
NN_BATCH_SIZE=1                       
NN_RSI=13                             
NN_DEMA=1                             

# ---------------------------------------------------------------------
# STOCHRSI (Double-Smoothed Oscillating Momentum Model)
# ---------------------------------------------------------------------
STOCHRSI_INTERVAL=10                  # Core stochastic sampling sequence width
STOCHRSI_HIGH=70                      # Upper threshold barrier for execution checks
STOCHRSI_LOW=30                       # Lower threshold barrier for execution checks
STOCHRSI_PERSISTENCE=5                # Validating signal filter durability confirmation
STOCHRSI_RSI=21                       # Base RSI engine initialization length
STOCHRSI_STOCH=21                     # Smoothing window parameter metric definition

# ---------------------------------------------------------------------
# CCI (Commodity Channel Index Deviation Metrics)
# ---------------------------------------------------------------------
CCI_THRESHOLDS_UP=100                 # Overextended positive divergence channel limit
CCI_THRESHOLDS_DOWN=-100              # Overextended negative divergence channel limit
CCI_THRESHOLDS_PERSISTENCE=0          
CCI_CONSTANT=0.015                    # Lambert statistical scaling factor constant
CCI_HISTORY=987                       # Historical evaluation distribution sample pool

```

---

## ⏱️ Interval & Time Window Metric Mapping Reference

When customizing `.env` parameters across your deployment environments, keep intervals in sync. Misaligned configurations can lead to incomplete data inputs or out-of-sync training arrays.

| Variable Name Property | Millisecond Vector | Equivalent Execution Window | Applied System Core Focus |
| --- | --- | --- | --- |
| **INTERVAL_MS** | `60000` | 1 Minute | High-Frequency Microstructure Scalping Loops |
| **INTERVAL_MS** | `300000` | 5 Minutes | Micro-Trend Infrastructure Processing |
| **INTERVAL_MS** | `900000` | 15 Minutes | Challenge Models, AutoTune, & Evaluators |
| **INTERVAL_MS** | `1800000` | 30 Minutes | Standard Volatility Momentum Scanning |
| **INTERVAL_MS** | `3600000` | 1 Hour | Macrostructure Trend Analysis & Execution |
| **INTERVAL_MS** | `21600000` | 6 Hours | Macro-Regime Allocation Models |
| **INTERVAL_MS** | `43200000` | 12 Hours | Coarse Account Multi-Asset Sweeps |
| **INTERVAL_MS** | `86400000` | 24 Hours | System Telemetry Performance Dumps |

---

## 🖥️ Ad-Hoc Runtime Environment Overrides

You can temporarily override configuration parameters for a single script execution directly from the terminal interface. This avoids making changes to your permanent `.env` files:

### Unix Platform Invocations (Linux / macOS)

```bash
# Temporarily re-bind the engine execution interval step rate to 1 Hour for a backtest run
export INTERVAL_MS=3600000
node tools/backtest/backtotesting.js

```

### Windows Platform Invocations (PowerShell Core)

```powershell
# Temporarily re-bind parameters within active process space
$env:INTERVAL_MS="3600000"
node tools/backtest/backtotesting.js

```

---

## 🚀 Architectural Deployment Best Practices

* **Scope Integrity Guardrails:** Keep `.env` configuration instances unique to their specific directory spaces. Never commit production configuration credentials (such as API secret keys) to public version control networks.
* **Keep Parameters In Sync:** When tweaking lookback steps (e.g., matching `historySize` metrics inside configuration advisors), ensure the largest indicator period constraint has enough history to properly warm up.
* **Verify Data Scaling Profiles:** Ensure that string and number environment variables are correctly parsed using conversion functions like `Number()` when loading them into your scripts. This prevents runtime type comparison exceptions during data processing loops.
