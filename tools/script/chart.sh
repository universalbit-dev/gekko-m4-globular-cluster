#!/usr/bin/env bash
# tools/script/chart.sh
# Optimized wrapper to run chart scripts using Node (default: 20)
# - robust nvm handling via `nvm exec`
# - optional parallelism control (-j / --jobs)
# - NODE_BIN override to bypass nvm (useful for pm2/systemd)
# - clearer diagnostics and safer exit-code handling
set -euo pipefail

# Defaults (allow environment overrides)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
DEFAULT_NODE_VERSION="${DEFAULT_NODE_VERSION:-20}"
NODE_VERSION="${NODE_VERSION:-$DEFAULT_NODE_VERSION}"
NODE_BIN="${NODE_BIN:-}"   # optional explicit node path
JOBS="${JOBS:-}"           # optional explicit jobs; will default to nproc if empty

# Resolve base dir relative to this script
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # script/
CANDIDATE_CHART_DIRS=(
  "$BASE_DIR/chart"
  "$BASE_DIR/../tools/chart"
  "$BASE_DIR/../script/chart"
  "$BASE_DIR/../../tools/chart"
)

CHART_DIR=""
for d in "${CANDIDATE_CHART_DIRS[@]}"; do
  if [ -d "$d" ]; then
    CHART_DIR="$(cd "$d" && pwd)"
    break
  fi
done

if [ -z "$CHART_DIR" ]; then
  echo "Chart directory not found. Tried candidates: ${CANDIDATE_CHART_DIRS[*]}" >&2
  exit 2
fi

# Discover top-level .js files
mapfile -t AVAILABLE_SCRIPTS < <(
  find "$CHART_DIR" -maxdepth 1 -type f -iname '*.js' -printf '%f\n' 2>/dev/null | sort || true
)

# aliases (short names -> filenames)
declare -A ALIASES=(
  [multi]="chart_ccxt_multi.js"
  [ccxt]="chart_ccxt_recognition.js"
  [rec]="chart_recognition.js"
  [magnitude]="chart_ccxt_recognition_magnitude.js"
  [config]="chart.config.js"
)

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] [script-or-alias ...]

Options:
  --list                 List available chart scripts (from $CHART_DIR)
  --all                  Run all discovered chart scripts (alphabetical)
  --parallel             Run scripts in background (capture exit codes)
  -j, --jobs N           Run up to N scripts concurrently (default: number of CPUs)
  --verbose              Print extra info before running each script
  --node-bin <path>      Use explicit node binary (overrides nvm)
  --node-version <ver>   Preferred Node major version for nvm (default: $NODE_VERSION)
  --help
Examples:
  $(basename "$0") --list
  $(basename "$0") --all --verbose
  $(basename "$0") -j 4 multi
  NODE_VERSION=20 bash $(basename "$0") rec
EOF
}

# parse args
RUN_ALL=false
PARALLEL=false
VERBOSE=false
ARGS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h) usage; exit 0;;
    --list)
      echo "Available chart scripts in $CHART_DIR:"
      for s in "${AVAILABLE_SCRIPTS[@]}"; do
        local_aliases=()
        for k in "${!ALIASES[@]}"; do
          [ "${ALIASES[$k]}" = "$s" ] && local_aliases+=("$k")
        done
        if [ "${#local_aliases[@]}" -gt 0 ]; then
          printf '  - %s (aliases: %s)\n' "$s" "${local_aliases[*]}"
        else
          printf '  - %s\n' "$s"
        fi
      done
      exit 0
      ;;
    --all) RUN_ALL=true; shift;;
    --parallel) PARALLEL=true; shift;;
    --verbose) VERBOSE=true; shift;;
    --node-bin) NODE_BIN="${2:-}"; shift 2;;
    --node-version) NODE_VERSION="${2:-$NODE_VERSION}"; shift 2;;
    -j|--jobs) JOBS="${2:-}"; shift 2;;
    --) shift; break;;
    --*) echo "Unknown option: $1" >&2; usage; exit 2;;
    -*) echo "Unknown short option: $1" >&2; usage; exit 2;;
    *) ARGS+=("$1"); shift;;
  esac
done

# compute job limit (if not provided)
if [ -z "$JOBS" ]; then
  if command -v nproc >/dev/null 2>&1; then
    JOBS="$(nproc)"
  else
    JOBS=4
  fi
fi

# Build scripts list
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
    match=$(printf '%s\n' "${AVAILABLE_SCRIPTS[@]}" | grep -i -- "$a" | head -n 1 || true)
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

# Helper: safe nvm source (disable nounset only while sourcing)
_try_source_nvm() {
  export NVM_IOJS="${NVM_IOJS:-}"
  export NVM_CD_FLAGS="${NVM_CD_FLAGS:-}"
  export NVM_LAZY_LOAD="${NVM_LAZY_LOAD:-}"

  local candidates=(
    "$NVM_DIR/nvm.sh"
    "$HOME/.nvm/nvm.sh"
    "$HOME/.config/nvm/nvm.sh"
    "/usr/local/opt/nvm/nvm.sh"
  )
  for f in "${candidates[@]}"; do
    if [ -s "$f" ]; then
      set +u
      # shellcheck source=/dev/null
      . "$f"
      set -u
      return 0
    fi
  done
  return 1
}

# Decide execution strategy
USE_NVM=false
NODE_CMD_DIRECT=""

if [ -n "${NODE_BIN:-}" ]; then
  if [ -x "$NODE_BIN" ]; then
    NODE_CMD_DIRECT="$NODE_BIN"
  else
    echo "NODE_BIN set but not executable: $NODE_BIN" >&2
    exit 2
  fi
else
  if _try_source_nvm >/dev/null 2>&1 && command -v nvm >/dev/null 2>&1; then
    USE_NVM=true
  else
    if command -v node >/dev/null 2>&1; then
      NODE_CMD_DIRECT="$(command -v node)"
    else
      echo "No node binary found: set NODE_BIN or install nvm/node" >&2
      exit 3
    fi
  fi
fi

[ "$VERBOSE" = true ] && {
  echo "[chart.sh] BASE_DIR: $BASE_DIR"
  echo "[chart.sh] CHART_DIR: $CHART_DIR"
  echo "[chart.sh] NODE_BIN override: ${NODE_BIN:-<none>}"
  echo "[chart.sh] NODE_VERSION: $NODE_VERSION"
  echo "[chart.sh] USING_NVM: $USE_NVM"
  echo "[chart.sh] JOBS: $JOBS"
  echo "[chart.sh] Scripts to run (count=${#SCRIPTS_TO_RUN[@]}):"
  for s in "${SCRIPTS_TO_RUN[@]}"; do echo "  - $s"; done
}

# run a single chart script; returns its exit code
run_one() {
  local script="$1"
  local full="$CHART_DIR/$script"

  if [ ! -f "$full" ]; then
    echo "Script not found: $full" >&2
    return 2
  fi

  [ "$VERBOSE" = true ] && echo "[chart.sh] Running $script (cwd=$CHART_DIR)"

  if [ "$USE_NVM" = true ]; then
    (
      cd "$CHART_DIR"
      # nvm exec launches the requested node version for the single command
      nvm exec "$NODE_VERSION" -- node "./$script"
    )
    return $?
  else
    (cd "$CHART_DIR" && "$NODE_CMD_DIRECT" "./$script")
    return $?
  fi
}

# Parallel runner with job slots
FAILED=0
PIDS=()
declare -A PID_TO_SCRIPT=()

if [ "$PARALLEL" = true ]; then
  running=0
  for s in "${SCRIPTS_TO_RUN[@]}"; do
    # wait for a free slot
    while [ "$running" -ge "$JOBS" ]; do
      # prefer wait -n, fallback to waiting for first pid
      if wait -n 2>/dev/null; then
        :
      else
        if [ ${#PIDS[@]} -gt 0 ]; then
          pid="${PIDS[0]}"
          wait "$pid" || true
          PIDS=("${PIDS[@]:1}")
        else
          break
        fi
      fi
      # compact remaining pids array
      new=()
      for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
          new+=("$pid")
        fi
      done
      PIDS=("${new[@]}")
      running="${#PIDS[@]}"
    done

    run_one "$s" &
    pid=$!
    PIDS+=("$pid")
    PID_TO_SCRIPT[$pid]="$s"
    running="${#PIDS[@]}"
    [ "$VERBOSE" = true ] && echo "Started $s (pid $pid) -- running=$running"
  done

  # wait for remaining
  for pid in "${PIDS[@]}"; do
    if ! wait "$pid"; then
      rc=$?
      echo "[chart.sh] Script failed: ${PID_TO_SCRIPT[$pid]} (pid $pid) exit $rc" >&2
      FAILED=1
    fi
    [ "$VERBOSE" = true ] && echo "Finished ${PID_TO_SCRIPT[$pid]} (pid $pid)"
  done
else
  for s in "${SCRIPTS_TO_RUN[@]}"; do
    [ "$VERBOSE" = true ] && echo "=== START $s ==="
    if ! run_one "$s"; then
      echo "[chart.sh] Script failed: $s" >&2
      FAILED=1
    fi
    [ "$VERBOSE" = true ] && echo "=== END $s ==="
  done
fi

if [ "$FAILED" -ne 0 ]; then
  echo "One or more scripts failed. Exiting non-zero." >&2
fi

exit $FAILED
