#!/bin/bash

echo "============================================"
echo "   NGC6121 Setup Script - Gekko M4 Cluster  "
echo "============================================"

# Check Node.js version (require >= 24)
required_node_major=24
current_node_major=$(node -v | sed 's/v\([0-9]*\).*/\1/')
if [ "$current_node_major" -lt "$required_node_major" ]; then
  echo "ERROR: Node.js v24 or newer is required. You have: $(node -v)"
  exit 1
fi

# System dependency check
echo ""
echo ">> Checking system dependencies..."
for cmd in g++ make python3 npm node-gyp; do
  if ! command -v $cmd &>/dev/null; then
    echo "ERROR: Required system package '$cmd' is not installed!"
    echo "       Install all dependencies using:"
    echo "         sudo apt update && sudo apt install -y build-essential g++ python3 node-gyp make node-gyp"
    exit 2
  fi
done

# Install npm dependencies
echo ""
echo ">> Installing Node.js dependencies..."
npm install

# Link local tools module
echo ""
echo ">> Linking local tools/ module..."
npm link tools

# Fix vulnerabilities with npm audit fix
echo ""
echo ">> Running npm audit fix to address vulnerabilities..."
npm audit fix

# Reinstall PM2 globally to ensure correct Node version
echo ""
echo ">> (Re)Installing PM2 globally for Node.js v$current_node_major..."
npm uninstall -g pm2 2>/dev/null
npm install -g pm2

# Start simulator.config.js with PM2
echo ""
echo ">> Starting ecosystem with PM2..."
pm2 start simulator.config.js --name ngc6121

# Final: Show PM2 process list
echo ""
echo "============================================"
echo "        All processes started with PM2      "
echo "============================================"
pm2 list

# Wait for 5 minutes before restarting all PM2 processes.
echo ""
echo ">> Waiting for 5 minutes (300 seconds) before restarting all PM2 processes..."
sleep 300

# Restart all pm2 processes
echo ">> Restarting all PM2 processes now."
pm2 restart all

echo "============================================"
echo " Files are kept in sync across the cluster. "
echo "============================================"
# Exit the script
echo ">> Script completed. Exiting."
exit 0
