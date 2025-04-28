# Paper Trader Plugin Documentation

The Paper Trader plugin in Gekko provides a simulated trading environment. It allows users to test trading strategies without risking real money by emulating trades based on historical or live market data. This documentation explains the functionality, configuration, and usage of the Paper Trader plugin.

---

## Overview

The Paper Trader plugin is designed to:

- Simulate buy and sell trades based on strategy-generated advice.
- Track portfolio changes and calculate performance metrics.
- Incorporate trading fees for realistic simulations.
- Support advanced features like trailing stop-loss triggers.

---

## Key Features

- **Simulated Trades**: Executes virtual buy/sell orders based on strategy advice.
- **Portfolio Management**: Tracks asset and currency balances.
- **Fee Handling**: Applies maker/taker fees to simulated trades.
- **Event Emission**: Emits events for portfolio and trade updates.
- **Trailing Stop-Loss**: Supports advanced triggers for automated exits.
- **Warmup Handling**: Ensures initialization before processing live trades.

---

## Configuration

The plugin uses the following configuration parameters:

1. **Trading Fees**:
   - `feeUsing`: Specifies whether to apply maker or taker fees (`maker` or `taker`).
   - `feeMaker` and `feeTaker`: Percentage fees for maker and taker trades.

2. **Initial Portfolio Balance**:
   - `simulationBalance`: Specifies the starting balance for assets and currency.

3. **Trading Pair**:
   - `currency` and `asset`: Defines the trading pair (e.g., BTC/USD).

---

## Core Functions

### Initialization
The Paper Trader initializes with the following steps:
- Loads trading fees and portfolio configuration.
- Sets the initial portfolio balance.
- Determines the exposure state (whether assets are held).

### Trade Execution
- **`updatePosition`**: Handles virtual "long" (buy) and "short" (sell) trades:
  - For "long": Buys assets using available currency.
  - For "short": Sells all assets for currency.
  - Applies trading fees and updates the portfolio.

### Advice Processing
- **`processAdvice`**:
  - Responds to strategy advice (e.g., buy, sell, hold).
  - Executes trades based on the recommendation.
  - Emits events for trade initiation and completion.

### Portfolio Updates
- **`relayPortfolioChange`**: Emits portfolio change events.
- **`relayPortfolioValueChange`**: Emits updates on the total portfolio value.

### Fee Handling
- **`extractFee`**: Deducts trading fees from the transaction amount.

### Trailing Stop-Loss
- **`createTrigger`**: Creates a trailing stop-loss trigger.
- **`onStopTrigger`**: Processes the trigger when conditions are met.

### Candle Processing
- **`processCandle`**:
  - Updates the current price and portfolio value with each new candle.
  - Ensures warmup completion before processing live trades.

---

## Events

The plugin emits the following events:

1. **Portfolio Events**:
   - `portfolioChange`: Emitted when the portfolio composition changes.
   - `portfolioValueChange`: Emitted when the portfolio value changes.

2. **Trade Events**:
   - `tradeInitiated`: Emitted when a trade is initiated.
   - `tradeCompleted`: Emitted upon trade completion.

3. **Trigger Events**:
   - `triggerCreated`: Emitted when a trailing stop trigger is created.
   - `triggerFired`: Emitted when a trigger is activated.

---

## Example Use Cases

1. **Backtesting**:
   - Use data to simulate trades and evaluate strategy performance.

2. **Strategy Debugging**:
   - Test strategies in a risk-free environment before live deployment.

3. **Performance Analysis**:
   - Analyze portfolio growth, trade costs, and profitability metrics.

---

## Licensing

This plugin is licensed under the MIT License. For more information, refer to the [source code](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/plugins/paperTrader/paperTrader.js).

---
