# 📊 `challenge_analysis.js` — Challenge Log Multi-Timeframe Analysis

---

## Overview

This script analyzes multi-timeframe challenge logs to detect rolling win rates, model dominance, and volatility. It selects the best performing model per timeframe, calculates key metrics (including ATR volatility), and outputs robust analytics for use in automated trading strategies and model selection.

---

## 🧩 Features

- **Multi-Timeframe Analysis:**  
  Supports any set of timeframes (`1m`, `5m`, `15m`, `1h`, etc.), configurable via `.env`.

- **Rolling Win Rate Calculation:**  
  Computes rolling win rates for each model over a configurable window.

- **Dominance Detection:**  
  Identifies periods where a model's win rate exceeds a dominance threshold for a minimum duration.

- **Robust Volatility Reporting:**  
  Calculates Average True Range (ATR) volatility per timeframe.

- **Winner Model Selection:**  
  Automatically selects the "active_model" for each timeframe based on dominance or highest win rate.

- **Comprehensive Output:**  
  Writes `model_winner.json` with all analytics, including dominant periods and recent win entry.

- **Continuous Analysis:**  
  Updates analytics at a configurable interval for live tracking.

---

## ⚙️ Environment Variables

| Variable                        | Default         | Description                                             |
|----------------------------------|-----------------|---------------------------------------------------------|
| `CHALLENGE_INTERVAL_MS`          | 900000 (15 min) | Analysis interval (ms)                                  |
| `WINDOW_SIZE`                    | 50              | Rolling window size for win rate calculation             |
| `CHALLENGE_MIN_WIN_RATE`         | 0.618           | Minimum win rate to select a model                      |
| `CHALLENGE_DOMINANCE_THRESHOLD`  | 0.618           | Threshold to detect dominant periods                    |
| `CHALLENGE_DOMINANCE_MIN_LENGTH` | 13              | Minimum length for dominance periods                    |
| `CHALLENGE_ATR_PERIOD`           | 14              | ATR period for volatility calculation                   |
| `CHALLENGE_MODEL_LIST`           | convnet,tf      | Comma-separated list of models to analyze               |
| `CHALLENGE_TIMEFRAMES`           | 1m,5m,15m,1h    | Comma-separated list of timeframes                      |

---

## 🧑‍💻 Main Components

### 1. **Log Parsing**
- Reads challenge logs, parses tab-separated rows, and extracts model predictions and results.

### 2. **ATR Volatility Calculation**
- Computes ATR for each candle to estimate volatility.

### 3. **Rolling Win Rate**
- Calculates win rates for each model using a sliding window.

### 4. **Dominance Detection**
- Finds periods where a model's win rate remains above the threshold for a specified length.

### 5. **Model Winner Selection**
- Prioritizes models with dominant periods, then falls back to highest win rate above threshold, else flags as `no_winner`.

### 6. **Recent Win Entry Retrieval**
- Finds the most recent "win" entry for the winner model and associates volatility.

### 7. **Output Generation**
- For each timeframe, outputs:
  - Active model
  - Win rate
  - Dominant periods
  - Recent win entry (with volatility)
  - Analysis timestamps

- Writes results to `model_winner.json`.

### 8. **Continuous Analysis**
- Runs analytics on startup and at regular intervals.

---

## 📂 File Structure

- `tools/challenge/challenge_analysis.js` — Main analysis script
- `tools/challenge/model_winner.json` — Output analytics file per timeframe
- `tools/challenge/challenge_{tf}.log` — Input logs per timeframe

---

## 📝 Output (`model_winner.json`)

Example structure:
```json
{
  "1m": {
    "summary": {
      "active_model": "convnet",
      "win_rate": 0.72,
      "dominant_periods": [
        { "start_ts": "2025-09-27T15:00:00Z", "end_ts": "2025-09-27T15:45:00Z", "length": 20 }
      ],
      "analysis_timestamp": "2025-09-27T15:49:42Z",
      "log_timestamp": "2025-09-27T15:45:00Z"
    },
    "recent_win": {
      ...signalFields,
      "volatility": 64.2
    }
  }
}
```

---

## 🏆 Best Practices

- **Review logs regularly** to monitor model performance.
- **Tune window, thresholds, and volatility parameters** as needed for your strategy.
- **Keep challenge logs updated** for accurate analytics.

---

## 📘 Further Reading

- [Model Selection in Trading](https://www.investopedia.com/model-selection-and-evaluation-4589784)
- [Rolling Window Analytics](https://en.wikipedia.org/wiki/Moving_average)
- [ATR Volatility](https://www.investopedia.com/terms/a/atr.asp)
- [Dominance Detection in Statistics](https://en.wikipedia.org/wiki/Statistical_dominance)

---

## 🖼️ Icon

```
📊
```

---

## ⚠️ Disclaimer

This script does not execute trades but is critical for robust model selection and analytics. Use with up-to-date challenge logs for meaningful results.
