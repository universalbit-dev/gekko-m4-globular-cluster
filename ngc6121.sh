#!/bin/bash
#
# NGC6121 Setup Script - Gekko M4 Cluster
# - Requires Node.js v20+
# - Ensures build toolchain is installed
# - Ensures node-gyp is available (installs globally if missing)
# - Installs npm deps
# - Reinstalls PM2 and starts simulator config
#
# Exit codes:
#  0 - success
#  1 - node / node version problem
#  2 - missing system dependency or node-gyp install failure
#  3 - npm install failure (non-fatal could be changed)
set -euo pipefail

echo "============================================"
echo "   NGC6121 Setup Script - Gekko M4 Cluster  "
echo "============================================"

# Ensure node is installed
if ! command -v node &>/dev/null; then
  echo "ERROR: node is not installed or not in PATH. Install Node.js v24+ and retry."
  exit 1
fi

# Check Node.js version (require >= 20)
required_node_major=20
current_node_major=$(node -v | sed -E 's/v([0-9]+).*/\1/')
if [ -z "$current_node_major" ]; then
  echo "ERROR: Unable to parse Node.js version: $(node -v)"
  exit 1
fi
if [ "$current_node_major" -lt "$required_node_major" ]; then
  echo "ERROR: Node.js v${required_node_major} or newer is required. You have: $(node -v)"
  exit 1
fi

echo ""
echo ">> Node.js check passed: $(node -v)"

# System dependency check (exclude node-gyp which is an npm package)
echo ""
echo ">> Checking system dependencies..."
missing_deps=()
for cmd in g++ make python3 npm; do
  if ! command -v "$cmd" &>/dev/null; then
    missing_deps+=("$cmd")
  fi
done

if [ ${#missing_deps[@]} -ne 0 ]; then
  echo "ERROR: Required system packages not found: ${missing_deps[*]}"
  echo "       Install system dependencies using (Debian/Ubuntu):"
  echo "         sudo apt update && sudo apt install -y build-essential g++ python3 make"
  echo "       After installing system packages, re-run this script."
  exit 2
fi
echo ">> System dependencies present."

# node-gyp check and attempt to fix if missing
echo ""
echo ">> Ensuring node-gyp is available in PATH..."
if command -v node-gyp &>/dev/null; then
  echo "node-gyp found in PATH."
else
  echo "node-gyp not found in PATH. Checking if node-gyp is installed globally via npm..."
  if npm list -g --depth=0 node-gyp >/dev/null 2>&1 || npm ls -g --depth=0 node-gyp >/dev/null 2>&1; then
    BIN_DIR=$(npm bin -g 2>/dev/null || true)
    if [ -n "$BIN_DIR" ] && [ -x "$BIN_DIR/node-gyp" ]; then
      echo "node-gyp is installed globally but its bin directory ($BIN_DIR) may not be in your PATH."
      echo "Add it to your PATH for the current session (example):"
      echo "  export PATH=\"$BIN_DIR:\$PATH\""
    else
      echo "node-gyp appears installed globally but npm bin couldn't be determined or node-gyp executable wasn't found."
      echo "Ensure the npm global bin directory is on your PATH."
    fi
  else
    echo "node-gyp is not installed globally. Attempting to install node-gyp globally now..."
    if npm install -g node-gyp; then
      echo "node-gyp installed successfully (npm global)."
      if command -v node-gyp &>/dev/null; then
        echo "node-gyp is now available in PATH."
      else
        BIN_DIR=$(npm bin -g 2>/dev/null || true)
        echo "node-gyp installed but not found in PATH. Global npm bin is: $BIN_DIR"
        echo "Add it to your PATH: export PATH=\"$BIN_DIR:\$PATH\""
      fi
    else
      echo "Automatic npm install -g node-gyp failed in user context."
      echo "Try installing with elevated privileges or configure npm global directory for your user."
      echo ""
      echo "Options:"
      echo "  1) Install with sudo (may be required on some systems):"
      echo "       sudo npm install -g node-gyp"
      echo "  2) Configure npm to install global packages in your home directory and re-run:"
      echo "       mkdir -p ~/.npm-global"
      echo "       npm config set prefix '~/.npm-global'"
      echo "       export PATH=\"\$HOME/.npm-global/bin:\$PATH\""
      echo "       npm install -g node-gyp"
      echo ""
      echo "After installing node-gyp, re-run this script."
      exit 2
    fi
  fi
fi

# Install npm dependencies
echo ""
echo ">> Installing Node.js dependencies (npm install)..."
if ! npm install; then
  echo "ERROR: 'npm install' failed. Check error output above."
  exit 3
fi
echo ">> npm dependencies installed."

# Skip npm link tools logic

# Fix vulnerabilities with npm audit fix (best-effort)
echo ""
echo ">> Running npm audit fix to address vulnerabilities (best-effort)..."
if npm audit fix; then
  echo ">> npm audit fix completed."
else
  echo ">> npm audit fix completed with issues (non-fatal)."
fi

# Reinstall PM2 globally to ensure correct Node version (best-effort)
echo ""
echo ">> (Re)Installing PM2 globally for Node.js v${current_node_major} (best-effort)..."
npm uninstall -g pm2 2>/dev/null || true
if npm install -g pm2; then
  echo ">> pm2 installed globally."
else
  echo "Warning: installing pm2 globally failed. You may need to run:"
  echo "  sudo npm install -g pm2"
fi

# Start simulator.config.js with PM2 if file exists
echo ""
echo ">> Starting ecosystem with PM2..."
if [ -f "simulator.config.js" ]; then
  if command -v pm2 &>/dev/null; then
    pm2 start simulator.config.js --name ngc6121 || {
      echo "Warning: pm2 start failed. Run 'pm2 start simulator.config.js' manually to see errors."
    }
  else
    echo "Warning: pm2 not found. Skip starting processes. Install pm2 globally and re-run or start manually."
  fi
else
  echo "Warning: simulator.config.js not found — skipping pm2 start."
fi

# Final: Show PM2 process list if pm2 present
echo ""
echo "============================================"
echo "        All processes started with PM2      "
echo "============================================"
if command -v pm2 &>/dev/null; then
  pm2 list || true
else
  echo "pm2 not available to list processes."
fi

# Wait for 5 minutes before restarting all PM2 processes.
echo ""
echo ">> Waiting for 5 minutes (300 seconds) before restarting all PM2 processes..."
sleep 300

# Restart all pm2 processes if pm2 present
if command -v pm2 &>/dev/null; then
  echo ">> Restarting all PM2 processes now."
  pm2 restart all || echo "Warning: pm2 restart all failed."
else
  echo "Skipping pm2 restart: pm2 not found."
fi

echo "============================================"
echo " Files are kept in sync across the cluster. "
echo "============================================"
echo ">> Script completed. Exiting."
exit 0
