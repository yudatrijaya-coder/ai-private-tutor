#!/bin/bash
# Trigger daily nudge
curl -s -m 120 http://localhost:3000/api/cron/daily-nudge
