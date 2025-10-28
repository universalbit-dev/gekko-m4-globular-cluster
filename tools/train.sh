#!/usr/bin/env bash
# tools/train.sh
# Enhanced wrapper to run trainer scripts under Node 20 via nvm.
#
# Features:
# - auto-detects trainer scripts under tools/train/
# - supports short aliases (multi, aggregate, ohlcv, ccxt)
# - supports running one script, multiple scripts, or all detected scripts
# - supports --list to show available scripts
# - ensures Node 20 is active (via nvm) before running each script
# - returns a non-zero exit code if any script fails
#
# Usage:
#   ./tools/train.sh --all --verbose --parallel
#   ./tools/train.sh multi
#   ./tools/train.sh train_ccxt_ohlcv_multi.js
#   ./tools/train.sh aggregate multi    # runs aggregate then multi
#   ./tools/train.sh --all               # run every script found under tools/train
#   ./tools/train.sh --help
set -euo pipefail

# NVM_DIR default (change if your nvm installed elsewhere)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

# load nvm
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
else
  echo "nvm not found at $NVM_DIR/nvm.sh; install nvm first: https://github.com/nvm-sh/nvm" >&2
  exit 2
fi

# Ensure node 20 is installed and available
# Don't stop on error for install (it may already be present)
nvm install 20 >/dev/null 2>&1 || true

# Directory layout
# BASE_DIR will be the tools folder where this script resides
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
TRAIN_DIR="$BASE_DIR/train"

# discover available trainer scripts (basename list)
mapfile -t AVAILABLE_SCRIPTS < <(cd "$TRAIN_DIR" 2>/dev/null && ls -1 *.js 2>/dev/null | sort || true)

# shorthand aliases mapping to filenames (if present)
declare -A ALIASES
ALIASES[tensorflowjs]="train_ccxt_ohlcv_multi.js"
ALIASES[aggregate]="train_ccxt_ohlcv_aggregate.js"
ALIASES[ohlcv]="train_ohlcv.js"
ALIASES[convnet]="train_ccxt_ohlcv.js"
ALIASES[label_multi]="label_ohlcv_multi.js"
ALIASES[label_aggregate]="label_ohlcv_aggregate.js"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] [script-or-alias ...]

Options:
  --list         Show available trainer scripts (from tools/train/)
  --all          Run all discovered trainer scripts in alphabetical order
  --help, -h     Show this help
  --once         Run each requested script once (default behavior)
  --parallel     Run requested scripts in parallel (backgrounded) - use with care
  --verbose      Print extra info before running each script

Script identifiers:
  You can supply either the exact filename (train_xxx.js) or a short alias:
    multi, aggregate, ohlcv, ccxt, ir, label_multi, label_aggregate

Examples:
  $(basename "$0") --list
  $(basename "$0") multi
  $(basename "$0") aggregate multi
  $(basename "$0") --all
EOF
}

if [ $# -eq 0 ]; then
  usage
  exit 0
fi

# parse simple flags
RUN_ALL=false
PARALLEL=false
VERBOSE=false
ARGS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h) usage; exit 0;;
    --list)
      echo "Available trainer scripts in $TRAIN_DIR:"
      for s in "${AVAILABLE_SCRIPTS[@]}"; do echo "  - $s"; done
      exit 0
      ;;
    --all)
      RUN_ALL=true
      shift
      ;;
    --parallel)
      PARALLEL=true
      shift
      ;;
    --once)
      # explicit, no-op because we run once by default
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --*)
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

# Build the final list of scripts to run
SCRIPTS_TO_RUN=()

if [ "$RUN_ALL" = true ]; then
  for s in "${AVAILABLE_SCRIPTS[@]}"; do
    SCRIPTS_TO_RUN+=("$s")
  done
else
  if [ ${#ARGS[@]} -eq 0 ]; then
    echo "No script specified. Use --list to see available scripts." >&2
    exit 2
  fi
  for a in "${ARGS[@]}"; do
    # if argument matches exact filename
    if printf '%s\n' "${AVAILABLE_SCRIPTS[@]}" | grep -qx -- "$a"; then
      SCRIPTS_TO_RUN+=("$a")
      continue
    fi
    # if argument is an alias
    if [ -n "${ALIASES[$a]:-}" ]; then
      target="${ALIASES[$a]}"
      # only add it if present
      if printf '%s\n' "${AVAILABLE_SCRIPTS[@]}" | grep -qx -- "$target"; then
        SCRIPTS_TO_RUN+=("$target")
        continue
      else
        echo "Alias '$a' maps to '$target' but file not found in $TRAIN_DIR" >&2
        exit 3
      fi
    fi
    # try to match by suffix (e.g., "multi" might match filename containing "multi")
    match=$(printf '%s\n' "${AVAILABLE_SCRIPTS[@]}" | grep -i "$a" | head -n 1 || true)
    if [ -n "$match" ]; then
      SCRIPTS_TO_RUN+=("$match")
      continue
    fi
    echo "Could not resolve script or alias: '$a'" >&2
    exit 3
  done
fi

# Ensure we have at least one script to run
if [ ${#SCRIPTS_TO_RUN[@]} -eq 0 ]; then
  echo "No scripts resolved to run." >&2
  exit 2
fi

# Function to run one script (ensures nvm use 20 before running)
run_one() {
  local script="$1"
  local fullpath="$TRAIN_DIR/$script"

  if [ ! -f "$fullpath" ]; then
    echo "Script not found: $fullpath" >&2
    return 2
  fi

  # ensure Node 20 is active for each run (in case invoked in new shell)
  nvm use 20 >/dev/null 2>&1 || {
    echo "Failed to switch to node 20 via nvm" >&2
    return 2
  }

  if [ "$VERBOSE" = true ]; then
    echo "[train.sh] Running $script with $(node -v) (cwd=$TRAIN_DIR)"
  fi

  # Run the script with TRAIN_DIR as cwd so scripts using relative paths behave correctly
  (cd "$TRAIN_DIR" && node "./$script")
  return $?
}

# Run scripts sequentially or in parallel
EXIT_SUM=0
if [ "$PARALLEL" = true ]; then
  # run in background and wait
  for s in "${SCRIPTS_TO_RUN[@]}"; do
    run_one "$s" &
  done
  wait
  EXIT_SUM=$?
else
  for s in "${SCRIPTS_TO_RUN[@]}"; do
    if [ "$VERBOSE" = true ]; then echo "=== START $s ==="; fi
    run_one "$s" || EXIT_SUM=$((EXIT_SUM + $?))
    if [ "$VERBOSE" = true ]; then echo "=== END $s (exit $?) ==="; fi
  done
fi

if [ "$EXIT_SUM" -ne 0 ]; then
  echo "One or more scripts failed. Combined exit sum: $EXIT_SUM" >&2
fi

exit $EXIT_SUM
