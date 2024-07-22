##### [Support UniversalBit Project](https://github.com/universalbit-dev/universalbit-dev/tree/main/support)   ##### [Disambiguation](https://en.wikipedia.org/wiki/Wikipedia:Disambiguation)   ##### [Bash Reference Manual](https://www.gnu.org/software/bash/manual/html_node/index.html)

<img src="https://github.com/universalbit-dev/universalbit-dev/blob/main/docs/assets/images/geppo.png" width="3%"></img>   
##### sustainable personal finance

<img src="https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/images/gekko-m4-globular-cluster.png" width="auto"></img>   

## Gekko-m4-globular-cluster
Let's naturalize the problem with the fibonacci sequence 

Fibonacci Sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 , 610 , 987

* [import](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/mode/import/import.md)
* [backtest](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/mode/backtest/backtest.md) 
* [trade](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/mode/trade/trade.md) 

#### unlike easy gains and record price

##### This software is for educational purposes only. Do not risk money which you are afraid to lose. USE THE SOFTWARE AT YOUR OWN RISK. THE AUTHORS AND ALL AFFILIATES ASSUME NO RESPONSIBILITY FOR YOUR TRADING RESULTS.
---
##### [Nodejs20](https://nodejs.org/en/blog/release/v20.15.0)
* [node.js get started](https://github.com/nvm-sh/nvm)
```
Now using node v20.15.0(npm v10.7.0)
```

---
```bash
git clone https://github.com/universalbit-dev/gekko-m4-globular-cluster.git
cd gekko-m4-globular-cluster
npm i
```
#### Install [PM2](https://pm2.keymetrics.io/) Process Manager and run gekko-m4 (ecosystem)
```bash
npm i pm2 -g 
```
---

<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/gif/gekko-m4-nodejs-installation.gif" width="auto"></img>

* #### [troubleshooter](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/error/troubleshooter.md)

---

---
### [Ecosystem Files](https://pm2.keymetrics.io/docs/usage/application-declaration/)

#### import exchange data [import mode]
```bash
pm2 start import.config.js 
```
#### ecosystem files  [backtest mode]
```bash
pm2 start ecosystem.config.js 
```

##### Note:
Backtest Export Result Directory: /gekko-m4/logs/json/ [under review]

[run individually](https://github.com/universalbit-dev/gekko-m4/blob/master/ecosystem/backtest/readme.md)
<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/gif/pm2_ecosystem.gif" width="auto"></img>

#### exchange simulator [realtime mode]
```bash
pm2 start trade.config.js 
```
* [run individually](https://github.com/universalbit-dev/gekko-m4-globular-cluster/edit/master/docs/mode/trade/trade.md)
<img src="https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/images/exchangesimulator/nn_exchange_simulator.png" width="auto"></img>



### [Indicators](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/strategies/tulip_indicators.md):
##### Tulip Node provides 100+ technical analysis indicator functions, such as: simple moving average, Bollinger Bands, MACD, Parabolic SAR, Stochastic Oscillator, and many more.
* [tulip_indicators](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/strategies/tulip_indicators.md)
```
npm install tulind --build-from-source
```

##### Gekko [Indicators](https://github.com/universalbit-dev/gekko-m4-globular-cluster/tree/master/strategies/indicators) is intended as an internal engine using indicators
* [gekko_indicators](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/strategies/gekko_indicators.md)
---

---
#### HTTPS server OR nothing.
* #### [...before run xor_ui.config.js](https://github.com/universalbit-dev/gekko-m4/tree/master/ssl)
```bash
pm2 start xor_ui.config.js 
```


* ##### [Thanks developers](https://github.com/askmike/gekko/graphs/contributors).
* ##### [Resources](https://github.com/universalbit-dev/gekko-m4-globular-cluster/blob/master/docs/resources/readme.md)





