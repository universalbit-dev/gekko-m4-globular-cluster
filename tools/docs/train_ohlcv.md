# 🏋️ train_ohlcv.js Documentation

Automated Training for Market Signal Recognition  
**Location:** `tools/train_ohlcv.js`

---

## 🗒️ Overview

`train_ohlcv.js` is a Node.js script that automatically trains a neural network (ConvNetJS) on labeled OHLCV data. It generates and saves models at regular intervals, ready for use in market prediction and recognition tasks.

---

## 🛠️ Features

- 📥 **Loads labeled OHLCV data** from JSON
- 🧠 **Trains ConvNetJS neural network** to recognize market states: bull, bear, idle
- 💾 **Saves trained models** in timestamped files for easy tracking
- 🔄 **Runs automatically every 15 minutes**
- 📝 **Logs training progress and model saves**

---

## ⚙️ How It Works

1. **Read Data:**  
   Loads OHLCV data with labels from `../logs/json/ohlcv/ohlcv_data.json`

2. **Prepare Training Set:**  
   Uses candle features and labels (`0`: bull, `1`: bear, `2`: idle)

3. **Build Neural Network:**  
   - Input layer: 5 features (open, high, low, close, volume)
   - Fully connected layer (16 neurons, relu activation)
   - Output: 3 market classes via softmax

4. **Train Model:**  
   - Trains for 10 epochs using all labeled data  
   - Uses Adadelta optimizer for efficient learning

5. **Save Model:**  
   - Model is saved as JSON in `./trained_ohlcv/`  
   - Filename includes a timestamp (example: `trained_ohlcv_2025-06-07T07-31-03-634Z.json`)

6. **Repeat:**  
   - The process repeats every 15 minutes automatically

---

## 📁 File Locations

| Purpose          | Path                                         |
|------------------|----------------------------------------------|
| Training Data    | `../logs/json/ohlcv/ohlcv_data.json`         |
| Trained Models   | `./trained_ohlcv/trained_ohlcv_*.json`       |

---

## 🚦 Market Labels

| Label | Meaning      | Icon  |
|-------|--------------|-------|
| 0     | Bull         | 📈    |
| 1     | Bear         | 📉    |
| 2     | Idle         | ⏸️    |

---

## 📋 Usage

Simply run the script:

```bash
node tools/train_ohlcv.js
```

- The script will train and save a new model every 15 minutes.
- Check the `trained_ohlcv` folder for new model files.

---

## 💡 Tips

- Make sure your OHLCV JSON data is labeled (see `label_ohlcv.js`).
- Use the saved models in your prediction scripts for live trading or backtesting.
- Monitor the console for training progress and model save notifications.

---

## 👤 Author

**universalbit-dev**  
🔗 [Repository](https://github.com/universalbit-dev/gekko-m4-globular-cluster)

---
