# clean_ohlcv.sh — Documentation

---

Table of contents

- Overview
- Behavior summary
- Prerequisites
- Files and environment variables
- Usage
  - Commands
  - Examples
- Intervals
- How the script works (implementation notes)
  - Alignment to clock boundaries
  - Daemon startup / backgrounding
  - PID management and stopping
  - Logging
  - Error handling and exit codes
- Cron examples
- systemd unit example
- Troubleshooting
- Security & permissions
- Suggestions / improvements
- Frequently asked questions (FAQ)

---

Overview

This script is a small runner to periodically execute the Node.js helper `explorer.js` with the `clean` subcommand to "clean" OHLCV logs. It supports:

- Single-run mode (run once immediately)
- Background daemon mode that runs at fixed intervals aligned to clock boundaries (1 minute, 5 minutes, 15 minutes, or 1 hour)
- Commands to start, stop, check status, and print help

Its primary job is to call the application-level cleaning command reliably and at predictable times (e.g., aligned to 5-minute marks).

Behavior summary

- Runs `node explorer.js clean` from the same directory as this script.
- Can be run once or as a background "daemon". The daemon aligns runs to the next clock boundary for the chosen interval (for example, if you choose 5m, runs occur at times where Unix epoch is divisible by 300).
- Captures standard output and error into a log file.
- Writes and uses a PID file to coordinate background runs.
- Provides helpful, timestamped log lines to indicate status and errors.

Prerequisites

- bash (script uses bash-specific features; run with /usr/bin/env bash)
- node (the `node` executable accessible via PATH; the script resolves it via `command -v node`)
- explorer.js must exist in the same directory as this script (SCRIPT_DIR/explorer.js)
- Permission to create/write the logfile and PID file in the script directory

Files and environment variables

- Script directory (detected automatically):
  - SCRIPT_DIR — computed at runtime: directory containing the script
- Primary helper to run:
  - EXPLORER_JS — set to "$SCRIPT_DIR/explorer.js"
- Node executable:
  - NODE_CMD — resolved with `command -v node`
- PID file:
  - PIDFILE — default is "$SCRIPT_DIR/.clean_ohlcv.pid"
- Log file:
  - LOGFILE — default is "$SCRIPT_DIR/clean_ohlcv.log"
  - Can be overridden with environment variable CLEAN_OHLCV_LOGFILE
    - Example: CLEAN_OHLCV_LOGFILE=/var/log/clean_ohlcv.log ./clean_ohlcv.sh start 5m

Usage

Run the script from its directory (or use full path). Example: assume the script is at tools/logs/json/ohlcv/clean_ohlcv.sh

Commands

- run-once
  - Run the cleaning action immediately one time.
  - Example: ./clean_ohlcv.sh run-once
- start <interval>
  - Start the background daemon, running at aligned intervals.
  - Valid intervals: 1m, 5m, 15m, 1h
  - Example: ./clean_ohlcv.sh start 5m
- stop
  - Stop background daemon if running (removes the PID file).
  - Example: ./clean_ohlcv.sh stop
- status
  - Print status whether daemon is running and log location.
  - Example: ./clean_ohlcv.sh status
- help, -h, --help
  - Print help text

Examples

- Run once (immediately):
  - CLEAN_OHLCV_LOGFILE=/tmp/c_ohlcv.log ./clean_ohlcv.sh run-once
- Start the 5-minute aligned daemon (background):
  - ./clean_ohlcv.sh start 5m
- Stop daemon:
  - ./clean_ohlcv.sh stop
- Check status:
  - ./clean_ohlcv.sh status

Intervals

The script maps interval strings to seconds:

- 1m  -> 60
- 5m  -> 300
- 15m -> 900
- 1h  -> 3600

If an invalid interval is passed to `start`, the script exits with an error.

How the script works (implementation notes)

High-level flow

- Resolves its own directory (SCRIPT_DIR) so it can run `explorer.js` with predictable relative paths.
- Ensures LOGFILE is set and its parent directory exists.
- Exports the runtime variables for the child background process.
- Provides helper functions:
  - interval_to_seconds — map interval string to seconds
  - seconds_until_next_boundary — compute seconds until next aligned multiple of period
  - run_clean_once — runs the Node script once and logs results
  - run_loop — main loop used by the daemon; aligns to boundary then runs every period seconds
  - start_daemon / stop_daemon / status — manage the background process via PID file
  - print_help — usage text

Alignment to clock boundaries

- The daemon does not simply sleep for fixed intervals starting from the moment you call `start`.
- Instead, it computes the seconds until the next multiple of the configured period since the Unix epoch, sleeps for that amount, and starts the first run exactly on a clock boundary. Then it sleeps for the full period between runs.
- Example:
  - Period = 300 seconds (5 minutes). If you start at 12:02:23, the script will wait till 12:05:00 (the next epoch multiple of 300) and then run; subsequent runs happen at 12:10:00, 12:15:00, etc.

Daemon startup / backgrounding

- start_daemon:
  - Validates no running PID (or removes stale PID file).
  - Converts the interval string into seconds.
  - Launches a subshell via `setsid bash -lc "..."` with the functions injected via `declare -f` (this exports the function definitions into the child).
  - The child installs a trap for SIGTERM and SIGINT so it can exit cleanly if killed.
  - Child runs `run_loop $seconds`.
  - The parent writes the child's PID ($!) to PIDFILE and returns control to the caller.
  - Output is appended to LOGFILE (stdout and stderr redirected).
- The child uses `setsid` so it detaches from terminal session; however it still runs as a child of the current shell and will be found via the PID file.

PID management and stopping

- PIDFILE defaults to "$SCRIPT_DIR/.clean_ohlcv.pid"
- stop_daemon:
  - Reads PID from PIDFILE.
  - Sends a SIGTERM (kill $pid) and waits up to ~4 seconds (20 * 0.2s) for process to exit.
  - If the process does not exit, sends SIGKILL (kill -9).
  - Removes PIDFILE after stopping.
- The script tests whether a PID is alive using kill -0 to determine process existence.

Logging

- Each run writes timestamped messages to LOGFILE, including:
  - start of run ("running: node explorer.js clean")
  - any errors if node is not found or `explorer.js clean` exits non-zero
  - completion notice ("done")
- All Node output (stdout & stderr) from explorer.js is appended to the same LOGFILE.

Error handling and exit codes

- set -euo pipefail at the top helps catch and abort on unhandled errors and unset variables.
- Common exit/return behaviors:
  - If LOGFILE is empty/unset and not provided via env, script exits with code 2 when starting (guard).
  - Starting with invalid interval: exit code 2 (in start_daemon).
  - start will exit with code 1 on failure to start the background process.
  - Running run-once: run_clean_once returns non-zero if node is not available or explorer.js returns non-zero.

Cron examples

If Cron is preferred over using this script’s daemon mode, you can schedule `run-once` runs instead. Examples (add to crontab via crontab -e):

- Run every minute (aligned naturally by cron):
  - * * * * * cd /path/to/tools/logs/json/ohlcv && ./clean_ohlcv.sh run-once >>clean_ohlcv.log 2>&1
- Run every 5 minutes:
  - */5 * * * * cd /path/to/tools/logs/json/ohlcv && ./clean_ohlcv.sh run-once >>clean_ohlcv.log 2>&1
- Run every hour at minute 0:
  - 0 * * * * cd /path/to/tools/logs/json/ohlcv && ./clean_ohlcv.sh run-once >>clean_ohlcv.log 2>&1

(Adjust paths and log locations to match your system.)

systemd unit example

If you prefer systemd instead of the script's backgrounding, create a unit like:

```
[Unit]
Description=clean_ohlcv runner
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/tools/logs/json/ohlcv
ExecStart=/bin/bash /path/to/tools/logs/json/ohlcv/clean_ohlcv.sh start 5m
ExecStop=/bin/bash /path/to/tools/logs/json/ohlcv/clean_ohlcv.sh stop
Restart=on-failure
User=your-user
Environment=CLEAN_OHLCV_LOGFILE=/var/log/clean_ohlcv.log

[Install]
WantedBy=multi-user.target
```

Note: Because the script launches a background process itself, prefer using `run-once` with a systemd timer if you want systemd to manage timing and the process lifetime. Alternatively, modify the script to run in the foreground for better integration with systemd.

Troubleshooting

- "LOGFILE is empty; aborting."
  - Ensure CLEAN_OHLCV_LOGFILE is not set to empty. By default LOGFILE is "$SCRIPT_DIR/clean_ohlcv.log". Make sure the script has permission to create/write it.
- "Daemon already running (PID N). Use stop first."
  - A previous instance is still active. Check the PID with `ps -p N -o pid,cmd` or use `./clean_ohlcv.sh stop`. If the process no longer exists, the script will remove the stale PID file on next start.
- explorer.js not found or returns error
  - Confirm explorer.js exists in the same directory as the script and is executable by node. Run `node explorer.js clean` manually in that directory to see full errors.
- NODE_CMD is empty / node not found in PATH
  - Install Node.js and ensure `node` is on PATH, or set NODE_CMD to a full path: NODE_CMD=/usr/bin/node ./clean_ohlcv.sh run-once
- Deamon does not stop with stop command
  - `stop` will send SIGTERM then SIGKILL if needed. If your OS is re-parenting processes, ensure the PID in the file actually belongs to the script. If the daemon was started by a different user, you must stop it with same user or as root.
- Logs very verbose / growing large
  - Implement log rotation (logrotate) for LOGFILE.

Security & permissions

- The script will write a PID file and log file into SCRIPT_DIR by default. Ensure correct ownership and permissions to prevent other users from tampering.
- Avoid running as root unless necessary. If you do run as root, ensure explorer.js and other files are secure.
- If using in a multi-user environment, consider restricting who can start/stop the daemon (e.g., wrapper systemd unit or directory permissions).

Suggestions / improvements

- Foreground mode option: make the daemon run in foreground (no setsid and backgrounding) so process supervisors (systemd, docker) can manage it directly.
- Logging improvements: add a rotation mechanism or integrate with syslog/journald.
- PID file atomicity: use `mkdir`-or-`flock` technique or use `set -o noclobber` with redirection to ensure only one starter can create the PIDfile atomically.
- Better signal handling: propagate SIGTERM to child processes spawned by the Node process (if any).
- Health check endpoint or status command can print last-run timestamp, last exit code, etc.
- Option to run explorer.js with Node.js version manager aware path (e.g., nvm) if needed.
- Allow configuring working directory and explicit path to explorer.js (instead of assuming same dir), via environment variables.

Frequently asked questions (FAQ)

Q: Why align to clock boundaries?
A: Aligning to clock boundaries ensures predictable run times (e.g., 05:00, 05:05, …). This is useful for operations that need to occur at natural time boundaries (aggregation, cleanup at OHLCV candle boundaries).

Q: Why does the daemon use setsid and bash -lc with declare -f?
A: The script injects the function definitions into the subshell via `declare -f` so the launched child can call the same shell functions. `setsid` detaches the process from the terminal session and helps it run as a background daemon.

Q: I want systemd to manage lifecycle. What do you recommend?
A: Use systemd to run `run-once` at the times you need with a systemd timer, or adapt the script to run in foreground so systemd can manage the service process directly.

Q: How to inspect what was run and when?
A: The log file contains timestamped messages and the Node command output. Example log lines:
- [2025-10-19T17:36:14Z] running: node explorer.js clean
- [2025-10-19T17:36:15Z] done

Exit codes summary

- 0 — Success (normal run or command processed)
- 1 — General failure (e.g., starting without required args)
- 2 — Specific failures like empty LOGFILE or invalid interval (used in a few places)
- Other codes may be returned by explorer.js when run.

Contact / ownership

- Repository: universalbit-dev/gekko-m4-globular-cluster
- Script author: maintained as part of repo (see repository for commit history and author metadata)

---

If you want, I can:
- Produce an example systemd timer file that runs `run-once` at 5m or other intervals.
- Convert the daemon behavior to a foreground mode better-suited for systemd.
- Add logrotate config for the LOGFILE.

Which of those would you like next?
