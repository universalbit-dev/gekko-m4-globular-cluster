# 📈 train_ohlcv.js – OHLCV Model Training Script

This script is used to train a neural network classifier on OHLCV (Open, High, Low, Close, Volume) candle data and automatically save the trained model at regular intervals.  
Perfect for time-series or trading-related machine learning tasks!

---

## ⚙️ How It Works

1. **Loads Data:** Reads OHLCV data from `../logs/json/ohlcv/ohlcv_data.json`  
2. **Prepares Training Set:** Uses only entries with a label (0, 1, or 2)  
3. **Builds Model:** Sets up a neural network using [ConvNetJS](https://github.com/karpathy/convnetjs)  
4. **Trains Model:** Runs 10 training epochs per session  
5. **Saves Model:** Exports the trained network as a JSON file in `trained_ohlcv/`  
6. **Repeats:** Retrains every 15 minutes (configurable)  

---

## 🧩 Dependencies

- [Node.js](https://nodejs.org/)
- [ConvNetJS (local)](../core/convnet.js)
- File system access (`fs`)

---

## 📦 Input Data

- **File:** `../logs/json/ohlcv/ohlcv_data.json`
- **Format:**  
  ```json
  [
    { "open":..., "high":..., "low":..., "close":..., "volume":..., "label": 0|1|2 },
    ...
  ]
  ```
  - Only entries with a numeric `label` are used.

---

## 🏗️ Network Architecture

```js
[
  { type: 'input', out_sx: 1, out_sy: 1, out_depth: 5 },
  { type: 'fc', num_neurons: 16, activation: 'relu' },
  { type: 'softmax', num_classes: 3 }
]
```

- **Input:** [open, high, low, close, volume]
- **Output:** One of 3 classes (label 0, 1, or 2)

---

## 🏃 Running the Script

```bash
node tools/train_ohlcv.js
```

- The script runs immediately and then repeats every 15 minutes (900,000 ms by default).
- To change the interval, edit:
  ```js
  const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  ```

---

## 💾 Model Output

- Trained model files are saved as:
  ```
  trained_ohlcv/trained_ohlcv_YYYY-MM-DDTHH-MM-SS-sssZ.json
  ```
  **Example:**
  ```
  trained_ohlcv/trained_ohlcv_2025-06-05T07-00-00-000Z.json
  trained_ohlcv/trained_ohlcv_2025-06-05T08-00-00-000Z.json
  ```

---

## 🛠️ Customization Tips

- **Change Training Epochs:**  
  Edit the loop: `for(let epoch = 0; epoch < 10; epoch++) {...}`
- **Adjust Network Layers:**  
  Modify the `layer_defs` array.
- **Data Path:**  
  Ensure the input JSON exists and is up to date.

---

## 🚨 Error Handling

- If the input file is missing or invalid, an error is logged and training is skipped for that interval.

---

## 🧠 Quick Code Reference

```js
// Run training once
trainAndSave();

// Repeat every INTERVAL_MS milliseconds
setInterval(trainAndSave, INTERVAL_MS);
```

---

## ⭐ Summary

- **Automated periodic training and saving of OHLCV neural network models**
- **Output is timestamped for easy tracking**
- **Easily customizable for different data sources or network architectures**

---

> 📚 **Need help?**  
> Check your paths and make sure your input data is present and formatted correctly.  
> For neural network tuning, see [ConvNetJS documentation](https://github.com/karpathy/convnetjs).

---
