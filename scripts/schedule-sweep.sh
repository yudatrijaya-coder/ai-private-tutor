#!/bin/bash
# Call schedule-sweep cron endpoint for reminders
TOKEN="guardian-weekly-secret-1783593237"
URL="http://localhost:3000/api/cron/schedule-sweep?token=$TOKEN"

# Capture full response for debugging
RESPONSE=$(curl -s --max-time 30 "$URL" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "ERROR: curl exit code $EXIT_CODE — $RESPONSE"
  exit 1
fi

# Parse and display key metrics
echo "$RESPONSE" | python3 -c "
import json,sys
try:
    d = json.load(sys.stdin)
    rs = d.get('reminderSweep', {})
    brief = d.get('dailyBriefSent', 0)
    assigned = d.get('sessionsAssigned', 0)
    print(f'Reminders: {rs.get(\"h1Sent\",0)} H-1, {rs.get(\"t30Sent\",0)} T-30, {rs.get(\"missedMarked\",0)} missed')
    print(f'Briefs sent: {brief} | Sessions auto-assigned: {assigned}')
    if rs.get('errors', 0) > 0:
        print(f'WARN: {rs[\"errors\"]} errors in reminders')
except Exception as e:
    print(f'PARSE ERROR: {e}')
    # Print raw for debugging
    import os, sys
    sys.stdout.flush()
    os.write(1, b'RAW: ')
    os.write(1, sys.stdin.buffer.read())
"
