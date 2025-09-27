# 🛠️ `autoTune.js` — Auto-Tuning Indicator Parameters

---

## Overview

This script automatically tunes parameters for trading indicators (like RSI and ATR) using multiple scoring methods. It analyzes historical OHLCV data and finds the best parameter values for each indicator and scoring strategy, supporting both one-off and continuous tuning (configurable via `.env`).

---

## 🧩 Features

- **Multi-Indicator Support:**  
  Supports auto-tuning for RSI and ATR indicators by default; modular for additional indicators.

- **Multiple Scoring Methods:**  
  - Absolute Score (`abs`)
  - Profit-based Score (`profit`)
  - Sharpe Ratio (`sharpe`)
  - Hit Rate (`hit-rate`)

- **Configurable Ranges & Levels:**  
  Parameter ranges, buy/sell levels, and scoring templates are customizable per indicator.

- **Robust Environment Variable Handling:**  
  Reads `.env` for config like interval, file paths, and scoring intervals.

- **Continuous or One-Shot Execution:**  
  Can run once or continuously at a set interval (`AUTOTUNE_INTERVAL_MS` or fallback to `INTERVAL_MS`).

- **Detailed Logging & Output:**  
  Prints best parameters and scores for each method, and saves all results to `autoTune_results.json`.

---

## ⚙️ Environment Variables

| Variable             | Default      | Description                              |
|----------------------|--------------|------------------------------------------|
| `AUTOTUNE_INTERVAL_MS` | 0          | How often to run autoTune (ms), 0=once   |
| `INTERVAL_MS`        | 0            | Fallback run interval if above not set   |
| `RSI` / `ATR` params | as coded     | See indicator config section             |

---

## 🧑‍💻 Main Components

### 1. **Indicator Config**
- Defines which indicators to tune, parameter ranges, scoring methods, and buy/sell levels.

### 2. **Scoring Functions**
- **absScore:** Sum of absolute values.
- **profitScore:** Simulated trading profit from buy/sell signals.
- **sharpeScore:** Standard Sharpe ratio calculation from returns.
- **hitRateScore:** Proportion of winning trades.

### 3. **Auto-Tuning Pipeline**
- Loads OHLCV data from JSON file.
- For each indicator and scoring method:
  - Iterates through possible parameter values.
  - Calculates scores for each.
  - Records the parameter yielding the best score.
- Outputs results to `autoTune_results.json`.

### 4. **Continuous Execution**
- If interval is set, runs repeatedly at that interval; otherwise runs once.

---

## 📂 File Structure

- `tools/evaluation/autoTune.js` — This script
- `tools/logs/json/ohlcv/ohlcv_ccxt_data.json` — Input OHLCV data
- `tools/evaluation/autoTune_results.json` — Output results
- `tools/evaluation/indicator/RSI.js` — RSI indicator class
- `tools/evaluation/indicator/ATR.js` — ATR indicator class

---

## 📝 Output Example

Each result in `autoTune_results.json` contains:
```json
{
  "indicator": "rsi",
  "paramName": "interval",
  "bestParam": 12,
  "scoring": "profit",
  "bestScore": 1.29,
  "bestLastValue": 44.1,
  "bestTimestamp": 1695826800000,
  "totalTrades": 14,
  "wins": 9,
  "losses": 5
}
```

---

## 🏆 Best Practices

- **Tune regularly:**  
  Set a periodic run interval to keep indicator parameters up-to-date with changing market conditions.
- **Review logs and output:**  
  Use printed logs and `autoTune_results.json` to adjust your trading bot configuration.
- **Customize scoring:**  
  Adjust scoring methods and parameter ranges for your own strategy and asset class.

---

## 📘 Further Reading

- [RSI Indicator](https://www.investopedia.com/terms/r/rsi.asp)
- [ATR Indicator](https://www.investopedia.com/terms/a/atr.asp)
- [Sharpe Ratio](https://www.investopedia.com/terms/s/sharperatio.asp)
- [Auto-Tuning in Trading](https://www.investopedia.com/terms/o/optimization.asp)

---

## 🖼️ Icon

```
🛠️
```

---

## ⚠️ Disclaimer

This script tunes indicator parameters for backtest/simulation. Review results before deploying in live trading systems.
