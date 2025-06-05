/**
 * ccxtMarketData.js
 *
 * This module provides a class for fetching OHLCV (Open, High, Low, Close, Volume) market data
 * from a cryptocurrency exchange using the ccxt library, and appending it to a rotating CSV log file.
 *
 * Features:
 * - Loads exchange and symbol configuration from environment variables and settings at the top.
 * - Fetches market data at a configurable interval (default: 1 minute).
 * - Writes new data rows to a CSV file, avoiding duplicate entries.
 * - Rotates log files to keep only recent data (max 30 files).
 * - Handles graceful shutdown on SIGINT (Ctrl+C).
 *
 * Dependencies:
 * - ccxt: Cryptocurrency exchange trading library
 * - fs-extra: File system utilities
 * - rotating-file-stream: For handling CSV file rotation
 * - dotenv: Loads environment variables from .env file
 *
 * Usage:
 *   - Configure EXCHANGE_MARKET_DATA_ID in your environment.
 *   - Adjust SYMBOL, OHLCV_INTERVAL, and INTERVAL_MS as needed.
 *   - Run the script to start logging market data to CSV.
 *
 * Exports:
 *   - CCXTMarketData class for use in other modules.
 */
require('dotenv').config();
const ccxt = require('ccxt');
const fs = require('fs-extra');
const rfs = require('rotating-file-stream');
const path = require('path');

class CCXTMarketData {
  constructor({symbol, interval}) {
    this.exchangeId = process.env.EXCHANGE_MARKET_DATA_ID;
    if (!this.exchangeId) throw new Error('Missing EXCHANGE_MARKET_DATA_ID env variable');
    this.exchange = new ccxt[this.exchangeId]();
    this.symbol = symbol;
    this.interval = interval;

    this.logDir = path.join(__dirname, '../../logs/csv');
    fs.ensureDirSync(this.logDir);

    this.HEADER = 'timestamp,open,high,low,close,volume\n';
    this.csvStream = rfs.createStream('ohlcv_ccxt_data.csv', {
      interval: '1d',
      path: this.logDir,
      maxFiles: 30
    });
    this.headerWritten = false;

    this.latestTimestamp = 0; // To avoid duplicates
  }

  async fetchAndAppendOHLCV() {
    try {
      await this.exchange.loadMarkets();
      const ohlcv = await this.exchange.fetchOHLCV(this.symbol, this.interval);

      if (!this.headerWritten) {
        this.csvStream.write(this.HEADER);
        this.headerWritten = true;
      }

      // Only append new rows
      const newRows = ohlcv.filter(([timestamp]) => timestamp > this.latestTimestamp);

      if (newRows.length > 0) {
        newRows.forEach(([timestamp, open, high, low, close, volume]) => {
          const line = `${timestamp},${open},${high},${low},${close},${volume}\n`;
          this.csvStream.write(line);
        });
        this.latestTimestamp = newRows[newRows.length - 1][0];
        console.log(`Appended ${newRows.length} new rows at ${new Date().toISOString()}`);
      } else {
        console.log(`No new data at ${new Date().toISOString()}`);
      }
    } catch (err) {
      console.error('Error fetching/appending OHLCV:', err);
    }
  }

  close() {
    this.csvStream.end();
  }
}

// ---- MAIN LOOP ----

const INTERVAL_MS = 60 * 1000; // 1 minute in ms (adjust for 5m if needed)
const SYMBOL = 'BTC/USDT';    // or your chosen symbol
const OHLCV_INTERVAL = '1m';  // or '5m', '15m', etc.

const marketData = new CCXTMarketData({
  symbol: SYMBOL,
  interval: OHLCV_INTERVAL
});

const loop = async () => {
  await marketData.fetchAndAppendOHLCV();
};

loop(); // run immediately at start
const timer = setInterval(loop, INTERVAL_MS);

process.on('SIGINT', () => {
  clearInterval(timer);
  marketData.close();
  console.log('\nCSV stream closed. Exiting.');
  process.exit(0);
});

module.exports = CCXTMarketData;
