#!/usr/bin/env bash
#
# maintenance-clean.sh (enhanced)
# Author: universalbit-dev
#
# Usage: ./maintenance-clean.sh [OPTIONS]
# Options:
#   --dry-run             : Show actions without making changes
#   --force               : Allow deletion of protected files
#   --days N              : Retention window in days (default: 7)
#   --delete              : Permanently delete matched files instead of archiving
#   --archive             : Operate on existing archive dir (use with --delete to remove archive contents)
#   --protect LIST        : Comma-separated basenames to protect (e.g. "foo.json,bar.log")
#   --protect-file PATH   : Path to file listing basenames to protect (one per line)
#   --help, -h            : Show this help and exit
#
# Examples:
#   ./maintenance-clean.sh --dry-run --days 1
#   ./maintenance-clean.sh --days 30
#   ./maintenance-clean.sh --archive --delete --force
#
# Safely clean temporary, backup and rotated log files;
# restart processes via pm2 when available.
#
# Notes:
#   - By default the script archives files (to ./maintenance_archive). Use --delete to remove.
#   - Use --dry-run to preview changes before applying them.
#   - Protected basenames (package.json, package-lock.json, evaluate.json) are preserved
#     unless overridden via --protect/--protect-file or removed with --force.
set -euo pipefail

LOCKFILE="/var/lock/maintenance-clean.lock"
LOCAL_LOCK="./maintenance-clean.lock"
ARCHIVE_DIR="./maintenance_archive"
MAINT_LOG="./maintenance.log"
RETENTION_DAYS=7
DRY_RUN=false
FORCE=false
DELETE_INSTEAD_OF_ARCHIVE=false
ARCHIVE_FLAG=false

# Default protected basenames (never delete unless --force)
TOOLS_EXCLUDE_NAMES=( "package.json" "package-lock.json" "evaluate.json" )

# Additional dynamic protections (from CLI --protect or --protect-file)
CLI_PROTECT_LIST=()    # comma separated from --protect
FILE_PROTECT_LIST=()   # read from --protect-file (one filename per line)

# Patterns for temp/backup files
PATTERNS=( "*.js~" "*.toml~" "*.json.swp" ".*.json.swp" "*.swp" "*.swo" "*~" "#*#" "*.bak" "*.tmp" )
LOG_ROTATED_PATTERN='*.log.[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]*'

log() {
  local ts; ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "[$ts] $1"
  printf "[%s] %s\n" "$ts" "$1" >> "$MAINT_LOG" 2>/dev/null || true
}

usage() {
  cat <<EOF
Usage: $0 [--dry-run] [--force] [--days N] [--delete] [--protect files] [--protect-file path]
  --dry-run         : show actions without changes
  --force           : allow deletion of protected files (for basenames listed in --protect or TOOLS_EXCLUDE_NAMES)
  --days N          : retention window in days (default: ${RETENTION_DAYS})
  --delete          : permanently delete files rather than archive
  --protect LIST    : comma-separated basenames to protect (e.g. "foo.json,bar.log")
  --protect-file FP : path to a file listing basenames to protect (one per line)
  --help            : show this help
  --archive         : operate on the existing archive dir (use with --delete to remove archive contents)
EOF
  exit 2
}

choose_lockfile() {
  if [ -w /var/lock ] 2>/dev/null; then echo "$LOCKFILE"; else echo "$LOCAL_LOCK"; fi
}

acquire_lock() {
  local lf; lf="$(choose_lockfile)"
  if command -v flock >/dev/null 2>&1; then
    exec 200>"$lf"
    if ! flock -n 200; then
      echo "Another maintenance run active (lock: $lf). Exiting."
      exit 0
    fi
  else
    if [ -f "$lf" ]; then
      local pid; pid=$(cat "$lf" 2>/dev/null || true)
      if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo "Another maintenance run active (pid: $pid). Exiting."
        exit 0
      fi
    fi
    echo $$ > "$lf"
    trap 'rm -f "$lf" >/dev/null 2>&1 || true' EXIT
  fi
}

# Add an entry to DYNAMIC_PROTECTED array (stores basenames)
DYNAMIC_PROTECTED=()
add_protected() {
  local entry="$1"
  # normalize: only basename
  local base
  base="$(basename "$entry")"
  # skip empty
  [ -z "$base" ] && return
  # avoid duplicates
  for e in "${DYNAMIC_PROTECTED[@]}"; do
    [ "$e" = "$base" ] && return
  done
  DYNAMIC_PROTECTED+=( "$base" )
}

# Build combined protected set (TOOLS_EXCLUDE_NAMES + CLI + FILE)
build_protected_set() {
  # start with static list
  for n in "${TOOLS_EXCLUDE_NAMES[@]}"; do add_protected "$n"; done
  # CLI_PROTECT_LIST: comma separated values
  IFS=',' read -r -a cli_items <<< "${CLI_PROTECT_LIST[*]-}"
  for ci in "${cli_items[@]}"; do
    [ -z "$ci" ] && continue
    # strip whitespace
    ci="$(echo "$ci" | xargs)"
    add_protected "$ci"
  done
  # FILE_PROTECT_LIST: entries collected from file(s)
  for fp in "${FILE_PROTECT_LIST[@]}"; do
    [ ! -f "$fp" ] && { log "Protect-file not found: $fp"; continue; }
    while IFS= read -r line || [ -n "$line" ]; do
      # ignore empty lines and comments
      line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
      [ -z "$line" ] && continue
      case "$line" in \#*) continue ;; esac
      add_protected "$line"
    done < "$fp"
  done
}

# Ensure maintenance log and archive dir exist (so log() and moves work)
mkdir -p "$(dirname "$MAINT_LOG")" 2>/dev/null || true
touch "$MAINT_LOG" 2>/dev/null || true
mkdir -p "$ARCHIVE_DIR" 2>/dev/null || true

# Returns 0 if the basename is protected
is_protected() {
  local base="$1"
  for p in "${DYNAMIC_PROTECTED[@]}"; do
    [ "$base" = "$p" ] && return 0
  done
  return 1
}

archive_or_delete() {
  local fp="$1"; local action="$2"
  if [ "$DRY_RUN" = true ]; then
    echo "[DRY-RUN] Would ${action} $fp"; return 0
  fi
  if [ "$action" = "archive" ]; then
    mkdir -p "$ARCHIVE_DIR"
    local dest="$ARCHIVE_DIR/$(date +%Y%m%d-%H%M%S)-$(basename "$fp")"
    mv -f -- "$fp" "$dest" && log "Archived $fp -> $dest"
  else
    rm -rf -- "$fp" && log "Deleted $fp"
  fi
}

# CLI parsing
while [ $# -gt 0 ]; do
    case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --force) FORCE=true; shift ;;
    --days) shift; RETENTION_DAYS="${1:-$RETENTION_DAYS}"; shift ;;
    --delete) DELETE_INSTEAD_OF_ARCHIVE=true; shift ;;
    --archive) ARCHIVE_FLAG=true; shift ;;
    --protect) shift; CLI_PROTECT_LIST=("${1:-}"); shift ;;
    --protect-file) shift; FILE_PROTECT_LIST+=( "${1:-}" ); shift ;;
    --help|-h) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

# Build protected set
build_protected_set

# Log protection set for visibility
log "Protected basenames: ${DYNAMIC_PROTECTED[*]}"


if [ "$DRY_RUN" = true ]; then log "Running in DRY-RUN mode (no file modifications)."; fi
if [ "$FORCE" = true ]; then log "FORCE enabled: protected files may be deleted/archived."; fi
if [ "$DELETE_INSTEAD_OF_ARCHIVE" = true ]; then log "DELETE mode enabled: files will be permanently removed (no archive)."; fi

acquire_lock
# If user explicitly asked to act on archive and also requested delete, remove archive contents.
# Safety: require --archive plus --delete. Honor --dry-run.
if [ "$ARCHIVE_FLAG" = true ] && [ "$DELETE_INSTEAD_OF_ARCHIVE" = true ]; then
  if [ ! -d "$ARCHIVE_DIR" ]; then
    log "Archive directory not found: $ARCHIVE_DIR"
  else
    if [ "$DRY_RUN" = true ]; then
      log "[DRY-RUN] Would remove all files under archive dir: $ARCHIVE_DIR/*"
      # show what would be removed
      find "$ARCHIVE_DIR" -mindepth 1 -print || true
    else
      log "Removing all contents of archive directory: $ARCHIVE_DIR"
      # remove contents but keep the archive dir itself
      rm -rf -- "${ARCHIVE_DIR:?}/"* || true
      log "Archive directory contents removed: $ARCHIVE_DIR"
    fi
  fi
fi
log "Starting maintenance-clean (retention=${RETENTION_DAYS}d)"

# Convert to minutes for precise selection (N * 24h)
MINUTES=$(( RETENTION_DAYS * 24 * 60 ))

shopt -s nullglob

# --- COMPLETE remove/archive of tools/backtest content ---
BACKTEST_DIR="./tools/backtest"
if [ -d "$BACKTEST_DIR" ]; then
  # If dry-run, show what would be archived/removed based on age (mmin)
  if [ "$DRY_RUN" = true ]; then
    # show files older than retention
    find "$BACKTEST_DIR" -mindepth 1 -mmin +"$MINUTES" -print || true
    # also show directories that would be removed/archived
    find "$BACKTEST_DIR" -mindepth 1 -maxdepth 2 -type d -print || true
  else
    # Archive or delete files older than retention
    while IFS= read -r -d '' f; do
      if [ -f "$f" ]; then
        archive_or_delete "$f" "$( [ "$DELETE_INSTEAD_OF_ARCHIVE" = true ] && echo delete || echo archive )"
      fi
    done < <(find "$BACKTEST_DIR" -mindepth 1 -type f -mmin +"$MINUTES" -print0 || true)

    # Remove or archive directories under BACKTEST_DIR (no age check; treat as removable)
    while IFS= read -r -d '' d; do
      # if delete mode -> remove directory fully; else archive entire directory
      if [ "$DELETE_INSTEAD_OF_ARCHIVE" = true ]; then
        rm -rf -- "$d" && log "Deleted directory $d"
      else
        mkdir -p "$ARCHIVE_DIR"
        mv -f -- "$d" "$ARCHIVE_DIR/$(date +%Y%m%d-%H%M%S)-$(basename "$d")" && log "Archived directory $d"
      fi
    done < <(find "$BACKTEST_DIR" -mindepth 1 -maxdepth 2 -type d -print0 || true)
  fi
else
  log "No $BACKTEST_DIR directory found"
fi

# --- Remove common temp/backup patterns project-wide ---
for pattern in "${PATTERNS[@]}"; do
  log "Scanning pattern: $pattern"
  if [ "$DRY_RUN" = true ]; then
    find . -type f -name "$pattern" -print || true
  else
    while IFS= read -r -d '' f; do
      base=$(basename "$f")
      if is_protected "$base" && [ "$FORCE" = false ]; then
        log "Skipping protected file by basename: $f"
        continue
      fi
      archive_or_delete "$f" "$( [ "$DELETE_INSTEAD_OF_ARCHIVE" = true ] && echo delete || echo archive )"
    done < <(find . -type f -name "$pattern" -print0 || true)
  fi
done

log "Maintenance cleanup completed. Archive dir: ${ARCHIVE_DIR}"

# Restart pm2 processes only if pm2 is available (keep original behavior)
if command -v pm2 >/dev/null 2>&1; then
  log "Restarting pm2 processes..."
  pm2 restart all || log "pm2 restart all failed (continuing)..."
  if [ -f simulator.config.js ]; then
    log "Starting main simulator with pm2..."
    pm2 start simulator.config.js || log "pm2 start simulator.config.js failed (continuing)..."
  fi
else
  log "pm2 not found in PATH; skipping pm2 restart/start steps."
fi

log "All done. New logs will be generated as your processes restart (if pm2 was available)."
exit 0
