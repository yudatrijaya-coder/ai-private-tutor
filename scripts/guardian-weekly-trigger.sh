#!/bin/bash
# Guardian weekly report trigger
# Calls the enhanced guardian-report endpoint (XP + streak + badges)
curl -s "http://localhost:3000/api/cron/guardian-report"
echo ""
