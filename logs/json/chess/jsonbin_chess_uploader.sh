#!/bin/bash
#
# jsonbin_chess_uploader.sh
#
# Description:
#   This script uploads chess-related JSON log files to a remote server or service.
#   It is intended for use in the gekko-m4-globular-cluster project.
#
# Usage:
#   ./jsonbin_chess_uploader.sh
#
# Author: universalbit-dev
# Repository: https://github.com/universalbit-dev/gekko-m4-globular-cluster
# Last Updated: 2025-06-28
#

# Start the jsonbin uploader via PM2
pm2 start jsonbin_randomchess.js --name randomchess

# Show a message to the user
echo "Starting realTimeChessProcessor: Waiting for log data on stdin (pipe)..."

# Start the real-time log processor (until stopped)
pm2 logs --json | node realTimeChessProcessor.js
