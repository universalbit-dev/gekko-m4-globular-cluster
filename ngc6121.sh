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

# Step 5: Start plugins/ccxtMarketData/ccxtmarket with PM2
echo ""
echo ">> Starting ccxtmarket plugin with PM2..."
cd plugins/ccxtMarketData
pm2 start ccxtMarketData.js --name ccxtmarket
cd ~

# Final: Show PM2 process list
echo ""
echo "============================================"
echo "        All processes started with PM2      "
echo "============================================"
pm2 list

# Wait for 15 minutes before restarting all PM2 processes.
echo ""
echo ">> Waiting for 15 minutes (900 seconds) before restarting all PM2 processes..."
sleep 900

# Restart all pm2 processes
echo ">> Restarting all PM2 processes now."
pm2 restart all

echo "============================================"
echo " Files are kept in sync across the cluster. "
echo "============================================"
# Exit the script
echo ">> Script completed. Exiting."
exit
