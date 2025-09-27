# 📊 chart_ccxt_recognition.js Documentation

Predict market signals from OHLCV data using a trained neural network, and log actionable transitions for automated trading.

---

## 🏷️ Description

`chart_ccxt_recognition.js` automates the process of analyzing market data, making predictions, and logging trading signals:

- Loads OHLCV data from CSV
- Converts and saves data as JSON for analysis
- Uses a ConvNetJS neural network model to predict market actions (`bull`, `bear`, `idle`)
- Outputs an enhanced CSV with predictions and true labels
- Appends state transitions to `ccxt_signal.log` (with deduplication)
- Runs automatically at a defined interval (default: 1 hour)

---

## ⚙️ How It Works

1. **📥 Load CSV Data**  
   Reads OHLCV data from:  
   `../logs/csv/ohlcv_ccxt_data.csv`

2. **🔄 Convert to JSON**  
   Saves parsed candles as JSON:  
   `../logs/json/ohlcv/ohlcv_ccxt_data.json`

3. **🤖 Load Neural Network Model**  
   Loads the latest ConvNetJS model from:  
   `./trained_ccxt_ohlcv/`

4. **🔮 Predict Market Actions**  
   For each candle, predicts:  
   - `bull` 📈  
   - `bear` 📉  
   - `idle` ⏸️

5. **📤 Output Enhanced CSV**  
   Writes all candles with true labels and predictions to:  
   `./ohlcv_ccxt_data_prediction.csv`

6. **📝 Log Signal Transitions**  
   Only appends state transitions to:  
   `./ccxt_signal.log`  
   Deduplicates log entries to avoid noise.

7. **⏲️ Interval Execution**  
   Runs once on startup, then every hour (can be changed).

---

## 🗂️ File Paths

| Purpose              | Path                                         |
|----------------------|----------------------------------------------|
| Input CSV            | `../logs/csv/ohlcv_ccxt_data.csv`            |
| Output JSON          | `../logs/json/ohlcv/ohlcv_ccxt_data.json`    |
| Model Directory      | `./trained_ccxt_ohlcv/`                      |
| Output Predictions   | `./ohlcv_ccxt_data_prediction.csv`           |
| Signal Log           | `./ccxt_signal.log`                          |

---

## 🛠️ Customization

- **Change Interval:**  
  Modify `INTERVAL_MS` near the top of the script to set how often it runs (default: 1 hour).
- **Model Directory:**  
  Ensure trained ConvNetJS models (JSON) are placed in `./trained_ccxt_ohlcv/`.

---

## 🚦 Signal Definitions

| Signal | Meaning           | Icon  |
|--------|-------------------|-------|
| bull   | Uptrend           | 📈    |
| bear   | Downtrend         | 📉    |
| idle   | No action         | ⏸️    |

---

## 📋 Usage

Run the script manually or as a service:
```bash
node tools/chart_ccxt_recognition.js
```
It will generate predictions and update logs automatically.

---

## 🧑‍💻 Dependencies

- [Node.js](https://nodejs.org/)
- [ConvNetJS](https://github.com/karpathy/convnetjs)
- Custom:  
  - `../core/convnet.js`
  - `./label_ohlcv.js`

---

## 🔍 FAQ

**Q:** Where are the predictions saved?  
**A:** See `ohlcv_ccxt_data_prediction.csv` for all candles, true labels, and predictions.

**Q:** How do I train a new model?  
**A:** Use ConvNetJS and save your trained model as JSON in `trained_ccxt_ohlcv/`.

**Q:** What triggers a log entry in `ccxt_signal.log`?  
**A:** Only a change in predicted signal (state transition) is logged.

---

## 💡 Tips

- Regularly train and update your ConvNetJS model for best results.
- Monitor `ccxt_signal.log` for actionable entries for your trading bot.
- Review enhanced prediction CSVs for model performance.

---

## 👤 Author

**universalbit-dev**  
🔗 [Repository](https://github.com/universalbit-dev/gekko-m4-globular-cluster)

---
