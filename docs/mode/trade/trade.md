<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

## -- Ecosystem Realtime -- 
#### Simulates your strategies using an exchange simulator by running gekko-m4 in realtime mode.

### Run gekko-m4 Realtime Mode Using PM2 (Terminal Commands)
```bash
cd ~/gekko-m4-globular-cluster
pm2 start trade.config.js
# Runs all available strategies
```

### Run gekko-m4 Realtime Mode Using Node (Terminal Commands)
```bash
cd ~/gekko-m4-globular-cluster
node gekko.js -c env/trade/trade_inverter_simulator.js
# Executes a strategy
```

---

### Example on Console
```bash
|INVERTER|-simulator-| > 2024-11-30 02:12:54 (DEBUG):    scheduling ticks                                                    
|INVERTER|-simulator-| > [EXCHANGE SIMULATOR] emitted 1 fake trades, up until 2024-11-30 02:12:54.                           
|INVERTER|-simulator-| > - Processing Exchange Data: 2024-11-30 01:12:55                                                   
|INVERTER|-simulator-| > ✔ Processed                                                                                         
|INVERTER|-simulator-| > [EXCHANGE SIMULATOR] emitted 20 fake trades, up until 2024-11-30 02:13:34.                         
|INVERTER|-simulator-| > - Processing Exchange Data: 2024-11-30 01:13:16     
```

---

### Trader Features
The `trader.js` module provides critical functionalities that enhance real-time trading in Gekko M4. Key features are as follows:

#### Portfolio and Balance Management
- **Methods**:
  - `setPortfolio`: Updates the trader's portfolio with the current balances of currency and asset.
  - `setBalance`: Calculates the total balance and exposure based on the portfolio and current price.

#### Processing Candles and Advice
- **Methods**:
  - `processCandle`: Updates the current price based on candle data and adjusts the portfolio and balance accordingly.
  - `processAdvice`: Handles buy and sell advice, creating or canceling orders as needed.

#### Order Management
- **Methods**:
  - `createOrder`: Creates a new order based on advice and validates it.
  - `cancelOrder`: Cancels an existing order and synchronizes the data.

---

### Event Listeners
- **`portfolioChange`**: Triggered when the portfolio changes.
- **`tradeCompleted`**: Signals the successful completion of a trade.
- **`triggerFired`**: Signals the firing of a stop trigger.

---

### Plugins to Enable/Disable
- [trade_inverter_simulator.js](https://github.com/universalbit-dev/gekko-m4/blob/master/env/trade/trade_inverter_simulator.js)

---

### Resources
- [PM2](https://pm2.io/docs/runtime/guide/process-management/) Ecosystem Trade.

---
