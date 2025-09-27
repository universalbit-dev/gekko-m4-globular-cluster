# 📉 `chart_recognition.js` — OHLCV Chart Recognition & Signal Prediction

---

## Overview

This script processes OHLCV market data from CSV, makes predictions using trained ConvNet models, outputs enhanced prediction CSVs, and records signal transitions for further analysis. It is designed for use with simulated or real exchange data, supporting continuous operation and robust log management.

---

## 🧩 Features

- **Market Action Prediction:**  
  Predicts `bull`, `bear`, or `idle` market signals using trained ConvNet models.

- **Data Pipeline:**  
  - Loads raw OHLCV data from CSV (ExchangeSimulator).
  - Converts CSV to JSON for further processing.
  - Supports deduplication and chronological sorting of candles.

- **Model Management:**  
  - Loads all available ConvNet models from a directory.
  - Applies each model to recent data and outputs results.

- **Enhanced Prediction Output:**  
  - Writes an enhanced CSV including predictions and model name.
  - Overwrites the output file each run to avoid uncontrolled file growth.

- **Signal Transition Logging:**  
  - Logs only signal transitions (state changes) with timestamps.
  - Deduplicates and sorts signal logs by timestamp for clean audit trails.

- **Automated & Continuous Operation:**  
  - Runs every 5 minutes (default) or as configured via `.env` (`INTERVAL_SIMULATOR_MS`).

---

## ⚙️ Environment Variables

| Variable               | Default   | Description                      |
|------------------------|-----------|----------------------------------|
| `INTERVAL_SIMULATOR_MS`| 300000    | Run interval in ms (default 5min)|

---

## 🧑‍💻 Main Components

### 1. **File Paths**
- **CSV Input:**  
  `logs/csv/ohlcv_data.csv`
- **JSON Output:**  
  `logs/json/ohlcv/ohlcv_data.json`
- **Model Directory:**  
  `trained/trained_ohlcv`
- **Prediction CSV Output:**  
  `logs/exchangesimulator_prediction.csv`
- **Signal Log:**  
  `logs/exchangesimulator_signal.log`

### 2. **Data Loading and Preparation**
- Reads raw CSV OHLCV data; removes possible header lines.
- Converts to JSON and deduplicates by timestamp, sorts chronologically.

### 3. **Model Loading**
- Loads all `.json` ConvNet model files from the model directory.
- Instantiates ConvNetJS nets using loaded model definitions.

### 4. **Prediction**
- For each model, predicts market action per candle.
- Writes an enhanced CSV with all candles and their predictions.

### 5. **Signal Transition Logging**
- Only appends lines when the predicted signal changes (transition).
- Converts timestamps to ISO format for clarity.
- Deduplicates and sorts log by timestamp each run.

### 6. **Automation**
- Runs initially on startup, then every configured interval.

---

## 📝 Output Formats

### Enhanced Prediction CSV

Header:
```
timestamp,open,high,low,close,volume,prediction,model
```
Each row:
```
2025-09-27T15:00:00Z,39000,39200,38950,39100,5.2,bull,model_v3.json
```

### Signal Log (`exchangesimulator_signal.log`)

Each entry:
```
2025-09-27T15:00:00Z    bull
2025-09-27T15:10:00Z    bear
...
```

---

## 📂 File Structure

- `tools/chart/chart_recognition.js` — Main recognition/analysis script
- `core/convnet.js` — ConvNetJS library
- `logs/csv/ohlcv_data.csv` — Raw CSV data
- `logs/json/ohlcv/ohlcv_data.json` — Processed JSON data
- `trained/trained_ohlcv/` — Model files
- `logs/exchangesimulator_prediction.csv` — Prediction output
- `logs/exchangesimulator_signal.log` — Signal transitions log

---

## 🏆 Best Practices

- **Keep models up-to-date:**  
  Retrain and refresh ConvNet models for best results.
- **Monitor logs:**  
  Use the signal log for auditing prediction transitions.
- **Avoid file growth:**  
  Enhanced CSV output is overwritten on each run; manage logs accordingly.

---

## 📘 Further Reading

- [OHLCV Explanation](https://www.investopedia.com/terms/o/ohlc-chart.asp)
- [ConvNetJS](https://github.com/karpathy/convnetjs)
- [Signal Processing in Trading](https://www.investopedia.com/articles/trading/08/trade-quality.asp)

---

## 🖼️ Icon

```
📉
```

---

## ⚠️ Disclaimer

This script only predicts and logs market actions; it does not execute trades. Use with care and validate model quality before relying on predictions.
