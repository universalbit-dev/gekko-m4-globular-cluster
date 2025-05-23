#!/bin/bash

set -e

# Directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

# Check for distinguished.cnf
if [ ! -f distinguished.cnf ]; then
  echo "Error: distinguished.cnf not found in $SCRIPT_DIR"
  exit 1
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

echo "Done! https_static_files.key and https_static_files.cert created."
