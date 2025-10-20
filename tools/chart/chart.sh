#!/usr/bin/env bash
# tools/chart/chart.sh
#
# Trainer-style wrapper for scripts in tools/chart/
# - Mirrors train.sh behavior: prefers running scripts "via nvm" (Node 20) unless overridden by NODE_BIN
# - Discovers all .js chart scripts in this directory
# - Supports: --list, --all, --parallel, --verbose, --node-bin, --help
# - Runs each script with tools/chart as cwd, captures per-script logs under tools/chart/logs/
# - Exits non-zero when one or more scripts fail (sum of exit codes)
#
# Usage:
#   ./tools/chart/chart.sh --all --verbose --parallel
#   ./tools/chart/chart.sh --all --verbose
#   NODE_BIN=/path/to/node ./tools/chart/chart.sh --all
#   ./tools/chart/chart.sh chart_recognition.js
set -euo pipefail

# NVM_DIR default (same style as tools/train.sh)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

# load nvm (required unless NODE_BIN is provided)
if [ -z "${NODE_BIN:-}" ]; then
  if [ -s "${NVM_DIR}/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "${NVM_DIR}/nvm.sh"
  elif [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$HOME/.nvm/nvm.sh"
  else
    echo "nvm not found at ${NVM_DIR}/nvm.sh and NODE_BIN not set; install nvm or set NODE_BIN to a node v20 binary" >&2
    exit 2
  fi

  # ensure node 20 is installed and available (do not fail if install already present)
  nvm install 20 >/dev/null 2>&1 || true
fi

# Defaults
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$BASE_DIR/logs"
mkdir -p "$LOG_DIR"

# Discover scripts
mapfile -t AVAILABLE_SCRIPTS < <(cd "$BASE_DIR" 2>/dev/null && ls -1 *.js 2>/dev/null | sort || true)

# Aliases (optional)
declare -A ALIASES
ALIASES[recognition]="chart_recognition.js"
ALIASES[ccxt]="chart_ccxt_recognition.js"
ALIASES[multi]="chart_ccxt_multi.js"
ALIASES[magnitude]="chart_ccxt_recognition_magnitude.js"

# CLI flags
RUN_ALL=false
PARALLEL=false
VERBOSE=false
ARGS=()

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] [script-or-alias ...]

Options:
  --list                 Show available chart scripts
  --all                  Run all discovered chart scripts
  --parallel             Run scripts in parallel (backgrounded)
  --verbose              Print extra info and show per-script log paths
  --node-bin <path>      Explicit node binary to use (overrides nvm use)
  --help                 Show this help

Examples:
  $(basename "$0") --list
  $(basename "$0") --all --verbose
  NODE_BIN=/usr/local/bin/node $(basename "$0") --all
  $(basename "$0") recognition
EOF
}

# Parse args
while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h) usage; exit 0;;
    --list)
      echo "Available chart scripts in $BASE_DIR:"
      for s in "${AVAILABLE_SCRIPTS[@]}"; do echo "  - $s"; done
      exit 0
      ;;
    --all) RUN_ALL=true; shift;;
    --parallel) PARALLEL=true; shift;;
    --verbose) VERBOSE=true; shift;;
    --node-bin) NODE_BIN="${2:-}"; shift 2;;
    --*) echo "Unknown option: $1" >&2; usage; exit 2;;
    *) ARGS+=("$1"); shift;;
  esac
done

# Build list of scripts to run
SCRIPTS_TO_RUN=()
if [ "$RUN_ALL" = true ]; then
  for s in "${AVAILABLE_SCRIPTS[@]}"; do
    [ -n "$s" ] && SCRIPTS_TO_RUN+=("$s")
  done
else
  if [ ${#ARGS[@]} -eq 0 ]; then
    echo "No script specified. Use --list or provide script names." >&2
    exit 2
  fi
  for a in "${ARGS[@]}"; do
    if printf '%s\n' "${AVAILABLE_SCRIPTS[@]}" | grep -qx -- "$a"; then
      SCRIPTS_TO_RUN+=("$a"); continue
    fi
    if [ -n "${ALIASES[$a]:-}" ]; then
      candidate="${ALIASES[$a]}"
      if printf '%s\n' "${AVAILABLE_SCRIPTS[@]}" | grep -qx -- "$candidate"; then
        SCRIPTS_TO_RUN+=("$candidate"); continue
      fi
    fi
    match=$(printf '%s\n' "${AVAILABLE_SCRIPTS[@]}" | grep -i "$a" | head -n 1 || true)
    if [ -n "$match" ]; then
      SCRIPTS_TO_RUN+=("$match"); continue
    fi
    echo "Could not resolve script: '$a' (use --list to see available scripts)" >&2
    exit 3
  done
fi

if [ ${#SCRIPTS_TO_RUN[@]} -eq 0 ]; then
  echo "No chart scripts resolved to run." >&2
  exit 2
fi

if [ "$VERBOSE" = true ]; then
  echo "[chart.sh] Using base dir: $BASE_DIR"
  if [ -n "${NODE_BIN:-}" ]; then
    echo "[chart.sh] NODE_BIN override: $NODE_BIN"
  else
    echo "[chart.sh] Using nvm (node v20) via \$NVM_DIR: ${NVM_DIR}"
  fi
  echo "[chart.sh] Scripts to run (count=${#SCRIPTS_TO_RUN[@]}):"
  for s in "${SCRIPTS_TO_RUN[@]}"; do echo "  - $s"; done
  echo "[chart.sh] Logs directory: $LOG_DIR"
fi

# Run a single script (ensures Node 20 via nvm use 20 like train.sh)
run_one() {
  local script="$1"
  local full="$BASE_DIR/$script"
  local logfile="$LOG_DIR/${script%.js}.log"

  if [ ! -f "$full" ]; then
    echo "Script not found: $full" >&2
    return 2
  fi

  echo "=== START $script $(date -Iseconds) ===" >> "$logfile"
  if [ "$VERBOSE" = true ]; then
    echo "[chart.sh] Running $script -> $logfile"
  fi

  if [ -n "${NODE_BIN:-}" ]; then
    (cd "$BASE_DIR" && "$NODE_BIN" "./$script" >> "$logfile" 2>&1)
    rc=$?
  else
    # mimic train.sh behavior: ensure node 20 is active
    nvm use 20 >/dev/null 2>&1 || {
      echo "Failed to switch to node 20 via nvm" >&2
      echo "=== END $script $(date -Iseconds) rc=2 ===" >> "$logfile"
      return 2
    }
    (cd "$BASE_DIR" && node "./$script" >> "$logfile" 2>&1)
    rc=$?
  fi

  echo "=== END $script $(date -Iseconds) rc=$rc ===" >> "$logfile"
  if [ "$rc" -ne 0 ]; then
    echo "[chart.sh] script $script exited with code $rc (see $logfile)" >&2
  fi
  return $rc
}

# Run scripts sequentially or in parallel (simple background & wait)
EXIT_SUM=0
if [ "$PARALLEL" = true ]; then
  for s in "${SCRIPTS_TO_RUN[@]}"; do
    run_one "$s" &
  done
  wait
  EXIT_SUM=$?
else
  for s in "${SCRIPTS_TO_RUN[@]}"; do
    if [ "$VERBOSE" = true ]; then echo "=== START $s ==="; fi
    run_one "$s" || EXIT_SUM=$((EXIT_SUM + $?))
    if [ "$VERBOSE" = true ]; then echo "=== END $s ==="; fi
  done
fi

if [ "$EXIT_SUM" -ne 0 ]; then
  echo "[chart.sh] One or more scripts failed. Combined exit sum: $EXIT_SUM" >&2
fi

exit $EXIT_SUM
