#!/bin/bash
#
# Gekko-M4-Globular-Cluster Setup Script (HTTPS)
# --------------------------------------
# Purpose:
#   Automates the setup of the Gekko M4 Globular Cluster project with
#   Grafana (HTTPS), PM2 serve, and required supporting tools.
#   Generates SSL certificates using 'distinguished.cnf'.
#
# Usage:
#   chmod a+x https_ngc6121_setup.sh
#   ./https_ngc6121_setup.sh
#
# Author: UniversalBit Development Team (https://github.com/universalbit-dev)
# Version: 1.4.0
# License: MIT
#
set -e

echo "===================================================================="
echo "Gekko-M4-Globular-Cluster ADVANCED CHARTING - HTTPS Setup with Grafana"
echo "===================================================================="

# Step 0: Check for SSL config file
if [ ! -f "distinguished.cnf" ]; then
    echo "ERROR: SSL config file 'distinguished.cnf' not found in the project directory."
    echo "Check your clone or branch."
    exit 1
fi

# Step 1: Update system and install dependencies
echo "Updating system and installing required packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ufw build-essential openssl libssl-dev apt-transport-https software-properties-common wget

# Step 2: Enable UFW firewall
echo "Enabling UFW firewall..."
sudo ufw enable

# Step 3: Install Grafana from official repository if missing
if ! dpkg -l | grep -q grafana; then
    echo "Installing Grafana from official repository..."
    sudo mkdir -p /etc/apt/keyrings/
    wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null
    echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
    sudo apt-get update
    sudo apt-get install -y grafana
else
    echo "Grafana is already installed."
fi

# Step 4: Install Infinity datasource plugin if missing
if ! sudo grafana-cli plugins ls | grep -q yesoreyeram-infinity-datasource; then
    echo "Installing Grafana Infinity Datasource plugin..."
    sudo grafana-cli plugins install yesoreyeram-infinity-datasource
    sudo systemctl restart grafana-server
else
    echo "Grafana Infinity Datasource plugin already installed."
fi

# Step 5: Generate SSL certificates in project directory, then move to system location
echo "Generating SSL certificates..."
export DYNAMIC_CN=$(hostname)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout grafana.key -out grafana.crt \
    -config distinguished.cnf

# Move SSL certs/keys to system directory and set permissions
sudo mkdir -p /etc/grafana/ssl
sudo mv grafana.key /etc/grafana/ssl/grafana.key
sudo mv grafana.crt /etc/grafana/ssl/grafana.cert
sudo chown root:grafana /etc/grafana/ssl/grafana.*
sudo chmod 640 /etc/grafana/ssl/grafana.*

# Step 6: Configure Grafana for HTTPS
GRAFANA_INI="/etc/grafana/grafana.ini"
if ! sudo grep -q "^\[server\]" $GRAFANA_INI; then
    echo -e "\n[server]" | sudo tee -a $GRAFANA_INI > /dev/null
fi

sudo sed -i "s|^;*protocol =.*|protocol = https|g" $GRAFANA_INI
sudo sed -i "s|^;*cert_file =.*|cert_file = /etc/grafana/ssl/grafana.cert|g" $GRAFANA_INI
sudo sed -i "s|^;*cert_key =.*|cert_key = /etc/grafana/ssl/grafana.key|g" $GRAFANA_INI

sudo grep -q "^protocol = https" $GRAFANA_INI || echo "protocol = https" | sudo tee -a $GRAFANA_INI > /dev/null
sudo grep -q "^cert_file = /etc/grafana/ssl/grafana.cert" $GRAFANA_INI || echo "cert_file = /etc/grafana/ssl/grafana.cert" | sudo tee -a $GRAFANA_INI > /dev/null
sudo grep -q "^cert_key = /etc/grafana/ssl/grafana.key" $GRAFANA_INI || echo "cert_key = /etc/grafana/ssl/grafana.key" | sudo tee -a $GRAFANA_INI > /dev/null

# Step 7: Start and enable Grafana service
sudo systemctl enable grafana-server
sudo systemctl restart grafana-server

# Step 8: Show service status
echo
echo "----------------------------------------"
echo "Grafana service status:"
sudo systemctl status grafana-server --no-pager | head -20
echo "----------------------------------------"
echo
echo "SETUP COMPLETE!"
echo "Access Grafana securely at: https://localhost:3000"
echo "Default login: admin / admin (you will be prompted to change this)."
echo "If you see a browser warning, it's because your certificate is self-signed."
echo "================================================================================"
echo "BEGINNER-FRIENDLY NOTE:"
echo
echo "This script is designed to help beginners quickly set up Grafana to work with"
echo "HTTPS in the Gekko M4 Globular Cluster project. It simplifies some installation"
echo "steps and basic configuration for a secure, local Grafana instance."
echo
echo "However, this script only covers a basic setup and is intended for learning or"
echo "development purposes."
echo
echo "For advanced configuration, production deployments, or troubleshooting, please"
echo "refer to the official Grafana documentation:"
echo "  https://grafana.com/docs/grafana/latest/setup-grafana/set-up-https/"
echo
echo "Always consult the official documentation for the latest best practices and"
echo "security recommendations."
echo "================================================================================"
