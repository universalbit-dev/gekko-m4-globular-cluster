# 📊 train_ccxt_ohlcv.js  
*Train a neural network on OHLCV data using ConvNetJS and save the model.*

---

## 📝 Overview

This script automates the process of training a neural network on OHLCV (Open, High, Low, Close, Volume) candlestick data, using ConvNetJS. It reads historical data, trains a classifier to predict labels (0, 1, or 2), and saves the trained model at regular intervals.

---

## 🚀 How It Works

1. **Data Loading**  
   📂 Reads `ohlcv_ccxt_data.json` from `../logs/json/ohlcv/`.

2. **Data Preparation**  
   🔄 Filters and formats the data for training, using candles with a `label` property.

3. **Network Architecture**  
   🧠 Builds a simple neural network:
   - Input: 5 features (open, high, low, close, volume)
   - Hidden: 1 fully connected layer with 16 neurons (ReLU)
   - Output: Softmax with 3 classes (0, 1, 2)

4. **Training**  
   🏋️‍♂️ Trains the model for 10 epochs on all labeled data using the Adadelta optimizer.

5. **Saving the Model**  
   💾 Saves the trained model as a timestamped JSON file in `./trained_ccxt_ohlcv/`.

6. **Automation**  
   ⏰ Repeats training and saving every 15 minutes (configurable).

---

## 📦 Input & Output

- **Input:**  
  - `../logs/json/ohlcv/ohlcv_ccxt_data.json`  
    Must be an array of candle objects with:
    ```json
    {
      "open": ...,
      "high": ...,
      "low": ...,
      "close": ...,
      "volume": ...,
      "label": 0 | 1 | 2
    }
    ```

- **Output:**  
  - Trained model saved as JSON, e.g.:  
    ```
    ./trained_ccxt_ohlcv/trained_ccxt_ohlcv_2025-06-05T07-00-00-000Z.json
    ```

---

## ⚙️ Usage

1. **Install dependencies:**  
   Make sure you have `fs` (Node.js built-in) and your custom `ConvNet` module in `../core/convnet.js`.

2. **Run the script:**  
   ```bash
   node tools/train_ccxt_ohlcv.js
   ```

3. **Automated retraining:**  
   The script will retrain and save a new model every 15 minutes by default.

---

## 🛠️ Configuration

- **Training Interval:**  
  Change the `INTERVAL_MS` constant (in milliseconds) for a different retraining frequency.

- **Network Parameters:**  
  You can modify `layer_defs` for a different architecture or adjust the trainer settings (batch size, method, etc.).

---

## 🧩 Dependencies

- Node.js (for running the script)
- ConvNetJS (custom version in your repo)

---

## 📁 File Structure

```
tools/
├── train_ccxt_ohlcv.js         # <--- This script
├── trained_ccxt_ohlcv/         # Output models folder
core/
└── convnet.js                  # Neural network library
logs/
└── json/
    └── ohlcv/
        └── ohlcv_ccxt_data.json # Source data
```

---

## 🖼️ Example Output

```
[2025-06-05T07-00-00-000Z] Model Saved as ./trained_ccxt_ohlcv/trained_ccxt_ohlcv_2025-06-05T07-00-00-000Z.json
```

---

## ⚠️ Notes & Troubleshooting

- If `ohlcv_ccxt_data.json` is missing or malformed, the script will log an error and skip training.
- Adjust the file paths if your directory structure is different.

---
