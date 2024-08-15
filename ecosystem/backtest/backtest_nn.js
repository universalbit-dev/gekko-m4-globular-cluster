var config = {};
//General Settings
config.debug =true;

config.watch = {exchange: 'kraken',currency:'XBT',asset:'LTC',tickrate:60}; //frequency information [3 - 10 - 20 - 60]
config.api={interval:317811}; //5.29685 minutes
config.expects={candle:987}; //987 seconds

//TradingAdvisor
config.tradingAdvisor = {enabled:true,candleSize:5,historySize:10,method:'NN'};//50minute

//optInTimePeriod : Fibonacci Sequence 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377 , 610 , 987
config.NN={threshold_buy:0.8,threshold_sell:-0.8,method:'adadelta',learning_rate:0.01,momentum:0.0,
l1_decay:0.001,l2_decay:0.001,price_buffer_len:987,min_predictions:144,hodl_threshold:1,scale:1,batch_size:1,RSI:13,DEMA:1,SMMA:5,STOPLOSS:3,rl:0.3,high:70,low:30,rl:0.3};


//Date.prototype.toISOString()
//Previous Month
var previous_month = new Date();
previous_month.setDate(1);
previous_month.setMonth(previous_month.getMonth()-1);
previous_month.setDate(4);

//Current Month
var current_month = new Date();
current_month.setDate(1);
current_month.setMonth(current_month.getMonth());
current_month.setDate(4);

//Backtest Exchange Data  FROM previous month TO current month
config.backtest = {enabled:true,
  daterange:{from:previous_month,to:current_month},
  batchSize: 1000
};

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
