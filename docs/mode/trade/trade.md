<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

#### [PM2](https://pm2.io/docs/runtime/guide/process-management/) Ecosystem Trade: 
### [ExchangeSimulator]
```bash
cd ~/gekko-m4-globular-cluster
pm2 start trade.config.js
```
<img src="https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/mode/trade/images/exchange_simulator.png" width="auto" />


#### Gekko Realtime Mode:

```bash
cd ~/gekko-m4-globular-cluster
node gekko.js -c ecosystem/trade/trade_rsibullbearadx_simulator.js 
```

```bash
cd ~/gekko-m4-globular-cluster
node gekko.js -c ecosystem/trade/trade_nn_simulator.js 
```
---

[exchangesimulator](https://github.com/universalbit-dev/gekko-m4/blob/master/ecosystem/trade/trade_rsibullbearadx_simulator.js)
* realtime mode

<img src="https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/images/exchangesimulator/nn_exchange_simulator.png" width="auto" />
