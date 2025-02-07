/*copilot explain

This JavaScript file, trade_neuralnet_simulator.js, contains configuration settings for a Gekko trading bot using a neural network strategy. Here is an overview of its key components:

    Debug Mode:
        config.debug = true;

    Market Watch Settings:
        config.watch specifies the exchange (ccxt_exchanges), exchange ID (kraken), currency (BTC), and asset (LTC).

    Trader Configuration:
        config.trader is disabled and set to use an exchange simulator with BTC and LTC.

    Trading Advisor Configuration:
        config.tradingAdvisor is enabled, with a candle size of 5, history size of 10, and method set to NEURALNET.

    Neural Network Settings:
        config.NEURALNET includes various thresholds, learning rate, order limits, momentum, decay, hodl threshold, price buffer length, and minimum predictions.

    Database Adapter:
        config.adapter uses SQLite, defined in plugins/sqlite.

    SQLite Configuration:
        Includes path, data directory, version, and dependencies.

    Additional Configurations:
        config.candleWriter, config.adviceLogger, config.backtest, config.backtestResultExporter, config.paperTrader, config.performanceAnalyzer, and config.importer settings are specified.

    Legal Disclaimer:
        The file includes an MIT license and a disclaimer to use at your own risk.

*/
var config = {};
config.debug =true;
config.watch = {exchange:'ccxt_exchanges',exchangeId:'kraken',currency:'BTC',asset:'LTC'};

config.trader={enabled:false,
exchange:'exchangesimulator',currency:'BTC',asset:'LTC',key:'',secret:''};
config.tradingAdvisor = {enabled:true,candleSize:5,historySize:10,method:'NEURALNET'};

config.NEURALNET={method:'',threshold_buy :0.2,threshold_sell :-0.2,learning_rate :0.01,limit_order:0.01,stop_order:0.2,take_order:0.2,
momentum:0.1,decay:0.01,hodl_threshold:1,price_buffer_len:4181,min_predictions :28657};

config.adapter='sqlite';config.adapter.path= 'plugins/sqlite';
config.sqlite = {path: 'plugins/sqlite',dataDirectory: 'history',version:'5.1.1',
dependencies:[{module: 'sqlite3',version:'5.1.7'}] };
config.candleWriter={enabled:true,adapter:'sqlite'};
config.adviceLogger={enabled:true};
config.backtest = {enabled:true};
config.backtestResultExporter = {enabled: false};
config.paperTrader = {enabled: true,reportInCurrency: true,simulationBalance: {asset: 100,currency: 1},feeMaker: 0.1,feeTaker: 0.1,feeUsing: 'maker',slippage: 0.05};

config.performanceAnalyzer = {enabled: true,riskFreeReturn: 5};
config.importer = {enabled:false};
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
The author and contributors of this project are NOT responsible for any damage or loss caused
by this software. There can be bugs and the bot may not perform as expected or specified. 
Please consider testing it first with paper trading and/or backtesting on historical data. 
Also look at the code to see what how it is working.
*/
