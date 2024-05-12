<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

#### PM2 Ecosystem Backtest:
```bash
cd ~/gekko-m4
pm2 start ecosystem.config.js
```

#### NodeJs :
```bash
cd ~/gekko-m4
node gekko.js -c ecosystem/backtest/backtest_inverter.js -b
```

* backtest mode

| Plugin         | description     | enable  |
|--------------|-----------|------------|
| BackTest | Testing your strategy      | enabled        |
| CandleWriter | Store Candle in a database      | disabled        |
| PaperTrader      | Simulate Fake Trades  | enabled       |
| Importer | Import Exchange Data      | disabled        |
| TradingAdvisor | Advice Buy-Sell Orders      | enabled        |

[backtest_inverter.js](https://github.com/universalbit-dev/gekko-m4/blob/master/ecosystem/backtest/backtest_inverter.js)

