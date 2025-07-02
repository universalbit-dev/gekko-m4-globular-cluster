#!/bin/bash

echo "============================================"
echo "   NGC6121 Setup Script - Gekko M4 Cluster  "
echo "============================================"

# Step 1: Install npm dependencies
echo ""
echo ">> Installing Node.js dependencies..."
npm install

# Step 2: Install PM2 globally
echo ""
echo ">> Installing PM2 globally..."
npm install pm2 -g

# Step 3: Start simulator.config.js
echo ""
echo ">> Starting simulator with PM2..."
pm2 start simulator.config.js --name simulator

# Step 4: Start tools/tools.config.js
echo ""
echo ">> Starting tools with PM2..."
cd tools
pm2 start tools.config.js --name tools
cd ..

# Step 5: Start plugins/ccxtMarketData/ccxtmarket.config.js
echo ""
echo ">> Starting ccxtmarket plugin with PM2..."
cd plugins/ccxtMarketData
pm2 start ccxtmarket.config.js --name ccxtmarket
cd ~

# Final: Show PM2 process list
echo ""
echo "============================================"
echo "        All processes started with PM2      "
echo "============================================"
pm2 list
