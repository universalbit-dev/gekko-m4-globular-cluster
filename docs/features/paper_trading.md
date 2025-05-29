### **Overview**
The `PaperTrader` module simulates cryptocurrency trading without executing real trades. It provides a way to test trading strategies by emulating the process of buying and selling assets based on historical or live market data.

---

### **Key Features**
1. **Initialization and Configuration:**
   - Reads configuration values such as `feeUsing`, `feeMaker`, `feeTaker`, and initial simulation balances (`asset` and `currency`).
   - Determines the trading fee based on the type of trade (maker or taker).

2. **Portfolio Management:**
   - Tracks the portfolio consisting of `asset` (e.g., Bitcoin) and `currency` (e.g., USD).
   - Calculates the portfolio's value based on the current market price and updates balance after trades.

3. **Simulated Trade Execution:**
   - Supports "long" (buy) and "short" (sell) positions.
   - Adjusts the portfolio by "virtually" trading the asset or currency while deducting fees.

4. **Event Emission:**
   - Emits events such as:
     - `portfolioChange` when the portfolio is updated.
     - `portfolioValueChange` when the portfolio's value changes.
     - `tradeInitiated` and `tradeCompleted` for tracking trade actions.
     - `triggerFired` for stop triggers (e.g., trailing stops).

5. **Fee Handling:**
   - Calculates and applies trading fees to simulate real-world trading costs.

6. **Triggers (e.g., Trailing Stops):**
   - Supports triggers like `trailingStop`, which automatically executes a trade if the price moves in a specified direction.
   - Manages active triggers and emits appropriate events when triggers are created, aborted, or fired.

7. **Warmup Handling:**
   - Handles the "warmup" phase of a strategy, ensuring the portfolio is not updated until the warmup period is complete.

8. **Candle Processing:**
   - Processes incoming market data (candles) to update the current price and portfolio value.
   - Integrates with advice signals (e.g., buy or sell recommendations) provided by a strategy.

---

### **Core Methods**
1. `relayPortfolioChange()`: Emits portfolio updates.
2. `relayPortfolioValueChange()`: Emits portfolio value changes.
3. `extractFee(amount)`: Applies the trading fee to a given amount.
4. `updatePosition(what)`: Simulates a trade (buy/sell) and updates the portfolio.
5. `getBalance()`: Calculates the total portfolio value.
6. `processAdvice(advice)`: Processes strategy advice (e.g., buy or sell signals) and executes trades accordingly.
7. `createTrigger(advice)`: Creates stop triggers like trailing stops.
8. `onStopTrigger()`: Handles the activation of a stop trigger.
9. `processCandle(candle, done)`: Updates the current price and portfolio based on incoming market data.

---

### **Usage**
The `PaperTrader` module can be integrated into a Gekko instance to test trading strategies. It allows users to simulate trades, track performance, and evaluate strategies before deploying them in live trading.

---
> ⚠️ **Note on Ambiguity:**  
> Sometimes, terms like "real world" and "virtual space" can be confusing, especially when discussing simulated and real environments together. If you find yourself unsure about the meaning, check out [Word-sense disambiguation](https://en.wikipedia.org/wiki/Word-sense_disambiguation) for more context on how words can have multiple meanings depending on the context.
