#!/bin/bash
#
# NGC6121 Setup Script - Gekko M4 Cluster
# - Node.js v20+
# - Debian/Ubuntu: Installs build-essential & python3 if missing
# - Ensures node-gyp & pm2 are globally available
# - Installs npm project dependencies
# - Launches PM2 processes if simulator config exists
set -euo pipefail

banner() {
  echo "============================================"
  printf "   NGC6121 Setup Script - Gekko M4 Cluster  \n"
  echo "============================================"
}

install_deps_if_needed() {
  local missing=()
  for dep in g++ make python3; do
    if ! command -v $dep &>/dev/null; then
      missing+=($dep)
    fi
  done
  if ((${#missing[@]})); then
    echo -e "\e[31mError!\e[0m Missing system packages: ${missing[*]}"
    read -p "Attempt to install using sudo apt? [Y/n]: " yn
    case $yn in
      [Nn]*) echo "Aborting. Please install required packages and re-run."; exit 2;;
      *)
        echo "Installing: sudo apt update && sudo apt install -y build-essential python3"
        sudo apt update
        sudo apt install -y build-essential python3
      ;;
    esac
  fi
}

ensure_global_package() {
  local pkg="$1"
  if ! command -v "$pkg" &>/dev/null; then
    echo ">> Installing $pkg globally..."
    if npm install -g "$pkg"; then
      export PATH="$(npm bin -g):$PATH"
      echo ">> $pkg ready."
    else
      echo "ERROR: Failed to install $pkg globally. Try: sudo npm install -g $pkg"
      return 1
    fi
  else
    echo ">> $pkg found in PATH."
  fi
}

run_npm_install() {
  echo ">> Installing Node.js dependencies (npm install)..."
  if ! npm install; then
    echo "ERROR: 'npm install' failed. Check error output above."
    exit 3
  fi
  echo ">> npm dependencies installed."
}

fix_npm_security() {
  echo ">> Running npm audit fix (best-effort)..."
  npm audit fix >/dev/null && echo ">> npm audit fix completed." || echo ">> npm audit fix completed with issues (non-fatal)."
}

manage_pm2() {
  echo ">> (Re)Installing PM2 globally for Node.js v${current_node_major} (best-effort)..."
  npm uninstall -g pm2 2>/dev/null || true
  if npm install -g pm2; then
    export PATH="$(npm bin -g):$PATH"
    echo ">> pm2 installed globally."
  else
    echo "Warning: pm2 global install failed. Try: sudo npm install -g pm2"
  fi
}

pm2_start_if_configured() {
  echo ">> Starting ecosystem with PM2 if simulator.config.js exists..."
  if [ -f simulator.config.js ] && command -v pm2 &>/dev/null; then
    pm2 start simulator.config.js --name ngc6121 || {
      echo "Warning: pm2 start failed. Try: pm2 start simulator.config.js"
    }
  else
    echo "simulator.config.js not found or pm2 unavailable — skipping pm2 start."
  fi
}

show_pm2_list() {
  echo "============================================"
  echo "        All processes started with PM2      "
  echo "============================================"
  if command -v pm2 &>/dev/null; then
    pm2 list || true
  else
    echo "pm2 not available to list processes."
  fi
}

wait_and_restart_pm2() {
  echo ">> Waiting 5 minutes (300s) before restarting PM2 processes..."
  sleep 300
  if command -v pm2 &>/dev/null; then
    echo ">> Restarting all PM2 processes now."
    pm2 restart all || echo "Warning: pm2 restart all failed."
  else
    echo "Skipping pm2 restart: pm2 not found."
  fi
}

final_summary() {
  echo "============================================"
  echo " Files are kept in sync across the cluster. "
  echo "============================================"
  echo ">> Script completed. Exiting."
}

# --- MAIN SCRIPT LOGIC ---
banner
install_deps_if_needed

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is not installed. Install Node.js v20+ and retry."
  exit 1
fi

required_node_major=20
current_node_major=$(node -v | sed -E 's/v([0-9]+).*/\1/')
if [[ -z "$current_node_major" ]] || (( current_node_major < required_node_major )); then
  echo "ERROR: Node.js v${required_node_major}+ required. You have: $(node -v)"
  exit 1
fi
echo ">> Node.js check passed: $(node -v)"

ensure_global_package node-gyp || exit 2

run_npm_install

fix_npm_security

manage_pm2

pm2_start_if_configured

show_pm2_list

wait_and_restart_pm2

final_summary

exit 0
