require('dotenv').config();

var config = {};

config.debug = true;

config.watch = {
  enabled: true,
  exchange: process.env.EXCHANGESIMULATOR || 'exchangesimulator',
  exchangeId: process.env.EXCHANGEID || '',          
  currency: process.env.CURRENCY || 'GaiaNut',           
  asset: process.env.ASSET || 'GaiaBolt'                   
};

config.ccxtMarketData = {
  enabled: process.env.CCXT_MARKET_DATA_ENABLED === 'true',
  exchange: process.env.CCXT_MARKET_DATA_EXCHANGE,
  pair: process.env.CCXT_MARKET_DATA_PAIR,
  candleSize: process.env.CCXT_MARKET_DATA_CANDLE_SIZE,
  fetchInterval: Number(process.env.CCXT_MARKET_DATA_FETCH_INTERVAL),
  outputCsv: process.env.CCXT_MARKET_DATA_OUTPUT_CSV,
  outputJson: process.env.CCXT_MARKET_DATA_OUTPUT_JSON
};

config.trader={enabled:false,
exchange:process.env.exchange,exchangeId:process.env.exchangeId,currency:process.env.currency,asset:process.env.asset,key:process.env.key,secret:process.env.secret};

config.tradingAdvisor = {enabled:true,candleSize:5,historySize:13,method:'INVERTER'};

config.INVERTER = {
  DI: Number(process.env.INVERTER_DI) || 13,
  DX: Number(process.env.INVERTER_DX) || 3
};

config.stopLoss = {enabled: true,
threshold: 5,trailing: true,resetAfterTrigger: false,candleSize: 5};

config.adapter = 'sqlite';

config.adapter.path = 'plugins/sqlite';

config.sqlite = {path: 'plugins/sqlite',dataDirectory: 'history',version:'5.1.1',
dependencies:[{module: 'sqlite3',version:'5.1.7'}] };

config.candleWriter={enabled:true,adapter:'sqlite'};

config.adviceLogger = {enabled: true};

config.backtest = {enabled: false};

config.backtestResultExporter = {enabled: false};

config.paperTrader = {enabled: true,reportInCurrency: true,simulationBalance: {asset: 100,currency: 1},feeMaker: 0.1,feeTaker: 0.1,feeUsing: 'maker',slippage: 0.05};

config.performanceAnalyzer = {enabled: true,riskFreeReturn: 5};

config['I understand that Gekko only automates MY OWN trading strategies'] = true;

module.exports = config;
