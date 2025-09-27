# 🧮 `evaluate.js` – Modular Indicator Evaluation Script

## Overview

`evaluate.js` is a modular evaluation utility in the `tools/evaluation/` directory of the `gekko-m4-globular-cluster` project.  
It automates the scoring of trading indicators (like RSI, ATR) on historical OHLCV datasets and supports various scoring methods.  
Runs once or continuously, configurable via environment variables.

---

## 📦 Main Features

- **Loads environment variables** from `.env` (supports interval config)
- **Reads configuration** from `evaluate.json`
- **Supports multiple indicators** (RSI, ATR, extendable)
- **Multiple scoring methods:**  
  - Absolute score  
  - Profit score  
  - Sharpe ratio  
  - Hit-rate
- **Flexible output:**  
  - Saves results as JSON (to a path or prints to console)
- **Can run in daemon mode** (periodic evaluation)

---

## ⚙️ Usage

### 1. Prepare Your Config

Create or edit `tools/evaluation/evaluate.json`:

```json
{
  "dataPath": "../logs/json/ohlcv/ohlcv_ccxt_data_15m.json",
  "outputPath": "evaluate_results.json",
  "tests": [
    {
      "indicator": "RSI",
      "params": { "period": 14 },
      "scoring": "hit-rate",
      "buyLevel": 30,
      "sellLevel": 70
    },
    {
      "indicator": "ATR",
      "params": { "period": 14 },
      "scoring": "abs"
    }
  ]
}
```
- **dataPath**: Path to OHLCV data (array of candles)
- **outputPath**: Where to save results (optional)
- **tests**: Array of indicator test configs

### 2. Set Environment Variables

In `.env` (root directory):

```
EVALUATE_INTERVAL_MS=0
```
- Set to `0` for one-time run
- Set to milliseconds for scheduled runs (e.g., `60000` for every minute)

### 3. Run the Script

```sh
node tools/evaluation/evaluate.js
```

---

## 🛠️ How It Works

### 1. Loads `.env` for interval configuration  
### 2. Loads `evaluate.json` for what to test  
### 3. Loads OHLCV data from `dataPath`  
### 4. For each test:
- Instantiates the indicator (e.g., RSI, ATR)
- Applies indicator to each candle
- Scores results using selected method:
  - **abs**: Sum of absolute indicator values
  - **profit**: Simulated profit from buy/sell signals
  - **sharpe**: Sharpe ratio of returns
  - **hit-rate**: Proportion of winning trades
- Optionally collects trade statistics (for hit-rate)
- Assembles results with indicator name, params, score, last value, timestamp

### 5. Outputs results:
- Writes JSON to `outputPath` if set
- Otherwise prints to console

### 6. If interval > 0, reruns on schedule

---

## 🧑‍💻 API/Config Reference

### `evaluate.json`

| Property      | Type            | Description                       |
|---------------|-----------------|-----------------------------------|
| dataPath      | string          | Path to OHLCV JSON file           |
| outputPath    | string          | Path for results output           |
| tests         | array           | List of indicator tests           |

**Test object:**

| Property   | Type    | Description                                  |
|------------|---------|----------------------------------------------|
| indicator  | string  | Indicator name e.g. 'RSI', 'ATR'             |
| params     | object  | Indicator params (e.g. `{period: 14}`)       |
| scoring    | string  | Scoring method: 'abs', 'profit', 'sharpe', 'hit-rate' |
| buyLevel   | number  | Buy threshold (for profit/hit-rate, optional)|
| sellLevel  | number  | Sell threshold (for profit/hit-rate, optional)|

---

## 🔗 Extending

- Add new indicators in `tools/evaluation/indicator/`
- Add new scoring methods in `scoringMethods` object

---

## 📋 Output Example

```json
[
  {
    "indicator": "RSI",
    "params": { "period": 14 },
    "scoring": "hit-rate",
    "score": 0.56,
    "lastValue": 43.2,
    "timestamp": 1727452800000,
    "totalTrades": 50,
    "wins": 28,
    "losses": 22
  },
  {
    "indicator": "ATR",
    "params": { "period": 14 },
    "scoring": "abs",
    "score": 104.5,
    "lastValue": 2.12,
    "timestamp": 1727452800000
  }
]
```

---

## 🔍 Internal Functions (Summary)

- **absScore(values)**: Sum of absolute indicator values
- **profitScore(ohlcvArr, signals, params)**: Simulates trading profit
- **sharpeScore(returns)**: Computes Sharpe ratio
- **hitRateScore(trades)**: Winning trade ratio
- **simulateTrades(ohlcvArr, signals, params)**: Runs simulated trades

---

## 🧑‍🎓 Example Indicators Supported

- **RSI** (`tools/evaluation/indicator/RSI.js`)
- **ATR** (`tools/evaluation/indicator/ATR.js`)
- *(Add more as needed)*

---

## 📝 Notes

- Requires Node.js
- Designed for modular extension
- Use with various OHLCV datasets

---

## 🖼️ Icon

![🧮](https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f9ee.svg) <!-- Calculation emoji -->

---

## 📖 Related Files

- `tools/evaluation/evaluate.json` – Configuration
- `tools/evaluation/indicator/RSI.js` – RSI Indicator
- `tools/evaluation/indicator/ATR.js` – ATR Indicator

---

## 🔗 [Source code](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/cf519ff3967bf36c9c05d0b6fddd84fa57e5ddeb/tools/evaluation/evaluate.js)
