#!/usr/bin/env bash
# tools/chart.sh
# Wrapper to run chart scripts located in tools/chart/
# - Discover .js scripts in tools/chart/
# - Support aliases, --list, --all, --parallel, --verbose
# - Prefer NODE_BIN env override; otherwise try nvm use 20; fallback to node on PATH
# - Safe nvm sourcing (avoid 'unbound variable' with set +u)
# - Returns non-zero if any script fails
set -euo pipefail

# Defaults
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
DEFAULT_NODE_VERSION="${DEFAULT_NODE_VERSION:-20}"
NODE_VERSION="${NODE_VERSION:-$DEFAULT_NODE_VERSION}"
NODE_BIN="${NODE_BIN:-}"   # optional override

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"   # tools/
CHART_DIR="$BASE_DIR/chart"

if [ ! -d "$CHART_DIR" ]; then
  echo "Chart directory not found: $CHART_DIR" >&2
  exit 2
fi

# discover scripts
mapfile -t AVAILABLE_SCRIPTS < <(cd "$CHART_DIR" && printf '%s\n' ./*.js 2>/dev/null | sed 's|^\./||' | sort || true)

# aliases (short names -> filenames)
declare -A ALIASES=(
  [multi]=chart_ccxt_multi.js
  [ccxt]=chart_ccxt_recognition.js
  [rec]=chart_recognition.js
  [magnitude]=chart_ccxt_recognition_magnitude.js
  [config]=chart.config.js
)

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] [script-or-alias ...]

Options:
  --list           List available chart scripts (from $CHART_DIR)
  --all            Run all discovered chart scripts (alphabetical)
  --parallel       Run scripts in background (simple)
  --verbose        Print extra info before running each script
  --node-bin <path>  Use explicit node binary (overrides nvm)
  --node-version <ver>  Preferred Node major version for nvm (default: $NODE_VERSION)
  --help
Examples:
  $(basename "$0") --list
  $(basename "$0") --all --verbose
  $(basename "$0") multi
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
      for s in "${AVAILABLE_SCRIPTS[@]}"; do echo "  - $s"; done
      exit 0
      ;;
    --all) RUN_ALL=true; shift;;
    --parallel) PARALLEL=true; shift;;
    --verbose) VERBOSE=true; shift;;
    --node-bin) NODE_BIN="${2:-}"; shift 2;;
    --node-version) NODE_VERSION="${2:-$NODE_VERSION}"; shift 2;;
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
    # fuzzy match
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

# Helper: safe nvm source (disable nounset only while sourcing)
_try_source_nvm() {
  # define a few variables nvm.sh may reference to avoid unbound var with set -u
  export NVM_IOJS="${NVM_IOJS:-}"
  export NVM_CD_FLAGS="${NVM_CD_FLAGS:-}"
  export NVM_LAZY_LOAD="${NVM_LAZY_LOAD:-}"

  if [ -s "$NVM_DIR/nvm.sh" ]; then
    set +u
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
    set -u
    return 0
  fi
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    set +u
    # shellcheck source=/dev/null
    . "$HOME/.nvm/nvm.sh"
    set -u
    return 0
  fi
  if [ -s "$HOME/.config/nvm/nvm.sh" ]; then
    set +u
    # shellcheck source=/dev/null
    . "$HOME/.config/nvm/nvm.sh"
    set -u
    return 0
  fi
  if [ -s "/usr/local/opt/nvm/nvm.sh" ]; then
    set +u
    # shellcheck source=/dev/null
    . "/usr/local/opt/nvm/nvm.sh"
    set -u
    return 0
  fi
  return 1
}

# Resolve node command: prefer NODE_BIN, else nvm use NODE_VERSION, else node on PATH
resolve_node_cmd() {
  if [ -n "${NODE_BIN:-}" ]; then
    if [ -x "$NODE_BIN" ]; then
      echo "$NODE_BIN"
      return 0
    else
      echo "NODE_BIN set but not executable: $NODE_BIN" >&2
      return 2
    fi
  fi

  if _try_source_nvm >/dev/null 2>&1 && command -v nvm >/dev/null 2>&1; then
    # ensure node version installed (no hard fail)
    nvm install "$NODE_VERSION" >/dev/null 2>&1 || true
    # we will run scripts in a subshell that does `nvm use` then node
    echo "nvm:$NODE_VERSION"
    return 0
  fi

  if command -v node >/dev/null 2>&1; then
    echo "$(command -v node)"
    return 0
  fi

  echo "No node binary found: set NODE_BIN or install nvm/node" >&2
  return 3
}

NODE_CMD="$(resolve_node_cmd)" || exit $?

if [ "$VERBOSE" = true ]; then
  echo "[chart.sh] NODE_CMD: $NODE_CMD"
  echo "[chart.sh] NODE_VERSION: $NODE_VERSION"
  echo "[chart.sh] Scripts to run (count=${#SCRIPTS_TO_RUN[@]}):"
  for s in "${SCRIPTS_TO_RUN[@]}"; do echo "  - $s"; done
  echo "[chart.sh] Parallel: $PARALLEL"
fi

run_one() {
  local script="$1"
  local full="$CHART_DIR/$script"

  if [ ! -f "$full" ]; then
    echo "Script not found: $full" >&2
    return 2
  fi

  if [ "$VERBOSE" = true ]; then
    echo "[chart.sh] Running $script (cwd=$CHART_DIR)"
  fi

  if [[ "$NODE_CMD" == nvm:* ]]; then
    # run in a subshell: source nvm, use requested version, then run node
    (
      set +u
      # ensure nvm is available in child shell
      if [ -s "$NVM_DIR/nvm.sh" ]; then
        # shellcheck source=/dev/null
        . "$NVM_DIR/nvm.sh"
      elif [ -s "$HOME/.nvm/nvm.sh" ]; then
        # shellcheck source=/dev/null
        . "$HOME/.nvm/nvm.sh"
      elif [ -s "$HOME/.config/nvm/nvm.sh" ]; then
        # shellcheck source=/dev/null
        . "$HOME/.config/nvm/nvm.sh"
      fi
      set -u
      nvm use "$NODE_VERSION" >/dev/null 2>&1 || true
      cd "$CHART_DIR"
      node "./$script"
    )
    return $?
  else
    # NODE_CMD is absolute node binary on PATH
    (cd "$CHART_DIR" && "$NODE_CMD" "./$script")
    return $?
  fi
}

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
  echo "One or more scripts failed. Combined exit sum: $EXIT_SUM" >&2
fi

exit $EXIT_SUM
