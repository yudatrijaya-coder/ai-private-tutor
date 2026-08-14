#!/bin/bash
# Retry all error materials across grades after main audit chain completes.
# Run via cron or manually after all 3 levels done.
cd /home/ubuntu/ai-private-tutor || exit 1
unset AUDIT_ONLY_IDS

echo "=== [$(date -Is)] Retry error materials ==="

for GRADE in SD_5 SMP_1 SMA_2; do
  PF="audit-reports/${GRADE}-progress.json"
  if [ ! -f "$PF" ]; then
    echo "No progress file for $GRADE, skipping"
    continue
  fi

  DONE=$(python3 -c "import json;d=json.load(open('$PF'));print(d['done'])" 2>/dev/null || echo 0)
  TOTAL=$(python3 -c "import json;d=json.load(open('$PF'));print(d['total'])" 2>/dev/null || echo 0)
  RUNNING=$(python3 -c "import json;d=json.load(open('$PF'));print(d['running'])" 2>/dev/null || echo False)

  if [ "$RUNNING" = "True" ]; then
    echo "$GRADE still running ($DONE/$TOTAL), skipping retry"
    continue
  fi

  if [ "$DONE" -lt "$TOTAL" ] 2>/dev/null; then
    echo "$GRADE incomplete ($DONE/$TOTAL), skipping retry"
    continue
  fi

  # Find error materials from latest audit report
  REPORT=$(ls -t audit-reports/*-${GRADE}-audit.json 2>/dev/null | head -1)
  if [ -z "$REPORT" ]; then
    echo "No audit report for $GRADE, skipping"
    continue
  fi

  IDS=$(python3 -c "
import json
d=json.load(open('$REPORT'))
ids=[r['materialId'] for r in d.get('results',[]) if r.get('error')]
print(','.join(ids))
" 2>/dev/null)

  if [ -z "$IDS" ] || [ "$IDS" = "" ]; then
    echo "$GRADE: no error materials to retry"
    continue
  fi

  COUNT=$(echo "$IDS" | tr ',' '\n' | wc -l)
  echo "$GRADE: retrying $COUNT error materials"
  export AUDIT_ONLY_IDS="$IDS"
  npx tsx scripts/audit-content.ts --grade "$GRADE" --apply 2>&1 | tee "/tmp/audit-${GRADE,,}-retry.log"
  echo "$GRADE retry done"
done

echo "=== [$(date -Is)] All retries complete ==="
