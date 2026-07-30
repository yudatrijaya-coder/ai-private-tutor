#!/usr/bin/env bash
# PostgreSQL backup for AI Private Tutor.
#
# The DB holds 1144 materials + 1200 quizzes produced by thousands of LLM calls.
# Losing it means regenerating everything, so this runs daily and keeps a
# rolling window plus weekly snapshots.
#
# Retention:
#   - daily  : last 7
#   - weekly : last 8 (taken on Sundays)
#
# Restore:
#   gunzip -c ~/backups/postgres/daily/ai_private_tutor-YYYYMMDD-HHMM.sql.gz \
#     | sudo -u postgres psql -d ai_private_tutor
set -euo pipefail

DB="ai_private_tutor"
BACKUP_ROOT="/home/ubuntu/backups/postgres"
DAILY_DIR="$BACKUP_ROOT/daily"
WEEKLY_DIR="$BACKUP_ROOT/weekly"
LOG_FILE="$BACKUP_ROOT/backup.log"

DAILY_KEEP=7
WEEKLY_KEEP=8

# Refuse to run if the filesystem is nearly full — a truncated dump that
# overwrites a good one is worse than no new backup.
MIN_FREE_MB=2048

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"

log() { echo "$(date -Is) $*" >> "$LOG_FILE"; }

free_mb=$(df -Pm "$BACKUP_ROOT" | awk 'NR==2 {print $4}')
if [ "$free_mb" -lt "$MIN_FREE_MB" ]; then
  log "ABORT only ${free_mb}MB free, need ${MIN_FREE_MB}MB"
  echo "backup aborted: only ${free_mb}MB free on $(df -P "$BACKUP_ROOT" | awk 'NR==2{print $6}')"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M)"
TARGET="$DAILY_DIR/${DB}-${STAMP}.sql.gz"
TMP="${TARGET}.partial"

# Dump to a .partial file, then rename. An interrupted run leaves the
# .partial behind and never masquerades as a complete backup.
if ! sudo -u postgres pg_dump --no-owner --no-acl "$DB" 2>>"$LOG_FILE" | gzip -9 > "$TMP"; then
  log "FAIL pg_dump failed for $DB"
  rm -f "$TMP"
  echo "backup FAILED: pg_dump error for $DB (see $LOG_FILE)"
  exit 1
fi

# Integrity gate: gzip must decompress cleanly and the SQL must contain the
# terminator pg_dump writes at the end of a complete dump.
if ! gzip -t "$TMP" 2>>"$LOG_FILE"; then
  log "FAIL gzip integrity check failed for $TMP"
  rm -f "$TMP"
  echo "backup FAILED: corrupt archive"
  exit 1
fi

if ! gunzip -c "$TMP" | tail -5 | grep -q "PostgreSQL database dump complete"; then
  log "FAIL dump is truncated (no completion marker) $TMP"
  rm -f "$TMP"
  echo "backup FAILED: truncated dump"
  exit 1
fi

mv "$TMP" "$TARGET"
SIZE=$(du -h "$TARGET" | cut -f1)

# Row-count sanity check recorded alongside the backup, so a silently
# emptied database is visible in the log history.
ROWS=$(sudo -u postgres psql -d "$DB" -t -A -c \
  "SELECT (SELECT count(*) FROM \"Material\") || '/' || (SELECT count(*) FROM \"Quiz\") || '/' || (SELECT count(*) FROM \"Student\");" 2>/dev/null || echo "?")

log "OK $TARGET ($SIZE) material/quiz/student=$ROWS"

# Sunday: promote a copy to the weekly set.
if [ "$(date +%u)" -eq 7 ]; then
  cp "$TARGET" "$WEEKLY_DIR/"
  log "OK weekly copy $(basename "$TARGET")"
fi

# Prune. `ls -1t` is safe here because the filenames are timestamped and
# contain no spaces or newlines.
prune() {
  local dir="$1" keep="$2"
  local n
  # `|| true` is required: with `set -o pipefail`, a glob that matches nothing
  # makes `ls` exit non-zero and would abort the whole script right at the end,
  # after a good backup was already written.
  n=$(ls -1t "$dir"/*.sql.gz 2>/dev/null | wc -l || true)
  if [ "${n:-0}" -gt "$keep" ]; then
    ls -1t "$dir"/*.sql.gz | tail -n +$((keep + 1)) | while read -r old; do
      rm -f "$old"
      log "prune $(basename "$old")"
    done
  fi
}
prune "$DAILY_DIR" "$DAILY_KEEP"
prune "$WEEKLY_DIR" "$WEEKLY_KEEP"

# Trim the log.
if [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE")" -gt 2000 ]; then
  tail -800 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

# Silent on success so cron only speaks up when something is wrong.
exit 0
