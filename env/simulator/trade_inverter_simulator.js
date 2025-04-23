/**
 * Trade Inverter Simulator is a key component for simulating inverted trades
 * in the Gekko M4 trading ecosystem. This module is designed to test and
 * validate trading strategies by flipping buy and sell signals, providing
 * insights into the opposite market behavior under simulated conditions.
 *
 * Key Features:
 * - Simulates inverted trades by swapping buy and sell signals.
 * - Provides a controlled environment for testing strategy robustness.
 * - Logs simulation results for analysis and debugging.
 * - Integrates seamlessly with Gekko's trading strategy modules.
 * - Supports customization for various trading scenarios and parameters.
 *
 * Usage:
 * - Configure the simulator settings in the Gekko configuration file under `simulator`.
 * - Ensure the input trade data is correctly formatted and compatible.
 * - Use the simulator to evaluate the inverse performance of trading strategies.
 * - Extensible for advanced simulation and analytics features.
 *
 * License:
 * The MIT License (MIT)
 * Copyright (c) 2014-2017 Mike van Rossum
 */

require('dotenv').config()
var config = {};
config.debug =true;
config.watch = {exchange: process.env.exchange,exchangeId:process.env.exchangeId,currency:process.env.currency,asset:process.env.asset};

config.trader={enabled:false,
exchange:process.env.exchange,exchangeId:process.env.exchangeId,currency:process.env.currency,asset:process.env.asset,key:process.env.key,secret:process.env.secret};


config.tradingAdvisor = {enabled:true,candleSize:5,historySize:10,method:'INVERTER'};
config.INVERTER={DI:13,DX:3};

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
