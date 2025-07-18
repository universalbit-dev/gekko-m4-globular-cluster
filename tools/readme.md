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

> 📚 **Documentation Directory ([`docs/`](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/tools/docs)**
>
> All user guides and detailed explanations for project tools are organized in the `docs/` directory.  
> Each file provides easy-to-read documentation for a specific tool or feature, ensuring you have clear instructions and helpful tips.  
> Browse the [`docs/`](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/tools/docs) folder to quickly find information about setup, usage, and best practices for every part of the system!

---


### ⚙️ PM2 Configuration

#### `tools.config.js`
- **Purpose:** PM2 ecosystem configuration for running all scripts.
- **Usage:**  
  ```bash
  pm2 start tools.config.js
  ```
---

## 📝 Usage Notes & Recommendations

- Input files must be regularly updated with fresh OHLCV data and correct labeling (for training).
- Each script is set up to re-run automatically every 1 hour by default.
- Output model and prediction files are timestamped for traceability.
- You can check logs and status of each process with:
  ```bash
  pm2 status
  pm2 logs
  ```

---

## 🧩 Example Workflow

1. Place your OHLCV CSV data in `../logs/csv/`.
2. Make sure your JSON/CSV data (for training) includes the required fields and labels.
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
> node ccxt_orders.js
> # ... etc.
> ```
---

### 🔗 Further Reading

- [PM2 Documentation](https://pm2.keymetrics.io/)
- [CCXT Library](https://github.com/ccxt/ccxt)
- [ConvNet.js](https://github.com/karpathy/convnetjs)

---

**Happy Gekko 🚀**

---
