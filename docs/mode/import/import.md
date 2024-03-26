<img src="https://github.com/universalbit-dev/gekko-m4/blob/master/images/snail.png" width="200" />

<img src="" width="auto" />

* import mode

| Plugin         | description     | enable  |
|--------------|-----------|------------|
| BackTest | Testing your strategy      | disabled        |
| CandleWriter | Store Candle in a database      | enabled        |
| PaperTrader      | Simulate Fake Trades  | disabled       |
| Importer | Import Exchange Data      | enabled        |
| TradingAdvisor | Advice Buy-Sell Orders      | disabled        |



```bash
node gekko -c import.js -i
```

##### *Terminal OutPut:
---
```bash
(INFO):	Setting up Gekko in importer mode
(INFO):
(INFO):	Setting up:
(INFO):		 Candle writer
(INFO):		 Store candles in a database
(INFO):
```

* import [mode]

import.js

```js
/*
The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
Disclaimer:
                              USE AT YOUR OWN RISK!
The author of this project is NOT responsible for any damage or loss caused
by this software. There can be bugs and the bot may not perform as expected
or specified. Please consider testing it first with paper trading and/or
backtesting on historical data. Also look at the code to see what how
it is working.
*/

var config = {};
//General Settings
config.debug =true;

//import kraken exchange data
config.watch = {exchange: 'kraken',currency:'XBT',asset:'LTC',tickrate:5};

//Trading Advisor
config.tradingAdvisor = {enabled:false,candleSize:1,historySize:40,method:'INVERTER'};

//https://cs.stanford.edu/people/karpathy/convnetjs/demo/regression.html
config.NN={
threshold_buy:0.1,threshold_sell:-0.1,method:'adadelta',learning_rate:0.01,momentum:0.0,
l1_decay:0.001,l2_decay:0.001,threshold:1,price_buffer_len:100,min_predictions:3,
hodl_threshold:1,scale:5,batch_size:1};

config.INVERTER={rsi:14,adx:14,dema:5,diplus:25.5,diminus:25,
longema:240,shortema:50,threshold:3};

config.StochRSI={interval:14,threshold:1};
config.StochRSI.thresholds={low:20,high:80,persistence:5};

config.NNSTOCH={
threshold_buy:1,threshold_sell:-1,method:'adadelta',learning_rate:0.01,momentum:0.0,
l1_decay:0.001,l2_decay:0.001,threshold:1,price_buffer_len:100,min_predictions:1,hodl_threshold:1
scale:5,batch_size:1,interval:3};
config.NNSTOCH.thresholds={low:30,high:70,persistence:3};

//Adapter
config.adapter='sqlite';

//Trader
config.trader={enabled:false,exchange:'',currency:'',asset:'',key:'',secret:''};

config.candleWriter={enabled:true,adapter:'sqlite'};

config.adviceLogger={enabled:false};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING BACKTESTING
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config.backtest = {
  enabled:false,
  daterange: {
    from: "2021-01-01",to: "2021-03-01"
  },
batchSize: 60
};

config.backtestResultExporter = {
  enabled: false,
  writeToDisk: true,
  data: {
    stratUpdates: false,
    portfolioValues: true,
    stratCandles: false,
    roundtrips: true,
    trades: true
  }
};


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING PAPERTRADER
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config.paperTrader = {enabled: false,
  reportInCurrency: true,
  simulationBalance: {asset: 100,currency: 1},
  feeMaker: 0.15,feeTaker: 0.25,feeUsing: 'maker',
  slippage: 0.05
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING PERFORMANCE ANALYZER
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config.performanceAnalyzer = {enabled: false,riskFreeReturn: 5};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING IMPORTER
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config.importer = {
  enabled:true,
  daterange:{from:"2021-01-01",to:"2021-03-01"}
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING DB
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

config.sqlite = {path: 'plugins/sqlite',dataDirectory: 'history',version:'4.1.2',
dependencies:[{module: 'sqlite3',version:'5.1.4'}] };
config['I understand that Gekko only automates MY OWN trading strategies']=true;
module.exports = config;
```
