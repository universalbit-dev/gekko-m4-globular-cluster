# ⚙️ Configuration Reference: `trade_inverter_simulator.js`

This documentation breaks down the environmental configurations for running the **INVERTER** strategy inside the simulated market engine environment. It maps environment variables to the core configuration components, ensuring compliance with the Gekko M4 architectural limits.

> 🔗 **Source File:** View the configuration file directly at [`env/simulator/trade_inverter_simulator.js`](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/env/simulator/trade_inverter_simulator.js).

---

## 🛑 Operational Configuration Breakdown

### 1. Market Monitor Setup (`config.watch`)
Defines the targeted exchange platform asset pair for the execution engine loop. By default, it targets virtual environmental tokens tailored for isolated simulator environments.

```js
config.watch = {
  enabled: true,
  exchange: process.env.EXCHANGESIMULATOR || 'exchangesimulator', // Mock exchange adapter
  exchangeId: process.env.EXCHANGEID || '',          
  currency: process.env.CURRENCY || 'GaiaNut',                   // Stake Currency
  asset: process.env.ASSET || 'GaiaBolt'                         // Traded Asset
};

```

### 2. Trading Advisor Engine (`config.tradingAdvisor`)

Connects the runtime tracking core directly to your custom strategy file (`strategies/INVERTER.js`).

```js
config.tradingAdvisor = {
  enabled: true,
  candleSize: 5,         // Aggregation window length in minutes
  historySize: 13,       // Required warmup candles BEFORE check() evaluation triggers
  method: 'INVERTER'     // Must exactly match strategies/INVERTER.js filename
};

```

### 3. Inverter Strategy Parameter Injection (`config.INVERTER`)

Injects customizable metrics into the strategy module instance space. These options are explicitly exposed and consumed inside `INVERTER.js` via the `this.settings` property array.

```js
config.INVERTER = {
  DI: Number(process.env.INVERTER_DI) || 13, // Directional Indicator lookback period
  DX: Number(process.env.INVERTER_DX) || 3   // Directional Movement Index timeframe
};

```

### 4. Risk Mitigation & Stop Losses (`config.stopLoss`)

Handles automated order protection routines when trade deviations cross safety thresholds.

```js
config.stopLoss = {
  enabled: true,
  threshold: 5,          // Absolute percentage loss bound triggering market exit (5%)
  trailing: true,         // Dynamically slides the stop-trigger window upward with profits
  resetAfterTrigger: false,
  candleSize: 5
};

```

### 5. Paper Trading Execution Sandbox (`config.paperTrader`)

Configures the local balance simulation layer used to test the active strategy's historical profitability without risking capital.

```js
config.paperTrader = {
  enabled: true,
  reportInCurrency: true,
  simulationBalance: {
    asset: 100,          // Initial starting balance allocation for traded tokens (GaiaBolt)
    currency: 1          // Initial starting balance allocation for base currency (GaiaNut)
  },
  feeMaker: 0.1,         // Limit order exchange fee percentage
  feeTaker: 0.1,         // Market order taker fee percentage
  feeUsing: 'maker',
  slippage: 0.05         // Simulated market order execution slippage padding
};

```

### 6. Database Storage Persistence (`config.sqlite` / `config.candleWriter`)

Directs the structural storage engine to continuously save calculated candle metrics into a local database layer for testing and visual reference plots.

```js
config.adapter = 'sqlite';

config.sqlite = {
  path: 'plugins/sqlite',
  dataDirectory: 'history',
  version: '5.1.1',
  dependencies: [{ module: 'sqlite3', version: '5.1.7' }]
};

config.candleWriter = { enabled: true, adapter: 'sqlite' };

```

---

## ⚡ Complete `.env` Environment Mapping Guide

To override standard defaults within your local deployment stack, provision an operational `.env` file in your root workspace path with the following key layout:

```env
# Exchange & Asset Pair Mapping Configurations
EXCHANGESIMULATOR=exchangesimulator
EXCHANGEID=simulator_instance_01
CURRENCY=GaiaNut
ASSET=GaiaBolt

# Strategy Parameter Modifiers
INVERTER_DI=14
INVERTER_DX=14

# Secondary CCXT Live Feed Syncing (If Enabled)
CCXT_MARKET_DATA_ENABLED=false
CCXT_MARKET_DATA_EXCHANGE=kraken
CCXT_MARKET_DATA_PAIR=LTC/BTC
CCXT_MARKET_DATA_CANDLE_SIZE=5
CCXT_MARKET_DATA_FETCH_INTERVAL=60000

```

```

***

### ⚠️ Critical Architecture Note for Users

Inside this config file, you will notice a section for live trade routing:
```javascript
config.trader = { enabled: false, ... };

```

Because this specific configuration file targets **`exchangesimulator`**, `config.trader.enabled` **must remain set to `false**`, and `config.paperTrader.enabled` **must remain `true**`. Real-world balance execution handlers (like `reverse.js`) consume independent trade routing managers instead of using the local simulator instance configuration.
