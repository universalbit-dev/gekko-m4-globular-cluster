# 🤖 chart_recognition.js Documentation

Automated Market Signal Recognition for ExchangeSimulator

---

## 🗒️ Overview

`chart_recognition.js` is a Node.js script that uses trained neural networks (ConvNetJS) to predict market signals (`bull`, `bear`, `idle`) from OHLCV data. It processes CSV data, generates predictions, and logs actionable state transitions for algorithmic trading.

---

## 🛠️ Features

- 📈 **Loads OHLCV Data:** Reads historical price/volume data from CSV.
- 🧠 **Neural Network Predictions:** Uses trained ConvNetJS models for market signal classification.
- ✨ **Enhanced Output:** Writes an enriched CSV with predictions and model info.
- ⏱️ **Scheduled Execution:** Runs automatically every 1 hour.
- 📝 **Signal Logging:** Appends only signal transitions (state changes) to `exchangesimulator_signal.log`.
- 🧹 **Deduplication:** Keeps logs clean by removing duplicate timestamps and sorting.

---

## 📂 File Paths

| Purpose             | Path                                               |
|---------------------|----------------------------------------------------|
| Input CSV           | `../logs/csv/ohlcv_data.csv`                       |
| Output JSON         | `../logs/json/ohlcv/ohlcv_data.json`               |
| Model Directory     | `./trained_ohlcv/`                                 |
| Output Prediction   | `./ohlcv_data_prediction.csv`                      |
| Signal Log          | `./exchangesimulator_signal.log`                   |

---

## ⚙️ How It Works

1. **Load Candles:**  
   Reads OHLCV data from CSV and converts it to JSON.

2. **Sort and Deduplicate:**  
   Ensures each timestamp is unique and sorted in ascending order.

3. **Load Models:**  
   Loads all ConvNetJS model files from the model directory.

4. **Predict Market States:**  
   For each candle, predicts one of:
   - `bull` 📈
   - `bear` 📉
   - `idle` ⏸️

5. **Output CSV:**  
   Overwrites prediction CSV on each run to avoid file size growth.

6. **Log Signal Transitions:**  
   Appends only signal changes to the log and deduplicates by timestamp.

7. **Scheduled Execution:**  
   Runs every 1 hour by default.

---

## 📋 Usage

```bash
node tools/chart_recognition.js
```

The script will process data, update predictions, and log signals automatically at the set interval.

---

## 🧑‍💻 Dependencies

- Node.js
- ConvNetJS
- Custom files:
  - `../core/convnet.js`

---

## 🔔 Signal Definitions

| Signal | Meaning      | Icon  |
|--------|--------------|-------|
| bull   | Uptrend      | 📈    |
| bear   | Downtrend    | 📉    |
| idle   | No action    | ⏸️    |

---

## 💡 Tips

- Place trained neural network models (JSON format) in `./trained_ohlcv/`.
- Check `exchangesimulator_signal.log` for actionable signal transitions.
- Review `ohlcv_data_prediction.csv` for model predictions and performance.

---

## 👤 Author

**universalbit-dev**  
🔗 [Repository](https://github.com/universalbit-dev/gekko-m4-globular-cluster)

---
