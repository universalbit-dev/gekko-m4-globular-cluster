# 🛠️ autoTune — Auto-Tuning Evaluation Summaries

This document describes the behavior and usage of the updated `tools/evaluation/autoTune.js` script. The script processes evaluation result records (from backtests / evaluations) and produces an aggregated set of auto-tune candidates per indicator (or a global aggregate) to help guide parameter selection and further tuning steps.

The script was enhanced to:
- read a prioritized input file (with a fallback),
- lower the default sample threshold so small indicator groups are not dropped unnecessarily,
- optionally generate simple parameter permutations,
- provide CLI flags for listing, dry-run, and verbose mode,
- and write a structured JSON summary that is easy to inspect or consume by downstream automation.

---

## Quick summary

- Input (default): `tools/evaluation/evaluate_results_augmented.json`
- Fallback input: `tools/evaluation/evaluate_results.json`
- Output: `tools/evaluation/autoTune_results.json` (configurable)
- Purpose: produce per-indicator candidate summaries (stats, sample counts, score keys) and optional generated permutations for parameter selection.

---

## Where the script lives

- Script: `tools/evaluation/autoTune.js`
- Docs: `tools/docs/autoTune.md` (this file)
- Typical input directory: `tools/evaluation/`
- Output path (default): `tools/evaluation/autoTune_results.json`

---

## Usage

From the repository root:

- Run once and write results:
  node tools/evaluation/autoTune.js

- Dry run (don’t write output; prints the built summary):
  node tools/evaluation/autoTune.js --dry-run

- List discovered indicators and sample counts:
  node tools/evaluation/autoTune.js --list-indicators

- Verbose logging:
  node tools/evaluation/autoTune.js --verbose

- Combine flags:
  node tools/evaluation/autoTune.js --list-indicators --dry-run --verbose

---

## Environment variables

Set these in your environment or in the repository `.env` (the script uses dotenv to load `../../.env` relative to the script):

- IN_PATH
  - Default: `tools/evaluation/evaluate_results_augmented.json`
  - Description: Input JSON file path containing evaluation records. If missing or not found, the script will attempt the fallback.

- OUT_PATH
  - Default: `tools/evaluation/autoTune_results.json`
  - Description: Output JSON file to write aggregated auto-tune results.

- MIN_SAMPLES
  - Default: `5`
  - Description: Minimum number of samples required for a per-indicator group to be included in results. If no per-indicator groups meet this threshold, a `_global` aggregate is created.

- GENERATE_PERMUTATIONS
  - Default: `0` (disabled)
  - If set to `1`, the script will attempt to generate a set of simple parameter permutations derived from the numeric statistics (mean ± sd) for keys found in the records.

Notes:
- The script also accepts CLI flags `--dry-run`, `--list-indicators`, and `--verbose`.
- DOTENV: the script calls `require('dotenv').config()` using a path resolved relative to the script; ensure your `.env` is at the repository root (two levels up from the script).

---

## What the script does (detailed)

1. Loads configuration from `.env` (if present) and reads the input JSON:
   - Primary: `IN_PATH` (evaluate_results_augmented.json by default)
   - Fallback: `tools/evaluation/evaluate_results.json`

2. Validates the input is a non-empty array of evaluation records. If none are found, the script exits with an error.

3. Groups records by indicator key:
   - For each record, the grouping key is `record.indicator || record.strategy || '_global'`.
   - This produces a Map of indicatorName => [records].

4. For each group with at least MIN_SAMPLES samples:
   - Summarizes numeric keys found in a sample record: for each numeric key, computes mean, standard deviation (sd), and sample count `n`.
   - Detects an appropriate score key for the group in order of preference:
     - `abs` (if present and numeric)
     - `score`
     - `pnl`
     - (falls back to null if none present)
   - Builds a base candidate object for the indicator with:
     - indicator name
     - samples count
     - scoreKey
     - stats (per numeric key: mean, sd, n)

5. Optional permutations:
   - If `GENERATE_PERMUTATIONS=1`, the script generates simple permutations for numeric stats: for each stat key, it emits triggers like mean + sd and mean - sd as suggested thresholds.
   - Generated permutations are attached to the candidate as a `generatedPermutations` array (each item contains the numeric key and suggested threshold).

6. If no per-indicator candidate groups meet MIN_SAMPLES, the script builds a single `_global` candidate which summarizes stats across all records.

7. Writes the resulting array of per-indicator candidate objects to OUT_PATH (JSON). If `--dry-run` is provided, the script prints the summary to stdout and does not write the file.

8. Exit codes:
   - `0` on success (or `--dry-run` end),
   - non-zero if input missing or write fails.

---

## CLI flags

- --dry-run
  - Build the same summary but print it and exit without writing the output file.

- --list-indicators
  - Print discovered indicators and counts, then exit (unless combined with --dry-run, which prevents file writes).

- --verbose
  - Prints extra informational lines prefixed with `[AUTOTUNE]` during processing.

---

## Best practices

- MIN_SAMPLES: set to a low but meaningful default (5). Increase it when you want more robust per-indicator candidate generation.
- Use `--list-indicators` to inspect which indicators are present and their sample counts before running a full generation.
- Use `--dry-run` first to inspect the structure of the auto-tune summary before writing files or integrating downstream.
- Enable `GENERATE_PERMUTATIONS=1` only when you intend to explore simple statistical permutations — these are heuristics and should be validated in backtests before deploying.
- Review `scoreKey` for each indicator to know which metric the script considered primary for that group.

---

## Troubleshooting

- "No evaluation records found" — ensure `IN_PATH` or the fallback file exists and contains a non-empty array of JSON objects.
- If output writing fails, check file system permissions for the `tools/evaluation` folder or set `OUT_PATH` to a writable path.
- If your `.env` isn't loaded, verify the repository root `.env` path relative to `tools/evaluation/autoTune.js` (script expects it two dirs up).

---

## Changelog (from prior behavior)

- Now prefers `evaluate_results_augmented.json` as primary input, falling back to `evaluate_results.json`.
- Lowered default MIN_SAMPLES to 5 (more permissive).
- Added `GENERATE_PERMUTATIONS` option to synthesize candidate parameter thresholds from stats.
- Added `--list-indicators`, `--dry-run`, and `--verbose` CLI flags.
- Groups by `indicator` or `strategy` if provided, otherwise falls back to `_global`.

---

## Disclaimer

This tool aggregates historical evaluation records to suggest candidate parameters and thresholds. The produced candidates and permutations are heuristics and summary statistics for exploration — always validate candidate parameter sets through rigorous backtesting (and paper / small-scale live testing) before using them in production systems.
