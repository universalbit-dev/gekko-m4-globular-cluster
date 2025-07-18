# CCXT Market Data Plugin

## Philosophy of Decentralization

> **Note:**  
> This plugin is built to reduce reliance on centralized data sources by leveraging decentralized, flexible configuration methods.

---

## 🚀 Dynamic Configuration Only

The **CCXT Market Data** plugin is configured entirely through dynamic settings, allowing you to adjust parameters at runtime using environment variables. This approach enhances flexibility, portability, and security for different environments and deployments.

### Example: Dynamic Configuration via Environment Variables

Set up your plugin in your strategy configuration file as follows:

```js
config.ccxtMarketData = {
  enabled: true,
  exchange: process.env.EXCHANGE_MARKET_DATA_ID,
  symbol: process.env.SYMBOL,
  interval: process.env.INTERVAL
};
```

**Environment variables you need to define:**
- `EXCHANGE_MARKET_DATA_ID` — The exchange identifier (e.g., `kraken`, `binance`)
- `SYMBOL` — The trading pair symbol (e.g., `BTC/EUR`)
- `INTERVAL` — The candle interval (e.g., `5m`, `1h`, etc.)

You can set these variables in your shell before starting the application:
```sh
export EXCHANGE_MARKET_DATA_ID=kraken
export SYMBOL=BTC/EUR
export INTERVAL=5m
node ccxtMarketData.js
```

---

## 🧩 Plugin Registration

Register the plugin in `plugins.js` as follows:

```js
{
  name: 'CCXT Market Data',
  description: 'Fetches live market data from a public exchange endpoint',
  slug: 'ccxtMarketData',
  modes: ['realtime', 'backtest'],
  path: config => 'ccxtMarketData/ccxtMarketData.js',
}
```

---

## Features

- Fetches market data in real-time via public CCXT endpoints
- All key settings are controlled via environment variables for maximum flexibility and automation

---

## Use Cases

- Automatically adapt your trading strategies to different exchanges, symbols, and intervals without modifying code
- Seamless integration across development, testing, and production environments

---

**Tip:**  
Always use environment variables to manage sensitive or frequently changed configuration options for best security practices and maximum portability.

---
