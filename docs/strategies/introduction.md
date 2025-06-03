## Strategies 

* [community-strategies](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/strategies/community-strategies)

If you are familiar with JavaScript, you can easily create your own strategies. Here is a video explaining everything you need to know:
* **[How to create Gekko Strategies](https://www.youtube.com/watch?v=6-74ZhrG0BE)**

Gekko-M4 currently comes with the following strategy examples:

- [DEMA](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/DEMA.js)
- [INVERTER](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/INVERTER.js)
- [NEURALNET](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/NEURALNET.js)
- [NN](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/NN.js)
- [NOOP](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/NOOP.js)
- [RSIBULLBEARADX](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/RSIBULLBEARADX.js)
- [SCALPER](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/SCALPER.js)
- [STOCHRSI](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/STOCHRSI.js)
- [SUPERTREND](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/SUPERTREND.js)
- [BOLLINGERBAND](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/BOLLINGERBAND.js)

## 🚀 How to Create Your Own Strategy

Gekko-M4 lets you design custom trading strategies in JavaScript. Strategies are in the `strategies/` folder, each as a `.js` file.

### 🧩 Structure of a Strategy

A basic strategy exports a method object:
- 🛠️ **init** – Set up indicators and settings
- 🔄 **update** – Process each new candle
- 💡 **check** – Trading logic (when to buy/sell)
- 📝 **log** *(optional)* – Custom logs for debugging
- 🏁 **end** *(optional)* – Clean up at the end

```js
var method = {};
method.init = function() { /* setup */ }
method.update = function(candle) { /* update indicators */ }
method.check = function(candle) { /* make trading decision */ }
module.exports = method;
```

### 📊 Adding Indicators

Use `this.addIndicator` in `init`:
```js
this.addIndicator('sma', 'SMA', { optInTimePeriod: 20 });
this.addIndicator('rsi', 'RSI', { optInTimePeriod: 14 });
```

### 🤔 Using Indicators

Access indicator results in `check`:
```js
const rsi = this.indicators.rsi.result;
if (rsi > 70) this.advice('short'); // 📉 Overbought
else if (rsi < 30) this.advice('long'); // 📈 Oversold
```

### 🛡️ Advanced: Stop Loss & AI

- **StopLoss:**  
  `const StopLoss = require('./indicators/StopLoss');`  
  `this.stopLoss = new StopLoss(5); // 5% threshold`

- **AI/Neural Net:**  
  See [NN.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/NN.js) for machine learning examples.

- **Elliott Waves:**  
  See [DEMA.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/DEMA.js) for advanced pattern logic.

### 📝 Example: The Simplest Strategy

```js
var method = {};
method.init = function() {
  this.addIndicator('sma', 'SMA', { optInTimePeriod: 20 });
};
method.check = function(candle) {
  let sma = this.indicators.sma.result;
  if (candle.close > sma) this.advice('long'); // 📈 Buy
  else this.advice('short'); // 📉 Sell
};
module.exports = method;
```

### 🔍 Explore More

- 👀 See examples:  
  [DEMA.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/DEMA.js) | 
  [INVERTER.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/INVERTER.js) | 
  [NN.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/NN.js)
- 🧠 Check available indicators:  
  [strategies/indicators.md](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/indicators.md)

---

> **ℹ️ Note: Understanding Technical Indicators**
>
> This project includes a wide range of technical indicators that you can use in your trading strategies. Each indicator helps you analyze the market in a different way — from identifying trends, measuring momentum, to spotting overbought or oversold signals.
>
> To learn more about each indicator (such as MACD, RSI, Bollinger Bands, Stochastic, and more), see the detailed documentation here:  
> [📄 strategies/indicators.md](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/indicators.md)
>
> The documentation gives short, user-friendly explanations for each indicator’s purpose and logic, so you can quickly understand which ones to use in your strategy!

---
