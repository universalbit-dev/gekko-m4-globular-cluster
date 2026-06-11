
```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                EXCHANGE SIMULATOR FOR GEKKO M4                          │
│                                      [ Core System Docs ]                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘

===========================================================================================
 01. OVERVIEW
===========================================================================================

The Exchange Simulator module in Gekko M4 provides a high-fidelity simulated trading 
environment designed for testing quantitative strategies, debugging execution wrappers, 
and analyzing raw execution performance without exposing real asset capital or relying 
on external network APIs. 

It replicates low-level exchange data flows, enabling seamless localized integration 
for fast-forward backtesting and pseudo-real-time runtime simulations.

The Exchange Simulator is designed to:
 ├── Mimic the behavioral interfaces of production Exchange REST/WS APIs.
 ├── Provide an isolated, repeatable environment for state machine testing.
 ├── Auto-generate virtual trade events, market regimes, and synced OHLCV candles.
 └── Support zero-latency integration with local plugins (e.g., Paper Trader).


===========================================================================================
 02. SYSTEM PIPELINE & DATA FLOW
===========================================================================================

   ┌─────────────────────────────────────────────────────────────────────────┐
   │                       [ CONFIGURATION SETTINGS ]                        │
   │               Initial Portfolio Balances & Timeframe Intervals          │
   └─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │                      [ ENGINE: TRADE GENERATOR ]                        │
   │       Emits Fake Trades ──► Randomizes Vol/Price ──► Fibonacci Trends    │
   └─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │                       [ MODULE: CANDLE CREATOR ]                        │
   │       Batches Individual Swaps ──► Aggregates into OHLCV Series         │
   └─────────────────────────────────────────────────────────────────────────┘
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
   ┌───────────────────────────────────┐ ┌───────────────────────────────────┐
   │        [ PORTFOLIO STATE ]        │ │         [ OUTPUT EMITTER ]        │
   │  Fee Deductions & Trigger Guards │ │  JSON Over File / WS Broadcast   │
   └───────────────────────────────────┘ └───────────────────────────────────┘


===========================================================================================
 03. ARCHITECTURAL FEATURES
===========================================================================================

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. SIMULATED EXCHANGE OPERATIONS                                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ ── TRADE SIMULATION : Dynamically loops over tick sequences to generate mock buy/sell   │
│                      fills with randomized mathematical deviations and volume weighting. │
│ ── OHLCV DATA       : Collects real-time transactional delta arrays and compresses them │
│                      into standard open-high-low-close-volume structured intervals.    │
│ ── TREND EMULATION  : Implements a systematic regime-shifting model that triggers trend │
│                      reversals over mathematical sequences tied to Fibonacci counts.     │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. PORTFOLIO MANAGEMENT                                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ ── INITIAL SNAPSHOTS: Provisions predictable sandbox wallets for customizable asset pairs│
│                       and fiat/quote collateral targets before simulation ticks begin.   │
│ ── PRICE VALIDATION : Inspects runtime calculations for mathematical anomalies (NaN,    │
│                       inversions) and applies explicit recovery/fallback resets.        │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. MODULAR COMPONENT DESIGN                                                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ ── CANDLE CREATOR   : Runs separate synchronous loops to slice incoming transactional   │
│                       streams into clear chronological historical candles.              │
│ ── ERROR HANDLING   : Isolates calculation failures and intercepts invalid API fetch   │
│                       errors, returning mock error payloads instead of blocking loops.  │
└─────────────────────────────────────────────────────────────────────────────────────────┘


===========================================================================================
 04. CORE FUNCTIONALITIES
===========================================================================================

── [ TRADE SIMULATION ENGINE ]
   ├── Randomizes continuous spot price spreads and micro-transaction volume.
   └── Emits periodic telemetry ticks at highly consistent, sub-second execution intervals.

── [ VOLATILITY & TREND SWITCHING ]
   └── Dynamically shifts price direction boundaries using interval counts based on 
       Fibonacci levels to emulate non-linear trending and mean-reverting market phases.

── [ OHLCV GENERATION MATRIX ]
   ├── Aggregates active transaction records on a per-second basis.
   └── Outputs structured candles matching defined operational timeframes (e.g., 1m, 5m).

── [ SYSTEM SECURITY AND ERROR GUARDS ]
   ├── PRICE VALIDATOR : Auto-heals pricing variables if calculation anomalies occur.
   └── FETCH ISOLATION : Intercepts hardware network exceptions and drops safe static mocks.


===========================================================================================
 05. INTEGRATION PIPELINE: PAPER TRADER
===========================================================================================

The Exchange Simulator exposes clean operational endpoints that bind cleanly to the 
Gekko M4 Paper Trader plugin core module. This relationship allows the system to:
 ├── Route advisor execution orders into a simulated matching engine instantly.
 ├── Compute real-time geometric balance changes based on localized order fills.
 ├── Deduct accurate, custom-configured flat or percentage trading fee tiers.
 └── Enforce rigid execution tracking for advanced indicators (e.g., Stop-Loss triggers).


===========================================================================================
 06. SYSTEM OUTPUT SAMPLES
===========================================================================================

 ── [ TERMINAL EXECUTION LOG ] ───────────────────────────────────────────────────────────
 ┌──────────────────────────────────────────────────────────────────────────────────────┐
 │ [EXCHANGE SIMULATOR] emitted 10 fake trades, up until 2024-11-30 02:12:54.           │
 │ [EXCHANGE SIMULATOR] emitted 15 fake trades, up until 2024-11-30 02:13:34.           │
 └──────────────────────────────────────────────────────────────────────────────────────┘

 ── [ STRUCTURAL OHLCV DATA OUTPUT ] ─────────────────────────────────────────────────────
 ┌──────────────────────────────────────────────────────────────────────────────────────┐
 │ {                                                                                    │
 │   "open": 10.00,                                                                     │
 │   "high": 12.50,                                                                     │
 │   "low": 9.15,                                                                       │
 │   "close": 11.20,                                                                    │
 │   "volume": 450.75,                                                                  │
 │   "trades": 25                                                                       │
 │ }                                                                                    │
 └──────────────────────────────────────────────────────────────────────────────────────┘

```
