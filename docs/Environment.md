# Environment Configuration Reference

This document explains the .env configuration used by this project. It is intended both for users who want to familiarize themselves with configuration options and for developers who need to understand where and how settings affect the application.

Use this document to:
- Understand each environment variable, its expected type and units, defaults in the repository's .env, and acceptable values.
- Learn safe practices for toggling live trading, storing secrets, and debugging.
- Find quick troubleshooting tips and suggested ranges for thresholds.
- See practical examples for common tasks (e.g., switch to live mode, connect CCXT exchange, debug model paths).

> Note: The values shown here come from the repository .env file In typical deployments you will override sensitive values (API keys, secrets) in a separate local .env or CI secret store and never commit real credentials.

Contents
- Overview & formatting rules
- How the app reads .env
- Detailed variable reference (grouped)
- Common tasks & examples
- Developer notes: where to find usage and how to extend
- Troubleshooting checklist
- Security & operational checklist
- Minimal and production example templates

---

## Overview & formatting rules

- Format: KEY=VALUE, no quotes required for most values. Strings with spaces are allowed but prefer no leading/trailing whitespace. Use comma-separated lists for multi-value fields (e.g., timeframes).
- Units: Many interval fields are in milliseconds (ms). Candle sizes and timeframe strings use human-friendly tokens like `1m,5m,1h`.
- Last-definition-wins: If a variable appears more than once in the file, the last occurrence will typically override earlier ones when parsed by dotenv-style parsers. Avoid duplicate keys or be explicit about intended overrides.
- Booleans: Represented as `true`/`false` (strings). When read in code you'll usually parse these strings into booleans.
- Numeric fields: Values are strings in the .env but should be parsed into numbers in code (integers/floats as appropriate).
- File paths: Prefer relative paths inside the repo for logs/model directories; ensure directories exist and are writable.

---

## How the app reads .env

The project is expected to use a dotenv loader (for Node.js: `dotenv`) or similar. Environment variables are accessed in code with `process.env.VARNAME`. The application typically parses numeric fields (parseInt/parseFloat), booleans, and comma-separated lists (split on `,` and trim).

Developer tip: When changing environment variable names or adding new ones, search the codebase for `process.env.VAR` or for the variable name itself to discover where the value is consumed.

---

## Detailed variable reference

Below the variables are grouped and documented following the grouping in the .env file. For each variable: Type, default (from the repo .env), notes, valid values and recommended ranges where applicable.

### Exchange Simulator Mode & Core Asset/Currency
- EXCHANGESIMULATOR
  - Type: string
  - Default: `exchangesimulator`
  - Notes: Identifier used by simulator components; used in routing and logs.
- SIMULATOR_DATA_ID
  - Type: string
  - Default: `exchangesimulator`
  - Notes: ID used by simulator data sources.
- CURRENCY
  - Type: string
  - Default: `GaiaNut`
  - Notes: The accounting currency used in reports.
- ASSET
  - Type: string
  - Default: `GaiaBolt`
  - Notes: The asset symbol used for simulated orders.

### CCXT Market Data Plugin Settings
- CCXT_MARKET_DATA_ENABLED
  - Type: boolean (`true`/`false`)
  - Default: `true`
  - Notes: Enable/disable the CCXT market data plugin (fetches OHLCV via CCXT).
- CCXT_MARKET_DATA_EXCHANGE
  - Type: string
  - Default: `kraken`
  - Notes: CCXT exchange id (see CCXT docs for exchange identifiers).
- CCXT_MARKET_DATA_PAIR
  - Type: string
  - Default: `BTC/EUR`
  - Notes: Trading symbol/pair used to fetch OHLCV.
- CCXT_MARKET_DATA_CANDLE_SIZE
  - Type: string (e.g., `1h`, `1m`)
  - Default: `1h`
  - Notes: Human-friendly candle size string used by the plugin.
- CCXT_MARKET_DATA_FETCH_INTERVAL
  - Type: integer (ms)
  - Default: `3600000` (1 hour)
  - Notes: How often to fetch via CCXT; ensure this matches the candle size to avoid duplicates/overfetch.
- CCXT_MARKET_DATA_OUTPUT_CSV / CCXT_MARKET_DATA_OUTPUT_JSON
  - Type: string (file path)
  - Default: `./logs/csv/ohlcv_ccxt_data.csv` and `./logs/json/ohlcv/ohlcv_ccxt_data.json`
  - Notes: Files written by the fetcher; directories must exist and be writable.

### Chart Recognition Script & Output
- INTERVAL_SIMULATOR_MS
  - Type: integer (ms)
  - Default: `3600000`
  - Notes: Polling interval used by simulator components.
- MODEL_DIR
  - Type: path
  - Default: `./trained_ohlcv`
  - Notes: Directory where trained models (convnet, tfjs, etc.) are stored.
- OUT_CSV_PATH
  - Type: path
  - Default: `./ohlcv_data_prediction.csv`
  - Notes: CSV output for predictions.
- SIGNAL_LOG_PATH
  - Type: path
  - Default: `./exchangesimulator_signal.log`
  - Notes: Where generated signals are logged (simulator mode).

### CCXT Market Data & Trading Settings (general)
- EXCHANGE
  - Type: string
  - Default: `kraken`
  - Notes: CCXT exchange used for trading (not only market data).
- KEY, SECRET
  - Type: string
  - Default: empty
  - Notes: API credentials. Keep them out of commits; use local secret storage or CI secrets.
- PAIR
  - Type: string
  - Default: `BTC/EUR`
- ORDER_AMOUNT / MIN_ORDER_AMOUNT / MAX_ORDER_AMOUNT
  - Type: decimal (asset units)
  - Defaults: `ORDER_AMOUNT=0.0001`, `MIN_ORDER_AMOUNT=0.00008`, `MAX_ORDER_AMOUNT=0.0001`
  - Notes: These set default and bounds for orders. Verify with exchange minimums and precision.

### CCXT Explorer & OHLCV Settings
- OHLCV_CANDLE_SIZE
  - Type: CSV
  - Default: `1m,5m,15m,1h`
  - Notes: Sizes fetched for the OHLCV explorer.
- INTERVAL_MS, INTERVAL_HIGH, INTERVAL_DEFAULT, INTERVAL_LOW
  - Type: integer (ms)
  - Defaults: `3600000`, `60000`, `300000`, `780000`
  - Notes: Processing intervals for different tasks.
- FETCH_LIMIT
  - Type: integer
  - Default: `60`
  - Notes: Number of candles fetched per request.

### Trainers & Model Settings
- TRAIN_INTERVAL_MS / MULTI_INTERVAL_MS
  - Type: ms
  - Defaults: `60000`
- TRAIN_OHLCV_TIMEFRAMES
  - Type: CSV
  - Default: `1m,5m,15m,1h`
  - Notes: Timeframes used by training jobs.
- TRAIN_OHLCV_JSON_DIR
  - Type: path
  - Default: `../logs/json/ohlcv`
- MICRO_* (micro trading trainer & decision variables)
  - MICRO_SELL_THRESHOLD: fraction (negative means loss), default `-0.05`
  - MICRO_HYSTERESIS: fraction, default `0.02`
  - MICRO_MIN_PROB: 0-1, default `0.65`
  - MICRO_MIN_SCORE: default `0.01`
  - MICRO_PROB_STRATEGY: `none|sigmoid|normalize|calibrated` (default `sigmoid`)
  - MICRO_PROB_SCALE, MICRO_MAX_SCORE, MICRO_VERBOSE: tuning/logging params
  - MICRO_PROB_CALIB_PATH: optional path to calibration JSON (commented out in the .env)
  - Notes: These drive microtrade decision logic and scoring. Adjust conservatively.

- PVVM_THRESHOLDS / PVD_THRESHOLDS / DYNAMIC_WINDOWS / DYNAMIC_FACTORS
  - Type: CSV of integers/floats
  - Notes: Used by dynamic sizing/timing algorithms. Keep monotonic sequences where expected.

### Challenge / Backtesting / Analysis
- CHALLENGE_INTERVAL_MS, CHLOG_INTERVAL_MS, etc.
  - Type: ms
  - Default: `60000`
- WINDOW_SIZE
  - Type: integer (candles)
  - Default: `50`
- CHALLENGE_MIN_WIN_RATE
  - Type: fraction (0-1)
  - Default: `0.618`
  - Notes: Required win rate to pass filters (domain-specific threshold).
- CHALLENGE_TIMEFRAMES / CHLOG_TIMEFRAMES
  - Type: CSV
- FUTURE_OFFSET
  - Type: integer (candles)
  - Default: `2`
  - Notes: How far predictions are offset relative to current candle.
- CHLOG_MODEL_LIST
  - Type: CSV of model identifiers
  - Default: `convnet,tf`
- CHLOG_MAX_ROWS
  - Type: integer
  - Default: `10000`
- CHLOG_NEUTRAL_RESULT
  - Default: `loss`
  - Notes: Label used for neutral/uncertain outcomes.

### Microstructure / Macrostructure TimeFrames
- MICRO_TIMEFRAMES
  - Type: CSV
  - Default: `15m`
  - Notes: Primary microstructure timeframe(s).
- MACRO_TIMEFRAMES
  - Type: CSV
  - Default: `1m,5m,15m,1h`
  - Notes: Timeframes used by macro-level components.

### Microstructure-specific Settings
- MICRO_EXCHANGE / MICRO_KEY / MICRO_SECRET / MICRO_PAIR
  - Type: strings
  - Default exchange: `kraken`
  - Notes: Configure micro-exchange and credentials separately for granular control.
- MICRO_ORDER_AMOUNT / MICRO_MAX_ORDER_AMOUNT
  - Default: `0.0001`
- LOG_PATH
  - Default: `tools/logs/micro_order.log`
- MICRO_OHLCV_CANDLE_SIZE / INDEX_OHLCV_CANDLE_SIZE
  - Default: `1m,5m`
- MICRO_INTERVAL_MS
  - Default: `300000` (5 minutes)
- MICRO_STRATEGY
  - Default: `Balanced+`
- MICRO_PRIMARY_TF
  - Default: `1m,5m`

Neural network microstructure model config
- MICRO_MODEL_ENABLE
  - Type: boolean
  - Default: `true`
- MICRO_MODEL_TYPE
  - Type: `json` or `tfjs`
  - Default: `json`
- MICRO_MODEL_PATH
  - Type: path
  - Default: `tools/microstructure/models/mlp.json`
  - Notes: For JSON-MLP, the file contains a tiny MLP format. For TFJS, set to `model.json` path.
- MICRO_MODEL_INPUT_KEYS
  - Type: CSV
  - Default: `momentum,priceChange,prediction`
- MICRO_MODEL_OUTPUT_KEY
  - Optional: If model output is an object and you need a specific key, set here.
- MICRO_MODEL_PROB_AS_LOGIT
  - Type: boolean
  - Default: `true`
  - Notes: Set `false` if your model already outputs probabilities in [0,1].

### Macrostructure Settings
- MACRO_EXCHANGE / MACRO_KEY / MACRO_SECRET / MACRO_PAIR
  - Default: `kraken`, ``, ``, `BTC/EUR`
- ORDER_*/MIN_ALLOWED_ORDER_AMOUNT/MAX_ORDER_AMOUNT
  - Notes: Duplicate keys exist; ensure the desired value is used (last one typically applies). Validate against exchange limits.
- INTERVAL_AFTER_* (TRADE / SKIP / HOLD / ERROR)
  - Units: ms
  - Defaults: `30000`, `90000`, `180000`, `60000`
  - Notes: Cooldown throttles between decisions.
- SYMBOL
  - Default: `BTC/EUR` (same as pair)
- OHLCV_JSON_DIR / OHLCV_JSON_PATH
  - Paths for macro OHLCV input/output.
- BACKTEST_JSON_PATH / MACRO_BACKTEST_JSON_PATH
  - Paths to backtest result files.
- STOP_LOSS_PCT / TAKE_PROFIT_PCT
  - Type: fraction
  - Defaults: `0.003` (0.3%) and `0.006` (0.6%)
  - Notes: Very sensitive in live trading; change carefully.
- MACRO_MIN_WIN_RATE / MACRO_MAX_VOLATILITY
  - Defaults: `0.2`, `100`

### Evaluate / AutoTune
- AUTOTUNE_SCORE_KEY
  - Default: `abs` (metric used for scoring)
- EVALUATE_INTERVAL_MS / AUTOTUNE_INTERVAL_MS
  - Type: ms
  - Defaults: `60000`
- EVALUATE_STRATEGY
  - Default: `neuralnet_v2`
- GENERATE_PERMUTATIONS
  - Type: integer boolean-like (0/1)
  - Default: `1`

### Advanced / Debug / Extra
- DEBUG
  - Type: boolean
  - Default: `true`
  - Notes: Toggle verbose debug logging.
- DRY_RUN / FORCE_DRY / ENABLE_LIVE
  - DRY_RUN & FORCE_DRY: protect against accidental live orders; both default to `true`/`true`
  - ENABLE_LIVE: Master flag `false` by default. To enable live trading: set `ENABLE_LIVE=true`, provide keys (KEY/SECRET), and set `DRY_RUN=false` and `FORCE_DRY=false`. See Security & Operational checklist below first.
- ORDER_SUBMISSION_RETRY_MS / ORDER_THROTTLE_MS
  - Defaults: `15000`, `300000`

### Order sizing & persistence
- FIXED_ORDER_SIZE / MIN_ALLOWED_ORDER_AMOUNT / MAX_ORDER_AMOUNT
  - Defaults duplicate: `0.0001`, `0.00008`, `0.0001`
  - Notes: Ensure consistent definitions used by code. Validate against exchange minimums and number precision.
- POSITION_STATE_FILE
  - Default: `./logs/position_state.json`
- ORDER_LOG_FILE
  - Default: `./logs/ccxt_order.log`

### Strategy-specific Blocks (Simulator)
- Bollinger Bands (BBANDS_*)
  - Timeperiod, nbdev up/down, SMA/DEMA, gann angles.
  - Example: BBANDS_TIMEPERIOD=20 and BBANDS_NBDEVUP=2.25
- RSIBULLBEARADX_* - RSI & ADX config for this strategy.
- INVERTER, SUPERTREND and other strategy parameter groups - numeric window sizes and thresholds.
- Neuralnet / NN blocks (parameters for on-line training/inference)
  - NEURALNET_* and NN_* variables give learning rates, buffer sizes, thresholds, regularization, etc.
  - Defaults include large buffer lengths (e.g., NEURALNET_PRICE_BUFFER_LEN=1597). These influence memory usage and how many samples are required before decisions.

Notes about duplicate blocks:
- The .env contains a duplicate NEURALNET block (compatibility). The last occurrence wins at parse time; remove duplicates to avoid confusion.

---

## Common tasks & examples

1. Enable live trading (basic):
   - Set these in a local .env (never commit real keys):
     - ENABLE_LIVE=true
     - DRY_RUN=false
     - FORCE_DRY=false
     - KEY=<your_api_key>
     - SECRET=<your_api_secret>
     - EXCHANGE=kraken (or other supported CCXT exchange)
     - PAIR=BTC/EUR (as needed)
   - Verify: ensure ORDER_AMOUNT & min/max are compatible with exchange precision/minimum.
   - Restart the application after updating .env.

2. Run only market-data collector (no trading):
   - CCXT_MARKET_DATA_ENABLED=true
   - ENABLE_LIVE=false
   - DRY_RUN=true or FORCE_DRY=true

3. Use a filesystem model for micro inference (JSON-MLP):
   - MICRO_MODEL_TYPE=json
   - MICRO_MODEL_PATH=tools/microstructure/models/mlp.json
   - MICRO_MODEL_ENABLE=true

4. Change polling frequency for high-frequency tasks:
   - Update INTERVAL_HIGH (value in ms), e.g., `INTERVAL_HIGH=30000` (30s) and restart.

5. Increase risk tolerance (examples - test thoroughly):
   - MACRO_MIN_WIN_RATE: lower value = more permissive (e.g., 0.15 -> 15%)
   - STOP_LOSS_PCT / TAKE_PROFIT_PCT: adjust fractions carefully.

---

## Developer notes: where variables are used and how to locate usage
  - Typical places to look in the codebase:
  - Config loader module (e.g., `config.js`, `env.js`): the project commonly uses the dotenv package to load .env files into process.env; the config loader should parse those string values and map them into typed config objects (numbers, booleans, arrays) and perform appropriate validation and defaults.
  - Exchange wrappers / CCXT integration (e.g., directories named `exchange`, `ccxt`, or `tools/ccxt`).
  - Trainers and model scripts: directories like `train`, `tools/microstructure`, `trained_ohlcv`.
  - Backtest and challenge components: look for names like `challenge`, `backtest`, `evaluate`, `autotune`.
- How to find usages quickly:
  - Search the repository for the environment variable names (e.g., `EXCHANGE`, `MICRO_MODEL_PATH`) or for `process.env`.
  - Use lexical/semantic code search or `grep`/ripgrep:
    - grep -R "MICRO_MODEL_PATH" .
    - rg "process.env\.(MICRO|MACRO|CCXT|ENABLE_LIVE|DRY_RUN)" .
- Adding a new env var:
  - Add it to `.env.example` or `docs/ENVIRONMENT.md`.
  - Update the config loader to parse and validate the value.
  - Add tests or runtime sanity checks (e.g., ensure numeric ranges, presence of required files).

---

## Troubleshooting checklist

If something isn't working, check these items:

1. No market data:
   - Is CCXT_MARKET_DATA_ENABLED=true?
   - Is CCXT_MARKET_DATA_EXCHANGE set to a valid CCXT id?
   - Are API limits reached? Check logs.
2. Model not found / inference failing:
   - Confirm MODEL_DIR / MICRO_MODEL_PATH exist and model files (e.g., `model.json`) are present.
   - Verify model type (json vs tfjs) matches files.
3. Orders failing or rejected:
   - Check KEY/SECRET for micro/macro exchanges; ensure the keys have trading permissions.
   - Compare ORDER_AMOUNT to exchange minimums and precision constraints.
   - Inspect ORDER_LOG_FILE and POSITION_STATE_FILE for errors and state.
4. Unexpected behavior after edits:
   - Ensure you restarted the application after changing .env.
   - Check for duplicate keys in .env (last value wins).
5. High CPU / memory usage:
   - Large buffer lengths and models can be memory heavy (e.g., NEURALNET_PRICE_BUFFER_LEN=1597). Tune down for small machines.
6. Inconsistent timeframes / duplicate candle fetches:
   - Ensure INTERVAL_* settings are consistent and candle sizes align with fetch intervals.
7. Debugging:
   - Set DEBUG=true for verbose logs. Logs usually contain traces for where errors originate.

---

## Security & operational checklist (before enabling live trading)

- Never commit API keys or real secrets. Use:
  - A separate `.env` file that is gitignored.
  - Environment variables in production via secret managers (CI/CD, Kubernetes secrets).
- Verify these flags before trading live:
  - ENABLE_LIVE=true
  - DRY_RUN=false
  - FORCE_DRY=false
- Validate exchange constraints:
  - Minimum order size, allowed pair, precision (decimals).
  - Rate limits (throttle between order submissions).
- Use small order sizes initially; test with dry-run extensively.
- Have monitoring / alerting around order submissions and position states (logs written to ORDER_LOG_FILE, POSITION_STATE_FILE).
- Establish a kill-switch (e.g., flip ENABLE_LIVE back to false) and ensure automated processes can be stopped quickly.

---

## Minimal .env example (local testing)
```dotenv
# Minimal test .env
EXCHANGE=kraken
CCXT_MARKET_DATA_ENABLED=true
CCXT_MARKET_DATA_EXCHANGE=kraken
CCXT_MARKET_DATA_PAIR=BTC/EUR
DRY_RUN=true
FORCE_DRY=true
ENABLE_LIVE=false
ORDER_AMOUNT=0.0001
MIN_ORDER_AMOUNT=0.00008
MAX_ORDER_AMOUNT=0.0001
MODEL_DIR=./trained_ohlcv
```

## Production .env example (safety checklist)
- Never store keys in repo. Use secret management.
- Example (values should come from secret store):
```dotenv
ENABLE_LIVE=true
DRY_RUN=false
FORCE_DRY=false
EXCHANGE=kraken
KEY=<set via secret-store>
SECRET=<set via secret-store>
PAIR=BTC/EUR
ORDER_AMOUNT=0.0001
MIN_ORDER_AMOUNT=0.00008
MAX_ORDER_AMOUNT=0.0001
ORDER_SUBMISSION_RETRY_MS=15000
ORDER_THROTTLE_MS=300000
DEBUG=false
```

---

## Notes about compatibility & maintenance

- Duplicate keys in the .env (e.g., ORDER_AMOUNT, MIN_ORDER_AMOUNT, NEURALNET blocks) can lead to confusion; consolidate duplicates and keep a single authoritative `.env`.
- Unit consistency: intervals are in milliseconds—document this every time you add new interval fields.
- When changing a variable's semantics (e.g., converting from integer to JSON), update the config loader and document the change in this file and in migration notes.

---
