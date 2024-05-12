#### BackTest
* find bugs or syntax errors. Also useful for fixing some runtime errors

#### run backtest individually
* note: 
written backtest .json file to:  logs/json/ directory
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
