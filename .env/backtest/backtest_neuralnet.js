var config = {};
//General Settings
config.debug =true;
config.watch = {exchange: 'ccxt_exchanges',exchangeId:'',currency:'BTC',asset:'LTC'};

config.tradingAdvisor = {enabled:true,candleSize:5,historySize:50,method:'NEURALNETV2'};
config.NEURALNETV2={threshold_buy :0.3,threshold_sell :-0.3,learning_rate :0.01,
momentum:0.1,decay:0.01,hodl_threshold:1,price_buffer_len:4181,min_predictions :987};

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

*/
