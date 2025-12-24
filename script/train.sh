#!/usr/bin/env bash
# tools/script/train.sh
# Optimized wrapper to run trainer scripts using Node (default: 20)
# - more robust nvm handling via nvm exec
# - optional parallelism control (-j / --jobs)
# - clearer diagnostics and safer invocation
set -euo pipefail

# Defaults (allow environment overrides)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
DEFAULT_NODE_VERSION="${DEFAULT_NODE_VERSION:-20}"
NODE_VERSION="${NODE_VERSION:-$DEFAULT_NODE_VERSION}"
NODE_BIN="${NODE_BIN:-}"   # optional explicit node path
JOBS="${JOBS:-}"           # optional explicit jobs; will default to nproc if empty

# Resolve base dir robustly relative to this script
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # tools/script/
CANDIDATE_TRAIN_DIRS=(
  "$BASE_DIR/train"
  "$BASE_DIR/../train"
  "$BASE_DIR/../../train"
  "$BASE_DIR/../tools/train"
  "$BASE_DIR/../../tools/train"
  "$BASE_DIR/../../../tools/train"
)

TRAIN_DIR=""
for d in "${CANDIDATE_TRAIN_DIRS[@]}"; do
  if [ -d "$d" ]; then
    TRAIN_DIR="$(cd "$d" && pwd)"
    break
  fi
done

if [ -z "$TRAIN_DIR" ]; then
  echo "Train directory not found. Tried candidates: ${CANDIDATE_TRAIN_DIRS[*]}" >&2
  exit 2
fi

# Discover available trainer scripts (top-level .js files)
mapfile -t AVAILABLE_SCRIPTS < <(
  find "$TRAIN_DIR" -maxdepth 1 -type f -iname '*.js' -printf '%f\n' 2>/dev/null | sort || true
)

declare -A ALIASES=(
  [tensorflowjs]="train_ccxt_ohlcv_multi.js"
  [aggregate]="train_ccxt_ohlcv_aggregate.js"
  [ohlcv]="train_ohlcv.js"
  [convnet]="train_ccxt_ohlcv.js"
  [label_multi]="label_ohlcv_multi.js"
  [label_aggregate]="label_ohlcv_aggregate.js"
  [multi]="train_ccxt_ohlcv_multi.js"
  [ccxt]="train_ccxt_ohlcv_multi.js"
)

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] [script-or-alias ...]

Options:
  --list                 List available trainer scripts (from $TRAIN_DIR)
  --all                  Run all discovered trainer scripts (alphabetical)
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
  NODE_VERSION=20 bash $(basename "$0") ohlcv
EOF
}

# default flags
RUN_ALL=false
PARALLEL=false
VERBOSE=false
ARGS=()

# simple long/short option parse
while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h) usage; exit 0;;
    --list)
      echo "Available trainer scripts in $TRAIN_DIR:"
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
    # exact match
    if printf '%s\n' "${AVAILABLE_SCRIPTS[@]}" | grep -qx -- "$a"; then
      SCRIPTS_TO_RUN+=("$a"); continue
    fi
    # alias
    if [ -n "${ALIASES[$a]:-}" ]; then
      candidate="${ALIASES[$a]}"
      if printf '%s\n' "${AVAILABLE_SCRIPTS[@]}" | grep -qx -- "$candidate"; then
        SCRIPTS_TO_RUN+=("$candidate"); continue
      fi
    fi
    # fuzzy case-insensitive match (first match)
    match=$(printf '%s\n' "${AVAILABLE_SCRIPTS[@]}" | grep -i -- "$a" | head -n 1 || true)
    if [ -n "$match" ]; then
      SCRIPTS_TO_RUN+=("$match"); continue
    fi
    echo "Could not resolve script: '$a' (use --list to see available scripts)" >&2
    exit 3
  done
fi

if [ ${#SCRIPTS_TO_RUN[@]} -eq 0 ]; then
  echo "No trainer scripts resolved to run." >&2
  exit 2
fi

# Try to source nvm (allow missing nvm)
_try_source_nvm() {
  local candidates=(
    "$NVM_DIR/nvm.sh"
    "$HOME/.nvm/nvm.sh"
    "$HOME/.config/nvm/nvm.sh"
    "/usr/local/opt/nvm/nvm.sh"
  )
  for f in "${candidates[@]}"; do
    if [ -s "$f" ]; then
      # disable nounset around source to avoid issues
      set +u
      # shellcheck source=/dev/null
      . "$f"
      set -u
      return 0
    fi
  done
  return 1
}

# Resolve execution strategy:
# - If NODE_BIN set and executable, we will call it directly
# - Else if nvm available, we will use: nvm exec <ver> -- node <script>
# - Else try node on PATH and warn if major mismatch
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
  echo "[train.sh] BASE_DIR: $BASE_DIR"
  echo "[train.sh] TRAIN_DIR: $TRAIN_DIR"
  echo "[train.sh] NODE_BIN override: ${NODE_BIN:-<none>}"
  echo "[train.sh] NODE_VERSION: $NODE_VERSION"
  echo "[train.sh] USING_NVM: $USE_NVM"
  echo "[train.sh] JOBS: $JOBS"
  echo "[train.sh] Scripts to run (count=${#SCRIPTS_TO_RUN[@]}):"
  for s in "${SCRIPTS_TO_RUN[@]}"; do echo "  - $s"; done
}

# run a single trainer script; returns its exit code
run_one() {
  local script="$1"
  local full="$TRAIN_DIR/$script"

  if [ ! -f "$full" ]; then
    echo "Script not found: $full" >&2
    return 2
  fi

  [ "$VERBOSE" = true ] && echo "[train.sh] Running $script (cwd=$TRAIN_DIR)"

  if [ "$USE_NVM" = true ]; then
    # nvm exec runs the requested node version for a single command without changing shell
    # use -- to end nvm options, then 'node' and path
    # redirect node's cwd via (cd ...) to ensure relative requires work
    (
      cd "$TRAIN_DIR"
      # nvm exec may print warnings; execute the node binary under requested version
      nvm exec "$NODE_VERSION" -- node "./$script"
    )
    return $?
  else
    (cd "$TRAIN_DIR" && "$NODE_CMD_DIRECT" "./$script")
    return $?
  fi
}

# Parallel runner with job slots (safe POSIX-ish approach)
FAILED=0
PIDS=()
declare -A PID_TO_SCRIPT=()

if [ "$PARALLEL" = true ]; then
  # start up to JOBS concurrent scripts
  running=0
  for s in "${SCRIPTS_TO_RUN[@]}"; do
    # wait for a slot if needed
    while [ "$running" -ge "$JOBS" ]; do
      # wait for any child to exit
      if ! wait -n 2>/dev/null; then
        # bash <5 doesn't support wait -n; fallback: wait for first pid
        if [ ${#PIDS[@]} -gt 0 ]; then
          pid="${PIDS[0]}"
          wait "$pid" || true
          # remove first pid
          PIDS=("${PIDS[@]:1}")
        else
          break
        fi
      else
        # a child ended; compact PIDS
        new=()
        for pid in "${PIDS[@]}"; do
          if kill -0 "$pid" 2>/dev/null; then
            new+=("$pid")
          fi
        done
        PIDS=("${new[@]}")
      fi
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
      echo "[train.sh] Script failed: ${PID_TO_SCRIPT[$pid]} (pid $pid) exit $rc" >&2
      FAILED=1
    fi
    [ "$VERBOSE" = true ] && echo "Finished ${PID_TO_SCRIPT[$pid]} (pid $pid)"
  done
else
  for s in "${SCRIPTS_TO_RUN[@]}"; do
    [ "$VERBOSE" = true ] && echo "=== START $s ==="
    if ! run_one "$s"; then
      echo "[train.sh] Script failed: $s" >&2
      FAILED=1
    fi
    [ "$VERBOSE" = true ] && echo "=== END $s ==="
  done
fi

if [ "$FAILED" -ne 0 ]; then
  echo "One or more scripts failed. Exiting non-zero." >&2
fi

exit $FAILED
