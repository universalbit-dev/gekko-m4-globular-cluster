require('dotenv').config();
const ccxt = require('ccxt');
const fs = require('fs-extra');
const rfs = require('rotating-file-stream');
const path = require('path');

class CCXTMarketData {
  constructor({ symbol, interval }) {
    this.exchangeId = process.env.EXCHANGE_MARKET_DATA_ID || 'kraken';
    if (!this.exchangeId) throw new Error('Missing EXCHANGE_MARKET_DATA_ID env variable');
    this.exchange = new ccxt[this.exchangeId]();
    this.symbol = symbol;
    this.interval = interval;

    // CSV log directory
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

    // JSON file in CSV log dir
    this.jsonFilePath = path.join(this.logDir, 'ohlcv_ccxt_data.json');
    if (!fs.existsSync(this.jsonFilePath)) {
      fs.writeJsonSync(this.jsonFilePath, []);
    }

    this.destDir = path.join(__dirname, '../../logs/json/ohlcv');
    fs.ensureDirSync(this.destDir);
    this.destPath = path.join(this.destDir, 'ohlcv_ccxt_data.json');
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
        // Prepare new entries for JSON
        const jsonEntries = [];

        newRows.forEach(([timestamp, open, high, low, close, volume]) => {
          const line = `${timestamp},${open},${high},${low},${close},${volume}\n`;
          this.csvStream.write(line);

          jsonEntries.push({
            timestamp, open, high, low, close, volume
          });
        });

        // Append new rows to JSON file (in /logs/csv/)
        let existingData = [];
        try {
          existingData = fs.readJsonSync(this.jsonFilePath);
        } catch (err) {
          existingData = [];
        }
        const updatedData = existingData.concat(jsonEntries);
        fs.writeJsonSync(this.jsonFilePath, updatedData, { spaces: 2 });

        this.latestTimestamp = newRows[newRows.length - 1][0];
        console.log(`Appended ${newRows.length} new rows at ${new Date().toISOString()}`);

        // ---- APPEND TO DESTINATION JSON FILE ----
        this.appendJsonToDest(jsonEntries);
        // -----------------------------------------
        
      } else {
        console.log(`No new data at ${new Date().toISOString()}`);
      }
    } catch (err) {
      console.error('Error fetching/appending OHLCV:', err);
    }
  }

  appendJsonToDest(newEntries) {
    // Appends only new entries
    let destData = [];
    try {
      if (fs.existsSync(this.destPath)) {
        destData = fs.readJsonSync(this.destPath);
      }
    } catch (e) {
      destData = [];
    }

    // Filter to ensure only new data is appended
    const lastTimestamp = destData.length ? destData[destData.length - 1].timestamp : 0;
    const filteredEntries = newEntries.filter(entry => entry.timestamp > lastTimestamp);

    if (filteredEntries.length) {
      const updatedDestData = destData.concat(filteredEntries);
      fs.writeJsonSync(this.destPath, updatedDestData, { spaces: 2 });
      console.log(`Appended ${filteredEntries.length} new entries to ${this.destPath}`);
    } else {
      console.log('No new entries to append to destination JSON.');
    }
  }

  close() {
    this.csvStream.end();
  }
}

// ---- MAIN LOOP ----
// INTERVALS: Define commonly used intervals in milliseconds for easy reference.
const INTERVALS = {
  '5m': 5 * 60 * 1000,        // 5 minutes  (high frequency)
  '15m': 15 * 60 * 1000,      // 15 minutes (high frequency)
  '1h': 60 * 60 * 1000,       // 1 hour     (medium term)
  '24h': 24 * 60 * 60 * 1000  // 24 hours   (long term)
};

// Select the interval you want to use here:
const INTERVAL_MS = INTERVALS['5m']; // Change to '15m', '1h', or '24h' as needed

const SYMBOL = process.env.SYMBOL || 'BTC/EUR'; // or your chosen symbol
const OHLCV_INTERVAL = process.env.INTERVAL || '5m'; // or '1m', '15m', etc.

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
  console.log('\nCSV and JSON streams closed. Exiting.');
  process.exit(0);
});

module.exports = CCXTMarketData;
