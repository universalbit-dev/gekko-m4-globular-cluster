/**
 * deduplicate_ohlcv_json.js
 *
 * Reads an OHLCV JSON file (possibly with duplicate timestamps) and writes a new JSON
 * file containing only the first record for each unique timestamp. The output file includes
 * only the fields: timestamp, open, high, low, close (volume is excluded).
 *
 * Usage:
 *   node deduplicate_ohlcv_json.js <input.json> [output.json]
 *   (or require as a module in another script)
 *
 * Author: universalbit-dev
 * Date: 2025-06-06
 */

const fs = require('fs');
const path = require('path');

/**
 * Deduplicate OHLCV JSON by timestamp and write to outputPath.
 * @param {string} inputPath
 * @param {string} outputPath
 */
function dedupOhlcvJSON(inputPath, outputPath) {
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const seen = new Set();
  const deduped = [];

  for (const candle of data) {
    const ts = candle.timestamp;
    if (!seen.has(ts)) {
      deduped.push({
        timestamp: ts,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
        // volume intentionally excluded
      });
      seen.add(ts);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(deduped, null, 2));
}

// CLI usage
if (require.main === module) {
  const input = process.argv[2];
  let output = process.argv[3];
  if (!input) {
    console.log('Usage: node deduplicate_ohlcv_json.js <input.json> [output.json]');
    process.exit(1);
  }
  if (!output) {
    // Default output: add _deduped before extension, safely escaping the extension
    const ext = path.extname(input);
    // Escape regex special chars in ext for safe replacement
    const safeExt = ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = input.replace(new RegExp(`${safeExt}$`), `_deduped${ext}`);
  }
  dedupOhlcvJSON(input, output);
  console.log('Deduplicated JSON written as', output);
}

module.exports = dedupOhlcvJSON;
