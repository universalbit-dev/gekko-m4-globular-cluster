#!/usr/bin/env bash
# tools/train.sh
# Wrapper to run trainer scripts under Node 20 via nvm.
# Usage:
#   ./tools/train.sh train_ccxt_ohlcv_multi.js
#   ./tools/train.sh train_ccxt_ohlcv_aggregate.js
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

# Ensure node 20 is installed and set active
nvm install 20 >/dev/null 2>&1 || true
nvm use 20

# Accept script name as argument (default to the multi trainer)
TRAIN_SCRIPT="${1:-train_ccxt_ohlcv_multi.js}"
# The trainer scripts live under tools/train
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR" || exit 1

# if TRAIN_SCRIPT is a plain filename, prefix train/
if [[ "$TRAIN_SCRIPT" != *"/"* ]]; then
  TRAIN_PATH="train/$TRAIN_SCRIPT"
else
  TRAIN_PATH="$TRAIN_SCRIPT"
fi

echo "[run_trainer_nvm] Running $TRAIN_PATH with node $(node -v) (npm root -g: $(npm root -g))"
# ensure PATH is set (nvm sets this)
node "$TRAIN_PATH"
EXIT=$?
echo "[run_trainer_nvm] exited with code $EXIT"
exit $EXIT
