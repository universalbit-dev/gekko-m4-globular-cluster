# 📒 `challenge_log_writer.js` — Challenge Log Writer (Multi-Timeframe)

---

## Overview

This utility processes prediction logs across multiple timeframes and models, generating challenge logs that track future price win/loss results for each model. It is robust to missing data, supports dynamic model lists and timeframes, and writes out detailed logs for auditing and model evaluation.

---

## 🧩 Features

- **Multi-Timeframe Support:**  
  Handles any list of timeframes (default: `1m`, `5m`, `15m`, `1h`) as specified in `.env`.

- **Flexible Models:**  
  Works with any set of models, configurable via `.env` (`CHLOG_MODEL_LIST`), e.g., `convnet`, `tf`.

- **Robust to Missing Data:**  
  Auto-creates missing input prediction log files and uses sensible defaults when data is missing or malformed.

- **Win/Loss Evaluation:**  
  For each signal, evaluates future price movement after a configurable offset (`FUTURE_OFFSET`) and marks each model's prediction as `win`, `loss`, or `pending`.

- **Dynamic Winner Model Selection:**  
  Uses `model_winner.json` (supports multiframe format) to select the winner label column for each timeframe.

- **Metadata-Rich Logs:**  
  Each challenge log entry includes open, high, low, close, volume, volatility, and other extra fields from prediction logs.

- **Automated Execution:**  
  Runs at a configurable interval (`CHLOG_INTERVAL_MS`) to update logs in real-time.

---

## ⚙️ Environment Variables

| Variable             | Default         | Description                                        |
|----------------------|-----------------|----------------------------------------------------|
| `CHLOG_INTERVAL_MS`  | 900000 (15 min) | How often to update challenge logs (ms)            |
| `FUTURE_OFFSET`      | 2               | How many steps ahead to check for win/loss         |
| `CHLOG_MODEL_LIST`   | convnet,tf      | Comma-separated model list                         |
| `CHLOG_TIMEFRAMES`   | 1m,5m,15m,1h    | Comma-separated list of timeframes                 |

---

## 🧑‍💻 Main Components

### 1. **File Initialization**
- Ensures each prediction file exists for the given timeframes, creating an empty file if missing.

### 2. **Signal Processing**
- Reads all signals from each prediction log.
- Extracts predictions, winner label, and extra fields.

### 3. **Win/Loss Evaluation**
- For each signal, compares predicted direction (`bull`/`bear`) against actual price movement after a future offset.
- Assigns `win`, `loss`, or `pending` for each model.

### 4. **Log Formatting**
- Builds tab-separated log entries with predictions, prices, win/loss, winner label, and all available extra metadata.

### 5. **Challenge Log Writing**
- Writes out `challenge_{tf}.log` files for each timeframe with header and formatted entries.

### 6. **Automation**
- Updates all challenge logs on startup and at the specified interval.

---

## 📝 Log Entry Format

Each log file starts with a header:
```
timestamp   prediction_model1   prediction_model2   ...   entry_price   next_price   model1_result   model2_result   ...   winner_label   open   high   low   close   volume   volatility   priceChange   candleSize   priceChangePct   timestamp_extra
```

Each subsequent line contains:
- Timestamp of signal
- Model predictions
- Entry price
- Future price (after offset)
- Win/loss/pending result for each model
- Winner label (as selected by model_winner.json)
- Extra OHLCV fields and metadata

---

## 🧵 Workflow

1. **On startup and every interval:**
   - Ensure prediction files exist.
   - For each timeframe:
     - Read all signals.
     - For each signal, find the corresponding future signal.
     - Evaluate win/loss for each model.
     - Build and write challenge log entries.
   - Repeat at defined interval.

---

## 📂 File Structure

- `tools/challenge/challenge_log_writer.js` — Main log writer
- `tools/challenge/model_winner.json` — Winner model selection per timeframe
- `tools/logs/json/ohlcv/ohlcv_ccxt_data_*_prediction.json` — Prediction logs per timeframe
- `tools/challenge/challenge_{tf}.log` — Output challenge logs

---

## 🏆 Best Practices

- **Review challenge logs** for model performance and prediction accuracy.
- **Configure `.env`** to adjust model list, timeframes, interval, and offset as needed.
- **Keep prediction files updated** for accurate win/loss evaluation.

---

## 📘 Further Reading

- [Model Evaluation in Trading](https://www.investopedia.com/model-selection-and-evaluation-4589784)
- [OHLCV Data](https://www.investopedia.com/terms/o/ohlc-chart.asp)
- [Tab-Separated File Format](https://en.wikipedia.org/wiki/Tab-separated_values)

---

## 🖼️ Icon

```
📒
```

---

## ⚠️ Disclaimer

This utility does not execute trades but is critical for model auditing and challenge performance tracking. Use with up-to-date prediction logs for meaningful results.
