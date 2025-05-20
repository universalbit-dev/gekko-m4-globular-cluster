/**
 * logger.js - Standardized Winston Logger  Strategies
 *
 *  - Consistent logging format and field order (OHLCV fields always first)
 *  - Uniform recording of events, errors, and analytics
 *  - Enhanced maintainability and traceability across feature-rich strategy modules
 *
 * @author universalbit-dev
 * @date 2025-05-20
 * @license MIT
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');
const DailyRotateFile = require('winston-daily-rotate-file');

const OHLCV_ORDER = [
  "timestamp", "open", "high", "low", "close", "volume"
];

function reorderFields(obj, ohlcvOrder = OHLCV_ORDER) {
  const ordered = {};
  for (const key of ohlcvOrder) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      ordered[key] = obj[key];
    }
  }
  for (const key of Object.keys(obj)) {
    if (!ohlcvOrder.includes(key)) {
      ordered[key] = obj[key];
    }
  }
  return ordered;
}

module.exports = function(strategyName) {
  const logDir = path.join(__dirname, '../logs');
  const logFile = path.join(logDir, `${strategyName}.log`);
  const jsonFile = path.join(__dirname, `../logs/json/${strategyName}.json`);
  fs.ensureFileSync(jsonFile);

  // Custom format to reorder fields in log message
  const reorderFormat = winston.format((info) => {
    if (info.message && typeof info.message === 'object') {
      info.message = reorderFields(info.message);
    }
    return info;
  });

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      reorderFormat(),
      winston.format.json()
    ),
    transports: [
      new DailyRotateFile({
        filename: logFile,           // No date pattern: always `${strategyName}.log`
        maxSize: '10m',              // Rotate at 10MB
        maxFiles: '5',               // Keep last 5 rotated files (or adjust as needed)
        zippedArchive: false         // Set true if you want old logs zipped
      })
    ]
  });

  function appendToJsonFile(data) {
    let fileData = [];
    if (fs.existsSync(jsonFile)) {
      fileData = JSON.parse(fs.readFileSync(jsonFile, 'utf8') || '[]');
    }
    fileData.push(reorderFields(data));
    fs.writeFileSync(jsonFile, JSON.stringify(fileData, null, 2));
  }

  return { logger, appendToJsonFile };
};
