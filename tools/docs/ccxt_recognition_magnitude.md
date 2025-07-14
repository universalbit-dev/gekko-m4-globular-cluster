# 📊 chart_ccxt_recognition_magnitude.js Documentation

Automated market signal recognition with magnitude analysis for crypto trading.

---

## 🗒️ Overview

`chart_ccxt_recognition_magnitude.js` uses a trained neural network to analyze OHLCV (Open, High, Low, Close, Volume) data and compute price/volume magnitude indicators. It then labels, predicts, and logs market states for trading automation.

---

## 🛠️ Features

- 📈 **Loads OHLCV Data:** Reads candles from CSV file for analysis.
- 🤖 **Neural Network Predictions:** Uses ConvNetJS models for market predictions (`bull`, `bear`, `idle`).
- 📏 **Magnitude Analysis:** Calculates PVVM (Price-Volume Vector Magnitude) and PVD (Price-Volume Distance).
- 🏷️ **Signal Labeling:** Distinguishes between `strong_bull`, `weak_bull`, `strong_bear`, `weak_bear`, and `neutral`.
- 📝 **Logs State Transitions:** Writes only significant prediction changes to `ccxt_signal_magnitude.log`.
- 🔄 **Automatic Execution:** Runs every 15 minutes by default.
- 🧹 **Log Management:** Keeps logs compact by trimming older entries.

---

## 📂 File Paths

| Purpose           | Path                                         |
|-------------------|----------------------------------------------|
| Input CSV         | `../logs/csv/ohlcv_ccxt_data.csv`            |
| Trained Models    | `./trained_ccxt_ohlcv/`                      |
| Signal Log        | `./ccxt_signal_magnitude.log`                |

---

## ⚙️ How It Works

1. **Load Candles**  
   Reads OHLCV data from CSV.

2. **Label Candles**  
   Applies modular labeling logic.

3. **Compute Magnitude Indicators**  
   Calculates PVVM and PVD values for each candle.

4. **Load Model**  
   Uses the newest valid ConvNetJS model for predictions.

5. **Predict States**  
   Classifies each candle as `bull`, `bear`, or `idle`.

6. **Label Signal Strength**  
   - `strong_bull` 🚀: Bull + high magnitude  
   - `weak_bull` 💡: Bull + low magnitude  
   - `strong_bear` ⚡: Bear + high magnitude  
   - `weak_bear` 🐾: Bear + low magnitude  
   - `neutral` ⚪: Idle or insignificant

7. **Log Transitions**  
   Adds only new transitions to the signal log, with price and magnitude data.

8. **Manage Logs**  
   Truncates log files if they grow too large (auto-maintenance).

---

## 🔔 Signal Definitions

| Signal         | Meaning                | Icon  |
|----------------|------------------------|-------|
| strong_bull    | Strong upward move     | 🚀    |
| weak_bull      | Weak upward move       | 💡    |
| strong_bear    | Strong downward move   | ⚡    |
| weak_bear      | Weak downward move     | 🐾    |
| neutral        | No clear action        | ⚪    |

---

## ⏰ Interval

Runs every **15 minutes** by default.  
To change, adjust `INTERVAL_MS` in the script.

---

## 📋 Usage

```bash
node tools/chart_ccxt_recognition_magnitude.js
```
The script will continue running and update logs automatically.

---

## 🧑‍💻 Dependencies

- Node.js
- ConvNetJS
- Custom files:
  - `../core/convnet.js`
  - `./label_ohlcv.js`

---

## 💡 Tips

- Place your trained model (JSON) in `./trained_ccxt_ohlcv/`
- Monitor `ccxt_signal_magnitude.log` for actionable signals
- Use magnitude thresholds to fine-tune your trading strategy

---

## 👤 Author

**universalbit-dev**  
🔗 [Repository](https://github.com/universalbit-dev/gekko-m4-globular-cluster)

---
