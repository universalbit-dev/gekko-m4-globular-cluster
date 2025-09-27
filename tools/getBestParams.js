const fs = require('fs');
const path = require('path');

/**
 * Dynamically fetch the best-tuned parameter for an indicator and scoring logic.
 * @param {string} indicator - Name of the indicator, e.g. 'rsi' or 'atr'
 * @param {string} scoring - Scoring logic, e.g. 'profit', 'abs', 'sharpe', 'hit-rate'
 * @param {string} [resultsPath='./evaluation/autoTune_results.json'] - Path to autoTune results file
 * @returns {number|null} - The best parameter value, or null if not found
 */
function getBestParam(indicator, scoring, resultsPath = './autoTune_results.json') {
  const results = JSON.parse(fs.readFileSync(path.resolve(__dirname, resultsPath), 'utf8'));
  const found = results.find(
    r => r.indicator === indicator && r.scoring === scoring
  );
  return found ? found.bestParam : null;
}

module.exports = { getBestParam };
