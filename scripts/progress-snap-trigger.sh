#!/bin/bash
# Trigger progress-snap endpoint
curl -s -m 120 http://localhost:3000/api/cron/progress-snap
