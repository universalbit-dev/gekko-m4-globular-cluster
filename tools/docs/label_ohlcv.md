# 🏷️ label_ohlcv.js Documentation

Simple OHLCV Candle Labeling for Market Recognition

---

## 📦 What is this?

`label_ohlcv.js` is a utility for labeling market candles in trading algorithms. It converts OHLCV (Open, High, Low, Close, Volume) data into meaningful market state labels: **bull**, **bear**, or **idle**.

---

## 🛠️ Features

- 🟢 **Bull**: Candle closed higher than it opened
- 🔴 **Bear**: Candle closed lower than it opened
- ⚪ **Idle**: Change between open and close is very small (less than `EPSILON`)
- 🍰 **Easy Integration**: Just import and label your candles!

---

## ⚙️ How It Works

### Labeling Logic

- If `close - open > EPSILON`: **Bull** (label `0`) 🟢
- If `close - open < -EPSILON`: **Bear** (label `1`) 🔴
- If `|close - open| < EPSILON`: **Idle** (label `2`) ⚪

> EPSILON is a small threshold value to filter out noise, default is `1` (good for BTC/EUR).

---

## 📋 Usage

```js
const { labelCandle, labelCandles, EPSILON } = require('./label_ohlcv');

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
```

---

## ⚙️ API

| Function       | Description                           |
|----------------|--------------------------------------|
| labelCandle    | Labels a single candle               |
| labelCandles   | Labels an array of candles           |
| EPSILON        | Threshold value for "idle" detection |

---

## 💡 Tips

- Adjust `EPSILON` for your instrument or timeframe for optimal signal detection.
- Use with prediction models to create labeled datasets for training or evaluation.

---

## 👤 Author

**universalbit-dev**  
🔗 [Repository](https://github.com/universalbit-dev/gekko-m4-globular-cluster)

---
