#!/usr/bin/env bash
#
# maintenance.sh
# Safe maintenance for project log folders.
#
# By default this script (empties) old log and data files under project
# log directories instead of deleting them. To actually delete files pass --delete.
#
# Usage:
#   sudo chmod +x maintenance.sh 	#Setup running permission
#   ./maintenance.sh [RETENTION_DAYS] [options]
#   ./maintenance.sh 1 			#Starting maintenance-clean retention=1d
# Options:
#   -n, --dry-run        Print actions but don't change files
#   -y, --yes, --force   Non-interactive (assume yes)
#   -v, --verbose        Verbose output
#   --delete             Actually remove files instead of truncating (dangerous)
#   --paths=LIST         Comma-separated list of root paths to scan (defaults below)
#   -h, --help           Show this help and exit
#
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
DEFAULT_RETENTION_DAYS=3
# Protected basenames (never touch)
: "${PROTECTED_BASENAMES:=package.json package-lock.json evaluate.json}"
# Default log paths to scan (only existing ones will be used)
DEFAULT_LOG_PATHS="./logs,./tools/logs,./tools/microstructure/logs"

# Only truncate/delete files matching these extensions (case-insensitive)
DEFAULT_FILE_EXT="(.log|.jsonl|.json|.csv|.txt|.log.gz)"

log()  { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
err()  { log "ERROR: $*" >&2; }
die()  { err "$*"; exit 1; }

usage() {
  cat <<USAGE
$SCRIPT_NAME [RETENTION_DAYS] [options]

Truncate (empty) old log/data files under project logs directories.
Defaults: retention=${DEFAULT_RETENTION_DAYS} days, scan paths=${DEFAULT_LOG_PATHS}
Options:
  -n, --dry-run        Print actions, do not change files.
  -y, --yes, --force   Do not prompt.
  -v, --verbose        Verbose output.
  --delete             Actually delete files instead of truncating (dangerous).
  --paths=LIST         Comma-separated list of paths to scan (overrides default).
  -h, --help           Show this help and exit.

Examples:
  $SCRIPT_NAME              # truncate files older than 7 days in ./logs & ./tools/logs
  $SCRIPT_NAME 1 --dry-run  # show what would be truncated for 1 day retention
  $SCRIPT_NAME 30 --paths=./logs --yes
  $SCRIPT_NAME 7 --delete --yes   # WARNING: actually remove files
USAGE
}

# --------------------------
# Parse args
# --------------------------
RETENTION_DAYS=""
DRY_RUN=false
ASSUME_YES=false
VERBOSE=false
DO_DELETE=false
PATHS_CSV=""

while (( "$#" )); do
  case "$1" in
    -n|--dry-run) DRY_RUN=true; shift ;;
    -y|--yes|--force) ASSUME_YES=true; shift ;;
    -v|--verbose) VERBOSE=true; shift ;;
    --delete) DO_DELETE=true; shift ;;
    --paths=*) PATHS_CSV="${1#--paths=}"; shift ;;
    -h|--help) usage; exit 0 ;;
    --) shift; break ;;
    -*)
      err "Unknown option: $1"; usage; exit 2 ;;
    *)
      if [ -z "$RETENTION_DAYS" ]; then RETENTION_DAYS="$1"; shift; else shift; fi
      ;;
  esac
done

if [ -z "$RETENTION_DAYS" ]; then RETENTION_DAYS="${DEFAULT_RETENTION_DAYS}"; fi
RETENTION_DAYS="${RETENTION_DAYS%%[^0-9]*}"
if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then die "Invalid retention value: $RETENTION_DAYS"; fi

# Build list of scan roots
if [ -n "$PATHS_CSV" ]; then
  IFS=',' read -r -a SCAN_ROOTS <<< "$PATHS_CSV"
else
  IFS=',' read -r -a SCAN_ROOTS <<< "$DEFAULT_LOG_PATHS"
fi

# Keep only existing roots
EXISTING_ROOTS=()
for p in "${SCAN_ROOTS[@]}"; do
  # trim whitespace
  rp="$(printf '%s' "$p" | xargs)"
  [ -z "$rp" ] && continue
  if [ -e "$rp" ]; then
    EXISTING_ROOTS+=("$rp")
  else
    [ "$VERBOSE" = true ] && log "Skipping missing path: $rp"
  fi
done

if [ "${#EXISTING_ROOTS[@]}" -eq 0 ]; then
  die "No log paths found to scan. Provide --paths or create ./logs"
fi

read -r -a PROTECTED_ARR <<< "$(printf '%s' "$PROTECTED_BASENAMES")"

log "Protected basenames: ${PROTECTED_ARR[*]}"
log "Starting maintenance-clean (truncate mode by default). retention=${RETENTION_DAYS}d"
log "Scan roots: ${EXISTING_ROOTS[*]}"
[ "$VERBOSE" = true ] && log "Dry run: $DRY_RUN ; Assume yes: $ASSUME_YES ; Delete mode: $DO_DELETE"

# Helper: check protected basename (case-insensitive)
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

# Build find command template for streaming
# We search for files older than retention days and matching extensions
# Use -iname to match case-insensitive extensions
find_template=(find)
find_template+=( )
# We'll append each root later

# Candidate statistics
processed=0
truncated=0
deleted=0
skipped_protected=0
failed=0
progress_interval=100

log "Scanning and truncating files older than ${RETENTION_DAYS} days (extensions: ${DEFAULT_FILE_EXT})..."

for root in "${EXISTING_ROOTS[@]}"; do
  # Use a safe find invocation per root
  if [ "$VERBOSE" = true ]; then
    log "Finding in root: $root"
  fi
  # Construct find: find "$root" -type f -mtime +N \( -iname '*.log' -o -iname '*.jsonl' -o ... \) -print0
  find_cmd=(find "$root" -mindepth 1 -type f -mtime +"$RETENTION_DAYS" -print0)
  # Stream results
  "${find_cmd[@]}" | while IFS= read -r -d '' file; do
    processed=$((processed+1))
    # protect known basenames
    if is_protected "$file"; then
      skipped_protected=$((skipped_protected+1))
      [ "$VERBOSE" = true ] && log "Skipping protected file: $file"
      continue
    fi

    # Only operate on expected log/data file extensions to avoid touching unexpected content.
    case "${file,,}" in
      *.log|*.log.*|*.jsonl|*.json|*.csv|*.txt)
        # ok
        ;;
      *)
        [ "$VERBOSE" = true ] && log "Skipping non-log file (not matched extension): $file"
        continue
        ;;
    esac

    if [ "$DRY_RUN" = true ]; then
      printf '%s %s\n' "TRUNCATE" "$file"
      continue
    fi

    # Ask for confirmation once if not forced
    if [ "$ASSUME_YES" != true ] && [ "$processed" -eq 1 ]; then
      printf '\n'
      printf 'About to %s %s files older than %sd in %s. Proceed? [y/N]: ' \
        "$([ "$DO_DELETE" = true ] && echo "DELETE" || echo "TRUNCATE")" "$([ "${#EXISTING_ROOTS[@]}" -gt 1 ] && echo "in multiple roots" || echo "$root")" "$RETENTION_DAYS" "$root"
      read -r answer || answer="n"
      case "$answer" in
        y|Y|yes|YES) ;;
        *) log "Aborted by user."; exit 0 ;;
      esac
    fi

    if [ "$DO_DELETE" = true ]; then
      if rm -f -- "$file"; then
        deleted=$((deleted+1))
        [ "$VERBOSE" = true ] && log "Deleted file: $file"
      else
        err "Failed to delete: $file"
        failed=$((failed+1))
      fi
    else
      # Truncate in-place (preserves inode/permissions)
      if : > "$file"; then
        truncated=$((truncated+1))
        [ "$VERBOSE" = true ] && log "Truncated file: $file"
      else
        err "Failed to truncate: $file"
        failed=$((failed+1))
      fi
    fi

    if (( processed % progress_interval == 0 )); then
      log "Processed ${processed} files... truncated=${truncated} deleted=${deleted} skipped_protected=${skipped_protected} failed=${failed}"
    fi
  done
done

log "Finished. Processed=${processed}, truncated=${truncated}, deleted=${deleted}, skipped_protected=${skipped_protected}, failed=${failed}"
if [ "$DRY_RUN" = true ]; then
  log "DRY RUN complete; no files changed."
  exit 0
fi
if [ "$failed" -gt 0 ]; then
  err "Some items failed to change. Check permissions or locks."
  exit 2
fi
exit 0
