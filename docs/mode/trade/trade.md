<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

* trade mode

| Plugin         | description     | enable  |
|--------------|-----------|------------|
| BackTest | Testing your strategy      | disabled        |
| CandleWriter | Store Candle in a database      | enabled        |
| PaperTrader      | Simulate Fake Trades  | disabled       |
| Importer | Import Exchange Data      | disabled        |
| TradingAdvisor | Advice Buy-Sell Orders      | enabled        |

```
node gekko -c trade.js
```

```
(INFO):	Setting up Gekko in realtime mode
(INFO):	Setting up:
(INFO):		 Trading Advisor
(INFO):		 Calculate trading advice
(INFO):		 Using the strategy: NNSTOCH
```
[trade.js]()
