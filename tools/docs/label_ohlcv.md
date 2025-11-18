# 🏷️ label_ohlcv.js Documentation

Simple OHLCV Candle Labeling for Market Recognition

---

## 📦 What is this?

`label_ohlcv.js` is a small utility used to label market candles (OHLCV) with discrete market-state labels — bull, bear, or idle — which is useful to build labeled datasets for training or evaluating prediction models.

---

## 🛠️ Features

- 🟢 **Bull**: Candle closed higher than it opened  
- 🔴 **Bear**: Candle closed lower than it opened  
- ⚪ **Idle**: Change between open and close is very small (less than `EPSILON`)  
- 🍰 **Easy Integration**: Import the module and call the helper functions

---

## ⚙️ How It Works

### Labeling Logic

- If `close - open > EPSILON`: **Bull** (label `0`) 🟢  
- If `close - open < -EPSILON`: **Bear** (label `1`) 🔴  
- If `|close - open| < EPSILON`: **Idle** (label `2`) ⚪

EPSILON is a small threshold value to filter out noise; the default value exported by the module is `1` (suitable as a starting point for instruments like BTC/EUR, but you should tune it per instrument/timeframe).

---

## 📋 Usage

Note: the module file lives at tools/train/label_ohlcv.js — from this docs folder use the relative path ../train/label_ohlcv

```js
const { labelCandle, labelCandles, EPSILON } = require('../train/label_ohlcv');

// Label a single candle
const labeled = labelCandle({ open: 100, close: 101, high: 102, low: 99, volume: 1 });
// labeled.label === 0 (bull)

// Label an array of candles
const candles = [
  { open: 100, close: 101, high: 102, low: 99, volume: 1 },
  { open: 105, close: 104, high: 106, low: 103, volume: 2 }
];
const labeledCandles = labelCandles(candles);
// labeledCandles[0].label === 0 (bull)
// labeledCandles[1].label === 1 (bear)

// Override EPSILON for different sensitivity
const customLabeled = labelCandles(candles, 0.5);
```

---

## ⚙️ API

| Function       | Description                           |
|----------------|---------------------------------------|
| labelCandle    | Labels a single candle, returns the candle with a `label` field |
| labelCandles   | Labels an array of candles            |
| EPSILON        | Default threshold value for "idle" detection (default `1`) |

Label values:
- 0 = bull
- 1 = bear
- 2 = idle

---

## 💡 Tips

- Adjust `EPSILON` for your instrument or timeframe to reduce noise or increase sensitivity.
- Use these labels as targets for supervised models or for simple rule-based strategies.
- Combine with additional features (volume, ranges, indicators) for richer datasets.

---
