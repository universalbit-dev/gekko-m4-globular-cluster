#!/usr/bin/env bash
# Clean OHLCV logs runner for tools/explorer.js
# Place this file in tools/, make executable: chmod +x tools/clean_ohlcv.sh
#
# This script supports running: node explorer.js clean
# at fixed intervals aligned to clock boundaries: 1m, 5m, 15m, or 1h.
# It can run once, or be started/stopped as a simple background daemon.
#
# Usage:
#   ./clean_ohlcv.sh run-once
#   ./clean_ohlcv.sh start 5m     # start background daemon at 5-minute aligned intervals
#   ./clean_ohlcv.sh stop
#   ./clean_ohlcv.sh status
#   ./clean_ohlcv.sh start 1h
#
# Valid intervals: 1m, 5m, 15m, 1h
# If you prefer cron, example lines are at the end of this file.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPLORER_JS="$SCRIPT_DIR/explorer.js"
NODE_CMD="$(command -v node || true)"
PIDFILE="$SCRIPT_DIR/.clean_ohlcv.pid"
LOGFILE="$SCRIPT_DIR/clean_ohlcv.log"

if [[ -z "$NODE_CMD" ]]; then
  echo "node not found in PATH. Install Node.js or add it to PATH." >&2
  exit 2
fi

# map interval string to seconds
interval_to_seconds() {
  case "$1" in
    1m) echo 60 ;;
    5m) echo 300 ;;
    15m) echo 900 ;;
    1h) echo 3600 ;;
    *)
      echo "invalid" ;;
  esac
}

# compute seconds until next multiple of $period since epoch
seconds_until_next_boundary() {
  local period="$1"
  local now
  now=$(date +%s)
  local rem=$(( now % period ))
  if [[ $rem -eq 0 ]]; then
    echo 0
  else
    echo $(( period - rem ))
  fi
}

run_clean_once() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] running: node explorer.js clean" | tee -a "$LOGFILE"
  # run from tools/ so explorer.js can find configs relative to its location
  (cd "$SCRIPT_DIR" && "$NODE_CMD" "$EXPLORER_JS" clean) >>"$LOGFILE" 2>&1 || {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] explorer.js clean exited with non-zero status" | tee -a "$LOGFILE"
    return 1
  }
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] done" | tee -a "$LOGFILE"
}

# Main loop: align to the clock then run every $period seconds
run_loop() {
  local period="$1"

  # initial align
  local wait
  wait=$(seconds_until_next_boundary "$period")
  if [[ "$wait" -gt 0 ]]; then
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] waiting $wait seconds to align to boundary..." | tee -a "$LOGFILE"
    sleep "$wait"
  fi

  while true; do
    run_clean_once
    sleep "$period"
  done
}

start_daemon() {
  local interval="$1"

  if [[ -f "$PIDFILE" ]]; then
    local pid
    pid=$(<"$PIDFILE")
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "Daemon already running (PID $pid). Use stop first." >&2
      exit 1
    else
      echo "Stale PID file found, removing."
      rm -f "$PIDFILE"
    fi
  fi

  local seconds
  seconds=$(interval_to_seconds "$interval")
  if [[ "$seconds" == "invalid" ]]; then
    echo "Invalid interval: $interval" >&2
    exit 2
  fi

  echo "Starting clean daemon (interval=$interval)..." | tee -a "$LOGFILE"
  # start in background
  (
    # child process becomes session leader, so it won't die with this shell
    setsid bash -lc "trap 'echo \"Stopping...\"; exit 0' SIGTERM SIGINT; $(declare -f run_loop run_clean_once seconds_until_next_boundary interval_to_seconds); run_loop $seconds" \
      >>"$LOGFILE" 2>&1 &
    echo $! > "$PIDFILE"
  )
  sleep 0.2
  if [[ -f "$PIDFILE" ]]; then
    echo "Daemon started (PID $(<"$PIDFILE"))"
  else
    echo "Failed to start daemon. See $LOGFILE for details." >&2
    exit 1
  fi
}

stop_daemon() {
  if [[ ! -f "$PIDFILE" ]]; then
    echo "Not running (no PID file)." >&2
    return 1
  fi
  local pid
  pid=$(<"$PIDFILE")
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    echo "Process $pid not running. Removing PID file."
    rm -f "$PIDFILE"
    return 1
  fi
  echo "Stopping PID $pid..."
  kill "$pid"
  # wait for termination
  for i in {1..20}; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done
  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "PID $pid did not exit, sending SIGKILL..."
    kill -9 "$pid"
  fi
  rm -f "$PIDFILE"
  echo "Stopped."
}

status() {
  if [[ -f "$PIDFILE" ]]; then
    local pid
    pid=$(<"$PIDFILE")
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "Daemon running (PID $pid)."
      echo "Log: $LOGFILE"
      return 0
    else
      echo "PID file exists but process $pid not running."
      return 1
    fi
  else
    echo "Daemon not running."
    return 3
  fi
}

print_help() {
  cat <<EOF
Usage:
  $0 run-once           # run node explorer.js clean immediately once
  $0 start <interval>   # start background cleaner. intervals: 1m,5m,15m,1h
  $0 stop               # stop background cleaner
  $0 status             # show status
  $0 help               # this message

Examples:
  $0 run-once
  $0 start 5m
  $0 stop
EOF
}

# entrypoint
if [[ $# -lt 1 ]]; then
  print_help
  exit 1
fi

cmd="$1"
case "$cmd" in
  run-once)
    run_clean_once
    ;;
  start)
    if [[ $# -ne 2 ]]; then
      echo "start requires an interval (1m,5m,15m,1h)" >&2
      exit 1
    fi
    start_daemon "$2"
    ;;
  stop)
    stop_daemon
    ;;
  status)
    status
    ;;
  help|-h|--help)
    print_help
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    print_help
    exit 2
    ;;
esac

exit 0
