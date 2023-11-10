##### [Support UniversalBit Project](https://github.com/universalbit-dev/universalbit-dev/tree/main/support)

### Gekko-[M4](http://www.wikisky.org/starview?object_type=4&object_id=3)
#### unlike easy gains
#### This software is for educational purposes only. Do not risk money which you are afraid to lose. USE THE SOFTWARE AT YOUR OWN RISK. THE AUTHORS AND ALL AFFILIATES ASSUME NO RESPONSIBILITY FOR YOUR TRADING RESULTS.
#### [Gekko may also refer to:](https://en.wikipedia.org/wiki/Gekko_(disambiguation))
---

* #### Learning [Javascript](https://github.com/universalbit-dev/gekko-m4/tree/master/docs/learning/javascript)
* #### Virtual Environment [NodeEnv](https://github.com/universalbit-dev/gekko-m4/tree/master/docs/nodenv)
* #### Gekko-M4 Engine Now using node v20.8.0 (npm v10.1.0)

Required Packages:
```
sudo apt install curl git build-essential
```
##### NVM Node Version Manager:
nvm allows you to quickly install and use different versions of node via the command line.
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
```

##### [NodeJs 21](https://nodejs.org/en/blog/release/v21.0.0)
```
nvm install 21
nvm use 21
```
[?](https://github.com/nvm-sh/nvm#install--update-script)
```
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```
clone project:
```
git clone https://github.com/universalbit-dev/gekko-m4.git
cd gekko-m4
```
#### Install:
-Engine
```
npm i && npm audit fix
```
[Thanks developers](https://github.com/askmike/gekko/graphs/contributors).

#### Install PM2 Process Manager 
```
npm i pm2 -g
```
 
* ###### [import](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/importer/import.md)
```
node gekko.js -c import.js -i
```
 
* ##### [backtest](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/backtest/backtest.md)
```
node gekko.js -c backtest.js -b
```
 
* ##### [trade](https://github.com/universalbit-dev/gekko-m4/blob/master/docs/trader/trade.md)
```
node gekko.js -c method-nn.js
```

#### Run Gekko-M4

```
pm2 start nn.js
pm2 monit 
```
* [BackTest-Tool]()
* [Pm2 Process Manager](https://pm2.keymetrics.io/docs/usage/quick-start/)
* [Generating a Startup Script](https://pm2.keymetrics.io/docs/usage/startup/)
* [OpenDNS](https://www.opendns.com/)


##### Run OpenDNS 
```
pm2 start opendns.js
```



#### Indicators:
#### [Tulip Node](https://www.npmjs.com/package/tulind)
Tulip Node is the official node.js wrapper for Tulip Indicators. It provides 100+ technical analysis indicator functions, such as: simple moving average, Bollinger Bands, MACD, Parabolic SAR, Stochastic Oscillator, and many more.
```
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
* [Learning Together](https://github.com/universalbit-dev/gekko-m4/tree/master/docs)

##### [Bash Reference Manual](https://www.gnu.org/software/bash/manual/html_node/index.html)




