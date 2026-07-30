#!/usr/bin/env bash
# Trigger the AI Private Tutor schedule sweep.
#
# Runs every 5 minutes from crontab. The endpoint is idempotent:
#   - H-1 / T-30 reminders are deduped via session metadata
#   - COMPLETED / MISSED detection only touches SCHEDULED sessions
#   - the daily brief has its own 6-9 AM window + per-day dedup
#
# Reads CRON_SECRET from .env so the token never lives in crontab.
set -euo pipefail

PROJECT_DIR="/home/ubuntu/ai-private-tutor"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/cron-sweep.log"
ENDPOINT="http://localhost:3000/api/cron/schedule-sweep"

mkdir -p "$LOG_DIR"

# Extract CRON_SECRET, tolerating surrounding quotes.
TOKEN="$(
  sed -n 's/^CRON_SECRET=//p' "$PROJECT_DIR/.env" \
    | head -1 \
    | sed "s/^['\"]//; s/['\"]$//"
)"

if [ -z "$TOKEN" ]; then
  echo "$(date -Is) ERROR CRON_SECRET not set in $PROJECT_DIR/.env" >> "$LOG_FILE"
  exit 1
fi

RESPONSE="$(
  curl -sS --max-time 120 \
    --get "$ENDPOINT" \
    --data-urlencode "token=$TOKEN" \
    2>&1
)" || {
  echo "$(date -Is) ERROR curl failed: $RESPONSE" >> "$LOG_FILE"
  exit 1
}

# Only log when the sweep actually did something, or when it failed.
# Keeps the log readable instead of 288 no-op lines per day.
if echo "$RESPONSE" | grep -q '"ok":true'; then
  if echo "$RESPONSE" \
      | grep -qE '"(h1Sent|t30Sent|completedMarked|missedMarked|sessionsAssigned|dailyBriefSent)":[1-9]'; then
    echo "$(date -Is) $RESPONSE" >> "$LOG_FILE"
  fi
else
  echo "$(date -Is) FAIL $RESPONSE" >> "$LOG_FILE"
fi

# Trim the log so it cannot grow without bound.
if [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE")" -gt 5000 ]; then
  tail -2000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi
