# CCXT Market Data Plugin Documentation

## Decentralization Philosophy

> **Note:** This plugin is developed with the goal of decentralizing everything where possible. Our aim is to reduce reliance on centralized data and service providers, and to promote resilience, transparency, and user sovereignty. Future updates may include support for decentralized data feeds and exchanges.

---

> 🚀 **How to Run This Plugin:**  
> To start this plugin manually, open your terminal and run:  
>
> ```
> node ccxtMarketData.js
> ```
>
> This command will launch the plugin and begin fetching market data using CCXT.

---

⚙️ **Configuration Quick Start**

Add to your strategy config:

```js
config.ccxtMarketData = {
  enabled: true,
  exchange: 'kraken',
  symbol: 'BTC/USDT',
  interval: '1m'
};
```

---

**ℹ️ Note:**  
You can see example of this integration in the project at  
`env/simulator/trade_rsibullbearadx_simulator.js`, where the plugin is enabled and configured for use with **environment variables**:

```js
config.ccxtMarketData = {
  enabled: true,
  exchange: process.env.EXCHANGE_MARKET_DATA_ID,
  symbol: `BTC/USDT`,
  interval: '1m'
};
```
This allows dynamic assignment of the exchange via environment variables, making your setup more flexible.

>
> 🧩 **Plugin Integration:**  
> Register the plugin in `plugins.js`:
>
> ```js
> {
>   name: 'CCXT Market Data',
>   description: 'Fetches live market data from a public exchange endpoint',
>   slug: 'ccxtMarketData',
>   modes: ['realtime', 'backtest'],
>   path: config => 'ccxtMarketData/ccxtMarketData.js',
> }
> ```

## Overview

Fetches real-time market data using **public ccxt endpoints**

## Key Features

- OHLCV data
- Configurable exchange and pair

## Example Use Cases

- Strategy development
- Market monitoring dashboards

---
