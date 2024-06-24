#### BackTest
* ### find bugs and syntax errors. Also useful for fixing some runtime errors

##### backtest files are written to: /logs/json/ directory 

#### run individually strategy [backtest mode]
```
cd ~/gekko-m4-globular-cluster
```
---
* [INVERTER.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/INVERTER.js)
```
node gekko.js -c ecosystem/backtest/backtest_inverter.js -b
```
* [STOCHRSI.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/STOCHRSI.js)
```
node gekko.js -c ecosystem/backtest/backtest_stochrsi.js -b
```

* [RSIBULLBEARADX.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/RSIBULLBEARADX.js)
```
node gekko.js -c ecosystem/backtest/backtest_rsibullbearadx.js -b
```
* [NN.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/NN.js)
```
node gekko.js -c ecosystem/backtest/backtest_nn.js -b
```
* [SUPERTREND.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/SUPERTREND.js)
```
node gekko.js -c ecosystem/backtest/backtest_supertrend.js -b
```

* [NOOP.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/NOOP.js)
```js
node gekko.js -c ecosystem/backtest/backtest_noop.js -b
```

* [DEMA.js](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/strategies/DEMA.js)
```js
node gekko.js -c ecosystem/backtest/backtest_dema.js -b
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
DEMA | |  

