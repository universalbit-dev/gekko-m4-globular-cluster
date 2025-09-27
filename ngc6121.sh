#!/bin/bash

echo "============================================"
echo "   NGC6121 Setup Script - Gekko M4 Cluster  "
echo "============================================"

# Step 1: Install npm dependencies
echo ""
echo ">> Installing Node.js dependencies..."
npm install

# Step 2: Fix vulnerabilities with npm audit fix
echo ""
echo ">> Running npm audit fix to address vulnerabilities..."
npm audit fix

# Step 3: Install PM2 globally
echo ""
echo ">> Installing PM2 globally..."
npm install pm2 -g

# Step 4: Start ngc6121.config.js with PM2
echo ""
echo ">> Starting ecosystem with PM2..."
pm2 start ngc6121.config.js --name ngc6121

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
exit
