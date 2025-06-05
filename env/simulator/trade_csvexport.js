/*
The trade_csvexport.js file configures a trading bot with environment-specific settings. Here's a summary of its key sections:

    General Settings: Enables debug mode.
    Watch: Configures the bot to watch for market changes on exchange for the LTC/BTC pair.
    Trader: Enables the trader and disables paper trading.
    Trading Advisor: Configures the trading advisor with a method CSVEXPORT.
    Database: Uses SQLite for data storage.
    Candle Writer & Advice Logger: Both are disabled.
    Backtesting: Configuration for backtesting, currently disabled.
    Backtest Result Exporter: Configures how backtest results are exported, currently disabled.
    Performance Analyzer: Enabled with a specified risk-free return rate.
    Importer: Configuration for importing data, currently disabled.

The file ends with an MIT license and a disclaimer about using the software at your own risk.
*/
require('dotenv').config()
var config = {};
//General Settings
config.debug =true;
config.watch = {exchange: process.env.exchange,exchangeId:process.env.exchangeId,currency:process.env.currency,asset:process.env.asset};

//Trader
config.trader={enabled:false};
config.paperTrader = {enabled: false};

//Trading Advisor
config.tradingAdvisor = {enabled:true,candleSize:5,historySize:10,method:'CSVEXPORT'};

config.CSVEXPORT={};

config.ccxtMarketData = {
  enabled: false,
  exchange: process.env.EXCHANGE_MARKET_DATA_ID,symbol: `BTC/USDT`,interval: '1m'
  };
  

//DataBase
config.adapter='sqlite';config.adapter.path= 'plugins/sqlite';
config.sqlite = {path: 'plugins/sqlite',dataDirectory: 'history',version:'5.1.1',
dependencies:[{module:'sqlite3',version:'5.1.7'}] };

config.candleWriter={enabled:false,adapter:'sqlite'};
config.adviceLogger={enabled:false};
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING BACKTESTING
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config.backtest = {enabled:false,daterange: {from: "2021-01-01",to: "2021-03-01"},batchSize: 50};

config.backtestResultExporter = {
  enabled: false,
  writeToDisk: true,
  data: {
    stratUpdates: false,
    portfolioValues: true,
    stratCandles: true,
    roundtrips: true,
    trades: true
  }
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING PERFORMANCE ANALYZER
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config.performanceAnalyzer = {enabled: true,riskFreeReturn: 5};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING IMPORTER
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config.importer = {enabled:false,daterange:{from:"2021-01-01",to:"2021-03-01"}}
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config['I understand that Gekko only automates MY OWN trading strategies']=true;
module.exports = config;

/*

The MIT License (MIT)
Copyright (c) 2014-2017 Mike van Rossum mike@mvr.me
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, 
including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Disclaimer:
                              USE AT YOUR OWN RISK!
The author of this project and contributors are NOT responsible for any damage or loss caused
by this software. There can be bugs and the bot may not perform as expected
or specified. Please consider testing it first with paper trading and/or
backtesting on historical data. 
Also look at the code to see what how it is working.

*/
