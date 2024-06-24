#### BackTest
* ### find bugs and syntax errors. Also useful for fixing some runtime errors

##### backtest files are written to: /logs/json/ directory 

#### run individually strategy [backtest mode]
```
cd ~/gekko-m4-globular-cluster
```
---
* INVERTER.js
```
node gekko.js -c ecosystem/backtest/backtest_inverter.js -b
```
* STOCHRSI.js
```
node gekko.js -c ecosystem/backtest/backtest_stochrsi.js -b
```

* RSIBULLBEARADX.js
```
node gekko.js -c ecosystem/backtest/backtest_rsibullbearadx.js -b
```
* NN.js
```
node gekko.js -c ecosystem/backtest/backtest_nn.js -b
```
* SUPERTREND.js
```
node gekko.js -c ecosystem/backtest/backtest_supertrend.js -b
```

---
BackTest Strategy Name | Written logs/json | Speed 1-10 (Time Frame 1Month)
---|---|---
INVERTER | yes | [9] 
STOCHRSI | yes | [9] 
RSIBULLBEARADX | | 
SUPERTREND | | 
NN | [yes] | [7] 
NOOP | | 
