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

---

* STOCHRSI.js
```
node gekko.js -c ecosystem/backtest/backtest_stochrsi.js -b
```

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
BackTest Strategy Name | Written logs/json | Speed 1-10 (Time Frame 1Month)
---|---|---
INVERTER | yes | [9] 
STOCHRSI | yes | [9] 
NNSTOCH | yes | [7] 
NNTMA | [] | []
NNDEMA | [] | []
NN | [under review] | [7] 
NNCCI | [no] | []
NOOP | [] | []
