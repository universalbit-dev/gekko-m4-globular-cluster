/**
 * deduplicate_ohlcv_json.js
 *
 *
 * 1. Duplicated rows from fetches are normal (especially with polling APIs)
 * 2. Do not fight the data source; simply post-process.
 * 3. A standardized, reusable deduplication module (like deduplicate_ohlcv_json.js) is clean and maintainable.
 *
 * Description:
 *   Reads an OHLCV JSON file containing market data (potentially with duplicate objects per timestamp),
 *   and writes a new JSON file with only the first occurrence of each unique timestamp.
 *   The output file contains only the first five fields: timestamp, open, high, low, close.
 *
 * Usage:
 *   node deduplicate_ohlcv_json.js <input.json> <output.json>
 *   (or require as a module in another script)
 *
 * Inputs:
 *   - Input JSON file path (as argument or hardcoded)
 *   - Expects an array of objects with at least timestamp, open, high, low, close, volume fields
 *
 * Outputs:
 *   - Writes a deduplicated JSON file with no volume field,
 *     named as the original file with '_deduped.json' appended before the extension.
 *
 * Author: universalbit-dev
 * Date: 2025-06-06
 
Usage as Module: 
const dedupOhlcvJSON = require('./deduplicate_ohlcv_json');
dedupOhlcvJSON('ohlcv.json', 'ohlcv_deduped.json');

Note:
dedupOhlcvJSON('ohlcv.json', 'ohlcv.json'); overwrite the same file

*/

const fs = require('fs');
const path = require('path');

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
        // volume intentionally excluded for standardization
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
    console.log('Usage: node deduplicate_ohlcv_json.js <input.json> <output.json>');
    process.exit(1);
  }
  if (!output) {
    // Default output: add _deduped before extension
    const ext = path.extname(input);
    output = input.replace(new RegExp(`${ext}$`), `_deduped${ext}`);
  }
  dedupOhlcvJSON(input, output);
  console.log('Deduplicated JSON written as', output);
}

module.exports = dedupOhlcvJSON;
