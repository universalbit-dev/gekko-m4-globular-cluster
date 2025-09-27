# 🏋️‍♂️ train_ccxt_ohlcv.js Documentation

Automated Training for Crypto Market Recognition Models  
**Location:** `tools/train_ccxt_ohlcv.js`

---

## 🗒️ Overview

`train_ccxt_ohlcv.js` is a Node.js script designed to automatically train neural network models on labeled OHLCV (Open, High, Low, Close, Volume) data. It saves new model files regularly for use in signal prediction and market recognition.

---

## 🛠️ Features

- 📥 **Loads labeled OHLCV data** from JSON
- 🧠 **Trains ConvNetJS neural network** for market state prediction (bull, bear, idle)
- 💾 **Saves trained models** in timestamped files for future use
- 🔄 **Runs automatically every 15 minutes**
- 🔔 **Logs training progress and model saves**

---

## ⚙️ How It Works

1. **Read Data:**  
   Loads OHLCV data with labels (from `../logs/json/ohlcv/ohlcv_ccxt_data.json`)

2. **Prepare Training Set:**  
   Uses candle features and assigned labels (`0`: bull, `1`: bear, `2`: idle)

3. **Build Neural Network:**  
   - Input layer: 5 features  
   - Multiple convolutional and fully connected layers  
   - Output: 3 market classes via softmax

4. **Train Model:**  
   - Trains for 10 epochs using all labeled data  
   - Uses Adadelta optimizer for efficient learning

5. **Save Model:**  
   - Model is saved as JSON in `./trained_ccxt_ohlcv/`  
   - Filename includes a timestamp for easy tracking

6. **Repeat:**  
   - The whole process runs every 15 minutes automatically

---

## 📁 File Locations

| Purpose          | Path                                           |
|------------------|------------------------------------------------|
| Training Data    | `../logs/json/ohlcv/ohlcv_ccxt_data.json`      |
| Trained Models   | `./trained_ccxt_ohlcv/trained_ohlcv_ccxt_*.json` |

---

## 🚦 Market Labels

| Label | Meaning      | Icon  |
|-------|--------------|-------|
| 0     | Bull         | 📈    |
| 1     | Bear         | 📉    |
| 2     | Idle         | ⏸️    |

---

## 📋 Usage

Just run the script:

```bash
node tools/train_ccxt_ohlcv.js
```

- The script will train a new model every 15 minutes.
- Check the `trained_ccxt_ohlcv` folder for new model files.

---

## 💡 Tips

- Make sure your OHLCV JSON data is labeled (see `label_ohlcv.js`).
- Use the saved models in your prediction scripts for live or simulated trading.
- Monitor the console for training progress and saved model notifications.

---

## 👤 Author

**universalbit-dev**  
🔗 [Repository](https://github.com/universalbit-dev/gekko-m4-globular-cluster)

---
