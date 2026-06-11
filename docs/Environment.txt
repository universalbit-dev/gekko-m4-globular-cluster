┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           ENVIRONMENT CONFIGURATION REFERENCE                           │
│                                  [ Core System Engine ]                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

===========================================================================================
 01. OVERVIEW & PARSING MATRIX
===========================================================================================

This document explains the `.env` configuration schema used across this project. It serves 
as a technical manual for operators tuning system boundaries and developers extending the 
core config loaders.

   ┌─────────────────────────────────────────────────────────────────────────┐
   │                        [ PRODUCTION ENGINE ]                            │
   │            Reads state via Node.js `process.env.VARNAME`                │
   └─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │                        [ CORE DOTENV LOADER ]                           │
   │  Loads `.env` arrays ──► Strips Whitespace ──► Injects String Pairs     │
   └─────────────────────────────────────────────────────────────────────────┘
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
   ┌───────────────────────────────────┐ ┌───────────────────────────────────┐
   │        [ STRATEGY PIPELINE ]      │ │        [ EXECUTION WRAPPER ]      │
   │ Parses: Booleans & Numeric Floats │ │ Maps: CCXT Pairs & Private Keys  │
   └───────────────────────────────────┘ └───────────────────────────────────┘

── [ FORMATTING RULES ]
   ├── ASSIGNMENT KEY  : Formatted strictly as KEY=VALUE. No quotation marks required.
   ├── TIME RESOLUTION : Core execution intervals use raw integer milliseconds (ms).
   ├── WINDOW TOKENS   : Candle resolutions use standard human tokens (e.g., 1m, 5m, 1h).
   ├── CASCADE PRIORITY: Cascades via "last-definition-wins". Duplicated tokens overwrite 
   │                     prior keys sequentially at runtime. Remove duplicates to ensure safety.
   └── FILE PATHWAYS   : Prefers localized repo-relative pathways; paths must be writable.


===========================================================================================
 02. DETAILED VARIABLE REFERENCE MATRIX
===========================================================================================

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. EXCHANGE SIMULATOR CORE CONFIG                                                       │
├───────────────────────┬──────────────┬───────────────┬──────────────────────────────────┤
│ ENVIRONMENT VARIABLE  │ DATA TYPE    │ REPO DEFAULT  │ CORE FUNCTIONAL DESCRIPTION      │
├───────────────────────┼──────────────┼───────────────┼──────────────────────────────────┤
│ EXCHANGESIMULATOR     │ String       │ exchangesimu* │ Core routing identifier tag.     │
│ SIMULATOR_DATA_ID     │ String       │ exchangesimu* │ Source stream data identifier.   │
│ CURRENCY              │ String       │ GaiaNut       │ Accounting base ledger metric.   │
│ ASSET                 │ String       │ GaiaBolt      │ Active mock order target asset.  │
└───────────────────────┴──────────────┴───────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. CCXT MARKET DATA ENGINE                                                              │
├───────────────────────┬──────────────┬───────────────┬──────────────────────────────────┤
│ ENVIRONMENT VARIABLE  │ DATA TYPE    │ REPO DEFAULT  │ CORE FUNCTIONAL DESCRIPTION      │
├───────────────────────┼──────────────┼───────────────┼──────────────────────────────────┤
│ CCXT_MARKET_DATA_ENAB*│ Boolean      │ true          │ Toggles CCXT candle polling.     │
│ CCXT_MARKET_DATA_EXCH*│ String       │ kraken        │ Target exchange engine string.   │
│ CCXT_MARKET_DATA_PAIR │ String       │ BTC/EUR       │ Active ticker instrument pair.   │
│ CCXT_MARKET_DATA_CAND*│ Token String │ 1h            │ Primary tracker candle window.   │
│ CCXT_MARKET_DATA_FETCH│ Integer (ms) │ 3600000       │ Polling cycle rate limit timing. │
│ CCXT_MARKET_DATA_OUT_*│ File Path    │ ./logs/...    │ CSV/JSON local sink targets.     │
└───────────────────────┴──────────────┴───────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. INFRASTRUCTURE & CHART RECOGNITION DICTIONARY                                        │
├───────────────────────┬──────────────┬───────────────┬──────────────────────────────────┤
│ ENVIRONMENT VARIABLE  │ DATA TYPE    │ REPO DEFAULT  │ CORE FUNCTIONAL DESCRIPTION      │
├───────────────────────┼──────────────┼───────────────┼──────────────────────────────────┤
│ INTERVAL_SIMULATOR_MS │ Integer (ms) │ 3600000       │ Heartbeat tick rate of simulator.│
│ MODEL_DIR             │ Folder Path  │ ./trained_oh* │ Target neural model repository.  │
│ OUT_CSV_PATH          │ File Path    │ ./ohlcv_data* │ Inference target output pipeline.│
│ SIGNAL_LOG_PATH       │ File Path    │ ./exchangesi* │ Direct diagnostic signal ledger. │
└───────────────────────┴──────────────┴───────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. GENERAL CCXT TRADING & EXECUTION BOUNDARIES                                          │
├───────────────────────┬──────────────┬───────────────┬──────────────────────────────────┤
│ ENVIRONMENT VARIABLE  │ DATA TYPE    │ REPO DEFAULT  │ CORE FUNCTIONAL DESCRIPTION      │
├───────────────────────┼──────────────┼───────────────┼──────────────────────────────────┤
│ EXCHANGE              │ String       │ kraken        │ Production execution exchange id.│
│ KEY                   │ Cipher String│ [EMPTY]       │ Account API key signature.       │
│ SECRET                │ Cipher String│ [EMPTY]       │ Private account signing token.   │
│ PAIR                  │ String       │ BTC/EUR       │ Execution asset target matrix.   │
│ ORDER_AMOUNT          │ Float Decimal│ 0.0001        │ Standard order block size.       │
│ MIN_ORDER_AMOUNT      │ Float Decimal│ 0.00008       │ Floor guard safety constraint.   │
│ MAX_ORDER_AMOUNT      │ Float Decimal│ 0.0001        │ Ceiling risk limit allocation.   │
└───────────────────────┴──────────────┴───────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 5. CHRONOLOGICAL FREQUENCIES & INVENTORY EXPLORERS                                     │
├───────────────────────┬──────────────┬───────────────┬──────────────────────────────────┤
│ ENVIRONMENT VARIABLE  │ DATA TYPE    │ REPO DEFAULT  │ CORE FUNCTIONAL DESCRIPTION      │
├───────────────────────┼──────────────┼───────────────┼──────────────────────────────────┤
│ OHLCV_CANDLE_SIZE     │ CSV Tokens   │ 1m,5m,15m,1h  │ Target discovery frames explorer.│
│ INTERVAL_MS           │ Integer (ms) │ 3600000       │ Core engine processing clock.    │
│ INTERVAL_HIGH         │ Integer (ms) │ 60000         │ High-speed calculation sequence. │
│ INTERVAL_DEFAULT      │ Integer (ms) │ 300000        │ Median baseline pacing clock.    │
│ INTERVAL_LOW          │ Integer (ms) │ 780000        │ Low-priority batch worker interval.│
│ FETCH_LIMIT           │ Integer Count│ 60            │ Array slice size per API call.   │
└───────────────────────┴──────────────┴───────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 6. TRAINING RIGS & SYSTEM INTERACTION VARIATES                                          │
├───────────────────────┬──────────────┬───────────────┬──────────────────────────────────┤
│ ENVIRONMENT VARIABLE  │ DATA TYPE    │ REPO DEFAULT  │ CORE FUNCTIONAL DESCRIPTION      │
├───────────────────────┼──────────────┼───────────────┼──────────────────────────────────┤
│ TRAIN_INTERVAL_MS     │ Integer (ms) │ 60000         │ Optimizer model calculation pace.│
│ MULTI_INTERVAL_MS     │ Integer (ms) │ 60000         │ Concurrency loop interval mark.  │
│ TRAIN_OHLCV_TIMEFRAMES│ CSV Tokens   │ 1m,5m,15m,1h  │ Matrix vectors for model weights.│
│ TRAIN_OHLCV_JSON_DIR  │ Folder Path  │ ../logs/js* │ Source ledger for training files.│
└───────────────────────┴──────────────┴───────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 7. MICROSTRUCTURE STRATEGY PARAMETERS                                                   │
├───────────────────────┬──────────────┬───────────────┬──────────────────────────────────┤
│ ENVIRONMENT VARIABLE  │ DATA TYPE    │ REPO DEFAULT  │ CORE FUNCTIONAL DESCRIPTION      │
├───────────────────────┼──────────────┼───────────────┼──────────────────────────────────┤
│ MICRO_SELL_THRESHOLD  │ Float (-)    │ -0.05         │ Negative stop loss exit criteria.│
│ MICRO_HYSTERESIS      │ Float (+)    │ 0.02          │ Volatility confirmation corridor.│
│ MICRO_MIN_PROB        │ Float (0-1)  │ 0.65          │ Internal confidence cutoff level.│
│ MICRO_MIN_SCORE       │ Float Decimal│ 0.01          │ Absolute priority score minimum. │
│ MICRO_PROB_STRATEGY   │ Enum Option  │ sigmoid       │ Normalizer: sigmoid|normalize|* │
│ MICRO_EXCHANGE        │ String       │ kraken        │ Segmented micro execution server.│
│ MICRO_TIMEFRAMES      │ CSV Tokens   │ 15m           │ Micro analysis scope filter.     │
│ MICRO_INTERVAL_MS     │ Integer (ms) │ 300000        │ Fine polling resolution timer.   │
│ MICRO_STRATEGY        │ String       │ Balanced+     │ Internal tactical matrix setup.  │
└───────────────────────┴──────────────┴───────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 8. NEURAL NETWORK MICROSTRUCTURE PIPELINE MODEL CONFIG                                  │
├───────────────────────┬──────────────┬───────────────┬──────────────────────────────────┤
│ ENVIRONMENT VARIABLE  │ DATA TYPE    │ REPO DEFAULT  │ CORE FUNCTIONAL DESCRIPTION      │
├───────────────────────┼──────────────┼───────────────┼──────────────────────────────────┤
│ MICRO_MODEL_ENABLE    │ Boolean      │ true          │ Activates microstructure tensor. │
│ MICRO_MODEL_TYPE      │ Enum Option  │ json          │ Local load layout format: json|tfjs│
│ MICRO_MODEL_PATH      │ File Path    │ tools/micr... │ Compiled asset array framework.  │
│ MICRO_MODEL_INPUT_KEYS│ CSV Tokens   │ momentum,p... │ Evaluator model features index.  │
│ MICRO_MODEL_PROB_AS_* │ Boolean      │ true          │ Evaluates probabilities as logits│
└───────────────────────┴──────────────┴───────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 9. DYNAMIC THRESHOLDS & ANALYSIS VALIDATORS                                             │
├───────────────────────┬──────────────┬───────────────┬──────────────────────────────────┤
│ ENVIRONMENT VARIABLE  │ DATA TYPE    │ REPO DEFAULT  │ CORE FUNCTIONAL DESCRIPTION      │
├───────────────────────┼──────────────┼───────────────┼──────────────────────────────────┤
│ WINDOW_SIZE           │ Integer      │ 50            │ Analysis candle tracking buffer. │
│ CHALLENGE_MIN_WIN_RATE│ Float (0-1)  │ 0.618         │ Passing floor barrier threshold. │
│ FUTURE_OFFSET         │ Integer      │ 2             │ Prediction step target forward.  │
│ CHLOG_MAX_ROWS        │ Integer      │ 10000         │ Log telemetry limitation guard.  │
│ CHLOG_NEUTRAL_RESULT  │ String Label │ loss          │ Ambiguous prediction attribution.│
└───────────────────────┴──────────────┴───────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 10. MACROSTRUCTURE CONTEXT BOUNDARIES                                                   │
├───────────────────────┬──────────────┬───────────────┬──────────────────────────────────┤
│ ENVIRONMENT VARIABLE  │ DATA TYPE    │ REPO DEFAULT  │ CORE FUNCTIONAL DESCRIPTION      │
├───────────────────────┼──────────────┼───────────────┼──────────────────────────────────┤
│ MACRO_TIMEFRAMES      │ CSV Tokens   │ 1m,5m,15m,1h  │ High level trend view resolution.│
│ INTERVAL_AFTER_TRADE  │ Integer (ms) │ 30000         │ Post-execution cooldown lock.    │
│ INTERVAL_AFTER_SKIP   │ Integer (ms) │ 90000         │ System cycle processing skip lock.│
│ INTERVAL_AFTER_HOLD   │ Integer (ms) │ 180000        │ Strategy invariant hold timer.   │
│ INTERVAL_AFTER_ERROR  │ Integer (ms) │ 60000         │ System failure network fallback. │
│ STOP_LOSS_PCT         │ Float Decimal│ 0.003         │ Core position risk stop ratio.   │
│ TAKE_PROFIT_PCT       │ Float Decimal│ 0.006         │ Static yield take target ratio.  │
│ MACRO_MIN_WIN_RATE    │ Float Decimal│ 0.2           │ Permissive macro baseline filter.│
└───────────────────────┴──────────────┴───────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 11. STRATEGY INDICATOR & SYSTEM TUNING SPECS                                            │
├───────────────────────┬──────────────┬───────────────┬──────────────────────────────────┤
│ ENVIRONMENT VARIABLE  │ DATA TYPE    │ REPO DEFAULT  │ CORE FUNCTIONAL DESCRIPTION      │
├───────────────────────┼──────────────┼───────────────┼──────────────────────────────────┤
│ AUTOTUNE_SCORE_KEY    │ Enum Option  │ abs           │ Metric criteria for optimization.│
│ EVALUATE_STRATEGY     │ String       │ neuralnet_v2  │ Dynamic core evaluation layout.  │
│ GENERATE_PERMUTATIONS │ Binary Int   │ 1             │ Boolean-like flag toggling tuner.│
│ DEBUG                 │ Boolean      │ true          │ Verbose level diagnostic logging.│
│ POSITION_STATE_FILE   │ File Path    │ ./logs/pos*   │ Tracking engine storage snapshot.│
│ ORDER_LOG_FILE        │ File Path    │ ./logs/ccx*   │ Trade transaction history ledger.│
│ NEURALNET_PRICE_BUFF* │ Integer      │ 1597          │ Memory allocation scale barrier. │
└───────────────────────┴──────────────┴───────────────┴──────────────────────────────────┘


===========================================================================================
 03. REPOSITORIES DEPLOYMENT RUNBOOKS
===========================================================================================

 ── [ TASK 01: BASIC DEPLOYMENT OF REAL LIVE MARKET TRADING ] ────────────────────────────
 ┌──────────────────────────────────────────────────────────────────────────────────────┐
 │ Set variables directly inside a secure production system console frame (never commit).│
 │                                                                                      │
 │ ENABLE_LIVE=true                                                                     │
 │ DRY_RUN=false                                                                        │
 │ FORCE_DRY=false                                                                      │
 │ EXCHANGE=kraken                                                                      │
 │ KEY=YOUR_PRIVATE_AUTHENTICATION_API_ACCESS_KEY                                       │
 │ SECRET=YOUR_PRIVATE_HMAC_SIGNING_SECRET_KEY_STRING                                   │
 │ PAIR=BTC/EUR                                                                         │
 └──────────────────────────────────────────────────────────────────────────────────────┘

 ── [ TASK 02: DEPLOYING DECOUPLED TELEMETRY MONITORING ONLY ] ───────────────────────────
 ┌──────────────────────────────────────────────────────────────────────────────────────┐
 │ CCXT_MARKET_DATA_ENABLED=true                                                        │
 │ ENABLE_LIVE=false                                                                    │
 │ DRY_RUN=true                                                                         │
 │ FORCE_DRY=true                                                                       │
 └──────────────────────────────────────────────────────────────────────────────────────┘

 ── [ TASK 03: FILE SYSTEM INTERACT STRUCTURE FOR MICRO INFERENCE ] ──────────────────────
 ┌──────────────────────────────────────────────────────────────────────────────────────┐
 │ MICRO_MODEL_ENABLE=true                                                              │
 │ MICRO_MODEL_TYPE=json                                                                │
 │ MICRO_MODEL_PATH=tools/microstructure/models/mlp.json                                │
 └──────────────────────────────────────────────────────────────────────────────────────┘


===========================================================================================
 04. DEVELOPER UTILITY GUIDE
===========================================================================================

 ── [ CODEBASE TRACKING PATHWAYS ]
    ├── CONFIG LOAD ENVIRONMENT : Managed inside core config engines (e.g. `config.js`). 
    │                             Translates string structures into distinct types.
    ├── INTERACTION LAYER       : Located within exchange modules (`tools/ccxt/*`).
    └── OPTIMIZATION CONTROLS   : Monitored in analytical structures (`autotune`, `backtest`).

 ── [ QUICK REPO TERMINAL COMMANDS (SEARCHING EXTENSIONS) ]
    ├── Unix Grep Pipeline      : grep -R "MICRO_MODEL_PATH" .
    └── RigGrep Stream Reader   : rg "process.env\.(MICRO|MACRO|CCXT|ENABLE_LIVE)" .


===========================================================================================
 05. ARCHITECTURAL TROUBLESHOOTING CHECKLIST
===========================================================================================

 ├── [ CULPRIT: DATA GAP STREAM STAGES ]
 │    └── Resolution: Confirm CCXT_MARKET_DATA_ENABLED=true. Align engine update 
 │        INTERVAL_DEFAULT settings with CCXT_MARKET_DATA_FETCH_INTERVAL boundaries.
 │
 ├── [ CULPRIT: SERIALIZATION INVERSION ]
 │    └── Resolution: Ensure directory pathing properties defined under MODEL_DIR 
 │        and MICRO_MODEL_PATH target valid, existing descriptors on disk storage.
 │
 ├── [ CULPRIT: SUBMISSION TRANSACTION FAILS ]
 │    └── Resolution: Inspect system logs via ORDER_LOG_FILE. Validate target order metrics 
 │        against exchange parameters. Ensure current wallet balances scale above limits.
 │
 └── [ CULPRIT: RESOURCE STARVATION / COMPUTE THREAD LEAK ]
      └── Resolution: Massive vector lengths strain localized hardware. Reduce values 
          assigned to memory scales like NEURALNET_PRICE_BUFFER_LEN to restore bandwidth.


===========================================================================================
 06. SECURITY & OPERATIONAL COMPLIANCE
===========================================================================================

 ── EMERGENCY CIRCUIT BREAKER (KILL SWITCH SYSTEM ACTION) ────────────────────────────────
 ┌──────────────────────────────────────────────────────────────────────────────────────┐
 │ In case of an anomaly or network dislocation, execute a total platform decoupling   │
 │ by resetting the system matrix as follows and issue a complete ecosystem reload:   │
 │                                                                                      │
 │ ENABLE_LIVE=false                                                                    │
 │ DRY_RUN=true                                                                         │
 │ FORCE_DRY=true                                                                       │
 └──────────────────────────────────────────────────────────────────────────────────────┘
 ── ACCESS KEY SECURITY COMPLIANCE WARNING ───────────────────────────────────────────────
 ┌──────────────────────────────────────────────────────────────────────────────────────┐
 │ CRITICAL RISK SAFETY DIRECTIVE: Never commit secret keys or validation records into  │
 │ git storage. Register `.env` allocations explicitly into `.gitignore` arrays. Use   │
 │ production orchestration clusters with secure encryption storage providers.         │
 └──────────────────────────────────────────────────────────────────────────────────────┘
