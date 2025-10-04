require('dotenv').config()
var config = {};
config.debug =true;

config.watch = {
  enabled: true,
  exchange: process.env.EXCHANGESIMULATOR || 'exchangesimulator',
  exchangeId: process.env.EXCHANGEID || '',          
  currency: process.env.CURRENCY || 'GaiaNut',           
  asset: process.env.ASSET || 'GaiaBolt'                   
};

config.trader={enabled:false,
exchange:process.env.exchange,currency:process.env.currency,asset:process.env.asset,key:process.env.key,secret:process.env.secret};

config.tradingAdvisor = {enabled:true,warmupPeriods:200 ,candleSize:13,historySize:21,method:'RSIBULLBEARADX'};

config.ccxtMarketData = {enabled: true,exchange: process.env.EXCHANGE_MARKET_DATA_ID,symbol: process.env.SYMBOL,candleSize:process.env.OHLCV_CANDLE_SIZE,fetchInterval: process.env.INTERVAL_FETCH_DATA};

config.RSIBULLBEARADX = {
  SMA_long: Number(process.env.RSIBULLBEARADX_SMA_LONG) || 200,
  SMA_short: Number(process.env.RSIBULLBEARADX_SMA_SHORT) || 50,
  BULL_RSI: Number(process.env.RSIBULLBEARADX_BULL_RSI) || 10,
  BULL_RSI_high: Number(process.env.RSIBULLBEARADX_BULL_RSI_HIGH) || 80,
  BULL_RSI_low: Number(process.env.RSIBULLBEARADX_BULL_RSI_LOW) || 60,
  BEAR_RSI: Number(process.env.RSIBULLBEARADX_BEAR_RSI) || 15,
  BEAR_RSI_high: Number(process.env.RSIBULLBEARADX_BEAR_RSI_HIGH) || 50,
  BEAR_RSI_low: Number(process.env.RSIBULLBEARADX_BEAR_RSI_LOW) || 20,
  BULL_mod_high: Number(process.env.RSIBULLBEARADX_BULL_MOD_HIGH) || 5,
  BULL_mod_low: Number(process.env.RSIBULLBEARADX_BULL_MOD_LOW) || -5,
  BEAR_mod_high: Number(process.env.RSIBULLBEARADX_BEAR_MOD_HIGH) || 15,
  BEAR_mod_low: Number(process.env.RSIBULLBEARADX_BEAR_MOD_LOW) || -5,
  RSI: Number(process.env.RSIBULLBEARADX_RSI) || 13,
  ADX: Number(process.env.RSIBULLBEARADX_ADX) || 8,
  ADX_high: Number(process.env.RSIBULLBEARADX_ADX_HIGH) || 70,
  ADX_low: Number(process.env.RSIBULLBEARADX_ADX_LOW) || 50
};

config.stopLoss = {enabled: true,threshold: 5,trailing: true,resetAfterTrigger: false,candleSize: 5};

config.adapter='sqlite';config.adapter.path= 'plugins/sqlite';

config.sqlite = {path: 'plugins/sqlite',dataDirectory: 'history',version:'5.1.1',
dependencies:[{module: 'sqlite3',version:'5.1.7'}] };

config.candleWriter={enabled:true,adapter:'sqlite'};

config.adviceLogger={enabled:true};

config.backtest = {enabled:false};

config.backtestResultExporter = {enabled: false};

config.paperTrader = {enabled: true,reportInCurrency: true,simulationBalance: {asset: 1,currency: 100},feeMaker: 0.1,feeTaker: 0.1,feeUsing: 'maker',slippage: 0.05};

config.performanceAnalyzer = {enabled: true,riskFreeReturn: 5};

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
The author of this project and contributors are NOT responsible for any damage or loss caused
by this software. There can be bugs and the bot may not perform as expected
or specified. Please consider testing it first with paper trading and/or
backtesting on historical data. Also look at the code to see what how
it is working.
*/
