# CCXT Market Data Plugin Documentation
## Decentralization Philosophy

> **Note:** This plugin is developed with the goal of decentralizing everything where possible. Our aim is to reduce reliance on centralized data and service providers, and to promote resilience, transparency, and user sovereignty. Future updates may include support for decentralized data feeds and exchanges.

> ⚙️ **Configuration Quick Start**
>
> Add to your strategy config:
>
> ```js
> config.ccxtMarketData = {
>   enabled: true,
>   exchange: 'kraken',
>   symbol: 'BTC/USDT',
>   interval: '1m'
> };
> ```
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
