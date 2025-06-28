#!/bin/bash

# Start the jsonbin uploader via PM2
pm2 start jsonbin_randomchess.js --name randomchess

# Show a message to the user
echo "Starting realTimeChessProcessor: Waiting for log data on stdin (pipe)..."

# Start the real-time log processor (until stopped)
pm2 logs --json | node realTimeChessProcessor.js
