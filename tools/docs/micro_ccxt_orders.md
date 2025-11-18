# 📈 micro_ccxt_orders.js — Microstructure Trading Bot (Updated)

---

This document describes the updated implementation of tools/microstructure/micro_ccxt_orders.js (index-driven microstructure bot). The implementation has been refactored and hardened — please read carefully before running anything live.

High-level changes since the previous version:
- Centralized .env loading and robust runtime flag parsing.
- Single submitOrder(...) handler that cleanly separates dry/simulated vs live execution and writes structured audit JSONL.
- Duplicate-order fingerprinting to avoid immediate duplicate submissions.
- Persisted position state and concise position history for reconciliation.
- Prefers index.js index-driven signals, with a fallback to OHLCV prediction files.
- Safer live gating: live trades require IS_LIVE && ENABLE_LIVE and not DRY_RUN/FORCE_DRY.
- Improved scheduling and single-timer watchdog.
- Clearer debug and info logs with parsed flags shown at startup.
- Exported functions for testing (decideAndAct, submitOrder, load/save state, etc).

This document summarizes:
- where the bot looks for signals,
- environment variables and defaults,
- the logging and audit formats,
- high-level decision & execution flow,
- safety and testing guidance,
- exported API for unit testing.

---

## Table of contents

- Overview
- Where signals come from
- Environment variables (complete list + defaults)
- Files produced / consumed
- Core functions and behavior
- Trading decision flow
- submitOrder: simulation vs live execution
- Logging & audit formats
- Persistence (position state)
- Startup, flags, and running
- Exported module API
- Safety checklist & best practices
- References

---

## Overview

micro_ccxt_orders.js is an index-driven microstructure trading bot intended to operate at micro timeframes using a small fixed order size. It prefers an in-repo index (index.js) produced by the micro-structure orchestrator. When that index is not available, it falls back to reading latest prediction files from an OHLCV directory.

The bot focuses on small, frequent trades (micro orders). It is designed to be safe by default: simulation (dry) mode is used unless explicit live flags are set. All orders, simulated or live, are recorded to both a legacy tab-separated log and a machine-friendly JSONL audit log.

---

## Where signals come from

Priority order for signals:
1. The in-repo index module: tools/microstructure/index.js (the script will require() this module if present and use its latest entry for the configured timeframe).
2. Fallback to prediction JSON files in the OHLCV directory. It will try multiple candidate filenames per timeframe and take the latest record available for each timeframe.

Timeframes configured in MICRO_TIMEFRAMES (comma-separated) are considered; MICRO_PRIMARY_TF defines the preferred timeframe.

---

## Environment variables

The bot reads .env early (from repository root by default). Important env vars:

- MICRO_PAIR (or PAIR)
  - Default: "BTC/EUR"
  - Description: trading symbol (case-insensitive, normalized to upper-case)

- MICRO_TIMEFRAMES
  - Default: "1m,5m,15m,1h"
  - Description: comma-separated list of timeframes to consider for multi-frame consensus

- MICRO_PRIMARY_TF
  - Default: first entry in MICRO_TIMEFRAMES
  - Description: primary timeframe preference when selecting a signal

- MICRO_ORDER_AMOUNT
  - Default: 0.0001
  - Description: order size in base asset units

- MICRO_INTERVAL_MS
  - Default: 300000 (5 minutes)
  - Description: primary scheduling interval (ms). The bot uses scheduleNext and a watchdog setInterval; set lower only if you understand rate limits.

- MICRO_EXCHANGE
  - Default: 'kraken'
  - Description: exchange id used with ccxt when running live

- MICRO_KEY / MICRO_SECRET
  - Default: empty
  - Description: API credentials used only in live mode (IS_LIVE + ENABLE_LIVE required)

- IS_LIVE
  - Default: false
  - Description: strict live flag. Live orders will NOT be placed unless this is set true AND ENABLE_LIVE is true and FORCE_DRY/DRY_RUN are false.

- ENABLE_LIVE
  - Default: false
  - Description: secondary safety flag; both ENABLE_LIVE and IS_LIVE must be true for live execution

- DRY_RUN
  - Default: false
  - Description: when true, forces simulation. If DRY_RUN or FORCE_DRY is true, live operations are inhibited.

- FORCE_DRY
  - Default: false
  - Description: explicit force dry flag (safety switch). When set, live is disabled regardless of other flags.

- DEBUG
  - Default: false
  - Description: verbose debug logging

- SIM_PRICE
  - Default: 30000
  - Description: price to use when simulating signals that lack a price

- SIM_BASE_BALANCE
  - Default: 0.01
  - Description: simulated base asset balance used for simulated balance checks

- SIM_QUOTE_BALANCE
  - Default: 1000
  - Description: simulated quote asset balance used for simulated balance checks

- OHLCV_DIR
  - Default: tools/logs/json/ohlcv
  - Description: directory to find OHLCV prediction files

- ORDER_THROTTLE_MS
  - Default: 300000
  - Description: minimum milliseconds between actual trades (throttle guard; affects simulated decisions too)

- MICRO_ORDER_LOG (ORDER_LOG_PATH)
  - Default: tools/logs/micro_ccxt_orders.log
  - Description: legacy tab-separated log file path

- MICRO_ORDER_AUDIT (ORDER_AUDIT_JSONL)
  - Default: tools/logs/micro_ccxt_order_audit.jsonl
  - Description: structured JSONL audit log path (one JSON object per line)

- POSITION_STATE_PATH
  - Default: tools/logs/micro_position_state.json
  - Description: persisted state for positions & history (saved after trades, on shutdown, and on certain events)

- HOLD_LOG_COOLDOWN_MS
  - Default: 300000 (5m)
  - Description: minimum ms before repeating 'HOLD' log entries (avoids log spam)

- ONCE
  - Not an env var; pass --once on CLI to run a single cycle (script checks process.argv)

There are also older aliases the script supports for backwards compatibility (e.g., PAIR, ORDER_AMOUNT). The MICRO_* prefixes are preferred.

---

## Files produced / consumed

Consumed:
- tools/microstructure/index.js — if present, the bot will attempt to require() it and use its outputs (preferred).
- tools/logs/json/ohlcv/*.json — fallback prediction files (names the script attempts are detailed in code).
- .env — loaded at start.

Produced:
- tools/logs/micro_ccxt_orders.log — legacy tab-separated log lines for human review.
- tools/logs/micro_ccxt_order_audit.jsonl — one-line JSON structured audit log per order action.
- tools/logs/micro_position_state.json — persisted position and diagnostics history.

---

## Core functions and behavior

Key helper functions:
- loadIndexData()
  - Attempts to require() the index module. If the module exports a function, it attempts to call it to get the index data. Used before reading files.

- loadLatestSignalsFromOHLCV(timeframes, dir)
  - Scans candidate filenames per timeframe and returns the last record for each timeframe found (used as fallback signals).

- formatSignalForDecision(tf, entry)
  - Normalizes record shapes into a consistent signal object:
    - tf, timestamp, signal/ensemble_label, ensemble_confidence, price, volatility, raw (source object)

- safeJsonRead(fp, fallback) / safeJsonWrite(fp, obj)
  - Robust file read/write with fallbacks and debug logging.

- simulatedBalance()
  - Returns an object reflecting SIM_BASE_BALANCE and SIM_QUOTE_BALANCE to check availability in simulation.

- simulateOrderResult(action, price, amount)
  - Returns a simulated order object when not placing live trades.

- getExchange()
  - Loads ccxt and instantiates the configured exchange with MICRO_KEY/MICRO_SECRET.
  - Throws if IS_LIVE is not true (strict guard).

- submitOrder(action, pair, price, amount, fullSignal)
  - Single point for all order submissions.
  - Signature backward-compat: also supports (action, price, amount, fullSignal).
  - Avoids immediate duplicate orders by fingerprinting pair|ACTION|roundedPrice|roundedAmount and skipping within 5s of last trade.
  - Strict live gating: will only call getExchange() and attempt true order placement if IS_LIVE && ENABLE_LIVE && !DRY_RUN && !FORCE_DRY.
  - Always appends a legacy tab log line and a JSONL audit line. Simulated orders are returned immediately as simulated results.
  - On live execution, it uses ccxt createMarketBuyOrder/createMarketSellOrder when available, otherwise falls back to createOrder.
  - On error, logs the error and re-throws.

- decideAndAct()
  - Main decision loop executed periodically.
  - Steps in short:
    1. Load index (preferred) or fallback OHLCV predictions.
    2. Normalize and pick a chosenSignal (preferring MICRO_PRIMARY_TF).
    3. Extract lightweight backtestStats if available from chosenSignal.raw.summary.
    4. Apply throttle guard (ORDER_THROTTLE_MS).
    5. Make compact decision: open / close / hold using ensemble_label, recent winner labels, raw.score, and configurable thresholds (MIN_SCORE_FOR_OPEN, MIN_WINRATE_FOR_OPEN).
    6. If open decision and position is closed: check simulated quote balance and submit BUY via submitOrder(...). Persist position state on success.
    7. If close decision and position open: submit SELL for available amount via submitOrder(...). Clear position on success.
    8. When nothing actionable, log HOLD (with a cooldown to avoid spam).
    9. Schedule next run via scheduleNext().

- scheduleNext(ms, reason)
  - Single timer guard; clears any previous timer and schedules the next decideAndAct run. Also used by the watchdog setInterval.

---

## Trading decision flow (summary)

- The bot treats strong_bull / strong_bear ensemble labels as highest priority.
- Secondary checks use raw.score and backtest summary winRate.
- Configurable thresholds:
  - MIN_SCORE_FOR_OPEN (default 60)
  - MIN_WINRATE_FOR_OPEN (default 0.45)
- Throttle / guard rails:
  - ORDER_THROTTLE_MS prevents very rapid consecutive trades (default 300000 ms).
  - Duplicate fingerprinting prevents immediate duplicate order re-submissions.
  - Live gating (IS_LIVE && ENABLE_LIVE) combined with FORCE_DRY and DRY_RUN make it hard to accidentally place live trades.
- Simulated balance checks are performed using SIM_QUOTE_BALANCE / SIM_BASE_BALANCE to avoid opening impossible positions in simulation.

---

## submitOrder: simulation vs live execution

- Simulation path:
  - Used when liveAllowed is false (i.e., not all live gating flags are set).
  - Returns a simulated order object with id sim-<timestamp>.
  - Records diagnostics.lastTrade, pushes an entry in diagnostics.history, writes both log files, and persists position state.
  - Returns an object: { status: 'simulated', result: <simulated order> }.

- Live path:
  - Executed only if IS_LIVE === true AND ENABLE_LIVE === true AND !DRY_RUN AND !FORCE_DRY.
  - Uses ccxt exchange interface. This code will throw an informative error if the exchange class is not present in ccxt or if credentials are invalid.
  - On success, writes logs and audit record, persists state, and returns { status: 'submitted', result: <exchange result> }.
  - On failure, logs the error and re-throws.

- Duplicate suppression:
  - Requests with an identical fingerprint (pair|ACTION|roundedPrice|roundedAmount) within ~5s of lastTrade are skipped and return { status: 'duplicate' }.

---

## Logging & audit formats

1) Legacy tab-separated order log (ORDER_LOG_PATH; default: tools/logs/micro_ccxt_orders.log)

Each line is appended as a tab-separated string with:
- ISO timestamp
- numeric timestamp (ms)
- action (BUY, SELL, PARTIAL_TAKE_PROFIT, EXIT, HOLD, SKIP)
- mode (DRY or LIVE)
- result JSON (or error text)
- reason string
- short signal summary (tf, ensemble_label, price)

This is intended for quick human inspection and tailing.

2) Structured audit JSONL (ORDER_AUDIT_JSONL; default: tools/logs/micro_ccxt_order_audit.jsonl)

Each line is a JSON object containing:
- iso: ISO timestamp
- timestamp: ms timestamp
- pair: symbol
- action: BUY/SELL/etc
- mode: DRY/LIVE
- reason: short reason
- signal: the full normalized signal object (formatSignalForDecision)
- result: raw result object (exchange or simulated)
- diagnostics: snapshot (lastTrade, cycles, etc.)

This file is optimized for tooling, replay, and auditing.

---

## Persistence (position state)

- Position state is saved to POSITION_STATE_PATH (default: tools/logs/micro_position_state.json).
- The file contains:
  - position: { open, side, entryPrice, amount, openedAt }
  - lastTradeAt: timestamp of last trade
  - history: diagnostics.history (array of past trade entries)
  - ts: when state was written
- The bot loads this state at startup if present.

---

## Startup, flags, and running

- The script loads .env from repository root (two levels up from the microstructure folder) by default.
- Flags are read via a centralized runtime_flags module that normalizes boolean-like env values. The important runtime flags are:
  - DRY_RUN, FORCE_DRY, ENABLE_LIVE, IS_LIVE, DEBUG
- The top-level output at startup logs:
  - Pair, Primary TF, and parsed flags (DRY_RUN, FORCE_DRY, ENABLE_LIVE, IS_LIVE, DEBUG)
- By default the bot schedules repeated runs:
  - decideAndAct() is invoked immediately on launch.
  - scheduleNext controls timing; a watchdog setInterval(MICRO_INTERVAL_MS) ensures periodic execution even if scheduling fails.
- CLI:
  - node tools/microstructure/micro_ccxt_orders.js --once
    - Runs a single cycle and exits (useful for testing).
- Graceful shutdown:
  - SIGINT, SIGTERM handlers persist state and exit cleanly.

---

## Exported module API (for tests)

At the bottom the script exports the following named functions for unit/integration testing:
- decideAndAct
- submitOrder
- loadPositionState
- savePositionState
- formatSignalForDecision

Use these exports to write automated tests that exercise decision logic and submitOrder behavior under simulated conditions.

---

## Safety checklist & best practices

- Always start with FORCE_DRY=1 and DRY_RUN=1 when testing locally.
- Keep ENABLE_LIVE and IS_LIVE disabled until you have done a thorough dry-run and a code review.
- Test the index.js outputs (or OHLCV predictions) separately to ensure signals contain expected fields: price, ensemble_label, summary.winRate or summary.win_rate, and recent_win with close/volatility when possible.
- Tail both the legacy tab log and the JSONL audit log during initial tests.
- Start with a low MICRO_ORDER_AMOUNT and short runs using --once to validate behavior.
- Ensure correct timezone and clock settings on any host running the bot (timestamps matter).
- Consider running under a supervisor (systemd, pm2, container with restart policy) and ensure logs are rotated/archived.

---

## Common troubleshooting tips

- "Exchange 'kraken' not found in ccxt" — ensure your installed ccxt version supports the requested exchange id; update ccxt or change MICRO_EXCHANGE.
- "Exchange access disabled: not running in live mode (IS_LIVE=false)" — set IS_LIVE and ENABLE_LIVE and unset DRY_RUN/FORCE_DRY to enable live trading (dangerous — only do after testing).
- Missing signals — confirm index.js is present and exporting data or check OHLCV_DIR prediction files for expected filenames and data shapes.
- Repeated HOLD spam — increase HOLD_LOG_COOLDOWN_MS or reduce MICRO_INTERVAL_MS depending on desired verbosity.
- Duplicate order skipped — fingerprinting prevented a near-identical order within a few seconds; ensure your loop doesn't attempt to double-submit.

---

## References

- CCXT: https://github.com/ccxt/ccxt
- Microstructure (general): https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/tools/Microstructure.md

---

## Short summary

This updated micro_ccxt_orders.js prioritizes safety, reproducible auditing, and testability. Simulation is the default; live execution requires multiple explicit flags and valid credentials. The code favors an in-repo index (index.js), falls back to OHLCV prediction files, writes both human and machine logs, and persists position state for recovery.

Use extreme caution when enabling live trading. Test extensively in dry/simulated mode first.
