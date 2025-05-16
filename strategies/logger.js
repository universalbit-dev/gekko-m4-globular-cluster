// strategies/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

/**
 * Returns a logger and a function to append data to a JSON file.
 * @param {string} strategyName - Name of the strategy (used for file naming).
 * @returns {object} { logger, appendToJsonFile }
 */
module.exports = function(strategyName) {
  const logFile = path.join(__dirname, `../logs/${strategyName}.log`);
  const jsonFile = path.join(__dirname, `../logs/json/${strategyName}.json`);

  // Ensure directory exists
  fs.ensureFileSync(jsonFile);

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: logFile })
    ]
  });

  function appendToJsonFile(data) {
    let fileData = [];
    if (fs.existsSync(jsonFile)) {
      fileData = JSON.parse(fs.readFileSync(jsonFile, 'utf8') || '[]');
    }
    fileData.push(data);
    fs.writeFileSync(jsonFile, JSON.stringify(fileData, null, 2));
  }

  return { logger, appendToJsonFile };
};
