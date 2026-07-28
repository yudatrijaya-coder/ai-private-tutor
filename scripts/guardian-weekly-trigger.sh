#!/bin/bash
# Guardian weekly report trigger
# Fires Next.js API to queue weekly reports for all students
CRON_SECRET="guardian-weekly-secret-1783593237"
curl -s "http://localhost:3000/api/cron/guardian-report?token=${CRON_SECRET}"
echo ""
