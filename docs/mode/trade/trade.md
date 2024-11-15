<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

## -- Ecosystem Trade -- 
#### simulates your strategies using exchange simulator by running gekko-m4 in realtime mode

#### Run gekko-m4 realtime mode -- pm2 -- terminal commands
```bash
cd ~/gekko-m4-globular-cluster
pm2 start trade.config.js
#runs all available strategies
```

#### Run gekko-m4 realtime mode  -- node -- terminal commands

```bash
cd ~/gekko-m4-globular-cluster
node gekko.js -c .env/trade/trade_inverter_simulator.js
#executes a strategy
```
---

* Plugins to Enable/Disable: [trade_inverter_simulator.js](https://github.com/universalbit-dev/gekko-m4/blob/master/.env/trade/trade_inverter_simulator.js)

#### Resources:
* [PM2](https://pm2.io/docs/runtime/guide/process-management/) Ecosystem Trade: 
