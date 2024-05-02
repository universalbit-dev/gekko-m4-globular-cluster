##### [Support UniversalBit Project](https://github.com/universalbit-dev/universalbit-dev/tree/main/support)
##### [Disambiguation](https://en.wikipedia.org/wiki/Wikipedia:Disambiguation)
##### [Bash Reference Manual](https://www.gnu.org/software/bash/manual/html_node/index.html)

<img src="https://github.com/universalbit-dev/universalbit-dev/blob/main/docs/assets/images/geppo.png" width="5%"></img>
##### sustainable personal finance
## Gekko-m4
* [import](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/mode/import/import.md)
* [backtest](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/mode/backtest/backtest.md) 
* [trade](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/mode/trade/trade.md) 

##### unlike easy gains and record price

##### This software is for educational purposes only. Do not risk money which you are afraid to lose. USE THE SOFTWARE AT YOUR OWN RISK. THE AUTHORS AND ALL AFFILIATES ASSUME NO RESPONSIBILITY FOR YOUR TRADING RESULTS.
---

```bash
git clone https://github.com/universalbit-dev/gekko-m4.git
```
<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/gif/gekko-m4-nodejs-installation.gif" width="auto"></img>

* [Install](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/installation/installing_gekko.md)

```
Meta debug info:
Gekko version: v0.6.8-m4
Nodejs version: v20.11.0
```
[Thanks developers](https://github.com/askmike/gekko/graphs/contributors).

---

#### Install [PM2](https://pm2.keymetrics.io/) Process Manager and run gekko-m4 (backtest mode)
```bash
npm i pm2 --save
```

<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/gif/pm2-advanced-process-manager.gif" width="auto"></img>

```bash
pm2 start m4.js
pm2 status 
```

---

### [Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/gif/pm2_ecosystem.gif" width="auto"></img>
#### import exchange data
```bash
pm2 start import_ecosystem.config.js 
```
##### backtest strategies
```bash
pm2 start ecosystem.config.js 
```

##### NOTE:
Backtest Export Result Directory: /gekko-m4/logs/json/ [under review]

---

* ##### [Docs](https://github.com/universalbit-dev/gekko-m4/tree/master/docs)
* ##### [Pm2 Process Manager](https://pm2.keymetrics.io/docs/usage/quick-start/)
* ##### [Generating a Startup Script](https://pm2.keymetrics.io/docs/usage/startup/)
* ##### Learning [Javascript](https://github.com/universalbit-dev/gekko-m4/tree/master/docs/learning/javascript)
* ##### Learning [Nodejs](https://nodejs.org/docs/latest-v20.x/api/synopsis.html)
* ##### [NPM Security best practices](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html)
* ##### Virtual Environment [NodeEnv](https://github.com/universalbit-dev/gekko-m4/tree/master/docs/nodenv) 
* ##### [BackTest-Tool](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/backtest/backtest-tool.md)

#### Indicators:
#### [Tulip Node](https://www.npmjs.com/package/tulind)
Tulip Node is the official node.js wrapper for Tulip Indicators. It provides 100+ technical analysis indicator functions, such as: simple moving average, Bollinger Bands, MACD, Parabolic SAR, Stochastic Oscillator, and many more.
```
npm install tulind --build-from-source
```

---
#### Resources:
* Gekko-Quasar-UI [0.6.9-m4](https://github.com/universalbit-dev/gekko-quasar-ui)
* [Gekko WebSite](https://gekko.wizb.it/docs/installation/installing_gekko.html)
* [Forum](https://forum.gekko.wizb.it/)
* [Strategies](https://github.com/xFFFFF/Gekko-Strategies)
* [Extra-Indicators](https://github.com/Gab0/gekko-extra-indicators)
* [Legal context](https://www.europarl.europa.eu/cmsdata/150761/TAX3%20Study%20on%20cryptocurrencies%20and%20blockchain.pdf)
* [Learning Together](https://github.com/universalbit-dev/gekko-m4/tree/master/docs)
* Gekko-[M4](http://www.wikisky.org/starview?object_type=4&object_id=3)
* [Perché gestiamo MALE il denaro?](https://www.youtube.com/watch?v=Y63fReR8vYA) con lo psichiatra @ValerioRosso
---
#### [Gekko may also refer to:](https://en.wikipedia.org/wiki/Gekko_(disambiguation))

* [BTC Node](https://github.com/universalbit-dev/universalbit-dev/tree/main/blockchain/bitcoin)
* [Mining](https://github.com/universalbit-dev/CityGenerator/blob/master/workers/README.md)
* [Buy-Sell](https://github.com/universalbit-dev/gekko-m4/edit/master/README.md)






