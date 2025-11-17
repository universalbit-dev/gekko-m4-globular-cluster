# tools/microstructure — Microstructure

This document describes the microstructure orchestrator implemented at:
`tools/microstructure/micro_ccxt_orders.js`.

```mermaid
flowchart TD
  %% Simplified, GitHub-mermaid-friendly Microstructure flow

  Start[Start - load env and libs]
  Flags[Parse runtime flags]
  Restore[Restore saved position and history]
  MainLoop[Main loop - decideAndAct]

  LoadIndex[Load index module]
  LoadOHLCV[Load OHLCV prediction files]
  PickSignal[Pick and normalize signal]
  Backtest[Load backtest stats]
  Throttle[Throttle check]
  Decide[Decide: open / close / hold]

  CheckOpen[Open check - simulated quote balance]
  SubmitBuy[Submit BUY order]
  CheckClose[Close check - base available]
  SubmitSell[Submit SELL order]

  SubmitOrder[Order submitter - single entry]
  DuplicateCheck[Duplicate fingerprint check]
  AllowLive[Live allowed check]
  Simulate[Simulate order and write audit]
  LiveExec[Place live order via exchange]
  Audit[Write audit and legacy log]
  Update[Update diagnostics and save state]
  Schedule[Schedule next run]

  HoldPath[HOLD path]
  HoldLog[Log HOLD or suppress]
  Throttled[Throttled - schedule next]
  ErrorFlow[On error - record diagnostics and schedule]

  Signals[Shutdown signals and exception handlers]
  SaveExit[Save state, print diagnostics, exit]

  %% Main flow
  Start --> Flags --> Restore --> MainLoop

  MainLoop --> LoadIndex
  MainLoop --> LoadOHLCV
  LoadIndex --> PickSignal
  LoadOHLCV --> PickSignal

  PickSignal --> Backtest --> Throttle
  Throttle -->|blocked| Throttled
  Throttle -->|ok| Decide

  Decide -->|open| CheckOpen
  Decide -->|close| CheckClose
  Decide -->|hold| HoldPath

  CheckOpen -->|insufficient| Throttled
  CheckOpen -->|ok| SubmitBuy --> SubmitOrder
  CheckClose -->|insufficient| Throttled
  CheckClose -->|ok| SubmitSell --> SubmitOrder

  SubmitOrder --> DuplicateCheck --> AllowLive
  AllowLive -->|no| Simulate --> Audit --> Update --> Schedule
  AllowLive -->|yes| LiveExec --> Audit --> Update --> Schedule

  HoldPath --> HoldLog --> Schedule

  MainLoop --> ErrorFlow --> Schedule

  Start --> Signals --> SaveExit

  %% Grouping helpers
  subgraph HELPERS [Helpers and utilities]
    PickSignal
    Backtest
    Audit
  end

  subgraph SUBMIT [Order submitter steps]
    SubmitOrder
    DuplicateCheck
    AllowLive
    Simulate
    LiveExec
    Audit
    Update
  end
```

- Startup
  - Loads .env early and parses runtime flags using `tools/lib/runtime_flags`.
  - Restores persisted position and diagnostics from `tools/logs/micro_position_state.json`.

- Signal input
  - Primary source: `loadIndexData()` (the index module under `tools/microstructure/index.js`).
  - Fallback: prediction JSON files in `OHLCV_DIR`.
  - `formatSignalForDecision()` normalizes the picked entry for decision logic.

- Decisioning
  - `decideAndAct()` performs throttling, simple gating (score/winRate/ensemble labels), then selects open/close/hold.
  - `shouldOpenPosition` / `shouldClosePosition` helpers are represented by the decision logic in the code.

- Order submission
  - `submitOrder()` is a single entry point that:
    - Prevents immediate duplicate submissions via a fingerprint.
    - Uses strict `IS_LIVE` + `ENABLE_LIVE` + `!DRY_RUN` + `!FORCE_DRY` checks to permit live exchange access.
    - When live is disallowed, uses `simulateOrderResult()` and writes audit JSONL and legacy log lines.
    - When live is allowed, obtains ccxt exchange with `getExchange()` and places market orders, handling both `createMarketBuyOrder`/`createOrder` fallbacks.
    - Updates diagnostics, persists position state and history.

- Persistence and scheduling
  - Position state and small history are saved to `tools/logs/micro_position_state.json`.
  - Scheduling uses a single timer (`scheduleNext`) and also a fallback `setInterval` watchdog.
  - Errors capture diagnostics and persist state before exit.

- Safety
  - Live orders are explicitly gated; defaults favor simulation.
  - Diagnostic history and audit logs facilitate reconciliation.

## File locations & key env variables

- Main script: `tools/microstructure/micro_ccxt_orders.js`
- Index module (preferred source): `tools/microstructure/index.js`
- OHLCV fallback directory: `TOOLS_OHLCV_DIR` (env `OHLCV_DIR`, default `tools/logs/json/ohlcv`)
- Position state: `tools/logs/micro_position_state.json`
- Logs:
  - Legacy tab log: `tools/logs/micro_ccxt_orders.log`
  - Audit JSONL: `tools/logs/micro_ccxt_order_audit.jsonl`
- Important env flags:
  - DRY_RUN, FORCE_DRY, ENABLE_LIVE, IS_LIVE, DEBUG
  - MICRO_PAIR, MICRO_TIMEFRAMES, MICRO_PRIMARY_TF
  - MICRO_ORDER_AMOUNT, MICRO_INTERVAL_MS
  - SIM_PRICE, SIM_BASE_BALANCE, SIM_QUOTE_BALANCE
  - ORDER_THROTTLE_MS, HOLD_LOG_COOLDOWN_MS

## Example quickstart

- Dry-run single cycle:
```
DRY_RUN=1 node tools/microstructure/micro_ccxt_orders.js --once
```

- Continuous dry-run:
```
DRY_RUN=1 node tools/microstructure/micro_ccxt_orders.js
```

## Notes, troubleshooting and extension points

- If `loadIndexData()` fails or index module is not present, the fallback to OHLCV files will be used.
- The submitter fingerprints use rounded price and scaled amount — change fingerprint scheme if you need finer duplicate control.
- Consider adding a persisted last-run marker to avoid reprocessing identical index entries after restart.
- The code already centralizes live checks; to extend to margin/futures, modify `getExchange()` and `submitOrder()` with care.
- Unit-testable functions exported: `decideAndAct`, `submitOrder`, `loadPositionState`, `savePositionState`, `formatSignalForDecision`.

---
