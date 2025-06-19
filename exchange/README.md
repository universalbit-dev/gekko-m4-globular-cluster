# 🚀 Gekko Broker

- 📚 [Documentation](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/docs/)
- 🌐 [Exchange Structure (ccxt)](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/gekko-broker/wrapper_api.md)

---

## 🤖 What is `gekkoBroker.js`?

The `gekkoBroker.js` file is the core component for communication with crypto exchanges. It keeps your trading portfolio and orders up-to-date, making the whole process smooth and reliable.

---

### 🧩 Main Components

1. **📦 Imports & Initialization**
   - **Modules Used:** `lodash`, `async`, `events`, `moment`, and more.
   - **Helpers:** Checks exchange capabilities and handles errors.
   - **Portfolio & Orders:** Manages your assets and trading actions.
   - **Utilities:** Binds functions and validates orders.

2. **🏗️ Broker Class**
   - **🔧 Constructor:**
     - Loads configuration and checks if trading/monitoring is possible.
     - Sets up API and market details.
     - Initializes your portfolio (when in private mode).
     - Ensures all class methods are correctly bound.
   - **⚙️ Key Methods:**
     - `cantTrade` & `cantMonitor`: Check if the exchange allows trading or monitoring.
     - `sync` & `syncPrivateData`: Synchronize information with the exchange.
     - `setTicker`: Fetches up-to-the-minute price data.
     - `isValidOrder`: Makes sure orders are correct before sending them.
     - `createOrder`: Places and manages buy/sell orders.
     - `createTrigger`: Sets up alerts for special conditions.

3. **🛡️ Error Handling & Logging**
   - Built-in checks and logs help prevent mistakes and make troubleshooting easy.

---

> 💡 **Tip:** For more details, see the [official docs](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/docs/gekko-broker) or the [ccxt Exchange Structure Guide](https://docs.ccxt.com/#/?id=exchange-structure).

---
