<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

## -- Ecosystem Import --
-- copilot explain --
### Import Exchange Data:
The `importer.js` [file](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/core/markets/importer.js) in the `universalbit-dev/gekko-m4-globular-cluster` repository handles importing trade data from cryptocurrency exchanges using the ccxt library. Here is an overview of its functionality:

- **Imports and Initial Setup:** Imports various libraries and utilities, including lodash, moment, util, ccxt, and custom modules like TradeBatcher, CandleManager, and exchangeChecker.
- **Date Range Validation:** Validates the date range specified in the configuration and exits with an error if invalid.
- **Fetcher Class:** Initializes an exchange instance using the ccxt library and fetches trades within a specified limit and date range.
- **Market Class:** Extends Readable and integrates Fetcher, TradeBatcher, and CandleManager.
- **Market Constructor:** Binds functions to the context, initializes trade batcher, candle manager, and fetcher, sets up event listeners, and starts fetching trades.
- **Event Handling:** Handles reading, pushing candles, fetching trades, managing errors, and processing trades.
- **Processes and manages trade data, converting it into candles for further analysis or usage.**

#### -- pm2 -- terminal commands
```bash
cd ~/gekko-m4-globular-cluster
pm2 start import.config.js
```

#### -- node -- terminal commands
```bash
cd ~/gekko-m4-globular-cluster
node gekko -c env/import/import.js -i
```
#### out console

```bash
|- import exchange data -|  | - Processing Exchange Data: 2024-10-14 13:51:39
|- import exchange data -|  | - Processing Exchange Data: 2024-10-15 21:20:03
|- import exchange data -|  | ✔ Processed
|- import exchange data -|  | ✔ Processed
|- import exchange data -|  | - Processing Exchange Data: 2024-10-17 04:11:28
|- import exchange data -|  | - Processing Exchange Data: 2024-10-17 16:03:09
|- import exchange data -|  | ✔ Processed
|- import exchange data -|  | - Processing Exchange Data: 2024-10-18 22:05:18
|- import exchange data -|  | ✔ Processed
|- import exchange data -|  | ✔ Processed
|- import exchange data -|  | - Processing Exchange Data: 2024-10-21 00:05:23
|- import exchange data -|  | - Processing Exchange Data: 2024-10-22 13:54:57
|- import exchange data -|  | ✔ Processed
|- import exchange data -|  | - Processing Exchange Data: 2024-10-24 12:10:52
|- import exchange data -|  | ✔ Processed
|- import exchange data -|  | ✔ Processed
|- import exchange data -|  | - Processing Exchange Data: 2024-10-25 22:12:57
|- import exchange data -|  | ✔ Processed
|- import exchange data -|  | - Processing Exchange Data: 2024-10-27 22:56:22
|- import exchange data -|  | ✔ Processed
|- import exchange data -|  | - Processing Exchange Data: 2024-10-29 16:47:45
|- import exchange data -|  | - Processing Exchange Data: 2024-10-30 19:42:44
|- import exchange data -|  | ✔ Processed
|- import exchange data -|  | ✔ Processed
|- import exchange data -|  | - Processing Exchange Data: 2024-11-01 22:31:58
|- import exchange data -|  | 2024-11-30 02:03:15 (INFO):	Done importing!
|- import exchange data -|  | ✔ Processed
```

---

* Plugins to Enable/Disable:[import.js](https://github.com/universalbit-dev/gekko-m4/blob/master/.env/import/import.js)

#### Resources:
* [PM2](https://pm2.io/docs/runtime/guide/process-management/) Ecosystem Import Exchange Data:



