# 📊 `macro_ccxt_orders.js` — Macrostructure Trading Orchestrator (Updated)

---

## Overview

This document describes the updated macrostructure trading orchestrator implemented in `tools/macro_ccxt_orders.js`. The module is designed as a safe, DRY-RUN-first orchestrator that:

- Selects the best timeframe/model from macro signals and backtest stats,
- Validates trade regimes,
- Logs decisions and diagnostics in structured formats,
- Schedules subsequent runs robustly,
- Provides simulation helpers and exports functions for easier unit testing.

Important: The current implementation intentionally separates macro-level decision logic from order placement. Actual order submission is delegated to specialized order modules. This file acts as an orchestrator and guard — it will not auto-submit live orders unless the runtime indicates IS_LIVE and a separate order module handles submission.

---

## What Changed (High-level)

- The bot is now explicitly DRY_RUN-first and safe by default; keep `FORCE_DRY=1` and `DRY_RUN=1` in `.env` for testing.
- Centralized runtime flags are read from `./lib/runtime_flags` for consistent semantics (`DEBUG`, `DRY_RUN`, `FORCE_DRY`, `ENABLE_LIVE`, `IS_LIVE`).
- Logging and audit formats improved:
  - Legacy tab-separated order log at `tools/logs/macro_ccxt_orders.log`.
  - Structured JSONL audit file at `tools/logs/macro_ccxt_orders_audit.jsonl`.
  - Diagnostics file at `tools/logs/macro_diagnostics.json`.
- Robust JSON loading via `safeJsonRead()` with multiple recovery strategies:
  - Full JSON parse, JSONL fallback, truncation recovery (trim to last brace/bracket), and top-level object extraction.
- The orchestration now reads macro signals from `tools/logs/macro_signal.log` (JSONL lines) and selects the best timeframe using backtest stats.
- Backtest stats loader supports a configurable path via `MACRO_BACKTEST_JSON_PATH`.
- Scheduling and retry logic improved: `scheduleNext()` logs schedule reasons and retries in case of failures.
- The module exports key functions for testing: `main`, `safeGetLatestMacroSignals`, `simulateOrderResult`, `safeGetBacktestStats`.

---

## Runtime / Environment Variables

(Updated names and defaults used by the script)

- MACRO_TIMEFRAMES: comma-separated timeframes (default: `1m,5m,15m,1h`)
- MACRO_PAIR / PAIR: e.g., `BTC/EUR` (default `BTC/EUR`)
- ORDER_AMOUNT: amount per order (default `0.0001`)
- MIN_ALLOWED_ORDER_AMOUNT: minimum order size (default `0.0001`)
- MAX_ORDER_AMOUNT: maximum order amount per trade (default `0.01`)
- INTERVAL_AFTER_TRADE / INTERVAL_AFTER_SKIP / INTERVAL_AFTER_HOLD / INTERVAL_AFTER_ERROR: scheduling intervals in ms
- MACRO_EXCHANGE: default exchange name (e.g., `kraken`)
- MACRO_KEY / MACRO_SECRET: exchange API credentials (empty by default)
- MACRO_BACKTEST_JSON_PATH: path to backtest JSON file (optional; defaults to `tools/backtest/backtest_results.json`)
- MACRO_MIN_WIN_RATE: minimum win rate threshold used by higher-level decision (default `0.2`)
- FORCE_DRY / DRY_RUN: runtime flags to enforce dry behavior
- ENABLE_LIVE / IS_LIVE: flags indicating live-enabled/runtime live execution
- DEBUG: enable extra logging
- SIM_PRICE, SIM_BASE_BALANCE, SIM_QUOTE_BALANCE: simulation defaults for testing balances and price
- DRY_INTERVAL_MS / MACRO_INTERVAL_MS: scheduling intervals (DRY vs nominal)

Note: The code reads flags from `./lib/runtime_flags` for consistent behavior.

---

## Files & Paths (Updated)

- Primary orchestrator:
  - tools/macro_ccxt_orders.js
- Logs and artifacts:
  - tools/logs/macro_signal.log — incoming macro signals (JSONL)
  - tools/logs/macro_ccxt_orders.log — legacy tab-separated order decision log
  - tools/logs/macro_ccxt_orders_audit.jsonl — line-delimited JSON audit trail for each decision
  - tools/logs/macro_diagnostics.json — periodic diagnostics snapshot
- Backtest:
  - tools/backtest/backtest_results.json (default path) or configured via `MACRO_BACKTEST_JSON_PATH`
- Related modules (used / expected by orchestration):
  - ./lib/runtime_flags — runtime flag parsing helper
  - Other order modules (not included in this file) — responsible for actual order placement in live mode

---

## Key Components & Behavior

1. Signal ingestion
   - Reads `tools/logs/macro_signal.log` which contains newline-delimited JSON signal lines.
   - `safeGetLatestMacroSignals()` returns the most recent, sanitized and derived ensemble signal per configured timeframe.

2. Signal sanitization & ensemble derivation
   - `sanitizeSignal()` normalizes keys and timestamps.
   - `deriveEnsemble()` collects available predictions (convnet / tf / raw) and returns `{ label, confidence }`.
   - `normalizeLabel()` maps many formats (strings/numbers) into canonical labels: `strong_bull`, `strong_bear`, `bull`, `bear`, `other`.

3. Backtest stats & regime detection
   - `safeGetBacktestStats(tf)` reads a backtest JSON file and locates the strategy variant data for the requested timeframe.
   - `regimeFromStats(stats)` returns "Bull", "Bear", or "Flat" based on totalPNL and winRate heuristics.

4. Decision selection
   - The orchestrator iterates timeframes and selects a best candidate where a `Bull` regime and a `strong_bull` ensemble are present (chooses the one with highest totalPNL).
   - If no valid candidate is found, the script logs diagnostics and schedules the next run.

5. Safety-first execution
   - The module is intended to be DRY-run-first: when `IS_LIVE` is false the module will not submit live orders and will exit the decision flow after logging the decision.
   - Live submission requires `IS_LIVE` true and a dedicated order module to perform the execution. This file intentionally does not include trade placement details and acts as a guard/orchestrator.

6. Order logging & auditing
   - `logOrder()` writes both a human-readable tab-separated line and a JSONL audit object per action.
   - Audit entries include ISO timestamp, action, mode (`DRY` or `LIVE`), reason, stats, signal, result, and diagnostics snapshot.

7. Robust JSON reading
   - `safeJsonRead(fp, fallback)` handles:
     - Normal JSON parse
     - JSONL fallback (one JSON object per line)
     - Truncated JSON recovery by trimming to last `}` or `]`
     - Extraction of top-level JSON objects by brace matching
   - Designed to be tolerant of partially-written files and external interruptions.

8. Simulation helpers
   - `simulateOrderResult(action, price, amount)` returns a simulated order result object.
   - `simulatedBalance()` returns a simulated free and total balance derived from `SIM_BASE_BALANCE` and `SIM_QUOTE_BALANCE`.

9. Diagnostics and scheduling
   - `printDiagnostics()` writes a snapshot to console and `tools/logs/macro_diagnostics.json`.
   - `scheduleNext(ms, reason)` standardizes scheduling and provides robust retry-on-error behavior.

10. Exports for testing
    - The file exports: `{ main, safeGetLatestMacroSignals, simulateOrderResult, safeGetBacktestStats }` to facilitate unit testing.

---

## Usage

1. Ensure environment variables are configured (use `.env` in repo root). For safe testing prefer:
   - FORCE_DRY=1
   - DRY_RUN=1
   - DEBUG=1

2. Start the orchestrator:
   ```bash
   node tools/macro_ccxt_orders.js
   ```

3. To run live (only after auditing and ensuring safety), enable the live flags and supply API credentials and an order module to actually place trades:
   - Set `MACRO_KEY`, `MACRO_SECRET` in `.env` (or equivalent).
   - Set `IS_LIVE=1` and ensure a separate live order execution module is wired in your runtime.
---

## Example Flow

1. `main()` runs and reads latest macro signals via `safeGetLatestMacroSignals()`.
2. It loads backtest stats via `safeGetBacktestStats()` and decides the regime via `regimeFromStats()`.
3. If a clear `Bull + strong_bull` candidate is selected, it logs the decision.
4. If `IS_LIVE` is false, the orchestration stops here and schedules the next run.
5. If `IS_LIVE` is true, the orchestration will expect a separate order module to actually place the order (not performed directly by this file).
6. Diagnostics are written and `scheduleNext()` is used to plan the next run.

---

## Safety Recommendations & Best Practices

- Always start with `DRY_RUN` + `FORCE_DRY` enabled to verify behavior.
- Keep `DEBUG` on locally while validating logic and logs.
- Monitor `tools/logs/macro_ccxt_orders_audit.jsonl` and `tools/logs/macro_diagnostics.json` for continuous observability.
- Ensure `macro_signal.log` source (e.g., explorer.js or other predictor) produces well-formed JSONL lines.
- Use the exported helper functions in tests rather than running full process for unit tests.

---

## Implementation Notes / Internals (concise)

- The orchestrator uses a central `diagnostics` object for runtime state and error tracking.
- Scheduling is robust against unhandled rejections: `scheduleNext()` wraps `main()` invocation and registers retries in case of failures.
- The `safeGetLatestMacroSignals()` function picks the latest line-per-timeframe and runs `sanitizeSignal()` + `deriveEnsemble()` to ensure the signal object always carries `ensemble_label` and `ensemble_confidence` when possible.
- The module does not attempt to place orders in non-live mode and logs a clear message on decision with `isLive` flag.

---

## Troubleshooting

- If `safeGetLatestMacroSignals()` returns empty results:
  - Ensure `tools/logs/macro_signal.log` exists and contains newline-delimited JSON.
- If backtest stats are missing:
  - Verify `MACRO_BACKTEST_JSON_PATH` points to the expected `backtest_results.json`.
- If scheduling seems to fail or `main()` gets retried unexpectedly:
  - Check the diagnostics file (`tools/logs/macro_diagnostics.json`) for `lastError` and cycle counts.

---

## Development / Testing

- Use the exported functions when writing unit tests:
  - safeGetLatestMacroSignals()
  - simulateOrderResult()
  - safeGetBacktestStats()
  - main() can be invoked but be aware of scheduling that will re-invoke itself — prefer calling internal utilities for isolated tests.

---

## Disclaimer

This orchestrator logs and derives trading decisions but purposely separates and delegates order execution. Running with live API credentials and IS_LIVE enabled can lead to real trades if complemented by a live order module. Use extreme caution, test thoroughly in DRY mode first, and review audit logs before enabling live execution.
