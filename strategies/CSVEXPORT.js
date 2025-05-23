/*
  CSVEXPORT Strategy - Optimized for Exchange Simulator and Grafana
  ---------------------------------------------------------------
  Exports OHLCV data in a standardized CSV format for easy Grafana ingestion.
  Columns: timestamp (ISO8601 UTC), open, high, low, close, volume.
  Compatible with exchangesimulator and real-time/streaming candle data.
  (c) CC-BY-SA 4.0 Rowan Griffin, enhanced by GitHub Copilot Chat Assistant
*/

const path = require('path');
const fs = require('fs-extra');
const log = require('../core/log.js');
const config = require('../core/util.js').getConfig();
const method = {};

const LOG_DIR = path.join(__dirname, '..', 'logs', 'csv');
const LOG_FILE = path.join(
  LOG_DIR,
  `${config.watch.asset}_${config.watch.currency}_${(new Date()).toISOString().replace(/[:.]/g, '-')}.csv`
);

const HEADER = 'timestamp,open,high,low,close,volume\n';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

let headerWritten = false;

function ensureHeader() {
  if (!headerWritten) {
    if (!fs.existsSync(LOG_FILE) || fs.statSync(LOG_FILE).size === 0) {
      fs.writeFileSync(LOG_FILE, HEADER);
    }
    headerWritten = true;
  }
}

method.init = function() {
  this.name = 'CSVEXPORT';
  this.requiredHistory = this.settings.historySize || 0;
  log.info(`CSVEXPORT: Logging OHLCV to ${LOG_FILE}`);
  ensureHeader();
};

method.update = function(candle) {
  ensureHeader();
  // Format timestamp as ISO 8601 UTC string
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

  fs.appendFile(LOG_FILE, row, err => {
    if (err) log.error('CSVEXPORT error:', err);
  });
};

method.check = function() {};
method.end = function() {};

module.exports = method;
