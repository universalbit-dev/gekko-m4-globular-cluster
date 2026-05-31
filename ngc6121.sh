#!/bin/bash
set -euo pipefail

# Color helpers
RED='\033[0;31m'
GRN='\033[0;32m'
YEL='\033[0;33m'
CYN='\033[0;36m'
NC='\033[0m' # reset

banner() {
  echo -e "${CYN}============================================"
  printf "   NGC6121 Setup Script - Gekko M4 Cluster  \n"
  echo -e "============================================${NC}"
}

req_summary() {
  echo -e "${GRN}Requirements: nodejs (v20+), npm, g++, make, python3, curl, git, build-essential${NC}"
}

check_user_write() {
  if [ ! -w . ]; then
    echo -e "${RED}ERROR:${NC} Current user cannot write to this directory (${PWD})!"
    echo "Fix this (e.g. sudo chown -R \$USER:\$USER .), then re-run."
    exit 10
  fi
}

check_or_install_deps() {
  local missing=()
  for dep in curl git g++ make python3; do
    if ! command -v $dep >/dev/null 2>&1; then
      missing+=($dep)
    fi
  done
  if ((${#missing[@]})); then
    echo -e "${YEL}Missing system packages: ${missing[*]}${NC}"
    read -p "Attempt to install using sudo apt? [Y/n]: " yn
    case $yn in
      [Nn]*) echo -e "${RED}Aborting. Please install required packages manually.${NC}"; exit 12;;
      *)
        sudo apt update
        sudo apt install -y curl git build-essential python3
      ;;
    esac
  fi
}

check_node_npm() {
  if ! command -v node >/dev/null; then
    echo -e "${RED}ERROR:${NC} Node.js not found. Install Node.js v20+."
    exit 9
  fi
  if ! command -v npm >/dev/null; then
    echo -e "${RED}ERROR:${NC} npm not found. Install Node.js/npm."
    exit 9
  fi
  required_node_major=20
  node_ver="$(node -v | sed -E 's/v([0-9]+).*/\1/')"
  if [[ -z "$node_ver" ]] || (( node_ver < required_node_major )); then
    echo -e "${RED}ERROR:${NC} Node.js v20+ required. Detected: $(node -v)"
    exit 8
  fi
  echo -e "${GRN}>> Node.js check passed: $(node -v)${NC}"
}

ensure_global_npm() {
  for pkg in node-gyp pm2; do
    if ! command -v $pkg >/dev/null 2>&1; then
      echo -e "${YEL}$pkg not found. Installing globally...${NC}"
      if npm install -g $pkg; then
        export PATH="$(npm bin -g):$PATH"
        echo -e "${GRN}>> $pkg installed globally.${NC}"
      else
        echo -e "${RED}ERROR:${NC} Failed to install $pkg globally. Try: sudo npm install -g $pkg"
        exit 11
      fi
    else
      echo -e "${GRN}>> $pkg found in PATH.${NC}"
    fi
  done
}

ensure_tulind_dependency() {
  if ! grep -q '"tulind"' package.json 2>/dev/null; then
    echo -e "${YEL}tulind not found in dependencies. Adding to package.json...${NC}"
    npm install tulind --save
  else
    echo -e "${GRN}>> tulind is listed in dependencies.${NC}"
  fi
}

run_npm_install() {
  echo -e "${CYN}>> Installing Node.js dependencies (npm install)...${NC}"
  npm install
}

rebuild_tulind() {
  echo -e "${CYN}>> Rebuilding tulind native module...${NC}"
  npm rebuild tulind --build-from-source
  # Test module load
  if node -e "require('tulind'); console.log('tulind loaded OK')" 2>/dev/null ; then
    echo -e "${GRN}>> tulind native module successfully built and loaded.${NC}"
  else
    echo -e "${RED}ERROR:${NC} tulind did not load after rebuild. See logs above."
    exit 14
  fi
}

fix_npm_security() {
  echo -e "${CYN}>> Running npm audit fix ...${NC}"
  npm audit fix >/dev/null && echo -e "${GRN}>> npm audit fix completed.${NC}" || echo -e "${YEL}>> npm audit fix completed with issues (non-fatal).${NC}"
}

manage_pm2() {
  echo -e "${CYN}>> (Re)Installing PM2 globally (best-effort)...${NC}"
  npm uninstall -g pm2 2>/dev/null || true
  npm install -g pm2
  export PATH="$(npm bin -g):$PATH"
  echo -e "${GRN}>> pm2 installed globally.${NC}"
}

pm2_start_if_configured() {
  if [ -f simulator.config.js ] && command -v pm2 >/dev/null 2>&1; then
    pm2 start simulator.config.js --name ngc6121 || {
      echo -e "${YEL}Warning: pm2 start failed. Try: pm2 start simulator.config.js${NC}"
    }
  else
    echo -e "${YEL}simulator.config.js not found or pm2 unavailable — skipping pm2 start.${NC}"
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
  echo -e "${CYN}>> Waiting 5 minutes (300s) before restarting PM2 processes...${NC}"
  sleep 300
  if command -v pm2 &>/dev/null; then
    echo -e "${CYN}>> Restarting all PM2 processes now.${NC}"
    pm2 restart all || echo -e "${YEL}Warning: pm2 restart all failed.${NC}"
  else
    echo -e "${YEL}Skipping pm2 restart: pm2 not found.${NC}"
  fi
}

final_summary() {
  echo -e "${CYN}============================================"
  echo " Files are kept in sync across the cluster. "
  echo -e "============================================${NC}"
  echo -e "${GRN}>> Script completed. Exiting.${NC}"
}

# --- MAIN SCRIPT LOGIC ---
banner
req_summary
check_user_write
check_or_install_deps
check_node_npm
ensure_global_npm
ensure_tulind_dependency
run_npm_install
rebuild_tulind
fix_npm_security
manage_pm2
pm2_start_if_configured
show_pm2_list
wait_and_restart_pm2
final_summary

exit 0
