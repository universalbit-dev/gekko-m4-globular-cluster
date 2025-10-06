const fs = require('fs');
const path = require('path');

/**
 * Dynamically fetch the most recent/best-tuned parameter for an indicator and scoring logic.
 * Finds the best parameter for any supported indicator/scoring method.
 *
 * @param {string} indicator - indicator name (e.g. 'rsi', 'atr', 'adx', ...)
 * @param {string} scoring - scoring logic (e.g. 'profit', 'abs', 'sharpe', 'hit-rate')
 * @param {string} [resultsPath='../evaluation/autoTune_results.json'] - Relative path to autoTune results file
 * @returns {number|null} - The best parameter value, or null if not found
 */
function getBestParam(indicator, scoring, resultsPath = './evaluation/autoTune_results.json') {
  const resolvedPath = path.resolve(__dirname, resultsPath);
  if (!fs.existsSync(resolvedPath)) {
    console.warn(`[getBestParam] autoTune results file not found: ${resolvedPath}`);
    return null;
  }
  let results;
  try {
    results = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  } catch (e) {
    console.error(`[getBestParam] Error reading autoTune results: ${e.message}`);
    return null;
  }

  // Filter for matching indicator and scoring type
  const candidates = results.filter(r => r.indicator === indicator && r.scoring === scoring);

  if (candidates.length === 0) {
    console.warn(`[getBestParam] No matching entry for indicator=${indicator}, scoring=${scoring}`);
    return null;
  }

  // If entries have a 'timestamp' or 'score', prefer the most recent/highest
  candidates.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return new Date(b.timestamp) - new Date(a.timestamp); // descending
    }
    if (typeof a.score === 'number' && typeof b.score === 'number') {
      return b.score - a.score; // descending
    }
    return 0; // fallback: keep order
  });

  return candidates[0].bestParam ?? null;
}

module.exports = { getBestParam };
