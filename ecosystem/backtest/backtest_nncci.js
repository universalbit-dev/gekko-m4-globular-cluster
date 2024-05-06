var config = {};
//General Settings
config.debug =true;

config.watch = {exchange: 'kraken',currency:'XBT',asset:'LTC',tickrate:20};

//Strategies
config.tradingAdvisor = {enabled:true,candleSize:15,historySize:10,method:'NNCCI'};
//requiredHistory = candleSize 15 * historySize 10 = 150 minutes

//optInTimePeriod : Fibonacci Sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 , 610 , 987
config.NNCCI={
threshold_buy:1,threshold_sell:-1,method:'adadelta',learning_rate:0.01,momentum:0.0,
l1_decay:0.001,l2_decay:0.001,threshold:1,price_buffer_len:987,min_predictions:144,
hodl_threshold:1,scale:1,batch_size:1,constant:0.015,history:89,cci:21,dema:1};
//history:89, make same or smaller than requiredHistory (history:89 requiredHistory:150)
config.NNCCI.thresholds={up:150,down:-30,persistence:3};

//Date.prototype.toISOString()
//Previous Month:
/* */
var previous_month = new Date();
previous_month.setDate(1);
previous_month.setMonth(previous_month.getMonth()-1);
previous_month.setDate(2);
var previous = previous_month.toString().slice(0, -14);
//Current Month:
var current_month = new Date();
current_month.setDate(1);
current_month.setMonth(current_month.getMonth());
current_month.setDate(2);
var current = current_month.toString().slice(0, -14);

/* today is a nice day */
const today = new Date();
var sunday = new Date(today.setDate(today.getDate() - today.getDay()),);
var nice_sunday = sunday.toString().slice(0, -14);
var saturday = new Date(today.setDate(today.getDate() - today.getDay() + 6),);
var nice_saturday = saturday.toString().slice(0, -14);
//Backtest Exchange Data  FROM sunday and last day saturday of the current week (backtest period ~ week)
config.backtest = {enabled:true,daterange:{from:nice_sunday,to:nice_saturday},batchSize: 60};

//Backtest Exchange Data  FROM previous month to current month (backtest period ~ month)
//config.backtest = {enabled:true,daterange:{from:previous,to:current},batchSize: 60};

//DataBase
config.adapter='sqlite';config.adapter.path= 'plugins/sqlite';
config.sqlite = {path: 'plugins/sqlite',dataDirectory: 'history',version:'5.1.1',
dependencies:[{module: 'sqlite3',version:'5.1.7'}] };

//Trader
config.trader={enabled:false,exchange:'',currency:'',asset:'',key:'',secret:''};

//Candle Writer
config.candleWriter={enabled:false};

//Advice Logger
config.adviceLogger={enabled:false};

//Export BackTest Result
config.backtestResultExporter = {enabled: true,writeToDisk: true,
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


