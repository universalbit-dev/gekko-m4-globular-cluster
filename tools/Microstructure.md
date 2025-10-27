# tools/microstructure — Microstructure trading bot (micro_ccxt_orders.js)

This document describes the updated microstructure trading bot implemented at
tools/microstructure/micro_ccxt_orders.js. It explains inputs, outputs, environment
variables, behavior changes in the recent rewrite, and how to run/manage the bot
safely in development and production.

Last updated: 2025-10-27

---

## Summary — what changed

The micro bot (micro_ccxt_orders.js) has been rewritten and hardened:

- Consistent, idempotent `.env` load and sensible env overrides.
- Auto-tune cache support (tools/evaluation/autoTune_results.json) with auto-reload.
- Reads per-TF prediction JSONs from `tools/logs/json/ohlcv/ohlcv_ccxt_data_<TF>_prediction.json`.
- Signal sanitization and ensemble derivation (ensemble_label + ensemble_confidence).
- Pre-trade validation using backtest stats (tools/backtest/backtest_results.json).
- TradeQuality scoring (tradeQualityScore.js) used to gate entries.
- DRY_RUN mode with full simulated order lifecycle (simulateOrderResult) and simulated balances.
- Atomic order logging and diagnostics (tools/logs/micro_ccxt_orders.log by default).
- Configurable scheduling and throttling (MICRO_INTERVAL / INTERVAL_AFTER_*).
- Clear diagnostics, error handling and safe retries.
- Support for multiple TFs and a primary TF preference.

If you used the previous micro bot, read the "Compatibility & migration" notes below.

---

## Location and main files

- Main bot: tools/microstructure/micro_ccxt_orders.js
- Utilities:
  - tools/microstructure/aggregator.js (aggregation of per-TF predictions)
  - tools/microstructure/featureExtractor.js
  - tools/microstructure/microSignalLogger.js
  - tools/microstructure/trainer_tf.js (training helpers)
- Inputs:
  - Per-TF predictions: tools/logs/json/ohlcv/ohlcv_ccxt_data_<TF>_prediction.json
  - Auto-tune results: tools/evaluation/autoTune_results.json
  - Backtest results: tools/backtest/backtest_results.json (override with BACKTEST_JSON_PATH)
- Outputs / logs:
  - Human-readable order log: tools/logs/micro_ccxt_orders.log (ORDER_LOG_PATH)
  - Diagnostics printed to stdout/stderr

Repository paths referenced by default (changeable via env):
- OHLCV_DIR => tools/logs/json/ohlcv
- AUTO_TUNE_PATH => tools/evaluation/autoTune_results.json
- BACKTEST_JSON_PATH => tools/backtest/backtest_results.json
- ORDER_LOG_PATH => tools/logs/micro_ccxt_orders.log

---

## High-level behavior

1. Load latest per-TF prediction lines (sanitized) and prefer the configured `MICRO_PRIMARY_TF`.
2. Load auto-tune params and backtest stats for the primary TF & strategy.
3. Compute a pre-trade trade-quality score using `tradeQualityScore.js`.
4. Enforce regime and quality gates (backtest PnL, winRate, tradeQuality threshold).
5. If trade decision is made:
   - Check available balance (or use simulated balance in DRY_RUN).
   - Place a market order (or simulate it in DRY_RUN).
   - Log the result and update internal state (positionOpen, entryPrice, lastTradeTimestamp).
6. If position is open, evaluate exit conditions (market signals, regime, stop-loss/take-profit logic).
7. Schedule next run based on outcome (INTERVAL_AFTER_TRADE / _SKIP / _ERROR or MICRO_INTERVAL).

---

## Configuration: environment variables

All environment variables may be set in `.env` or the host environment. Reasonable defaults are provided.

- GENERAL
  - ENV_PATH — (optional) path to .env file used by the loader
  - DRY_RUN — "1"/"true" to simulate; default "0"
  - DEBUG — "1"/"true" for verbose logging; default "0"

- Bot identity & scheduling
  - MICRO_TIMEFRAMES — comma list, e.g. `1m,5m,15m,1h` (default)
  - MICRO_PRIMARY_TF — e.g. `1m` (preferred TF for decisioning)
  - MICRO_INTERVAL_MS or MICRO_INTERVAL — polling interval when no action; default 300000 (5m)
  - INTERVAL_AFTER_TRADE — ms to wait after a trade; default 30000
  - INTERVAL_AFTER_SKIP — ms to wait after a skip; default 60000
  - INTERVAL_AFTER_ERROR — ms to wait after an error; default 60000

- Trading / exchange
  - MICRO_PAIR or PAIR — e.g. `BTC/EUR` (default)
  - MICRO_EXCHANGE or EXCHANGE — ccxt exchange id (default `kraken`)
  - MICRO_ORDER_AMOUNT or ORDER_AMOUNT — per-trade size (default `0.001`)
  - KEY / SECRET — API credentials (used only when DRY_RUN not set)
  - MICRO_ORDER_LOG / ORDER_LOG_PATH — path to order log (default: tools/logs/micro_ccxt_orders.log)

- Data/paths
  - OHLCV_DIR — directory for per-TF prediction JSONs (default: tools/logs/json/ohlcv)
  - AUTO_TUNE_PATH — path to autoTune_results.json (default: tools/evaluation/autoTune_results.json)
  - BACKTEST_JSON_PATH — path to backtest results (default: tools/backtest/backtest_results.json)

- Simulation tuning (used only when DRY_RUN=1)
  - SIM_PRICE — simulated market price (default 30000)
  - SIM_BASE_BALANCE — simulated base asset free balance (default 0.01)
  - SIM_QUOTE_BALANCE — simulated quote asset free balance (default 1000)

- Strategy & scoring
  - MICRO_STRATEGY — strategy name used to lookup backtest results (default `Balanced+`)
  - MICRO_VARIANT — variant name used to lookup backtest results (default `PREDICTION`)
  - MICRO_METRIC — metric used by auto-tune lookup (default `abs`)

---

## Order gating & trade quality

- The bot uses `tools/tradeQualityScore.js` to compute a trade quality object that includes:
  - totalScore — composite score (0–100)
  - breakdown — per-factor components

- Default gating rules (tunable):
  - Reject trades if backtestStats.totalPNL <= 0 or backtestStats.winRate < 0.5
  - Reject trades if tradeQuality.totalScore < 65

Those thresholds are coded as defaults but can be changed in code or wrapped by an external policy before calling the bot.

---

## Logs and diagnostics

- Order entries are appended to ORDER_LOG_PATH as tab-separated lines with:
  - timestamp, signal timestamp, model, prediction, label, action, status/result, reason, fullSignal, indicatorParams, tradeQualityScore, tradeQualityBreakdown, backtestStats, diagnostics
- Diagnostics are kept in-memory and printed on errors or at scheduled intervals (max history kept).
- The script registers `uncaughtException` and `unhandledRejection` handlers to persist last error state.

---

## Running the bot

From the repository root (example):

- One-off run (single cycle, not scheduled):
  NODE_ENV=development MICRO_PRIMARY_TF=1m DRY_RUN=1 node tools/microstructure/micro_ccxt_orders.js

- Run continuously using Node (the script internally schedules next calls):
  DRY_RUN=1 NODE_ENV=production node tools/microstructure/micro_ccxt_orders.js

- Run under PM2 (recommended for long-running):
  Create a small ecosystem file or:
  PM2:
    pm2 start tools/microstructure/micro_ccxt_orders.js --name microbot --interpreter node --node-args=""

- Run as a systemd service:
  - Create a unit that runs `node /path/to/repo/tools/microstructure/micro_ccxt_orders.js` with desired env vars.

---

## Input / Output examples

- Input (example last element of `ohlcv_ccxt_data_1m_prediction.json`):
```json
{
  "timestamp": 1761417960000,
  "open": 12345.6,
  "high": 12350.0,
  "low": 12340.0,
  "close": 12348.2,
  "volume": 1.23,
  "prediction_convnet": "bull",
  "prediction_tf": null,
  "ensemble_label": "bull",
  "ensemble_confidence": 87,
  "timeframe": "1m",
  "logged_at": "2025-10-25T18:49:34.244Z",
  "signal_timestamp": 1761417960000
}
```

- Output (sample order log line — tab delimited columns in ORDER_LOG_PATH):
```
2025-10-27T20:31:43.000Z	1761417960000	trained_ccxt_ohlcv_1m_...	bull	...	BUY	SUCCESS	{"id":"sim-..."}	"DRY strong_bull"	... <full JSON>
```

---

## Safety & best practices

- Always run with `DRY_RUN=1` while you test configuration and live data consumption.
- Use API keys with limited permissions or testnet keys when moving to live.
- Use `BACKTEST_JSON_PATH` to point to a recent backtest summary; missing backtest stats will block trading.
- Keep `AUTO_TUNE_PATH` up-to-date if you rely on tuned indicator parameters.
- Consider running the validator (tools/logs/json/ohlcv/validate_predictions.js) regularly (cron or pm2) to ensure prediction files are healthy.

---

## Compatibility & migration notes

- If you had a previous micro bot implementation:
  - Prediction input filenames remain compatible (per-TF `_prediction.json` files).
  - The logging format is extended (more JSON fields appended as columns). If consuming old logs, update downstream parsers.
  - The new bot enforces backtest checks and trade quality gating; you may see more SKIP entries until backtests/auto-tune files exist.

---

## Troubleshooting

- No signals found: verify `OHLCV_DIR` and per-TF `_prediction.json` files exist and contain arrays.
- Model/backtest missing: confirm `tools/backtest/backtest_results.json` contains entries for the TF and strategy name.
- Exchange init failures: ensure `MICRO_EXCHANGE` is a valid ccxt exchange id and your `KEY`/`SECRET` are correct (or run DRY_RUN).
- Order failures: check exchange account permissions and minimum order sizes; the bot clamps order sizes but exchange rules vary.

---

## Next steps & enhancements you may want

- Add a small CLI `--once` flag to exit after one cycle (useful for cron).
- Add a persistent state file for position/last trade across restarts.
- Add Slack/Discord webhook alerts for failures or notable trades.
- Add unit tests for `sanitizeSignal()` and `tradeQualityScore` edge cases.

---

## Contact / maintainers

Maintained by @universalbit-dev. For changes to bot behavior, modify `tools/microstructure/micro_ccxt_orders.js` and update this README with any new env variables or outputs.
