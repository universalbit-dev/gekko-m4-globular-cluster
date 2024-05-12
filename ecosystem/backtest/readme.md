#### BackTest
* ### find bugs or syntax errors. Also useful for fixing some runtime errors

##### files are written to the: /logs/json/ directory

```
cd ~/gekko-m4
```

---

* INVERTER.js
```
node gekko.js -c ecosystem/backtest/backtest_inverter.js -b
```
log file successfully written [yes]

---

* STOCHRSI.js
```
node gekko.js -c ecosystem/backtest/backtest_stochrsi.js -b
```
log file successfully written [yes]

---

* NNSTOCH.js
```
node gekko.js -c ecosystem/backtest/backtest_nnstoch.js -b
```

---

* NNTMA.js
```
node gekko.js -c ecosystem/backtest/backtest_nntma.js -b
```

---

* NNDEMA.js
```
node gekko.js -c ecosystem/backtest/backtest_nndema.js -b
```

---

* NNCCI.js
```
node gekko.js -c ecosystem/backtest/backtest_nncci.js -b
```

---

* NN.js
```
node gekko.js -c ecosystem/backtest/backtest_nn.js -b
```

---
BackTest Strategy Name | written logs/json | speed 1-10 
---|---|---
INVERTER | yes | [9] 
STOCHRSI | yes | [9] 
NNSTOCH | no | [9] 
NNTMA | [] | []
NNDEMA | [] | []
NN | [under review] | [7] 
NNCCI | [] | []
NOOP | [] | []
