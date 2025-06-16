# 🚦 Gekko M4 Exchange Data Architecture

![Horizontal Scalability Architecture](../../images/horizontal%20scalability.png)

## 🏗️ Horizontal Scalability

Scale your simulation environment by running multiple broker instances in parallel. This lets you distribute workloads across processes or servers for robust, high-performance operations—essential for demanding trading and analytics tasks.

---

## ⚡ Event-Driven, Modular Core

The broker is built on Node.js’s `EventEmitter`, letting your application listen for <ins>key events</ins> and respond instantly. This event-driven approach makes integrations seamless, responsive, and extensible.

---

## 🔄 Unified Exchange Interface

Switch effortlessly between **Simulated** and **Live Public Market Data** environments.  
The broker abstracts away exchange details, so you can use the **ExchangeSimulator** for development/backtesting or plug in **[CCXT](https://github.com/ccxt/ccxt)** for live data with minimal code changes.

---

## 🧩 Key Components

| Component                 | Type     | Purpose                                                        | Output                |
|---------------------------|----------|----------------------------------------------------------------|-----------------------|
| 🧪 **ExchangeSimulator**   | Wrapper  | Generates **fake trades** and market data for backtesting/sim. | Logs for analysis     |
| 🌐 **ccxtMarketData**      | Plugin   | Fetches **public market data** from real exchanges (no keys)   | OHLCV logs for reuse  |

- **ExchangeSimulator (Wrapper):**  
  🛠️ Used directly for generating simulated trades and fake market data (ideal for backtests and dev).  
  📄 Writes logs for later analysis.

- **ccxtMarketData (Plugin):**  
  🛠️ Fetches real, public market data (no API keys needed), runs as a plugin for live analytics.  
  📄 Outputs logs (like OHLCV) for later use in backtesting or analytics.

---

## 🗺️ System Diagram

```plaintext
[ ⚖️ PM2 Process Manager ]
           │
   ┌───────┴────────┐
   │                │
🖥️ Process 1    🖥️ Process 2   ...   🖥️ Process N
   │                │                  │
┌──┴──────┐    ┌────┴─────┐       ┌────┴─────┐
│Plugin:  │    │Plugin:   │       │Wrapper:  │
│ccxt     │    │ccxt      │       │Exchange  │
│Market   │    │Market    │       │Simulator │
│Data     │    │Data      │       │          │
└─────────┘    └──────────┘       └──────────┘
   │                │                  │
🌍 CCXT Live   🌍 CCXT Live        🎲 Simulated
   Market        Market             Market
   Data          Data               Data
   (public)      (public)           (fake)
```

### **Legend**
- **⚖️ PM2 Process Manager:** Orchestrates multiple plugin/wrapper processes for scalability.
- **ccxtMarketData Plugin:** Fetches real OHLCV/trade data from public exchange endpoints.
- **ExchangeSimulator Wrapper:** Fakes trades and market activity for backtests/dev.
- **🖥️ Each process** can run a plugin (for real data) or a wrapper (for simulated data), generating logs as needed.

---

## 📝 Summary

- <span style="color:#4caf50">**ExchangeSimulator**</span> is the **only “wrapper”** for fake data and trade simulation.
- <span style="color:#2196f3">**ccxtMarketData plugin**</span> handles **public live data** (no API keys, logs only).
- **PM2** enables horizontal scaling: run multiple processes for different symbols, intervals, or exchanges.

---
