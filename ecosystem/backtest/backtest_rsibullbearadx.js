var config = {};
//General Settings
config.debug =true;

config.watch = {exchange: 'kraken',currency:'XBT',asset:'LTC',tickrate:30};

//Strategies
config.tradingAdvisor = {enabled:true,candleSize:15,historySize:100,method:'RSIBULLBEARADX'};
//# BULL/BEAR is defined by the longer SMA trends {Make sure your warmup period(tradingAdvisor.historySize) matches SMA_long}
config.RSIBULLBEARADX={SMA_long:100,SMA_short:55,RSI:14,BULL_RSI:10,
BULL_RSI_high:80,BULL_RSI_low:60,BEAR_RSI:15,BEAR_RSI_high:50,BEAR_RSI_low:20,
BULL_MOD_high:5,BULL_MOD_low:-5,BEAR_MOD_high:15,BEAR_MOD_low:-5,ADX:3,ADX_high:70,ADX_low:50};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       BACKTESTING
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config.backtest = {
  enabled:true,
  daterange:{from:"2022-01-02",to:"2022-03-01"},
  batchSize: 60
};

config.backtestResultExporter = {
  enabled: true,
  writeToDisk: true,
  data: {
    stratUpdates: false,
    portfolioValues: true,
    stratCandles: false,
    roundtrips: true,
    trades: true
  }
};

//DataBase
config.adapter='sqlite';config.adapter.path= 'plugins/sqlite';
config.sqlite = {path: 'plugins/sqlite',dataDirectory: 'history',version:'5.1.1',
dependencies:[{module: 'sqlite3',version:'5.1.7'}] };

//Trader
config.trader={enabled:false};

//Candle Writer
config.candleWriter={enabled:false};

//Advice Logger
config.adviceLogger={enabled:false};

//Export BackTest Result
config.backtestResultExporter = {
  enabled: true,writeToDisk: true,
  data: {stratUpdates: false,portfolioValues: true,stratCandles: false,roundtrips: true,trades: true}
};

//PaperTrader
config.paperTrader = {enabled: true,reportInCurrency: true,
  simulationBalance: {asset: 100,currency: 1},
  feeMaker: 0.15,feeTaker: 0.25,feeUsing: 'maker',slippage: 0.05
};

//Performance Analyzer
config.performanceAnalyzer = {enabled: true,riskFreeReturn: 5};

//Import
config.importer = {enabled:false}

config.candleWriter={enabled:true,adapter:'sqlite'};
config['I understand that Gekko only automates MY OWN trading strategies']=true;
module.exports = config;
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
