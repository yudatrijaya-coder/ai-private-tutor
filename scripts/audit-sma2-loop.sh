#!/bin/bash
cd /home/ubuntu/ai-private-tutor || exit 1
unset AUDIT_ONLY_IDS

for attempt in {1..20}; do
  echo "=== [$(date -Is)] SMA_2 attempt $attempt ==="
  npx tsx scripts/audit-content.ts --grade SMA_2 --apply >> /tmp/audit-sma2.log 2>&1
  EXIT=$?
  echo "Exit: $EXIT"
  if [ $EXIT -eq 0 ]; then
    echo "=== SUCCESS ==="
    break
  fi
  sleep 5
done
