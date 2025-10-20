#!/usr/bin/env bash
# tools/chart/chart.sh
#
# Persistent runner for scripts in tools/chart/
# - Supports one-shot runs (default) or continuous daemon mode (--loop --interval N)
# - NODE_BIN overrides nvm/non-interactive shells; otherwise attempts nvm run $NODE_VERSION
# - Writes per-script logs to tools/chart/logs/
# - Usage examples:
#     ./tools/chart/chart.sh --all --verbose
#     ./tools/chart/chart.sh --all --loop --interval 300 --verbose
set -euo pipefail

# Defaults and environment
DEFAULT_NODE_VERSION="${DEFAULT_NODE_VERSION:-20}"
NODE_VERSION="${NODE_VERSION:-$DEFAULT_NODE_VERSION}"
NODE_BIN="${NODE_BIN:-}"
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$BASE_DIR/logs"
mkdir -p "$LOG_DIR"

# discover scripts (exclude this wrapper)
mapfile -t AVAILABLE_SCRIPTS < <(cd "$BASE_DIR" && printf '%s\n' ./*.js 2>/dev/null | sed 's|^\./||' | grep -v "$(basename "$0")" | sort || true)

declare -A ALIASES=(
  [recognition]=chart_recognition.js
  [ccxt]=chart_ccxt_recognition.js
  [multi]=chart_ccxt_multi.js
  [magnitude]=chart_ccxt_recognition_magnitude.js
)

# CLI defaults
RUN_ALL=false
PARALLEL=false
VERBOSE=false
DRY_RUN=false
LOOP=true
INTERVAL=300   # default seconds between runs when looping
ARGS=()

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] [script-or-alias ...]

Options:
  --list                 List available chart scripts
  --all                  Run all discovered chart scripts
  --parallel             Run scripts in background (simple)
  --verbose              Verbose diagnostics
  --dry-run              Show planned actions and exit
  --loop                 Run continuously (daemon-style)
  --interval <seconds>   Sleep interval between iterations when --loop (default: ${INTERVAL}s)
  --node-bin <path>      Explicit node binary (absolute path) - overrides nvm/node on PATH
  --node-version <ver>   Preferred Node major version (default: ${NODE_VERSION})
  --help
Examples:
  $(basename "$0") --list
  $(basename "$0") --all --verbose
  ./$(basename "$0") --all --loop --interval 300 --verbose
  NODE_BIN=/usr/bin/node ./$(basename "$0") --all --loop
EOF
}

# parse args
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
    --dry-run) DRY_RUN=true; shift;;
    --loop) LOOP=true; shift;;
    --interval) INTERVAL="${2:-$INTERVAL}"; shift 2;;
    --node-bin) NODE_BIN="${2:-}"; shift 2;;
    --node-version) NODE_VERSION="${2:-$NODE_VERSION}"; shift 2;;
    --*) echo "Unknown option: $1" >&2; usage; exit 2;;
    *) ARGS+=("$1"); shift;;
  esac
done

# Build list of scripts to run
SCRIPTS_TO_RUN=()
if [ "$RUN_ALL" = true ]; then
  for s in "${AVAILABLE_SCRIPTS[@]}"; do [ -n "$s" ] && SCRIPTS_TO_RUN+=("$s"); done
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

# nvm sourcing helper (best-effort)
_try_source_nvm() {
  if [ -n "${NVM_DIR:-}" ] && [ -s "${NVM_DIR}/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "${NVM_DIR}/nvm.sh"
    return 0
  fi
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$HOME/.nvm/nvm.sh"
    return 0
  fi
  if [ -s "$HOME/.config/nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$HOME/.config/nvm/nvm.sh"
    return 0
  fi
  if [ -s "/usr/local/opt/nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "/usr/local/opt/nvm/nvm.sh"
    return 0
  fi
  return 1
}

# Determine node command: NODE_BIN -> nvm run NODE_VERSION -> node on PATH
get_node_cmd() {
  if [ -n "${NODE_BIN:-}" ]; then
    if [ -x "$NODE_BIN" ]; then
      echo "$NODE_BIN"
      return 0
    else
      echo "NODE_BIN set but not executable: $NODE_BIN" >&2
      return 1
    fi
  fi

  if _try_source_nvm >/dev/null 2>&1 && command -v nvm >/dev/null 2>&1; then
    # ensure requested version is installed quietly
    nvm install "$NODE_VERSION" >/dev/null 2>&1 || true
    echo "nvm run $NODE_VERSION --node"
    return 0
  fi

  if command -v node >/dev/null 2>&1; then
    nodepath=$(command -v node)
    if [ "$VERBOSE" = true ]; then
      nodever=$("$nodepath" -v 2>/dev/null || echo "v?")
      echo "[chart.sh] Using node on PATH: $nodepath ($nodever)"
    fi
    echo "$nodepath"
    return 0
  fi

  echo "No node binary found. Set NODE_BIN to an absolute node v$NODE_VERSION binary or install nvm." >&2
  return 1
}

NODE_CMD=$(get_node_cmd) || exit 3

if [ "$VERBOSE" = true ] || [ "$DRY_RUN" = true ]; then
  echo "[chart.sh] NODE_CMD: $NODE_CMD"
  echo "[chart.sh] NODE_VERSION: $NODE_VERSION"
  echo "[chart.sh] LOOP: $LOOP interval=${INTERVAL}s"
  echo "[chart.sh] Scripts to run (count=${#SCRIPTS_TO_RUN[@]}):"
  for s in "${SCRIPTS_TO_RUN[@]}"; do echo "  - $s"; done
  echo "[chart.sh] Logs dir: $LOG_DIR"
  [ "$DRY_RUN" = true ] && echo "[chart.sh] Dry-run: nothing will be executed."
fi

if [ "$DRY_RUN" = true ]; then
  exit 0
fi

trap 'echo "Interrupted, terminating children..."; pkill -P $$ || true; exit 130' INT TERM

# run a single script using resolved NODE_CMD, log to per-script file
run_script() {
  local script="$1"
  local logfile="$LOG_DIR/${script%.js}.log"
  echo "=== START $script $(date -Iseconds) ===" >> "$logfile"
  [ "$VERBOSE" = true ] && echo "[chart.sh] Running $script -> $logfile"

  if [[ "$NODE_CMD" == nvm\ run* ]]; then
    # ensure nvm loaded for the child shell
    _try_source_nvm >/dev/null 2>&1 || true
    (cd "$BASE_DIR" && eval "$NODE_CMD \"./$script\"" >> "$logfile" 2>&1)
    rc=$?
  else
    (cd "$BASE_DIR" && "$NODE_CMD" "./$script" >> "$logfile" 2>&1)
    rc=$?
  fi

  echo "=== END $script $(date -Iseconds) rc=$rc ===" >> "$logfile"
  if [ "$rc" -ne 0 ]; then
    echo "[chart.sh] $script exited rc=$rc (see $logfile)" >&2
  fi
  return $rc
}

# run set of scripts (parallel or sequential)
run_all_once() {
  local rc=0
  if [ "$PARALLEL" = true ]; then
    for s in "${SCRIPTS_TO_RUN[@]}"; do
      run_script "$s" &
    done
    wait
    rc=$?
  else
    for s in "${SCRIPTS_TO_RUN[@]}"; do
      run_script "$s" || rc=$((rc + $?))
    done
  fi
  return $rc
}

# main runner: either single iteration or loop
EXIT_SUM=0
if [ "$LOOP" = true ]; then
  [ "$VERBOSE" = true ] && echo "[chart.sh] Entering loop mode. Interval=${INTERVAL}s"
  while true; do
    run_all_once || EXIT_SUM=$((EXIT_SUM + $?))
    sleep "$INTERVAL"
  done
else
  run_all_once || EXIT_SUM=$((EXIT_SUM + $?))
fi

if [ "$EXIT_SUM" -ne 0 ]; then
  echo "[chart.sh] One or more scripts failed. Combined exit sum: $EXIT_SUM" >&2
fi

exit $EXIT_SUM
