# 🧬 `index.js` — Microstructure Pipeline Orchestrator

---

## Overview

This orchestrator script manages the entire microstructure analysis pipeline for financial candle data. It performs multi-timeframe aggregation, feature extraction, prediction, and signal logging, integrating challenge/model winner context for advanced decision-making. All steps are logged for dashboarding and traceability.

---

## 🧩 Features

- **Multi-Timeframe Aggregation:**  
  Aggregates prediction-labeled candles for user-configurable timeframes (default: `1m`, `5m`, `15m`, `1h`).

- **Modular Pipeline:**  
  Integrates modular components for aggregation, feature extraction, model inference, and logging.

- **Challenge/Model Winner Integration:**  
  Enriches each signal with challenge/model_winner analytics for contextual decision support.

- **Advanced Decision Logic:**  
  Selects the best trading signal across timeframes using customizable logic (e.g., highest score or majority).

- **Dashboard Logging:**  
  Logs all pipeline steps for traceability and dashboard integration.

- **Continuous Operation:**  
  Runs on a user-defined interval (`MICRO_INTERVAL_MS`), defaulting to 1 minute.

---

## ⚙️ Environment Variables

| Variable                | Default      | Description                                      |
|-------------------------|--------------|--------------------------------------------------|
| `PAIR`                  | BTC/EUR      | Trading pair to aggregate                        |
| `MICRO_OHLCV_CANDLE_SIZE` | 1m,5m,15m,1h| Timeframes to process (comma-separated)          |
| `MICRO_INTERVAL_MS`     | 60000        | Run interval in ms (default 1 minute)            |

---

## 🧑‍💻 Pipeline Steps

1. **Load Prediction-Labeled Candles:**  
   For each timeframe, loads and aggregates prediction-labeled candles using `microOHLCV`.

2. **Aggregate Candles:**  
   Aggregates candle data using the `aggregator` module.

3. **Feature Extraction:**  
   Extracts advanced features from aggregated candles, integrating challenge/model_winner context via `featureExtractor`.

4. **Inference:**  
   Runs model inference (prediction) on features using `trainer_tf`.

5. **Signal Enrichment:**  
   Attaches challenge/model_winner fields to the predicted signal for richer analytics.

6. **Decision Logic:**  
   Chooses the best signal across timeframes (by score or other logic).

7. **Logging:**  
   Logs all signals and decisions using `microSignalLogger` and to an aggregation log file.

8. **Continuous Execution:**  
   Runs the pipeline once at startup, and then at every interval.

---

## 📂 File Structure

- `tools/microstructure/index.js` — Orchestrator (this file)
- `tools/microstructure/aggregator.js` — Aggregation logic
- `tools/microstructure/featureExtractor.js` — Feature extraction
- `tools/microstructure/trainer_tf.js` — TensorFlow model inference
- `tools/microstructure/microSignalLogger.js` — Signal logging
- `tools/microstructure/microOHLCV.js` — Multi-timeframe OHLCV utilities
- `tools/microstructure/aggregated.log` — Aggregation log for dashboard

---

## 📝 Logging

- **Aggregated Candles:**  
  Appended to `aggregated.log` per timeframe for dashboard and traceability.
- **Final Signals and Decisions:**  
  Logged using `microSignalLogger` for further analysis and auditing.

---

## 🏆 Best Practices

- **Customize decision logic** in the pipeline for your strategy.
- **Monitor aggregated logs** to understand pipeline behavior and outcomes.
- **Tune timeframes and intervals** via `.env` for optimal responsiveness.

---

## 📘 Further Reading

- [Microstructure in Trading](https://www.investopedia.com/terms/m/market-microstructure.asp)
- [Candlestick Aggregation](https://www.investopedia.com/terms/c/candlestick.asp)
- [Feature Engineering](https://en.wikipedia.org/wiki/Feature_engineering)

---

## 🖼️ Icon

```
🧬
```

---

## ⚠️ Disclaimer

This orchestrator does not execute trades but is essential for pipeline management, dashboarding, and advanced signal analytics.
