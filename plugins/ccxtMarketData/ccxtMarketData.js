require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const ccxt = require('ccxt');
const fs = require('fs-extra');
const rfs = require('rotating-file-stream');
const path = require('path');

class CCXTMarketData {
  constructor({ symbol, ohlcvCandleSize }) {
    this.exchangeId = process.env.EXCHANGE_MARKET_DATA_ID || 'kraken';
    if (!this.exchangeId) throw new Error('Missing EXCHANGE_MARKET_DATA_ID env variable');
    this.exchange = new ccxt[this.exchangeId]();
    this.symbol = symbol;
    this.ohlcvCandleSize = ohlcvCandleSize;

    this.logDir = path.resolve(__dirname, '../../logs/csv');
    fs.ensureDirSync(this.logDir);

    this.HEADER = 'timestamp,open,high,low,close,volume\n';
    this.csvFileName = 'ohlcv_ccxt_data.csv';
    this.csvFilePath = path.resolve(this.logDir, this.csvFileName);

    // Create CSV file with header if it doesn't exist
    if (!fs.existsSync(this.csvFilePath)) {
      fs.writeFileSync(this.csvFilePath, this.HEADER);
    }
    this.csvStream = rfs.createStream(this.csvFileName, {
      interval: '1d',
      path: this.logDir,
      maxFiles: 30
    });

    this.latestTimestamp = 0;

    // JSON file
    this.jsonFilePath = path.resolve(this.logDir, 'ohlcv_ccxt_data.json');
    if (!fs.existsSync(this.jsonFilePath)) {
      fs.writeJsonSync(this.jsonFilePath, []);
    }

    this.destDir = path.resolve(__dirname, '../../logs/json/ohlcv');
    fs.ensureDirSync(this.destDir);
    this.destPath = path.resolve(this.destDir, 'ohlcv_ccxt_data.json');
  }

  async fetchAndAppendOHLCV() {
    try {
      await this.exchange.loadMarkets();
      const ohlcv = await this.exchange.fetchOHLCV(this.symbol, this.ohlcvCandleSize);

      // Only new, non-duplicate rows
      const newRows = ohlcv.filter(([timestamp]) => timestamp > this.latestTimestamp);

      if (newRows.length > 0) {
        // Prepare JSON entries
        const jsonEntries = [];

        for (const [timestamp, open, high, low, close, volume] of newRows) {
          const line = `${timestamp},${open},${high},${low},${close},${volume}\n`;
          this.csvStream.write(line);
          jsonEntries.push({ timestamp, open, high, low, close, volume });
        }

        // Atomic write: backup before overwrite
        if (fs.existsSync(this.jsonFilePath)) {
          fs.copySync(this.jsonFilePath, this.jsonFilePath + '.bak');
        }
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

        // Destination file
        this.appendJsonToDest(jsonEntries);
      } else {
        console.log(`No new data at ${new Date().toISOString()}`);
      }
    } catch (err) {
      console.error('Error fetching/appending OHLCV:', err);
    }
  }

  appendJsonToDest(newEntries) {
    let destData = [];
    try {
      if (fs.existsSync(this.destPath)) {
        destData = fs.readJsonSync(this.destPath);
      }
    } catch (e) {
      destData = [];
    }
    const lastTimestamp = destData.length ? destData[destData.length - 1].timestamp : 0;
    const filteredEntries = newEntries.filter(entry => entry.timestamp > lastTimestamp);

    if (filteredEntries.length) {
      const updatedDestData = destData.concat(filteredEntries);
      // Atomic write: backup before overwrite
      if (fs.existsSync(this.destPath)) {
        fs.copySync(this.destPath, this.destPath + '.bak');
      }
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

// ----------------- Main Loop -----------------

const SYMBOL = process.env.SYMBOL || 'BTC/EUR';
const OHLCV_CANDLE_SIZE = process.env.OHLCV_CANDLE_SIZE || '1h';
// INTERVAL_FETCH_DATA should be set in .env (e.g., INTERVAL_FETCH_DATA=3600000 for 1 hour)
const INTERVAL_FETCH_DATA = Number(process.env.INTERVAL_FETCH_DATA) || 3600000;

const marketData = new CCXTMarketData({
  symbol: SYMBOL,
  ohlcvCandleSize: OHLCV_CANDLE_SIZE
});

const loop = async () => {
  await marketData.fetchAndAppendOHLCV();
};

loop(); // Run initially at startup
const timer = setInterval(loop, INTERVAL_FETCH_DATA);

process.on('SIGINT', () => {
  clearInterval(timer);
  marketData.close();
  console.log('\nCSV and JSON streams closed. Exiting.');
  process.exit(0);
});

module.exports = CCXTMarketData;
