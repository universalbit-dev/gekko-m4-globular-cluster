<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

## -- Ecosystem Backtest -- 
-- copilot explain --

The `backtest.js` [file](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/core/markets/backtest.js) is responsible for running backtests on historical market data. Here's a detailed explanation of its components and functionality:

1. **Imports and Initialization**:
    - **Modules**:
        - `underscore`: A utility library.
        - `util`: Provides utility functions and configurations.
        - `moment`: A library for date and time manipulation.
        - `fs-extra`: A file system library.
        - `node-noop`: A no-operation function.
    - **Configuration**:
        - Retrieves configurations and directory paths.
        - Initializes logging and date range for backtesting.
        - Checks if the date range is valid and if the Paper Trader is enabled.

2. **Market Class**:
    - **Constructor**:
        - Binds all functions to the class instance.
        - Initializes properties like `pushing`, `ended`, and `closed`.
        - Logs warnings about backtesting and initializes the `Reader`.
        - Sets up the iterator for fetching data in batches.
    - **Prototype Methods**:
        - **read**: Initiates the data retrieval process.
        - **get**: Fetches a batch of historical data.
        - **processCandles**: Processes the retrieved candles, pushes them to the backtesting engine, and updates the iterator for the next batch.

3. **Error Handling and Logging**:
    - Checks for valid date ranges and configuration settings.

#### -- pm2 -- terminal commands
```bash
cd ~/gekko-m4-globular-cluster
pm2 start backtest.config.js
```


#### -- node -- terminal commands
```bash
cd ~/gekko-m4-globular-cluster
node gekko.js -c env/backtest/backtest_inverter.js -b
```
---

* Plugins to Enable/Disable: [backtest_inverter.js](https://github.com/universalbit-dev/gekko-m4/blob/master/env/backtest/backtest_inverter.js)

#### Resources:
* [PM2](https://pm2.io/docs/runtime/guide/process-management/)  

