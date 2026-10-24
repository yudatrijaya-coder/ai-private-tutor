#!/bin/bash
# Trigger AI Private Tutor schedule sweep (H-1 / T-30 / missed / daily brief / auto-assign).
#
# The secret is read from the app .env — never hardcoded here. This file used to
# carry the production CRON_SECRET in plaintext, and the repository is public.
#
# Endpoint: GET /api/cron/schedule-sweep?token=<CRON_SECRET>
# Auth is fail-closed: an unset CRON_SECRET makes the endpoint return 503.

set -uo pipefail

ENV_FILE="${ENV_FILE:-/home/ubuntu/ai-private-tutor/.env}"
URL_BASE="${URL_BASE:-http://localhost:3000/api/cron/schedule-sweep}"

if [ ! -r "$ENV_FILE" ]; then
  echo "ERROR: cannot read $ENV_FILE" >&2
  exit 1
fi

TOKEN="$(sed -n 's/^CRON_SECRET=//p' "$ENV_FILE" | head -1 | tr -d '"'"'"'\r')"

if [ -z "$TOKEN" ]; then
  echo "ERROR: CRON_SECRET is not set in $ENV_FILE — refusing to call the endpoint" >&2
  exit 1
fi

RESPONSE="$(curl -sS --max-time 30 --get "$URL_BASE" --data-urlencode "token=$TOKEN" 2>&1)"
EXIT_CODE=$?

if [ "$EXIT_CODE" -ne 0 ]; then
  echo "ERROR: curl exit code $EXIT_CODE — $RESPONSE" >&2
  exit 1
fi

echo "$RESPONSE" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.stdout.write('RAW: ' + sys.stdin.read() + '\n')
    raise SystemExit(1)
if d.get('error'):
    print('ERROR:', d['error'])
    raise SystemExit(1)
rs = d.get('reminderSweep', {})
print(f\"Reminders: {rs.get('h1Sent', 0)} H-1, {rs.get('t30Sent', 0)} T-30, {rs.get('missedMarked', 0)} missed\")
print(f\"Briefs sent: {d.get('dailyBriefSent', 0)} | Sessions auto-assigned: {d.get('sessionsAssigned', 0)}\")
if rs.get('errors', 0) > 0:
    print(f\"WARN: {rs['errors']} errors in reminders\")
"
