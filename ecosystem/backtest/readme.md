#### BackTest
* ### find bugs and syntax errors. Also useful for fixing some runtime errors

##### backtest files are written to: /logs/json/ directory 
```
cd ~/gekko-m4
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
* NNSTOCH.js
```
node gekko.js -c ecosystem/backtest/backtest_nnstoch.js -b
```
* NNTMA.js
```
node gekko.js -c ecosystem/backtest/backtest_nntma.js -b
```
* NNDEMA.js
```
node gekko.js -c ecosystem/backtest/backtest_nndema.js -b
```
* NNCCI.js
```
node gekko.js -c ecosystem/backtest/backtest_nncci.js -b
```
* RSIBULLBEARADX.js
```
node gekko.js -c ecosystem/backtest/backtest_rsibullbearadx.js -b
```
* NN.js
```
node gekko.js -c ecosystem/backtest/backtest_nn.js -b
```

---
BackTest Strategy Name | Written logs/json | Speed 1-10 (Time Frame 1Month)
---|---|---
INVERTER | yes | [9] 
STOCHRSI | yes | [9] 
NNSTOCH | yes | [7] 
NNTMA | [no] | [6]
NNDEMA | [] | [8]
NN | [yes] | [7] 
NNCCI | [no] | [8]
NOOP | | 
