/*
  Enhanced CSVEXPORT Strategy: Exports OHLCV data to a standardized CSV for Grafana.
  (CC-BY-SA 4.0) Rowan Griffin, enhanced by GitHub Copilot Chat Assistant
*/

const path = require('path');
const fs = require('fs');
const log = require('../core/log.js');
const config = require('../core/util.js').getConfig();
const Wrapper = require('../strategyWrapperRules.js');
const method = Wrapper;

// Prepare log file path
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

// Write header if file does not exist
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, HEADER);
}

method.init = function() {
  this.name = 'CSVEXPORT';
  this.requiredHistory = this.settings.historySize;
  log.info(`CSVEXPORT: Logging OHLCV to ${LOG_FILE}`);
};

method.update = function(candle) {
  // Format timestamp as ISO string (Grafana-friendly)
  const timestamp = (candle.start instanceof Date)
    ? candle.start.toISOString()
    : candle.start; // fallback

  // Build CSV row in correct order
  const row = [
    timestamp,
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume
  ].join(',') + '\n';

  fs.appendFile(LOG_FILE, row, (err) => {
    if (err) log.error('CSVEXPORT error:', err);
  });
};

method.check = function() {};
method.end = function() {};

module.exports = method;
