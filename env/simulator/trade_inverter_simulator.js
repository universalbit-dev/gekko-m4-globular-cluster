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

require('dotenv').config(); // Load environment variables from a .env file

var config = {};

// Enable debug mode for detailed logs
config.debug = true;

// Define the market to watch, configured using environment variables
config.watch = {
  exchange: process.env.exchange,      // Trading exchange (e.g., Binance, Bitfinex)
  exchangeId: process.env.exchangeId, // Exchange ID
  currency: process.env.currency,     // Base currency (e.g., USD, EUR)
  asset: process.env.asset            // Asset to trade (e.g., BTC, ETH)
};

// Trader settings, currently disabled
config.trader = {
  enabled: false,                      // Disable live trading
  exchange: process.env.exchange,      // Trading exchange
  exchangeId: process.env.exchangeId,  // Exchange ID
  currency: process.env.currency,      // Base currency
  asset: process.env.asset,            // Asset to trade
  key: process.env.key,                // API key for the exchange
  secret: process.env.secret           // API secret
};

// Trading advisor configuration
config.tradingAdvisor = {
  enabled: true,       // Enable strategy advisor
  candleSize: 5,       // Candle size in minutes
  historySize: 10,     // Number of historical candles to analyze
  method: 'INVERTER'   // Strategy method to use
};

// Settings specific to the INVERTER strategy
config.INVERTER = {
  DI: 13,  // Directional Indicator parameter
  DX: 3    // Directional Movement Index parameter
};

// Database adapter configuration
config.adapter = 'sqlite'; // Use SQLite as the database adapter
config.adapter.path = 'plugins/sqlite'; // Path to the SQLite plugin

// SQLite database settings
config.sqlite = {
  path: 'plugins/sqlite',       // Path to the SQLite plugin
  dataDirectory: 'history',    // Directory for historical data
  version: '5.1.1',            // SQLite version
  dependencies: [
    { module: 'sqlite3', version: '5.1.7' } // SQLite3 module dependency
  ]
};

// Enable writing candles to the database
config.candleWriter = {
  enabled: true,  // Enable candle writing
  adapter: 'sqlite'  // Use SQLite adapter
};

// Enable logging of trading advice
config.adviceLogger = {
  enabled: true // Enable advice logging
};

// Enable backtesting mode
config.backtest = {
  enabled: true // Enable backtesting
};

// Disable exporting backtest results
config.backtestResultExporter = {
  enabled: false // Disable exporting backtest results
};

// Paper trader configuration for simulated trading
config.paperTrader = {
  enabled: true,            // Enable paper trading
  reportInCurrency: true,   // Report results in currency
  simulationBalance: {      // Initial balance for simulation
    asset: 100,             // Asset balance
    currency: 1             // Currency balance
  },
  feeMaker: 0.1,            // Maker fee percentage
  feeTaker: 0.1,            // Taker fee percentage
  feeUsing: 'maker',        // Use maker fee for calculations
  slippage: 0.05            // Slippage percentage
};

// Performance analyzer settings
config.performanceAnalyzer = {
  enabled: true,        // Enable performance analysis
  riskFreeReturn: 5     // Risk-free return rate
};

// Disable importer functionality
config.importer = {
  enabled: false // Disable importing historical data
};

// Acknowledge responsibility for trading strategies
config['I understand that Gekko only automates MY OWN trading strategies'] = true;

// Export configuration object
module.exports = config;
