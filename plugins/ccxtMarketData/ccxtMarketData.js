const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const ccxt = require('ccxt');
const fs = require('fs-extra');
const rfs = require('rotating-file-stream');

/**
* CCXT Market Data Plugin
* Loads live OHLCV data for any CCXT-supported exchange, pair, interval.
*
* Reads config from .env file: gekko-m4-globular-cluster/.env
* CCXT_MARKET_DATA_ENABLED=true
* CCXT_MARKET_DATA_EXCHANGE=kraken
* CCXT_MARKET_DATA_PAIR=BTC/EUR
* CCXT_MARKET_DATA_CANDLE_SIZE=1h
* CCXT_MARKET_DATA_FETCH_INTERVAL=3600000
* CCXT_MARKET_DATA_OUTPUT_CSV=./logs/csv/ohlcv_ccxt_data.csv
* CCXT_MARKET_DATA_OUTPUT_JSON=./logs/json/ohlcv/ohlcv_ccxt_data.json
*
*/

class CCXTMarketData {
  constructor() {
    this.enabled = process.env.CCXT_MARKET_DATA_ENABLED === 'true';
    this.exchangeId = process.env.CCXT_MARKET_DATA_EXCHANGE || 'kraken';
    this.pair = process.env.CCXT_MARKET_DATA_PAIR || 'BTC/EUR';
    this.ohlcvCandleSize = process.env.CCXT_MARKET_DATA_CANDLE_SIZE || '1h';
    this.fetchInterval = Number(process.env.CCXT_MARKET_DATA_FETCH_INTERVAL) || 3600000;
    this.csvFilePath = path.resolve(__dirname, '../../', process.env.CCXT_MARKET_DATA_OUTPUT_CSV || './logs/csv/ohlcv_ccxt_data.csv');
    this.jsonFilePath = path.resolve(__dirname, '../../', process.env.CCXT_MARKET_DATA_OUTPUT_JSON || './logs/json/ohlcv/ohlcv_ccxt_data.json');

    this.exchange = new ccxt[this.exchangeId]();

    // CSV setup
    this.logDir = path.dirname(this.csvFilePath);
    fs.ensureDirSync(this.logDir);
    this.HEADER = 'timestamp,open,high,low,close,volume\n';
    if (!fs.existsSync(this.csvFilePath)) {
      fs.writeFileSync(this.csvFilePath, this.HEADER);
    }
    this.csvStream = rfs.createStream(path.basename(this.csvFilePath), {
      interval: '1d',
      path: this.logDir,
      maxFiles: 30
    });

    this.latestTimestamp = 0;

    // JSON setup
    fs.ensureDirSync(path.dirname(this.jsonFilePath));
    if (!fs.existsSync(this.jsonFilePath)) {
      fs.writeJsonSync(this.jsonFilePath, []);
    }
  }

  async fetchAndAppendOHLCV() {
    if (!this.enabled) {
      console.log('CCXT Market Data Plugin disabled by config.');
      return;
    }
    try {
      await this.exchange.loadMarkets();

      // Defensive: Check if pair exists
      if (!(this.pair in this.exchange.markets)) {
        throw new Error(
          `Pair "${this.pair}" not found on exchange "${this.exchangeId}". Available pairs: ${Object.keys(this.exchange.markets).join(', ')}`
        );
      }

      const ohlcv = await this.exchange.fetchOHLCV(this.pair, this.ohlcvCandleSize);

      // Only new, non-duplicate rows
      const newRows = ohlcv.filter(([timestamp]) => timestamp > this.latestTimestamp);

      if (newRows.length > 0) {
        const jsonEntries = [];

        for (const [timestamp, open, high, low, close, volume] of newRows) {
          const line = `${timestamp},${open},${high},${low},${close},${volume}\n`;
          this.csvStream.write(line);
          jsonEntries.push({ timestamp, open, high, low, close, volume });
        }

        // Backup JSON file before writing
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

// ----------------- Main Loop -----------------
const marketData = new CCXTMarketData();

const loop = async () => {
  await marketData.fetchAndAppendOHLCV();
};

if (marketData.enabled) {
  loop(); // Initial run
  const timer = setInterval(loop, marketData.fetchInterval);

  process.on('SIGINT', () => {
    clearInterval(timer);
    marketData.close();
    console.log('\nCSV and JSON streams closed. Exiting.');
    process.exit(0);
  });
} else {
  console.log('CCXT Market Data Plugin is disabled in .env config.');
}

module.exports = CCXTMarketData;
