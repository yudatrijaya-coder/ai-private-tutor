#!/bin/bash
cd /home/ubuntu/ai-private-tutor
IDS=$(python3 -c "import json; d=json.load(open('audit-reports/2026-08-01-SD_5-audit.json')); print(','.join(r['materialId'] for r in d['results'] if r.get('error')))")
export AUDIT_ONLY_IDS=$IDS
echo "Retrying $(${IDS//,/ } | tr ',' '\n' | wc -l) SD_5 error materials"
npx tsx scripts/audit-content.ts --grade SD_5 --apply 2>&1 | tee /tmp/audit-sd5-retry.log
