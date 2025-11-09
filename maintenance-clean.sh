#!/usr/bin/env bash
#
# maintenance-clean.sh
# Streamed, memory-safe repo cleanup
#
# Usage:
#   ./maintenance-clean.sh [RETENTION_DAYS] [--dry-run] [--yes] [--verbose] [--protect=list]
#   sudo chmod +x maintenance-clean.sh
#   Preview before deleting, run: ./maintenance-clean.sh 1 --dry-run
#   For non-interactive runs use: ./maintenance-clean.sh 1 --yes
#
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
DEFAULT_RETENTION_DAYS=7
: "${PROTECTED_BASENAMES:=package.json package-lock.json evaluate.json}"
DEFAULT_PRUNE_DIRS=".git .github node_modules .venv venv .venv*"

log() { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
err()  { log "ERROR: $*" >&2; }
die()  { err "$*"; exit 1; }

usage() {
  cat <<USAGE
$SCRIPT_NAME [RETENTION_DAYS] [options]

Remove files/directories older than RETENTION_DAYS (default ${DEFAULT_RETENTION_DAYS}).
Options:
  -n, --dry-run        Do not delete anything, just print what would be removed.
  -y, --yes, --force   Do not prompt, run non-interactively.
  -v, --verbose        Verbose output.
  --protect=LIST       Comma or space separated protected basenames (overrides PROTECTED_BASENAMES env)
  -h, --help           Show this help and exit.
USAGE
}

# --------------------------
# Parse args
# --------------------------
RETENTION_DAYS=""
DRY_RUN=false
ASSUME_YES=false
VERBOSE=false

while (( "$#" )); do
  case "$1" in
    -n|--dry-run) DRY_RUN=true; shift ;;
    -y|--yes|--force) ASSUME_YES=true; shift ;;
    -v|--verbose) VERBOSE=true; shift ;;
    -h|--help) usage; exit 0 ;;
    --protect=*)
      val="${1#--protect=}"
      PROTECTED_BASENAMES="$(printf '%s' "$val" | sed 's/,/ /g')"
      shift
      ;;
    --protect)
      shift
      PROTECTED_BASENAMES="${1:-$PROTECTED_BASENAMES}"
      shift
      ;;
    --) shift; break ;;
    -*)
      err "Unknown option: $1"; usage; exit 2 ;;
    *)
      if [ -z "$RETENTION_DAYS" ]; then RETENTION_DAYS="$1"; shift; else shift; fi
      ;;
  esac
done

if [ -z "$RETENTION_DAYS" ]; then RETENTION_DAYS="${DEFAULT_RETENTION_DAYS}"; fi
# Strip non-digits like "7d"
RETENTION_DAYS="${RETENTION_DAYS%%[^0-9]*}"
if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then die "Invalid retention value."; fi

read -r -a PROTECTED_ARR <<< "$(printf '%s' "$PROTECTED_BASENAMES")"
ROOT_DIR="."

log "Protected basenames: ${PROTECTED_ARR[*]}"
log "Starting maintenance-clean (retention=${RETENTION_DAYS}d) at root: ${ROOT_DIR}"
[ "$VERBOSE" = true ] && log "Dry run: $DRY_RUN ; Assume yes: $ASSUME_YES"

# Build prune -path expressions for find
PRUNE_FIND_EXPR=()
for d in $DEFAULT_PRUNE_DIRS; do
  PRUNE_FIND_EXPR+=( -path "./$d" -prune -o )
done

# Helper: case-insensitive compare basename to protected list
is_protected() {
  local path="$1"; local base
  base="$(basename "$path")"
  for b in "${PROTECTED_ARR[@]}"; do
    [ -z "$b" ] && continue
    if [ "$base" = "$b" ] || [ "${base,,}" = "${b,,}" ]; then
      return 0
    fi
  done
  return 1
}

# --------------------------
# Find & delete files (streaming)
# --------------------------
deleted=0
failed=0
checked=0
progress_interval=100

log "Scanning for files older than ${RETENTION_DAYS} days (this may take a while on large repos)..."

# Build find command as array for safety
find_files_cmd=(find "$ROOT_DIR" -mindepth 1)
if [ "${#PRUNE_FIND_EXPR[@]}" -gt 0 ]; then
  find_files_cmd+=("${PRUNE_FIND_EXPR[@]}")
fi
find_files_cmd+=(-type f -mtime +"$RETENTION_DAYS" -print0)

# Stream through files one-by-one
"${find_files_cmd[@]}" | while IFS= read -r -d '' file; do
  checked=$((checked+1))
  # Skip protected basenames
  if is_protected "$file"; then
    [ "$VERBOSE" = true ] && log "Skipping protected file: $file"
    continue
  fi
  if [ "$DRY_RUN" = true ]; then
    printf 'F %s\n' "$file"
  else
    if rm -f -- "$file"; then
      [ "$VERBOSE" = true ] && log "Deleted file: $file"
      deleted=$((deleted+1))
    else
      err "Failed to remove file: $file"
      failed=$((failed+1))
    fi
  fi
  if (( checked % progress_interval == 0 )); then log "Processed ${checked} files... deleted=${deleted} failed=${failed}"; fi
done

# --------------------------
# Find & delete directories (streaming, depth-first)
# --------------------------
# Use -depth so subdirs are seen before parents
find_dirs_cmd=(find "$ROOT_DIR" -mindepth 1 -depth)
if [ "${#PRUNE_FIND_EXPR[@]}" -gt 0 ]; then
  find_dirs_cmd+=("${PRUNE_FIND_EXPR[@]}")
fi
find_dirs_cmd+=(-type d -mtime +"$RETENTION_DAYS" -print0)

"${find_dirs_cmd[@]}" | while IFS= read -r -d '' dir; do
  # skip protected basenames
  if is_protected "$dir"; then
    [ "$VERBOSE" = true ] && log "Skipping protected dir: $dir"
    continue
  fi
  # attempt rmdir, fallback to rm -rf
  if [ "$DRY_RUN" = true ]; then
    printf 'D %s\n' "$dir"
  else
    if rmdir -- "$dir" 2>/dev/null; then
      [ "$VERBOSE" = true ] && log "Removed empty dir: $dir"
      deleted=$((deleted+1))
    else
      if rm -rf -- "$dir"; then
        [ "$VERBOSE" = true ] && log "Removed directory tree: $dir"
        deleted=$((deleted+1))
      else
        err "Failed to remove directory: $dir"
        failed=$((failed+1))
      fi
    fi
  fi
done

log "Finished cleanup. Files processed: ${checked}. Deleted: ${deleted}. Failed: ${failed}."
if [ "$DRY_RUN" = true ]; then
  log "DRY RUN complete; no changes made."
  exit 0
fi
if [ "$failed" -gt 0 ]; then
  err "Some items could not be deleted. Inspect permissions or locks."
  exit 2
fi

exit 0
