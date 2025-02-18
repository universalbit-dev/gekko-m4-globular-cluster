<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

## -- Ecosystem Backtest -- 
### Backtest your strategies:
#### any runtime strategies errors are detected by running gekko-m4 in backtest mode

#### Run gekko-m4 backtest mode -- pm2 -- terminal commands
```bash
cd ~/gekko-m4-globular-cluster
pm2 start backtest.config.js
#runs all available strategies

```


#### Run gekko-m4 backtest mode  -- node -- terminal commands
```bash
cd ~/gekko-m4-globular-cluster
node gekko.js -c .env/backtest/backtest_inverter.js -b
#executes a strategy
```
---

* Plugins to Enable/Disable: [backtest_inverter.js](https://github.com/universalbit-dev/gekko-m4/blob/master/env/backtest/backtest_inverter.js)

#### Resources:
* [PM2](https://pm2.io/docs/runtime/guide/process-management/)  

