<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

## -- Ecosystem Realtime -- 
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

#### Example on console

```bash
|INVERTER|-simulator-| > 2024-11-30 02:12:54 (DEBUG):    scheduling ticks                                                    
|INVERTER|-simulator-| > [EXCHANGE SIMULATOR] emitted 1 fake trades, up until 2024-11-30 02:12:54.                           
|INVERTER|-simulator-| > - Processing Exchange Data: 2024-11-30 01:12:55                                                   
|INVERTER|-simulator-| > ✔ Processed                                                                                         
|INVERTER|-simulator-| > [EXCHANGE SIMULATOR] emitted 20 fake trades, up until 2024-11-30 02:13:34.                          │
|INVERTER|-simulator-| > - Processing Exchange Data: 2024-11-30 01:13:16     
```

* Plugins to Enable/Disable: [trade_inverter_simulator.js](https://github.com/universalbit-dev/gekko-m4/blob/master/.env/trade/trade_inverter_simulator.js)

#### Resources:
* [PM2](https://pm2.io/docs/runtime/guide/process-management/) Ecosystem Trade: 
