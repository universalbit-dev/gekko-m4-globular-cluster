# 🚀 Creating a Strategy for Gekko M4

Strategies are the core of Gekko's trading bot. They analyze the market and make trading decisions based on technical analysis indicators. Each strategy operates on a single market and exchange.

> **New to strategies?**  
> Check out this [Intro Video: How to Create Gekko Strategies](https://www.youtube.com/watch?v=6-74ZhrG0BE)

---

## 📦 What is a Strategy?

A strategy is a JavaScript module that receives live market data (candles: OHLC, volume, weighted price) and decides whether to buy, sell, or hold.

- Gekko comes with [built-in strategies](./introduction.md).
- You can also write your own strategies in JavaScript!

---

## 📝 Strategy Boilerplate

Here’s a simple template for a custom strategy:

```js
// Let's create our own strategy!
var strat = {};

// Initialize your strategy (setup indicators, state, etc.)
strat.init = function() {
  // your code here
}

// Called on every new candle
strat.update = function(candle) {
  // your code here
}

// For debugging/logging
strat.log = function() {
  // your code here
}

// Check if you should trigger a trade
strat.check = function(candle) {
  // your code here
}

// Optional: called after a backtest completes
strat.end = function() {
  // your code here
}

module.exports = strat;
```

---

## 🔄 Strategy Lifecycle

Here’s how Gekko calls each function:

1. **On start:** `init`
2. **For each new candle:**
   - `update`
   - (After warmup) `log` (if enabled)
   - (After warmup) `check`

---

## 🛠️ Function Details

### `init`
- Called once when your strategy starts.
- Initialize your indicators and state here.

### `update(candle)`
- Called for every new candle.
- Use this to update calculations or state.

### `log`
- Called for each candle when debugging is enabled.
- Use for printing logs (not shown in UI mode).

### `check(candle)`
- Called for each candle (after warmup).
- Make trading decisions here!
- To give advice:
  ```js
  this.advice({
    direction: 'long', // or 'short'
    trigger: {
      type: 'trailingStop',
      trailPercentage: 5
      // or trailValue: 100
    }
  });
  ```
  *The `trigger` is optional. Use it to set trailing stops, etc.*

### `end`
- Called only after a backtest completes (not in live mode).

---

## 🕒 Candle Variables

You’ll get a `candle` object in `update` and `check`. Available properties:

- `candle.close` — Closing price
- `candle.high` — Highest price
- `candle.low` — Lowest price
- `candle.volume` — Volume in this candle
- `candle.trades` — Number of trades

---

## ⚡ Tips & Best Practices

- Set your strategy in config:  
  `config.tradingAdvisor.strategy = 'custom'`
- Each candle’s time interval is set by `config.tradingAdvisor.candleSize`
- Match `config.tradingAdvisor.historySize` to your `requiredHistory` property for proper warmup
- Use `candle.start` (a moment.js object) for timestamps—don’t rely on system time

---

## 🧰 Strategy Tools

### Indicators

Gekko supports:
- Native indicators
- [TA-lib](http://ta-lib.org/) indicators
- Tulip indicators

**How to add an indicator:**

```js
// In init()
this.addIndicator('myRSI', 'RSI', { interval: 14 });
this.addTalibIndicator('myMACD', 'macd', { optInFastPeriod: 10, optInSlowPeriod: 21, optInSignalPeriod: 9 });
this.addTulipIndicator('mySMA', 'sma', { period: 10 });
```

**Access indicator results:**
```js
var rsi = this.indicators.myRSI.result;
```

- See [TA-lib indicators](./talib_indicators.md)
- See [Tulip indicators](./tulip_indicators.md)

---

### Custom Strategy Parameters

You can set custom parameters in your config:

```js
// config.js
config.custom = {
  my_custom_setting: 10,
};
```

Access in your strategy:
```js
log.debug(this.settings.my_custom_setting); // Logs 10
```
> The config section name must match your strategy’s filename!

---

### Using External Libraries

You can use libraries like [underscore](https://www.npmjs.com/package/underscore),[lodash](http://lodash.com/) and [async](https://caolan.github.io/async/):

```js
var _ = require('underscore');
var async = require('async');
```

---

### Logging

For debug logs, use Gekko's logger:

```js
var log = require('../core/log.js');
log.debug('hello world');
```
> ℹ️ **Note:** For standardized logging in your strategies, you can also use the built-in Winston library provided in this repository. See the implementation in [strategies/logger.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/logger.js) for details. Winston offers advanced logging features, consistent log levels, and flexible output options, making it a robust alternative to Gekko's basic logger.

---

## 🤝 Need Help?

- Check out the built-in strategies for inspiration.
- Questions? [Create an issue](https://github.com/universalbit-dev/gekko-m4-globular-cluster/issues).

---
