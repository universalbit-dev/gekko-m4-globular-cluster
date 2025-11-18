# 📊 `challenge_analysis.js` — Challenge Log Multi-Timeframe Analysis (UPDATED)

---

## Overview

This document describes the updated `challenge_analysis.js` analyzer. The script now targets a single-model workflow (configurable), inspects only resolved events (non-pending) for robust recent statistics, and uses a two-path activation rule to decide an "active" model per timeframe:

Activation happens when either:
- A dominant period is detected (sustained rolling win-rate above the dominance threshold for a minimum length), OR
- The recent last-N resolved events count is at least the configured minimum and the recent resolved win-rate meets the minimum win-rate threshold.

The analyzer still computes volatility (ATR), rolling win-rates, finds dominant periods, and writes per-timeframe output to `model_winner.json`. Atomic writes and a non-overlap guard ensure safe continuous operation.

---

## Key Changes (since previous versions)

- Single-model optimized operation (env var CHALLENGE_SINGLE_MODEL).
- New parameter CHALLENGE_RECENT_EVENTS to control how many resolved events (win/loss) to examine for recent statistics (default 20).
- New MIN_EVENTS (CHALLENGE_MIN_EVENTS) threshold to require a minimum number of resolved events before activation based on recent statistics (default 5).
- Activation logic changed: prefer dominant-period detection; otherwise require sufficient recent resolved events + minimum recent win-rate to activate.
- Rolling win-rate computation and dominance detection remain, but dominance check uses strict '>' (win rate > threshold).
- Recent win lookup returns the most recent 'win' entry; if none, falls back to the latest log entry and associates ATR-based volatility for that row.
- Atomic write to `model_winner.json` via a `.tmp` file and rename to avoid partial writes.
- Non-overlap guard prevents overlapping runs when analysis takes longer than the configured interval.

---

## Environment Variables

Note: the defaults below reflect the values implemented in the script (and minimum enforced values where applicable).

- CHALLENGE_INTERVAL_MS — 900000 (15 minutes)  
  Analysis interval (ms) between runs.

- WINDOW_SIZE — 50 (minimum enforced: 3)  
  Rolling window size used for win-rate calculation.

- CHALLENGE_MIN_WIN_RATE — 0.55  
  Minimum recent resolved win-rate required to activate when no dominant period exists.

- CHALLENGE_DOMINANCE_THRESHOLD — 0.618  
  Win-rate threshold used to define dominance (dominant when rolling win-rate > threshold).

- CHALLENGE_DOMINANCE_MIN_LENGTH — 8 (minimum enforced: 3)  
  Minimum consecutive rolling window length above the dominance threshold to count as a dominant period.

- CHALLENGE_ATR_PERIOD — 14 (minimum enforced: 2)  
  ATR period (in candles) used for volatility estimation.

- CHALLENGE_MIN_EVENTS — 5 (minimum enforced: 1)  
  Minimum number of resolved events required (in the recent lookback) before the recent-win-rate activation rule applies.

- CHALLENGE_RECENT_EVENTS — 20 (minimum enforced: 1)  
  How many recent resolved (win/loss) events to inspect when computing recent statistics.

- CHALLENGE_SINGLE_MODEL — tf  
  The single model identifier the analyzer evaluates (e.g., `tf`, `convnet`). The analyzer treats this as the sole model to analyze.

- CHALLENGE_TIMEFRAMES — 1m,5m,15m,1h  
  Comma-separated list of timeframes to analyze (per timeframe it looks for `challenge_{tf}.log`).

---

## Files (location)

- tools/challenge/challenge_analysis.js — Main analysis script (this is the updated script).
- tools/challenge/model_winner.json — Output analytics file (written atomically).
- tools/challenge/challenge_{tf}.log — Input logs per timeframe (tab-separated rows with headers).
- tools/docs/challenge_analysis.md — This documentation file.

---

## Main Components / Behavior

1. Log Parsing
   - Reads tab-separated log files `challenge_{tf}.log`.
   - Parses headers and converts numeric columns like open/high/low/close/volume/entry_price/next_price to numbers when possible.

2. ATR Volatility Calculation
   - Fast ATR implementation that returns an ATR value per candle index (null for the first candle).
   - ATR is used to attach per-row volatility to the recent win (or fallback) entry.

3. Rolling Win Rate
   - Computes rolling win-rate over the configured WINDOW_SIZE for the configured single model.
   - Only `win` and `loss` values count toward denominators; pending/non-resolved entries are excluded.

4. Dominance Detection
   - Finds consecutive periods where the rolling win-rate is strictly greater than DOMINANCE_THRESHOLD for at least DOMINANCE_MIN_LENGTH candle indices.
   - Returns periods with start_ts, end_ts, and length.

5. Recent Resolved Stats & Activation Logic
   - Scans backward up to CHALLENGE_RECENT_EVENTS resolved (win/loss) events and computes:
     - wins, losses, pending (skipped while counting), totalResolved, recentWinRate.
   - Activation priority:
     - If any dominant periods are present → active model = SINGLE_MODEL.
     - Else if totalResolved >= CHALLENGE_MIN_EVENTS and recentWinRate >= CHALLENGE_MIN_WIN_RATE → active model = SINGLE_MODEL.
     - Else → active_model = 'no_winner'.
   - This reduces false activations when there are many pending/unresolved entries.

6. Recent Win Entry Retrieval
   - For an active model, the analyzer finds the most recent row whose `${model}_result` is `'win'`.
   - If no such `'win'` exists, it falls back to the last log row.
   - The script then finds the index of that row and attaches the ATR volatility for that index (if available).

7. Output Generation
   - For each timeframe, the analyzer produces an object with:
     - summary: { active_model, win_rate, dominant_periods, analysis_timestamp, log_timestamp }
     - recent_win: the row object for the most-recent-win (or fallback last row) plus `volatility`.
   - Writes the aggregated results to `tools/challenge/model_winner.json` atomically.

8. Continuous Analysis & Safety
   - Runs once on startup and then at CHALLENGE_INTERVAL_MS intervals.
   - A runtime non-overlap guard `_running` prevents overlapping runs.
   - All file writes use a `.tmp` → rename pattern to avoid partial file writes.

---

## Example Output (model_winner.json)

Example structure (per timeframe):

```json
{
  "1m": {
    "summary": {
      "active_model": "tf",
      "win_rate": 0.72,
      "dominant_periods": [
        { "start_ts": "2025-09-27T15:00:00Z", "end_ts": "2025-09-27T15:45:00Z", "length": 20 }
      ],
      "analysis_timestamp": "2025-09-27T15:49:42Z",
      "log_timestamp": "2025-09-27T15:45:00Z"
    },
    "recent_win": {
      "timestamp": "2025-09-27T15:45:00Z",
      "entry_price": 12345.6,
      "next_price": 12390.1,
      "tf": "1m",
      "tf_model": "tf",
      "tf_result": "win",
      "volatility": 64.2
      // ...other signal/log fields present in the log row
    }
  }
}
```

Notes:
- `dominant_periods` will be an empty array if no activation or no dominance found.
- `win_rate` will be either the latest rolling win-rate (when dominance exists) or the recent resolved win-rate used for activation; otherwise 0 in `no_winner` case.

---

## Console Logging / Diagnostics

During analysis the script prints per-timeframe diagnostics including:
- Active model and win-rate summary.
- Recent counts (wins/losses/pending/totalResolved) used for recent-statistics activation.
- Detected dominant periods (if any).
- If a previous run is still executing, the script will log and skip the interval.

---

## Best Practices

- Keep challenge logs current and ensure resolved events are reflected (entries labeled `win` or `loss`); pending entries are ignored by the recent-statistics logic.
- Tune CHALLENGE_RECENT_EVENTS and CHALLENGE_MIN_EVENTS to reflect how many resolved outcomes you expect in a short window; increase them if you want more confidence before activation.
- Consider adjusting DOMINANCE_THRESHOLD, DOMINANCE_MIN_LENGTH, and CHALLENGE_MIN_WIN_RATE to balance sensitivity vs. robustness.
- Review `model_winner.json` regularly to verify activation decisions and to inspect the volatility attached to the recent win entry.

---

## Troubleshooting

- If `model_winner.json` is not updating:
  - Ensure the analyzer has read permissions for `challenge_{tf}.log` files.
  - Ensure `.env` values are valid numbers or absent (defaults will apply).
  - Check console logs for parse errors or file read errors.
- If you see frequent `Previous analysis still running, skipping this interval.` messages, increase CHALLENGE_INTERVAL_MS or investigate why analysis is slow (large logs, IO issues).

---

## Disclaimer

This script is an analytics helper for model selection and does not execute trades. Use the output judiciously and ensure logs are accurate and up-to-date for meaningful results.

---
