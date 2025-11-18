# 🗺️ explorer.js — Multi-Timeframe OHLCV Data Explorer & Fetcher (Updated)

---

## Overview

This script is an improved, more robust tool for fetching, validating, updating, and storing OHLCV (Open/High/Low/Close/Volume) data across multiple timeframes from any ccxt-supported exchange.

Key improvements in the current implementation:
- Row validation & sanitization for safer downstream processing.
- Atomic writes (write-to-temp + rename) to avoid partial/corrupt JSON files.
- Tolerant JSON loader with JSONL fallback and corrupt-file backups (BAD_DIR).
- Winston-based logging (console + file).
- Per-timeframe and multi-timeframe files maintained and deduplicated.
- Rejected rows saved to BAD_DIR for inspection.
- Configurable limits and optional file-size caps.

Usage:
- node explorer.js
- node explorer.js clean

---

## Environment Variables

The script reads configuration from `.env` (falls back to defaults):

| Variable                    | Default                 | Description |
|----------------------------:|------------------------:|------------|
| `EXCHANGE`                  | `kraken`                | Exchange name (any ccxt-supported) |
| `PAIR`                      | `BTC/EUR`               | Trading pair / symbol |
| `OHLCV_CANDLE_SIZE`         | `1m,5m,15m,1h`          | Comma-separated candle sizes (timeframes) |
| `FETCH_LIMIT`               | `200`                   | Number of candles to fetch per ccxt call |
| `MAX_OHLCV_FILE_ENTRIES`    | `50000`                 | Optional cap: trim files keeping most recent entries |
| `LOG_LEVEL`                 | `info`                  | Winston log level (e.g., info, warn, debug) |
| `DEBUG`                     | (unset)                 | If set (any value), debug logs are emitted |

Directories used:
- data dir: tools/logs/json/ohlcv
- bad/corrupt backups: tools/logs/json/ohlcv/bad
- logs: tools/logs (winston writes explorer.log)

---

## Main Components & Behavior

### Initialization & Clean Mode
- Ensures `tools/logs/json/ohlcv`, `.../bad`, and `tools/logs` exist.
- `node explorer.js clean`:
  - Finds files matching `^ohlcv_ccxt_data.*\.json$` inside data dir and atomically resets them to empty arrays (`[]`).
  - Logs progress and exits.

### Logging
- Uses winston with timestamped messages.
- Transports:
  - Console (errors/warns to stderr).
  - Rotating-ish file: tools/logs/explorer.log (max size configured in code).
- `LOG_LEVEL` controls verbosity; setting `DEBUG` environment variable enables debug logging in the script.

### Robust Load/Save Utilities
- safeLoadJsonArray(fp)
  - If file is missing / empty → returns [].
  - Tries normal JSON parse; if parse fails:
    - Attempts JSONL parse: each non-empty line parsed as JSON.
    - Attempts light cleaning of non-printable characters.
    - Tries to extract first {...} or [...] blob.
    - If still failing, backs up the original corrupt content to BAD_DIR with timestamped suffix and returns [].
- atomicWriteJson(fp, arr)
  - Writes JSON to a temp file (fp.tmp.<pid>.<ts>) then fs.renameSync to target path to avoid partial writes.
  - Creates parent directories as needed.

### Validation & Sanitization
- sanitizeRow(rawRow)
  - Coerces numeric strings (timestamp/open/high/low/close/volume) to numbers when possible.
  - Normalizes keys: ensures `symbol`, `exchange`, `ohlcvCandleSize` are present when possible.
- validateOhlcvRow(row)
  - Required fields: symbol, exchange, timestamp, open, high, low, close, volume, ohlcvCandleSize.
  - Numeric sanity checks (not NaN).
  - Timestamp normalization: if timestamp looks like seconds (10-digit), it's converted to milliseconds.
  - Rejects timestamps that are extremely old ( > ~5 years in the past) or far in the future (> ~1 day).
  - OHLC logical checks (low <= high, open/close within [low, high]), non-negative volume.
  - Returns { ok: true, row } or { ok: false, reason }.

Rejected rows are:
- Logged with reason.
- Written to BAD_DIR as `rejected_<tf>_<timestamp>_<ts>.json` for manual inspection.

### Fetch & Update Routine
For each timeframe (parallelized):

1. Load multi-file: `tools/logs/json/ohlcv/ohlcv_ccxt_data.json` (multi-timeframe store).
2. Load per-timeframe file: `tools/logs/json/ohlcv/ohlcv_ccxt_data_<timeframe>.json`.
3. Compute the latest timestamp seen for this exchange / symbol / timeframe from both multi and per-TF files.
   - Use that to set `since = latest + 1` to do incremental fetches where supported by the exchange.
4. Call ccxt.fetchOHLCV(PAIR, timeframe, since, FETCH_LIMIT).
5. Map CCXT candles ([timestamp,open,high,low,close,volume]) into row objects with metadata:
   - symbol, exchange, timestamp, open, high, low, close, volume, ohlcvCandleSize, source_timeframe
6. For each fetched row:
   - sanitizeRow -> validateOhlcvRow
   - If validated, collect for persistence; otherwise log and save rejected sample.
7. If there are accepted rows:
   - Append to both multi and per-timeframe arrays.
   - Deduplicate using symbol|exchange|timeframe|timestamp key.
   - Optionally trim arrays to MAX_OHLCV_FILE_ENTRIES (keeps most recent).
   - Atomic write both files.
   - Log counts appended.

If there are no accepted rows, logs "No accepted new rows ..." for that timeframe.

Network / rate errors:
- Handles ccxt.NetworkError, ccxt.ExchangeNotAvailable, ccxt.DDoSProtection specially by logging warnings and retrying next cycle.
- Other errors are logged as errors.

Concurrency:
- Each timeframe is processed in parallel (Promise.all over TIMEFRAMES) during a cycle.

### Continuous Operation
- The script performs one fetch cycle on startup.
- Then schedules repeated cycles using setInterval at 120 * 1000 ms (every 2 minutes) by default.
  - (This interval is set in the code; adjust scheduling externally or modify the script as needed.)

---

## File Structure

- tools/explorer.js — The script (current code)
- tools/docs/explorer.md — This documentation
- tools/logs/json/ohlcv/ohlcv_ccxt_data.json — Multi-timeframe data (merged)
- tools/logs/json/ohlcv/ohlcv_ccxt_data_<timeframe>.json — Per-timeframe data files
- tools/logs/json/ohlcv/bad/ — Corrupt/backed-up/rejected row files
- tools/logs/explorer.log — Winston runtime log

---

## Data Format

Each OHLCV entry written by the script looks like:

```json
{
  "symbol": "BTC/EUR",
  "exchange": "kraken",
  "timestamp": 1695826800000,
  "open": 39000,
  "high": 39200,
  "low": 38950,
  "close": 39100,
  "volume": 5.2,
  "ohlcvCandleSize": "1m",
  "source_timeframe": "1m"
}
```

Notes:
- timestamp is normalized to milliseconds (if ccxt returns seconds-like values they are converted).
- `ohlcvCandleSize` is always set for stored candles; rows missing it are rejected.
- Deduplication is enforced across (symbol, exchange, timeframe, timestamp).

---

## Best Practices & Troubleshooting

- Use `node explorer.js clean` before re-running large fetches or before retraining models to start with an empty dataset.
- Increase `FETCH_LIMIT` if you need more historical bars per request (respect the exchange's max limits and rate limits).
- Adjust `OHLCV_CANDLE_SIZE` in `.env` to control which timeframes are gathered in one run.
- If files get corrupted, check `tools/logs/json/ohlcv/bad` — the script will back up corrupt blobs there automatically.
- Inspect `tools/logs/explorer.log` for runtime issues, rejected row reasons, and fetch errors.
- If you need more frequent polling, adjust the scheduling interval in explorer.js (current default is 2 minutes).
- If you need different retention behavior, change `MAX_OHLCV_FILE_ENTRIES` (default 50000) to trim stored history.

---

## Implementation Details (Quick Summary)

- Safe JSON loader with JSONL fallback and corrupt backups.
- Per-row sanitize + validate functions that transform numeric strings and enforce OHLC and timestamp sanity.
- Atomic writes (tmp file + rename) to avoid partial writes.
- Deduplication by key symbol|exchange|timeframe|timestamp.
- Rejected rows and corrupt files are saved under BAD_DIR for debugging.
- Uses ccxt with enableRateLimit and attempts to handle common ccxt exceptions gracefully.

---

## Further Reading

- Data Deduplication: https://en.wikipedia.org/wiki/Data_deduplication
- Winston Logging: https://github.com/winstonjs/winston

---

## Disclaimer

This script only collects and persists market data — it does not execute trades. Ensure API keys and `.env` are correct for your chosen exchange and that you comply with exchange rate limits and API TOS.
