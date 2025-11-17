# tools/microstructure — Microstructure (micro_ccxt_orders.js)

This document describes the microstructure orchestrator implemented at:
`tools/microstructure/micro_ccxt_orders.js`.

```mermaid
flowchart TD
  %% Microstructure mermaid (GitHub-friendly)
  Start["Start\nload .env\nrequire runtime_flags"]
  Start --> ParseFlags["Parse runtime flags\n(DRY_RUN, FORCE_DRY,\nENABLE_LIVE, IS_LIVE, DEBUG)"]
  ParseFlags --> LoadState["loadPositionState()\nrestore position/history"]
  LoadState --> MainLoop["decideAndAct()\n(main cycle)"]

  subgraph INDEX["Index / OHLCV Signal Loading"]
    IDXLOAD["loadIndexData()\n(require index module)"]
    OHLCVLOAD["loadLatestSignalsFromOHLCV()\n(fallback files)"]
    IDXLOAD --> CHOOSEIDX["pick primary TF or first match"]
    OHLCVLOAD --> CHOOSEOHLCV["pick primary TF or latest"]
  end

  MainLoop --> IDXLOAD
  MainLoop --> OHLCVLOAD

  CHOOSEIDX --> FormatSignal["formatSignalForDecision()\nnormalizeIndexEntry()"]
  CHOOSEOHLCV --> FormatSignal

  FormatSignal --> Stats["derive backtestStats\n(from summary if present)"]
  Stats --> ThrottleCheck["canThrottle()?"]
  ThrottleCheck -- blocked --> Throttled["Schedule next\n(reason: throttled)"]
  ThrottleCheck -- ok --> DecisionLogic["Decision logic\n-> 'open' | 'close' | 'hold'"]

  DecisionLogic --> OpenPath{"decision === open\n&& position.open === false"}
  DecisionLogic --> ClosePath{"decision === close\n&& position.open === true"}
  DecisionLogic --> HoldPath{"decision === hold\nor no-op"}

  OpenPath --> BalanceCheck["Simulated balance check\n(required quote >= price*size)"]
  BalanceCheck -- insufficient --> SkipOpen["log SKIP\nschedule next"]
  BalanceCheck -- ok --> SubmitBuy["submitOrder('BUY',...)\n(simulated or live)"]

  ClosePath --> BaseCheck["Simulated base check\n(available >= amount)"]
  BaseCheck -- insufficient --> SkipClose["log SKIP\nschedule next"]
  BaseCheck -- ok --> SubmitSell["submitOrder('SELL',...)\n(simulated or live)"]

  SubmitBuy --> OnOpen["Update position state\nposition.open=true\nsavePositionState()"]
  SubmitSell --> OnClose["Update position state\nposition.open=false\nsavePositionState()"]
  OnOpen --> SchedulePost["scheduleNext(MICRO_INTERVAL_MS,'post-open')"]
  OnClose --> SchedulePost

  HoldPath --> HoldCooldown["HOLD logging cooldown\n(HOLD_LOG_COOLDOWN_MS)"]
  HoldCooldown -- log --> LogHold["logOrder(HOLD)\nsave diagnostics"]
  HoldCooldown -- suppress --> Suppressed["debug suppressed hold"]
  LogHold --> ScheduleHold["scheduleNext(MICRO_INTERVAL_MS,'hold')"]
  Suppressed --> ScheduleHold

  %% submitOrder internal branching
  SubmitBuy --> SUBMIT["submitOrder() implementation"]
  SubmitSell --> SUBMIT
  SUBMIT --> CheckFingerprint["duplicate fingerprint check\nskip if duplicate"]
  CheckFingerprint --> LiveAllowed{"liveAllowed?\n(IS_LIVE && !DRY_RUN && !FORCE_DRY && ENABLE_LIVE)"}
  LiveAllowed -- false --> Simulate["simulateOrderResult()\nlogOrder(mode: DRY)"]
  LiveAllowed -- true --> LiveExchange["getExchange()\ncreateMarketBuyOrder/Sell\nlogOrder(mode: LIVE)"]
  Simulate --> ReturnSubmit
  LiveExchange --> ReturnSubmit
  ReturnSubmit --> CommonPost["update diagnostics\nlastTradeAt / history\nsavePositionState()"]

  %% error handling & scheduling
  MainLoop --> TryCatch["try/catch around main\non error -> diagnostics.lastError\nsavePositionState()\nscheduleNext(MICRO_INTERVAL_MS,'error')"]
  TryCatch --> ScheduleEnd["end cycle"]

  SchedulePost --> ScheduleEnd
  ScheduleHold --> ScheduleEnd
  Throttled --> ScheduleEnd
  SkipOpen --> ScheduleEnd
  SkipClose --> ScheduleEnd

  %% graceful shutdown
  Start --> Signals["process.on SIGINT/SIGTERM\nuncaughtException\nunhandledRejection"]
  Signals --> SaveAndExit["savePositionState()\nprint diagnostics\nexit"]

  classDef core fill:#f8fafc,stroke:#1f2937,stroke-width:1px;
  class MainLoop,DecisionLogic,SUBMIT,LiveExchange core;
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
