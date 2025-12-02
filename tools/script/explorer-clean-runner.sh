#!/usr/bin/env bash
# Robust wrapper to run explorer.js clean from anywhere.
# - Finds explorer.js in a set of sensible locations relative to the repo.
# - Filters out unwanted "stopmessage" lines (case-insensitive).
# - Preserves the original exit code so PM2 behaves properly.
#
# Place this at: tools/script/explorer-clean-runner.sh
# Make executable: chmod +x tools/script/explorer-clean-runner.sh

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Try to discover repository root: prefer git top-level, otherwise assume two levels up from script dir
ROOT_DIR="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$ROOT_DIR" ]; then
  # fallback: two levels up (assumes script is at <repo>/tools/script)
  ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." 2>/dev/null && pwd || echo "")"
fi

# If still empty, use script dir parent-parent
if [ -z "$ROOT_DIR" ]; then
  ROOT_DIR="${SCRIPT_DIR}/../.."
fi
ROOT_DIR="$(cd "$ROOT_DIR" 2>/dev/null && pwd || echo "$ROOT_DIR")"

# Allow overriding the explorer path with env EXPLORER
if [ -n "${EXPLORER_OVERRIDE:-}" ]; then
  EXPLORER_CANDIDATES=("$EXPLORER_OVERRIDE")
else
  EXPLORER_CANDIDATES=(
    "$ROOT_DIR/explorer.js"
    "$ROOT_DIR/tools/explorer.js"
    "$ROOT_DIR/tools/script/explorer.js"
    "$ROOT_DIR/tools/scripts/explorer.js"
    "$ROOT_DIR/src/explorer.js"
    "$ROOT_DIR/app/explorer.js"
  )
fi

EXPLORER_PATH=""
for c in "${EXPLORER_CANDIDATES[@]}"; do
  if [ -f "$c" ]; then
    EXPLORER_PATH="$c"
    break
  fi
done

if [ -z "$EXPLORER_PATH" ]; then
  echo "[explorer-clean-runner] ERROR: explorer.js not found. Tried locations:"
  for c in "${EXPLORER_CANDIDATES[@]}"; do
    echo "  - $c"
  done
  echo "You can set EXPLORER_OVERRIDE to point to the correct file, e.g.:"
  echo "  EXPLORER_OVERRIDE=/full/path/to/explorer.js $0"
  exit 2
fi

# Node binary (can be overridden by env NODE_BIN)
NODE_BIN="${NODE_BIN:-node}"
ARGS="${@:-clean}"

# Filtering config
FILTER_REGEX="${FILTER_REGEX:-(?i)stopmessage}"
OUT_LOG="${OUT_LOG:-/dev/null}"    # default: no persistent log
ERR_LOG="${ERR_LOG:-/dev/null}"

echo "[explorer-clean-runner] running: ${NODE_BIN} ${EXPLORER_PATH} ${ARGS}"
echo "[explorer-clean-runner] repo root: ${ROOT_DIR}"
echo "[explorer-clean-runner] filtering regex: ${FILTER_REGEX}"

# Run and filter both stdout and stderr. Preserve exit code of the node process.
if command -v perl >/dev/null 2>&1; then
  # Use perl to apply the regex (supports (?i) case-insensitive inline)
  # Capture node exit code via a subshell and PIPESTATUS
  ( "${NODE_BIN}" "${EXPLORER_PATH}" ${ARGS} 2>&1 ) | perl -ne "print unless /$FILTER_REGEX/" | tee "$OUT_LOG"
  EXIT_CODE=${PIPESTATUS[0]:-${?}}
else
  # Fallback to grep -vi for simple case-insensitive filtering
  ( "${NODE_BIN}" "${EXPLORER_PATH}" ${ARGS} 2>&1 ) | grep -vi "stopmessage" | tee "$OUT_LOG"
  EXIT_CODE=${PIPESTATUS[0]:-${?}}
fi

exit "${EXIT_CODE}"
