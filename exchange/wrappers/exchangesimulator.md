# ⚙️ ExchangeSimulator.js

**Simulate Exchange Operations for Gekko M4 Globular Cluster**

---

## 📝 Overview

**ExchangeSimulator.js** is a simulated exchange wrapper designed for the [Gekko M4 Globular Cluster](https://github.com/universalbit-dev/gekko-m4-globular-cluster) project. 

---

## ✨ Main Features

- 🔮 **Simulates price trends** using Fibonacci sequence durations.
- 💹 **Generates fake trades & OHLCV data** (Open-High-Low-Close-Volume) for robust testing.
- 🌌 **Celestial data integration:** Fetches the M4 (NGC 6121) cluster’s coordinates from the Noctua Sky API and factors them into price generation, simulating “astro-influenced” market behavior.
- 🔄 **Trend switching:** Price trends alternate between “up” and “down” using Fibonacci-based timing.
- ⚡ **Configurable volatility levels:** Supports low, moderate, and high volatility to match different market conditions.

---

## 🌠 How the M4 Cluster Influences Prices

- The simulator fetches Right Ascension (RA) and Declination (Dec) from the Noctua Sky API for M4.
- These coordinates are summed and used to compute a small, deterministic price modifier (`(ra + dec) % 5`).
- This “celestial factor” introduces external, unique market dynamics for advanced testing.

---

## 🚀 Getting Started

```js
const Trader = require('./exchange/wrappers/exchangesimulator.js');

// 1. Create a Trader instance (choose volatility: 'low', 'moderate', 'high')
const trader = new Trader({ initialPrice: 10, initialTrend: 'up', volatility: 'moderate' });

// 2. Fetch and cache M4 Sky Source data
await trader.fetchSkySourceData();

// 3. Simulate and retrieve trades
trader.getTrades(null, (err, trades) => {
  if (!err) {
    console.log(trades); // Array of simulated trade objects
  }
});

// 4. Generate OHLCV data for charting/testing
trader.generateOHLCV(startTimestamp, endTimestamp, intervalSeconds, (err, ohlcvData) => {
  if (!err) {
    console.log(ohlcvData); // Array of OHLCV candles
  }
});

// 5. Simulate M4 cluster stars (optional)
await trader.simulateStarsInCluster(10000);

// 6. Export stars to JSON (optional)
trader.exportStarsToJSON("m4_simulated_stars.json");
```

---

## 🧩 Core Components

| Component              | Description                                                              |
|------------------------|--------------------------------------------------------------------------|
| `Trader`               | Main class to simulate trading, prices, and integrate celestial factors. |
| `fetchSkySourceData`   | Fetches and caches M4 cluster coordinates from Noctua Sky API.           |
| `fetchLatestPrice`     | Adjusts price with trend, volatility, and celestial factor.              |
| `getTrades`            | Generates and returns simulated trades.                                  |
| `generateOHLCV`        | Produces OHLCV candles from simulated trades.                            |
| `simulateStarsInCluster` | Simulates unique star IDs for M4 cluster.                              |
| `exportStarsToJSON`    | Exports simulated stars to a JSON file.                                  |

---

## 🔁 Volatility Levels

- **Low:** Small, gentle price movements.
- **Moderate:** Typical market volatility.
- **High:** Large, wild swings (useful for stress testing).
- *Set via the `volatility` parameter when initializing `Trader`.*

---

## ⚠️ Error Handling

- If fetching celestial data fails, the simulator falls back to default coordinate values.
- All price calculations are safeguarded against invalid values (e.g., NaN or negative prices).

---

## 📦 Capabilities

- **Currencies:** GaiaNut
- **Assets:** GaiaBolt
- **Market:** GaiaNut / GaiaBolt
- **Not for live trading:** Purely for simulation and development.

---

## ⛅ External API

- **Noctua Sky API:**  
  Used for fetching real celestial coordinates for the M4 globular cluster.

---

## 💡 Author & License

- **Author:** universalbit-dev
- **Repository:** [gekko-m4-globular-cluster](https://github.com/universalbit-dev/gekko-m4-globular-cluster)
- **License:** MIT

---

> 🛠️ For more details, check the source:  
> [`exchange/wrappers/exchangesimulator.js`](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/exchange/wrappers/exchangesimulator.js)

---
