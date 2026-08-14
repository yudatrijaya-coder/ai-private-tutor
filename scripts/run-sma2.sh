#!/bin/bash
cd /home/ubuntu/ai-private-tutor
unset AUDIT_ONLY_IDS
rm -f audit-reports/SMA_2-progress.json
:> /tmp/audit-sma2.log
npx tsx scripts/audit-content.ts --grade SMA_2 --apply 2>&1 | tee /tmp/audit-sma2.log
echo "=== SMA_2 DONE ==="
