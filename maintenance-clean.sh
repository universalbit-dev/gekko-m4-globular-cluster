#!/bin/bash

###############################################################################
# Script: maintenance-clean.sh
# Author: universalbit-dev (enhanced)
# Description:
#   This script cleans up backup, swap, temp, and log files in the project.
#   - Removes backup, swap, and temporary files by pattern.
#   - Cleans logs directories of *.log, *.csv, and *.json files,
#   - Recursively removes files in logs/ directory matching:
#     *.log.YYYY-MM-DD, *.log.YYYY-MM-DD.HH, *.log.YYYY-MM-DD.HH.MM, etc.
#   - Restarts all pm2 processes and starts the main simulator via pm2 (only if pm2 exists).
#
# Usage:
#   chmod +x maintenance-clean.sh
#   ./maintenance-clean.sh
#
# Notes:
#   - The tools/ cleanup step now excludes package.json and package-lock.json by basename.
#   - If you want to protect additional filenames or paths, add them to the
#     TOOLS_EXCLUDE_NAMES array below or modify the exclusion in the find command.
###############################################################################

set -euo pipefail

echo "Cleaning up generated and temporary files..."

# Remove any backtest* files/directories if they exist
if compgen -G "backtest*" > /dev/null; then
  rm -rf backtest*
  echo "Removed backtest* files/directories."
else
  echo "No backtest* files/directories found."
fi

# Define patterns to clean
PATTERNS=(
    "*.js~"
    "*.toml~"
    "*.json.swp"
    ".*.json.swp"
    "*.swp"
    "*~"
    "#*#"
)

# Clean each pattern
for pattern in "${PATTERNS[@]}"; do
  echo "Removing files matching pattern: $pattern"
  find . -type f -name "$pattern" -print -delete || true
done

# Clean logs directories of .log, .csv, .json files in all folders and subdirectories,
# BUT EXCLUDE logs/json/chess/package.json and package-lock.json
echo "Removing .log, .csv, and .json files from logs directories (except logs/json/chess/package.json and package-lock.json)..."
find . -type d -name "logs" | while read -r logdir; do
  # exclude the specific chess package files (keep existing behavior)
  find "$logdir" -type f \( -name "*.log" -o -name "*.csv" -o -name "*.json" \) \
    ! \( -path "$logdir/json/chess/package.json" -o -path "$logdir/json/chess/package-lock.json" \) \
    -print -delete || true
done

# Remove files like *.log.YYYY-MM-DD* (including .log.YYYY-MM-DD, .log.YYYY-MM-DD.HH, .log.YYYY-MM-DD.HH.MM, etc.)
echo "Removing files like *.log.YYYY-MM-DD* from logs directory and all subdirectories..."
find ./logs -type f -name '*.log.[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]*' -print -delete || true

# Clean tools directory and all subdirectories of .log, .csv, .json files
# IMPORTANT: exclude package.json and package-lock.json so the tools package metadata is preserved.
# If you need to exclude other file basenames, add them to TOOLS_EXCLUDE_NAMES below.
TOOLS_EXCLUDE_NAMES=( "package.json" "package-lock.json" )

echo "Removing .log, .csv, and .json files from tools directory (excluding: ${TOOLS_EXCLUDE_NAMES[*]})..."
# Build exclusion expression for find
EXCLUDE_EXPR=()
for name in "${TOOLS_EXCLUDE_NAMES[@]}"; do
  EXCLUDE_EXPR+=( ! -name "$name" )
done

# Use a subshell to construct and run the find safely
(
  cd ./tools 2>/dev/null || exit 0
  # The find here runs only inside ./tools to avoid accidental wide deletions.
  # It will delete .log, .csv, .json files but skip the protected basenames.
  eval "find . -type f \( -name '*.log' -o -name '*.csv' -o -name '*.json' \) ${EXCLUDE_EXPR[*]} -print -delete" || true
)
echo "Tools directory cleanup finished."

# Optionally remove empty directories (uncomment if desired)
# echo "Removing empty directories..."
# find . -type d -empty -not -path '.' -print -delete

echo "Cleanup complete: Removed backup, swap, temp, and logs files."
echo

# Restart pm2 processes only if pm2 is available
if command -v pm2 >/dev/null 2>&1; then
  echo "Restarting all pm2 processes..."
  pm2 restart all || echo "pm2 restart all failed (continuing)..."

  if [ -f simulator.config.js ]; then
    echo "Starting main simulator with pm2..."
    pm2 start simulator.config.js || echo "pm2 start simulator.config.js failed (continuing)..."
  else
    echo "No simulator.config.js found in current directory, skipping pm2 start."
  fi
else
  echo "pm2 not found in PATH; skipping pm2 restart/start steps."
fi

echo "All done. New logs will be generated as your processes restart (if pm2 was available)."
