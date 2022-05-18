# Gekko-M4

unlike easy gains


Gekko-M4 is a framework for develop your own cryptocurrency trading strategy.


Gekko The MIT License (MIT) Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. #gekko


Gekko-M4 The MIT License (MIT) Copyright (c) 2022 UniversalBit Blockchain This Software unlike easy gains

Donation Address : LTC LWgAMAXEbcMienXHqzmSn8Gg4A6Q6RywWt

During these months (from June 2021) I am committed to understanding how this application could work and there is still a lot of work to be done. this application is not intended as a quick profit use.


Node	Mining	Buy/Sell
Armadillium	Glomeris	Gekko-M4

Armadillium Blockchain Node

Armadillium

Glomeris Mining Rig

Glomeris

Gekko-M4 Buy/Sell
Gekko-M4

help to improve the blockchain project
Remove/Upgrade deprecated packages, fix some bug [ERROR:Exchange ECONNRESET].

Boost Data exchange performance.

User interface front-end redesign.

One file configuration.

Gekko-M4
introduction

NodeJs
NVM Node Version Manager:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

#####

nvm use 12

Gekko-M4
clone project and start learn

git clone https://universalbit.it:3000/universalbit-blockchain/Gekko-M4.git

installation

Node-Pre-Gyp
npm i @mapbox/node-pre-gyp -g

NPM
npm i --build-from-source

Thanks developers:
added 1873 packages from 1324 contributors

Gekko Exchanges
exchange directory:
cd exchange

install available exchanges
npm i --build-from-source

Thanks developers:
added 339 packages from 262 contributors

Gekko UI v0.2.3
Start Application
configuring gekko on a server

node gekko -c config.js --ui

Start Application using Pm2
npm i pm2 -g

pm2 start gekko-m4.js

Pm2
id	namespace	version	mode
gekko-m4	default	0.6.8-m4	fork
#####Pm2 Process Manager

Pm2 Module System installation:
it is also possible to manage modules with pm2.

pm2 i module_name@version

Install additional Modules
pm2 install module_name@version

modules	version
ccxt-js	1.15.38
reconnecting-websocket	4.4.0
Module System
documentation

Note:
There are no easy gains
#Custom Strategy: INVERTER

This strategy intended as "low freq trade", essentially do nothing in down trend. sells in the event of a sudden rise or an uptrend period.

#Resources:

Doc	Forum	Strategies	Extra-Indicators
Gekko	Gekko-Forum	Gekko-Strategies	Gekko-Extra Indicators
Exchange API
Gekko Support Multiple Exchange,Watchers and PaperTrader. Allowed one live trading for one exchange.

Import Data and API:
import data from exchange for backtest your strategy

Exchange	Import Data	API
BitFinex	NOT	OK
Kraken	OK	OK
Poloniex	OK	OK
EXMO	NOT	OK
Luno	N/A	OK
Therock	N/A	OK
CoinFalcon	N/A	N/A
Binance	N/A	N/A
On the crypto road
ccxt-js library: a JavaScript / Python / PHP library for cryptocurrency trading and e-commerce with support for many bitcoin/ether/altcoin exchange markets and merchant APIs. ccxt

Logs Folder
Into this folder are stored all activities of application. watcher,papertrade and tradebot log files. display the last values of your logs with this command:

tail -f logs/log_filename.log

Legal Context
cryptocurrency and blockchain each exchange requires registration, 2fa and verify identity.

Documentation	Gekko Installation & Usage	Community & Support
documentation website	installing Gekko doc	forum
#####Custom Strategy INVERTER : strategy

This strategy is intended as "low frequency trade" and reduce possible analysis lag. Dema and Sma indicators are reversed.

I have reused this codes. Strategies Extra Indicators

Community content: [Archive]
Gordon Gekko -Gordon Gekko Gekko is a Bitcoin TA trading and backtesting platform that connects exchanges.

-Gabriel Araujo gekko-extra-indicators

Documentation
See documentation.

Installation & Usage
See installing Gekko doc.

Community & Support
Gekko has forum that is the place for discussions on using Gekko.