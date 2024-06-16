<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

#### [PM2](https://pm2.io/docs/runtime/guide/process-management/) Ecosystem Trade: 
Simulate all strategy 
### [ExchangeSimulator]
```bash
cd ~/gekko-m4-globular-cluster
pm2 start trade.config.js
```

#### Gekko Realtime Mode:

```bash
cd ~/gekko-m4-globular-cluster
node gekko.js -c ecosystem/trade/rsibullbearadx.js -b
```
---

Plugins to Enable/Disable: [backtest_inverter.js](https://github.com/universalbit-dev/gekko-m4/blob/master/ecosystem/backtest/backtest_inverter.js)


* realtime mode []()

| Plugin         | description     | enable  |
|--------------|-----------|------------|
| BackTest | Testing your strategy      | disabled        |
| CandleWriter | Store Candle in a database      | enabled        |
| PaperTrader      | Simulate Fake Trades  | disabled       |
| Importer | Import Exchange Data      | disabled        |
| TradingAdvisor | Advice Buy-Sell Orders      | enabled        |
