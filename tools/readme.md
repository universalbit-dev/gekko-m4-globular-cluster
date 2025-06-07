## 🧰 Purpose of Gekko M4 Globular Cluster Tools

> **🔎 What are these tools for?**

The **Gekko M4 Globular Cluster Tools** help you explore, analyze, and model financial time-series data using neural networks.  
They provide practical starting code (“propedeutic” scripts) for building and training neural network models, perfect for market prediction, classification, and data analysis workflows.

---

### 📚 Inspired by Deep Learning Best Practices

These tools draw inspiration from the [Stanford CS-230 Deep Learning Course](https://github.com/afshinea/stanford-cs-230-deep-learning), especially the [Convolutional Neural Networks Cheatsheet (PDF)](https://github.com/afshinea/stanford-cs-230-deep-learning/blob/4653bc01297b269edb19e844b01127ba13de59df/en/cheatsheet-convolutional-neural-networks.pdf) 📄.  
They implement neural network techniques and best practices recommended by leading academics and practitioners.

---

### 🛠️ Why use these tools?

- **Learn by Doing:** Hands-on introduction to neural networks and financial data analysis  
- **Ready for Modeling:** Essential scripts to prepare, train, and save neural network models  
- **Adaptable:** A solid base for advanced AI-driven analytics in finance or other fields  
- **Community Knowledge:** Built on proven, widely-shared deep learning principles

---

### 🚦 Summary

> These tools bridge the gap between theory and practice—making it easier to apply neural network methods to your own data projects.  
> Start here, experiment, and build smarter models! 🧠🚀

---
Thank you for clarifying! Here’s a revised version of the documentation note, making it clear that some ccxt scripts require context from this plugin’s documentation:

---

> 📘 **ccxtMarketData:**  
> This page covers the [`ccxtMarketData` plugin](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/plugins/ccxtMarketData/ccxtMarketData.md).  
> _Please note: Some ccxt scripts need to be understood in the context of this plugin. Learn how to quickly launch the plugin with a simple Node.js command, or follow detailed examples to integrate it into your strategy._

# 🛠️ Gekko M4 Globular Cluster Tools

This directory contains core automation scripts for model training and chart recognition, along with their PM2 process management configuration.

## 🚦 Quick Start: Running All Tools with PM2

Make sure you have [PM2](https://pm2.keymetrics.io/) installed globally:

```bash
npm install -g pm2
```

Start all tools as background processes with:

```bash
pm2 start tools.config.js
```

---

## 📄 Tool Overview

### 1. 🧠 Model Training Scripts

#### `train_ohlcv.js`
- **Purpose:** Trains a neural network on standard OHLCV data (Open, High, Low, Close, Volume).  
- **Input:** `../logs/json/ohlcv/ohlcv_data.json` (must include `label` per candle).  
- **Output:** Saves models to `./trained_ohlcv/` as timestamped `.json` files.  
- **Interval:** Retrains every 15 minutes (default).

#### `train_ccxt_ohlcv.js`
- **Purpose:** Same as above, but for OHLCV data sourced via CCXT.  
- **Input:** `../logs/json/ohlcv/ohlcv_ccxt_data.json`  
- **Output:** `./trained_ccxt_ohlcv/` (timestamped).  
- **Interval:** Every 15 minutes.

**Model Output Example:**  
`trained_ohlcv/trained_ohlcv_2025-06-05T07-00-00-000Z.json`  
`trained_ccxt_ohlcv/trained_ccxt_ohlcv_2025-06-05T07-00-00-000Z.json`

---

### 2. 📊 Chart Recognition Scripts

#### `chart_recognition.js`
- **Purpose:** Applies all trained models to predict market behavior on new OHLCV data.  
- **Input:** `../logs/csv/ohlcv_data.csv`  
- **Output:**  
  - Converts CSV to JSON at `../logs/json/ohlcv/ohlcv_data.json`
  - Creates predictions CSV: `./ohlcv_data_prediction.csv`  
- **Models:** Uses all models from `./trained_ohlcv/`

#### `chart_ccxt_recognition.js`
- **Purpose:** Same as above, but for CCXT OHLCV data.  
- **Input:** `../logs/csv/ohlcv_ccxt_data.csv`  
- **Output:**  
  - JSON at `../logs/json/ohlcv/ohlcv_ccxt_data.json`
  - Predictions CSV: `./ohlcv_ccxt_data_prediction.csv`  
- **Models:** Uses all models from `./trained_ccxt_ohlcv/`

**Prediction Output Example:**  
`ohlcv_data_prediction.csv`  
`ohlcv_ccxt_data_prediction.csv`

---

### 3. ⚙️ PM2 Configuration

#### `tools.config.js`
- **Purpose:** PM2 ecosystem configuration for running all scripts.
- **Usage:**  
  ```bash
  pm2 start tools.config.js
  ```
- **Manages:**  
  - `train_ccxt_ohlcv.js`
  - `train_ohlcv.js`
  - `chart_ccxt_recognition.js`
  - `chart_recognition.js`

---

## 📝 Usage Notes & Recommendations

- Input files must be regularly updated with fresh OHLCV data and correct labeling (for training).
- Each script is set up to re-run automatically every 15 minutes by default.
- Output model and prediction files are timestamped for traceability.
- You can check logs and status of each process with:
  ```bash
  pm2 status
  pm2 logs
  ```

---

## 🧩 Example Workflow

1. Place your OHLCV CSV data in `../logs/csv/`.
2. Make sure your JSON data (for training) includes the required fields and labels.
3. Start all tools with PM2.
4. Monitor and collect models and predictions from the `trained_ohlcv/`, `trained_ccxt_ohlcv/`, and prediction CSV files.

---

## 🛟 Troubleshooting

- **Missing Input:** Scripts will log errors if required input files are missing.
- **No Model Found:** Prediction scripts will skip output if no trained models are present.
- **Path Issues:** Paths are relative to the `tools/` directory. Adjust as needed if you change project structure.

---

> **💡 Tip:**  
> All training and prediction scripts can be run standalone for debugging:
> ```bash
> node train_ohlcv.js
> node chart_recognition.js
> # ... etc.
> ```

---

### 🔗 Further Reading

- [PM2 Documentation](https://pm2.keymetrics.io/)
- [CCXT Library](https://github.com/ccxt/ccxt)
- [ConvNet.js](https://github.com/karpathy/convnetjs)

---

**Happy Hacking! 🚀**

---
