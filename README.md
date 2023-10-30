##### [Support UniversalBit Project](https://github.com/universalbit-dev/universalbit-dev/tree/main/support)

### Gekko-[M4](http://www.wikisky.org/starview?object_type=4&object_id=3)
#### unlike easy gains
#### This software is for educational purposes only. Do not risk money which you are afraid to lose. USE THE SOFTWARE AT YOUR OWN RISK. THE AUTHORS AND ALL AFFILIATES ASSUME NO RESPONSIBILITY FOR YOUR TRADING RESULTS.
#### [Gekko may also refer to:](https://en.wikipedia.org/wiki/Gekko_(disambiguation))
#### Learning [Javascript](https://github.com/universalbit-dev/gekko-m4/tree/master/docs/learning/javascript)

---

* #### Virtual Environment [NodeEnv](https://github.com/universalbit-dev/gekko-m4/tree/master/docs/nodenv)
* #### Gekko-M4 Engine Now using node v20.8.0 (npm v10.1.0)

Required Packages:
```bash
sudo apt install curl git build-essential
```
##### NVM Node Version Manager:
nvm allows you to quickly install and use different versions of node via the command line.
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
```

##### [NodeJs 20](https://nodejs.org/en/blog/release/v20.0.0)

```bash
nvm install 20
nvm use 20
```

clone project:
```bash
git clone https://github.com/universalbit-dev/gekko-m4.git
cd gekko-m4
```
#### Install:
-Engine
```bash
npm i && npm audit fix
```
[Thanks developers](https://github.com/askmike/gekko/graphs/contributors).

* [Learning Together](https://github.com/universalbit-dev/gekko-m4/tree/master/docs)
---
 
* ###### [import](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/importer/import.md)
```bash
node gekko.js -c import.js -i
```
 
* ##### [backtest](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/backtest/backtest.md)
```bash
node gekko.js -c backtest.js -b
```
 
* ##### [trade](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/trader/trade.md)
```bash
node gekko.js -c method-nn.js
```

#### Run Gekko-M4

```bash
npm i pm2 -g
pm2 start nn.js
pm2 monit 
```
* [BackTest-Tool](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/backtest/backtest-tool.md)
* [Pm2 Process Manager](https://pm2.keymetrics.io/docs/usage/quick-start/)
* [Generating a Startup Script](https://pm2.keymetrics.io/docs/usage/startup/)
* [OpenDNS](https://www.opendns.com/)


##### Run OpenDNS 
```bash
pm2 start opendns.js
```

#### Indicators:
#### [Tulip Node](https://www.npmjs.com/package/tulind)
Tulip Node is the official node.js wrapper for Tulip Indicators. It provides 100+ technical analysis indicator functions, such as: simple moving average, Bollinger Bands, MACD, Parabolic SAR, Stochastic Oscillator, and many more.

```bash
npm install tulind --build-from-source
```

---
#### Resources:
* Gekko-Quasar-UI [0.6.9-m4](https://github.com/universalbit-dev/gekko-quasar-ui)
* [Docs](https://github.com/universalbit-dev/gekko-m4/tree/master/docs)
* [Gekko WebSite](https://gekko.wizb.it/docs/installation/installing_gekko.html)
* [Forum](https://forum.gekko.wizb.it/)
* [Strategies](https://github.com/xFFFFF/Gekko-Strategies)
* [Extra-Indicators](https://github.com/Gab0/gekko-extra-indicators)
* [Legal context](https://www.europarl.europa.eu/cmsdata/150761/TAX3%20Study%20on%20cryptocurrencies%20and%20blockchain.pdf)

##### [Bash Reference Manual](https://www.gnu.org/software/bash/manual/html_node/index.html)
