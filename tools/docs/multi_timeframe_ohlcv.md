# 🕰️ `multi_timeframe_ohlcv.js` — Multi-Timeframe OHLCV Candle Recognition & Signal Labeling

---

## Overview

This script performs multi-timeframe OHLCV candle recognition and signal labeling using **TensorFlow** and **ConvNetJS** models. It discovers the latest model per timeframe, applies both neural network predictions, and outputs enhanced prediction JSON files for use in trading, analysis, and visualization.

---

## 🧩 Features

- **Multi-Model Prediction:**  
  Supports both TensorFlow (`tfjs-node`) and ConvNetJS models in parallel.

- **Robust Model Discovery:**  
  Automatically locates the latest trained model for each timeframe.

- **Modular Loader Architecture:**  
  Clean separation for TensorFlow and ConvNetJS model loading.

- **Flexible Timeframes:**  
  Runs on any set of timeframes as specified in `.env` (default: `1m`, `5m`, `15m`, `1h`).

- **Continuous Operation:**  
  Runs at intervals defined by `TRAIN_INTERVAL_MS` for ongoing signal updates.

- **Enhanced Feature Engineering:**  
  Computes PVVM (price-volume volatility metric) and PVD (price variation delta) for each candle.

- **Majority Voting Ensemble:**  
  Combines predictions via ensemble majority voting for robust signal labeling.

- **Rich Output:**  
  Writes enhanced prediction JSON per timeframe, including all features and predictions.

---

## ⚙️ Environment Variables

| Variable             | Default   | Description                                  |
|----------------------|-----------|----------------------------------------------|
| `TRAIN_OHLCV_TIMEFRAMES` | 1m,5m,15m,1h | Comma-separated timeframes to process       |
| `TRAIN_INTERVAL_MS`  | 300000    | Continuous run interval (ms, default 5 min)  |

---

## 🧑‍💻 Main Components

### 1. **Model Loading**
- **TensorFlow Loader**:  
  Finds the latest TensorFlow model directory for each timeframe and loads it.
- **ConvNetJS Loader**:  
  Finds and loads the latest ConvNetJS model file.

### 2. **OHLCV Candle Data Loading**
- Loads raw OHLCV candle data per timeframe from JSON files.

### 3. **Feature Engineering**
- Computes PVVM and PVD from candle and previous candle data.

### 4. **Prediction**
- **ConvNetJS:**  
  Uses neural net to predict "bull", "bear", or "idle" for each candle.
- **TensorFlow:**  
  Uses deep learning model to predict "bull", "bear", or "idle" (softmax output).

### 5. **Labeling & Ensemble**
- Assigns labels ("strong_bull", "strong_bear", "neutral") based on model predictions.
- Applies majority voting to create an `ensemble_label`.

### 6. **Output**
- Writes enhanced prediction JSON per timeframe including:
  - OHLCV data
  - PVVM, PVD
  - All model predictions
  - All labels
  - Ensemble label

### 7. **Continuous Execution**
- Runs the recognition and output loop continuously at the specified interval.

---

## 📂 File Structure

- `tools/chart/multi_timeframe_ohlcv.js` — Main recognition script
- `tools/logs/json/ohlcv/ohlcv_ccxt_data_{tf}.json` — Input raw OHLCV candles
- `tools/logs/json/ohlcv/ohlcv_ccxt_data_{tf}_prediction.json` — Output enhanced prediction files
- `tools/trained/trained_ccxt_ohlcv_tf/` — TensorFlow model directories
- `tools/trained/trained_ccxt_ohlcv/` — ConvNetJS model files
- `core/convnet.js` — ConvNetJS library

---

## 📝 Output Example

Each candle in the enhanced prediction JSON contains:
```json
{
  "timestamp": 1695826800000,
  "open": 39000,
  "high": 39200,
  "low": 38950,
  "close": 39100,
  "volume": 5.2,
  "PVVM": 0.24,
  "PVD": 0.00256,
  "prediction_convnet": "bull",
  "prediction_tf": "bear",
  "label_convnet": "strong_bull",
  "label_tf": "strong_bear",
  "ensemble_label": "strong_bull"
}
```

---

## 🏆 Best Practices

- **Update models regularly:**  
  Ensure TensorFlow and ConvNetJS models are retrained and updated for best performance.
- **Monitor logs:**  
  Watch for `[ERROR]` or `[WARN]` messages for missing models or prediction issues.
- **Tune interval:**  
  Adjust `TRAIN_INTERVAL_MS` for real-time or batch operation.

---

## 📘 Further Reading

- [OHLCV Data](https://www.investopedia.com/terms/o/ohlc-chart.asp)
- [TensorFlow.js Node](https://www.tensorflow.org/js/guide/nodejs)
- [ConvNetJS](https://github.com/karpathy/convnetjs)
- [Ensemble Methods](https://en.wikipedia.org/wiki/Ensemble_learning)

---

## 🖼️ Icon

```
🕰️
```

---

## ⚠️ Disclaimer

This script is for candle recognition and signal labeling; it does not execute trades. Use enhanced prediction files for further analysis or as input to trading bots.
