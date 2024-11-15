<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

## -- Ecosystem Backtest -- 
### Backtest your strategies:
#### any runtime strategies errors are detected by running gekko-m4 in backtest mode

#### Run gekko-m4 backtest mode -- pm2 -- terminal commands
```bash
cd ~/gekko-m4-globular-cluster
pm2 start backtest.config.js
```

#### Run gekko-m4 backtest mode  -- node -- terminal commands
```bash
cd ~/gekko-m4-globular-cluster
node gekko.js -c .env/backtest/backtest_inverter.js -b
```
---

* Plugins to Enable/Disable: [backtest_inverter.js](https://github.com/universalbit-dev/gekko-m4/blob/master/.env/backtest/backtest_inverter.js)


#### Backtest mode
| Plugin         | description     | enabled -- disabled  |
|--------------|-----------|------------|
| BackTest | Testing your strategy      | enabled        |
| CandleWriter | Store Candle in a database      | disabled        |
| PaperTrader      | Simulate Fake Trades  | enabled       |
| Importer | Import Exchange Data      | disabled        |
| TradingAdvisor | Advice Buy-Sell Orders      | enabled        |

#### Resources:
* [PM2](https://pm2.io/docs/runtime/guide/process-management/)  

