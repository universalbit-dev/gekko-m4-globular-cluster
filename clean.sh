#!/bin/bash

###############################################################################
# Script: cleaner.sh
# Author: universalbit-dev
# Description:
#   This script cleans up backup, swap, temp, and log files in the project.
#   - Removes backup, swap, and temporary files by pattern.
#   - Cleans logs directories of *.log, *.csv, and *.json files,
#     EXCEPT logs/json/chess/package.json and package-lock.json.
#   - Recursively removes files in logs/ directory matching:
#     *.log.YYYY-MM-DD, *.log.YYYY-MM-DD.HH, *.log.YYYY-MM-DD.HH.MM, etc.
#   - Optionally removes empty directories (uncomment to enable).
#   - Restarts all pm2 processes and starts the main simulator via pm2.
#
# Usage:
#   chmod +x cleaner.sh
#   ./cleaner.sh
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
  find . -type f -name "$pattern" -print -delete
done

# Clean logs directories of .log, .csv, .json files in all folders and subdirectories,
# BUT EXCLUDE logs/json/chess/package.json and package-lock.json
echo "Removing .log, .csv, and .json files from logs directories (except logs/json/chess/package.json and package-lock.json)..."
find . -type d -name "logs" | while read -r logdir; do
  find "$logdir" -type f \( -name "*.log" -o -name "*.csv" -o -name "*.json" \) \
    ! \( -path "$logdir/json/chess/package.json" -o -path "$logdir/json/chess/package-lock.json" \) \
    -print -delete
done

# Remove files like *.log.YYYY-MM-DD* (including .log.YYYY-MM-DD, .log.YYYY-MM-DD.HH, .log.YYYY-MM-DD.HH.MM, etc.)
echo "Removing files like *.log.YYYY-MM-DD* from logs directory and all subdirectories..."
find ./logs -type f -name '*.log.[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]*' -print -delete

# Clean tools directory and all subdirectories of .log, .csv, .json files
echo "Removing .log, .csv, and .json files from tools directory and all subdirectories..."
find ./tools -type f \( -name "*.log" -o -name "*.csv" -o -name "*.json" \) -print -delete

# Optionally remove empty directories (uncomment if desired)
# echo "Removing empty directories..."
# find . -type d -empty -not -path '.' -print -delete

echo "Cleanup complete: Removed backup, swap, temp, and logs files."
echo

echo "Restarting all pm2 processes..."
pm2 restart all

echo "Starting main simulator with pm2..."
pm2 start simulator.config.js

echo "All done. New logs will be generated as your processes restart."


