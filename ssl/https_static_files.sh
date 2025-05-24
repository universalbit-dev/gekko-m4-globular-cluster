#!/bin/bash
#
# Friendly HTTPS Configuration Script for Nginx Reverse Proxy
#
# This script sets up a secure (HTTPS) nginx reverse proxy for various static and API files.
# It automatically:
#   - Installs nginx if it's missing
#   - Generates a self-signed SSL certificate and key (using distinguished.cnf)
#   - Sets up nginx to always redirect HTTP traffic to HTTPS
#   - Configures nginx as a reverse proxy for the following endpoints:
#
#     https://localhost/neuralnet/neuralnet.json
#     https://localhost/cci/cci.json
#     https://localhost/dema/dema.json
#     https://localhost/rsibullbearadx/rsibullbearadx.json
#     https://localhost/bollingerband/bollingerband.json
#     https://localhost/noop/noop.json
#     https://localhost/neuralnet_refinements/neuralnet_refinements.json
#     https://localhost/ohlcv_data/ohlcv_data.csv
#
# The script also ensures the SSL files are copied to /etc/nginx/ssl/ and overwrites the
# nginx configuration to apply these reverse proxy rules.
#
# Intended for development and testing purposes. For production, use a valid SSL certificate.
#
# Usage:
#   ./ssl/https_static_files.sh
#
set -e

# Directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

# Check for distinguished.cnf
if [ ! -f distinguished.cnf ]; then
  echo "Error: distinguished.cnf not found in $SCRIPT_DIR"
  exit 1
fi

# 1. Check and install nginx if missing
if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx not found. Installing nginx..."
  if [ -f /etc/debian_version ]; then
    sudo apt-get update
    sudo apt-get install -y nginx
  elif [ -f /etc/redhat-release ]; then
    sudo yum install -y epel-release
    sudo yum install -y nginx
  else
    echo "Unsupported OS. Please install nginx manually."
    exit 1
  fi
else
  echo "nginx is already installed."
fi

echo "Generating https_static_files.key and https_static_files.cert using distinguished.cnf..."

# Generate private key
openssl genrsa -out https_static_files.key 2048

# Generate certificate signing request (CSR)
openssl req -new -key https_static_files.key -out https_static_files.csr -config distinguished.cnf

# Self-sign certificate
openssl x509 -req -days 365 -in https_static_files.csr -signkey https_static_files.key -out https_static_files.cert

echo "Cleaning up CSR file..."
rm -f https_static_files.csr

# 2. Create /etc/nginx/ssl if missing
sudo mkdir -p /etc/nginx/ssl

# 3. Copy cert and key
sudo cp https_static_files.key /etc/nginx/ssl/
sudo cp https_static_files.cert /etc/nginx/ssl/

# 4. Overwrite nginx config
sudo tee /etc/nginx/nginx.conf > /dev/null <<'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name localhost;

        ssl_certificate /etc/nginx/ssl/https_static_files.cert;
        ssl_certificate_key /etc/nginx/ssl/https_static_files.key;
        location /simulator/ {
            proxy_pass http://127.0.0.1:9559/simulator.json;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        location /neuralnet/ {
            proxy_pass http://127.0.0.1:9560/neuralnet.json;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        location /cci/ {
            proxy_pass http://127.0.0.1:9561/cci.json;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        location /dema/ {
            proxy_pass http://127.0.0.1:9562/dema.json;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        location /rsibullbearadx/ {
            proxy_pass http://127.0.0.1:9563/rsibullbearadx.json;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        location /bollingerband/ {
            proxy_pass http://127.0.0.1:9564/bollingerband.json;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        location /noop/ {
            proxy_pass http://127.0.0.1:9565/noop.json;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        location /neuralnet_refinements/ {
            proxy_pass http://127.0.0.1:9566/neuralnet_refinements.json;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        location /ohlcv_data/ {
            proxy_pass http://127.0.0.1:9567/ohlcv_data.csv;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# 5. Reload nginx
echo "Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "Done! https_static_files.key and https_static_files.cert created, nginx configured and reloaded."
