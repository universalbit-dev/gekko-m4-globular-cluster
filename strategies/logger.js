/**
 * logger.js - Standardized Winston Logger for Strategies (with field ordering and rotation)
 *
 * This module provides a pre-configured Winston logger for all trading strategies, ensuring:
 *  - Consistent logging format and order (OHLCV fields always first)
 *  - Uniform recording of events, errors, and analytics
 *  - Maintainability and traceability
 *  - Automatic rotation of both .log and .json files (10MB, 5 files) ~50MB
 *
 * Usage:
 *   const { logger, appendToJsonFile } = require('./logger')('strategyName');
 *   logger.info({ ... });
 *   await appendToJsonFile({ ... });
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

const OHLCV_ORDER = [
  "timestamp", "open", "high", "low", "close", "volume"
];

const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_JSON_FILES = 5; // Keep up to 5 files

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

// Rotates JSON files: strategy.json -> strategy.json.1, etc.
async function rotateJsonFiles(jsonFile) {
  if (await fs.pathExists(`${jsonFile}.${MAX_JSON_FILES - 1}`)) {
    await fs.remove(`${jsonFile}.${MAX_JSON_FILES - 1}`);
  }
  for (let i = MAX_JSON_FILES - 2; i >= 0; i--) {
    const src = i === 0 ? jsonFile : `${jsonFile}.${i}`;
    const dest = `${jsonFile}.${i + 1}`;
    if (await fs.pathExists(src)) {
      await fs.move(src, dest, { overwrite: true });
    }
  }
}

module.exports = function(strategyName) {
  const logDir = path.join(__dirname, `../logs`);
  const jsonDir = path.join(logDir, 'json');
  const logFile = path.join(logDir, `${strategyName}.log`);
  const jsonFile = path.join(jsonDir, `${strategyName}.json`);

  // Ensure directories and initial files exist
  fs.ensureDirSync(logDir);
  fs.ensureDirSync(jsonDir);
  fs.ensureFileSync(jsonFile);

  // Winston custom format for OHLCV reordering
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
      new winston.transports.File({
        filename: logFile,
        maxsize: 10 * 1024 * 1024, // 10 MB per file
        maxFiles: 5
      })
    ]
  });

  // Async, size-limited, rotated JSON file appender
  async function appendToJsonFile(data) {
    let fileData = [];
    try {
      if (await fs.pathExists(jsonFile)) {
        const raw = await fs.readFile(jsonFile, 'utf8');
        fileData = JSON.parse(raw || '[]');
      }
      fileData.push(reorderFields(data));
      const jsonString = JSON.stringify(fileData, null, 2);

      // Rotate if the new file would be too big
      if (Buffer.byteLength(jsonString, 'utf8') > MAX_JSON_SIZE) {
        await rotateJsonFiles(jsonFile);
        fileData = [reorderFields(data)];
      }
      await fs.writeFile(jsonFile, JSON.stringify(fileData, null, 2));
    } catch (err) {
      logger.error({ message: 'Failed to append to JSON log', error: err });
    }
  }

  return { logger, appendToJsonFile };
};
