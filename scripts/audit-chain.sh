#!/bin/bash
# Serial audit chain. Memory rule: NEVER run parallel generation/LLM scripts.
# This script self-locks so only one instance runs globally.
cd /home/ubuntu/ai-private-tutor || exit 1
unset AUDIT_ONLY_IDS

LOCK=/tmp/audit-chain.lock
exec 200>"$LOCK"
if ! flock -n 200; then
  echo "Another audit-chain is already running. Exiting."
  exit 0
fi

wait_for_free() {
  while pgrep -f "audit-content.ts --grade" > /dev/null; do
    sleep 30
  done
}

run_grade() {
  local GRADE=$1
  local LOG="/tmp/audit-$(echo "$GRADE" | tr '[:upper:]' '[:lower:]' | tr -d '_').log"
  local PF="audit-reports/${GRADE}-progress.json"
  echo "=== [$(date -Is)] START $GRADE ===" | tee "$LOG"

  # Try/resume up to 5 times per grade
  for attempt in 1 2 3 4 5; do
    npx tsx scripts/audit-content.ts --grade "$GRADE" --apply 2>&1 | tee "$LOG"
    local RUNNING
    RUNNING=$(python3 -c "import json;print(json.load(open('$PF'))['running'])" 2>/dev/null || echo False)
    if [ "$RUNNING" = "False" ]; then
      echo "=== [$(date -Is)] DONE $GRADE (attempt $attempt) ===" | tee -a "$LOG"
      return 0
    fi
    echo "=== [$(date -Is)] $GRADE incomplete, resuming (attempt $attempt) ===" | tee -a "$LOG"
    sleep 30
  done
  echo "=== [$(date -Is)] $GRADE gave up after 5 attempts ===" | tee -a "$LOG"
}

# Start only if no other audit is running
wait_for_free
run_grade SD_5
wait_for_free
run_grade SMP_1
wait_for_free
run_grade SMA_2
echo "=== [$(date -Is)] ALL GRADES COMPLETE ==="
