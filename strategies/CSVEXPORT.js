/*
  CSVEXPORT Strategy - Optimized for Exchange Simulator and Grafana
  ---------------------------------------------------------------
  Exports OHLCV data in a standardized CSV format for easy Grafana ingestion.
  Columns: timestamp (ISO8601 UTC), open, high, low, close, volume.
  Compatible with exchangesimulator and real-time/streaming candle data.
  (c) CC-BY-SA 4.0 Rowan Griffin, enhanced by GitHub Copilot Chat Assistant
*/
const path = require('path');
const rfs = require('rotating-file-stream');
const log = require('../core/log.js');
const config = require('../core/util.js').getConfig();
const method = {};

const LOG_DIR = path.join(__dirname, '..', 'logs', 'csv');
const HEADER = 'timestamp,open,high,low,close,volume\n';

// Ensure log directory exists
require('fs-extra').ensureDirSync(LOG_DIR);

// Create a rotating write stream (1 file per day, keep 30 days by default)
const stream = rfs.createStream('ohlcv_data.csv', {
  interval: '1d',          // rotate daily
  path: LOG_DIR,
  maxFiles: 30             // optional: keep last 30 days
});

let headerWritten = false;

function ensureHeader() {
  if (!headerWritten) {
    stream.write(HEADER);
    headerWritten = true;
  }
}

method.init = function() {
  this.name = 'CSVEXPORT';
  this.requiredHistory = this.settings.historySize || 0;
  log.info(`CSVEXPORT: Logging OHLCV to daily-rotated file in ${LOG_DIR}`);
  ensureHeader();
};

method.update = function(candle) {
  ensureHeader();
  const timestamp = (candle.start instanceof Date)
    ? candle.start.toISOString()
    : new Date(candle.start).toISOString();

  const row = [
    timestamp,
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume
  ].join(',') + '\n';

  stream.write(row);
};

method.check = function() {};
method.end = function() {
  stream.end();
};

module.exports = method;
