<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

## -- Ecosystem Backtest -- [review]
### Backtest your strategies:
* runtime errors

#### -- pm2 -- terminal commands
```bash
cd ~/gekko-m4-globular-cluster
pm2 start backtest.config.js
```


#### -- node -- terminal commands
```bash
cd ~/gekko-m4-globular-cluster
node gekko.js -c env/backtest/backtest_inverter.js -b
```
---

* Plugins to Enable/Disable: [backtest_inverter.js](https://github.com/universalbit-dev/gekko-m4/blob/master/env/backtest/backtest_inverter.js)

#### Resources:
* [PM2](https://pm2.io/docs/runtime/guide/process-management/)  

