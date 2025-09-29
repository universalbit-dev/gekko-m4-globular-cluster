# 📈 `micro_ccxt_orders.js` — Microstructure Trading Bot

---

## Overview

This script implements a highly adaptive microstructure trading bot for cryptocurrency markets using the [ccxt](https://github.com/ccxt/ccxt) library. It is designed for rapid, small trades with advanced risk management, multi-frame prediction confirmation, dynamic trade sizing, trailing stops, and strict position handling.

---
```mermaid
flowchart TD
    %% ENVIRONMENT CONFIGURATION
    subgraph ENV["🛠️ .env Config"]
        EXCHANGE["EXCHANGE"]
        API_KEY["KEY"]
        API_SECRET["SECRET"]
        PAIR["PAIR"]
        MICRO_ORDER_AMOUNT["MICRO_ORDER_AMOUNT"]
        MICRO_INTERVAL_MS["MICRO_INTERVAL_MS"]
        BASE_PROFIT_PCT["BASE_PROFIT_PCT"]
        BASE_LOSS_PCT["BASE_LOSS_PCT"]
        FIB_HOLD_INDEX["FIB_HOLD_INDEX"]
        MIN_HOLD_MS["MIN_HOLD_MS"]
        MICRO_TIMEFRAME["MICRO_TIMEFRAME"]
        MICRO_MAX_TRADES_PER_DAY["MICRO_MAX_TRADES_PER_DAY"]
    end

    %% DATA FILES
    subgraph DATA["📂 Data Files"]
        OHLCV_PRED["logs/json/ohlcv/ohlcv_ccxt_data_*_prediction.json"]
        MICRO_ORDER_LOG["logs/micro_order.log"]
    end

    %% CORE MODULES
    subgraph MODULES["🧩 Core Modules"]
        BOT["microstructure/micro_ccxt_orders.js"]
        SCORE_TRADE["tradeQualityScore.js"]
    end

    %% EXCHANGE LAYER
    subgraph CCXT["🌐 Exchange Layer"]
        CCXT_API["ccxt (Kraken, etc.)"]
    end

    %% MAIN LOGIC
    subgraph MAINLOOP["🔁 Main Loop Workflow"]
        DailyReset["Reset Daily Trade Counter"]
        LoadPred["Load Latest OHLCV Prediction Data"]
        CalcVol["Calculate Volatility & Adaptive Thresholds"]
        MultiConfirm["Multi-Frame Consensus Check"]
        TradeLimit["Enforce Daily Trade Limit"]
        QualityEval["Evaluate Trade Quality"]
        EntryLogic["Enter Trade if Eligible"]
        PosManage["Manage Open Position (Trailing Stop, Partial Exit, Full Exit)"]
        HoldLogic["Hold Position if Exit Not Triggered"]
        LogOutcome["Log All Action Outcomes"]
        ScheduleNext["Schedule Next Run"]
    end

    %% DATA FLOW & DEPENDENCIES
    ENV --> BOT
    BOT --> CCXT_API
    BOT --> SCORE_TRADE
    BOT --> OHLCV_PRED
    BOT --> MICRO_ORDER_LOG

    BOT --> DailyReset
    BOT --> LoadPred
    BOT --> CalcVol
    BOT --> MultiConfirm
    BOT --> TradeLimit
    BOT --> QualityEval
    BOT --> EntryLogic
    BOT --> PosManage
    BOT --> HoldLogic
    BOT --> LogOutcome
    BOT --> ScheduleNext
    LogOutcome --> MICRO_ORDER_LOG

    OHLCV_PRED --> LoadPred
    OHLCV_PRED --> CalcVol
    OHLCV_PRED --> MultiConfirm

    SCORE_TRADE --> QualityEval

    EntryLogic --> CCXT_API
    PosManage --> CCXT_API
    CCXT_API --> LogOutcome

    %% Error Handling
    BOT --> ErrorHandling["🛡️ Enhanced Error Handling"]

``````mermaid
flowchart TD
    %% ENVIRONMENT CONFIGURATION
    subgraph ENV["🛠️ .env Config"]
        EXCHANGE["EXCHANGE"]
        API_KEY["KEY"]
        API_SECRET["SECRET"]
        PAIR["PAIR"]
        MICRO_ORDER_AMOUNT["MICRO_ORDER_AMOUNT"]
        MICRO_INTERVAL_MS["MICRO_INTERVAL_MS"]
        BASE_PROFIT_PCT["BASE_PROFIT_PCT"]
        BASE_LOSS_PCT["BASE_LOSS_PCT"]
        FIB_HOLD_INDEX["FIB_HOLD_INDEX"]
        MIN_HOLD_MS["MIN_HOLD_MS"]
        MICRO_TIMEFRAME["MICRO_TIMEFRAME"]
        MICRO_MAX_TRADES_PER_DAY["MICRO_MAX_TRADES_PER_DAY"]
    end

    %% DATA FILES
    subgraph DATA["📂 Data Files"]
        OHLCV_PRED["logs/json/ohlcv/ohlcv_ccxt_data_*_prediction.json"]
        MICRO_ORDER_LOG["logs/micro_order.log"]
    end

    %% CORE MODULES
    subgraph MODULES["🧩 Core Modules"]
        BOT["microstructure/micro_ccxt_orders.js"]
        SCORE_TRADE["tradeQualityScore.js"]
    end

    %% EXCHANGE LAYER
    subgraph CCXT["🌐 Exchange Layer"]
        CCXT_API["ccxt (Kraken, etc.)"]
    end

    %% MAIN LOGIC
    subgraph MAINLOOP["🔁 Main Loop Workflow"]
        DailyReset["Reset Daily Trade Counter"]
        LoadPred["Load Latest OHLCV Prediction Data"]
        CalcVol["Calculate Volatility & Adaptive Thresholds"]
        MultiConfirm["Multi-Frame Consensus Check"]
        TradeLimit["Enforce Daily Trade Limit"]
        QualityEval["Evaluate Trade Quality"]
        EntryLogic["Enter Trade if Eligible"]
        PosManage["Manage Open Position (Trailing Stop, Partial Exit, Full Exit)"]
        HoldLogic["Hold Position if Exit Not Triggered"]
        LogOutcome["Log All Action Outcomes"]
        ScheduleNext["Schedule Next Run"]
    end

    %% DATA FLOW & DEPENDENCIES
    ENV --> BOT
    BOT --> CCXT_API
    BOT --> SCORE_TRADE
    BOT --> OHLCV_PRED
    BOT --> MICRO_ORDER_LOG

    BOT --> DailyReset
    BOT --> LoadPred
    BOT --> CalcVol
    BOT --> MultiConfirm
    BOT --> TradeLimit
    BOT --> QualityEval
    BOT --> EntryLogic
    BOT --> PosManage
    BOT --> HoldLogic
    BOT --> LogOutcome
    BOT --> ScheduleNext
    LogOutcome --> MICRO_ORDER_LOG

    OHLCV_PRED --> LoadPred
    OHLCV_PRED --> CalcVol
    OHLCV_PRED --> MultiConfirm

    SCORE_TRADE --> QualityEval

    EntryLogic --> CCXT_API
    PosManage --> CCXT_API
    CCXT_API --> LogOutcome

    %% Error Handling
    BOT --> ErrorHandling["🛡️ Enhanced Error Handling"]

```


## 🧩 Features

- **Trailing Stops:**  
  Dynamically updates trailing stop price for both long and short positions.

- **Adaptive Profit/Loss Thresholds:**  
  Adjusts take profit and stop loss thresholds based on current volatility.

- **Partial Exits:**  
  Allows partial position exits for more granular risk management.

- **Multi-Frame Confirmation:**  
  Confirms trading signals across multiple timeframes (`1m`, `5m`, `15m`, `1h`) for higher confidence.

- **Adaptive Sizing:**  
  Order size changes based on volatility for optimal risk exposure.

- **Smart Re-entry Logic:**  
  Prevents immediate re-entry or exit in the same cycle.

- **Trade Quality Scoring:**  
  Integrates trade quality assessment before and after trades.

- **Fibonacci Hold Time:**  
  Uses Fibonacci sequence (or .env override) to set minimum position hold times.

- **Daily Trade Limits:**  
  Restricts the number of trades per day for safety.

- **Strict Position Management:**  
  Prevents exiting a position in the same cycle as entry.

- **Verbose Debug Logging:**  
  Logs all actions and reasons to `micro_order.log` for transparency and review.

---

## ⚙️ Environment Variables

| Variable                   | Default      | Description                                                      |
|----------------------------|--------------|------------------------------------------------------------------|
| `EXCHANGE`                 | kraken       | Exchange name (e.g., 'kraken')                                   |
| `KEY`, `SECRET`            | (empty)      | Exchange API credentials                                         |
| `PAIR`                     | BTC/EUR      | Trading pair                                                     |
| `MICRO_ORDER_AMOUNT`       | 0.00005      | Base order size                                                  |
| `MICRO_INTERVAL_MS`        | 60000        | Bot run interval (ms)                                            |
| `BASE_PROFIT_PCT`          | 0.006138     | Base take profit percentage                                      |
| `BASE_LOSS_PCT`            | 0.006138     | Base stop loss percentage                                        |
| `FIB_HOLD_INDEX`           | 10           | Index for Fibonacci hold time                                    |
| `MIN_HOLD_MS`              | 754000       | Minimum hold time (can override Fibonacci)                       |
| `MICRO_TIMEFRAME`          | 1m           | Main timeframe for predictions                                   |
| `MICRO_MAX_TRADES_PER_DAY` | 4            | Maximum trades per day                                           |

---

## 🧑‍💻 Main Components

### 1. **Exchange Initialization**
- Loads exchange configuration and connects via ccxt using API keys.

### 2. **Utility Functions**
- **calcPVDPVVMFromPredictionFile:**  
  Calculates price volatility and variation from OHLCV prediction files.
- **getAdaptiveThresholds:**  
  Returns profit/loss percentages scaled by volatility.
- **multiFrameConfirm:**  
  Checks latest ensemble labels across all timeframes for consensus.
- **getAdaptiveOrderSize:**  
  Adjusts order size based on volatility.
- **updateTrailingStop:**  
  Moves trailing stop up/down depending on position and price.

### 3. **Trading Logic**
- **Entry:**  
  Only enters positions when volatility and PVD/PVVM exceed thresholds and multi-frame signal agrees.
- **Quality Enforcement:**  
  Skips low-quality trades per `scoreTrade`.
- **Position Management:**  
  Supports trailing stops, partial exits, and strict minimum hold times using Fibonacci values.
- **Exit Logic:**  
  Full or partial exits are triggered by take-profit, stop-loss, or hold time expiration.

### 4. **Logging and Error Handling**
- Logs every action and skip reason to `micro_order.log`.
- Handles uncaught exceptions and unhandled promise rejections gracefully.

---

## 📝 Logging Format

Order logs are written as lines to `tools/logs/micro_order.log`, including:

- Timestamp
- Trade action (BUY, SELL, PARTIAL_TAKE_PROFIT, EXIT, HOLD, SKIP)
- Order size and price
- PVVM/PVD values
- Trade quality score
- Daily trade count
- Position state info

---

## 🧵 Main Loop Workflow

1. **Reset daily trade counter if new day**
2. **Load latest OHLCV prediction data**
3. **Calculate volatility and adaptive thresholds**
4. **Check multi-frame consensus for signal**
5. **Enforce daily trade limit**
6. **Evaluate trade quality**
7. **Enter trade if eligible**
8. **Manage open position with trailing stop, partial exit, or full exit**
9. **Hold position if exit not triggered**
10. **Log all action outcomes**
11. **Schedule next run**

---

## 📂 File Structure

- `tools/microstructure/micro_ccxt_orders.js` — Main microstructure bot
- `tools/tradeQualityScore.js` — Trade quality scoring logic
- `tools/logs/micro_order.log` — Execution logs
- `tools/logs/json/ohlcv/ohlcv_ccxt_data_*_prediction.json` — Prediction sources

---

## 🏆 Best Practices

- **Monitor logs** for skipped trades and errors.
- **Update prediction files** regularly for accurate signals.
- **Tune parameters** in `.env` for optimal strategy.
- **Test on demo credentials** before live deployment.

---

## 📘 Further Reading

- [CCXT Documentation](https://github.com/ccxt/ccxt)
- [Kraken API Docs](https://docs.kraken.com)
- [Microstructure Trading](https://www.investopedia.com/terms/m/microstructure.asp)
- [Fibonacci Sequence in Trading](https://www.investopedia.com/terms/f/fibonacciretracement.asp)

---

## 🖼️ Icon

```
📈
```

---

## ⚠️ Disclaimer

This bot executes real trades if credentials are enabled. Use at your own risk. Always test on demo before live trading.
