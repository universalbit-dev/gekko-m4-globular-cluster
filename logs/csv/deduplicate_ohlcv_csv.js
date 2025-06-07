/**
 * deduplicate_ohlcv.js
 *

    1 .Duplicated rows from fetches are normal (especially with polling APIs)
    2. Do not fight the data source; simply post-process.
    3. A standardized, reusable deduplication module (like dedup_ohlcv.js) is clean and maintainable.

 * Description:
 *   Reads an OHLCV CSV file containing market data (potentially with duplicate rows per timestamp),
 *   and writes a new CSV file with only the first occurrence of each unique timestamp.
 *   The output file is tab-separated and contains only the first five columns: timestamp, open, high, low, close.
 *
 * Usage:
 *   node deduplicate_ohlcv.js
 *   (or require as a module in another script)
 *
 * Inputs:
 *   - Input CSV file path (adjustable in the script)
 *   - Expects the first row to be a header
 *
 * Outputs:
 *   - Writes a deduplicated, tab-separated CSV with no volume column,
 *     named as the original file with '_deduped.csv' appended before the extension.
 *
 * Author: universalbit-dev
 * Date: 2025-06-06

Usage ad Module:
const dedupOhlcvCSV = require('./deduplicate_ohlcv_csv.js');
dedupOhlcvCSV(''ohlcv.csv', 'ohlcv_deduped.csv'');

Note:
dedupOhlcvCSV(''ohlcv.csv', 'ohlcv.csv''); //overwrites the existing file.

*/
const fs = require('fs');
const path = require('path');

function dedupOhlcvCSV(inputPath, outputPath) {
  const lines = fs.readFileSync(inputPath, 'utf8').trim().split('\n');
  const header = lines[0];
  const seen = new Set();
  const deduped = [header];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].trim().split(',');
    const ts = parts[0];
    if (!seen.has(ts)) {
      deduped.push(parts.slice(0,5).join('\t'));
      seen.add(ts);
    }
  }

  fs.writeFileSync(outputPath, deduped.join('\n')+'\n');
}

module.exports = dedupOhlcvCSV;

// CLI usage
if (require.main === module) {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input || !output) {
    console.log('Usage: node deduplicate_ohlcv_csv.js <input.csv> <output.csv>');
    process.exit(1);
  }
  dedupOhlcvCSV(input, output);
  console.log('Deduplication complete:', output);
}
