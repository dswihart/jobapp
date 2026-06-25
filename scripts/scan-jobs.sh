#!/bin/bash

# Automated Job Scanning Script - runs hourly 06-21 UTC via cron
API_URL="http://localhost:3000/api/cron/scan-jobs"
LOG_FILE="/var/log/job-tracker-cron.log"
LOCK_FILE="/var/run/job-tracker-scan.lock"

# Prevent overlapping scans (cron + manual triggers)
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(date "+%Y-%m-%d %H:%M:%S")] Scan already running — skipping." >> "$LOG_FILE"
  exit 0
fi

# Load environment variables
. /opt/job-tracker/.env

TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$TIMESTAMP] Starting automated job scan for all users..." >> "$LOG_FILE"

START_TIME=$(date +%s)

RESPONSE=$(curl -s --max-time 3300 -X POST "$API_URL"   -H "Content-Type: application/json"   -H "x-cron-secret: $CRON_SECRET"   2>&1)

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] Response: $RESPONSE" >> "$LOG_FILE"

if echo "$RESPONSE" | grep -q '"success":true'; then
  TOTAL=$(echo "$RESPONSE" | grep -oP "\"totalJobsFound\":\K[0-9]+" || echo "0")
  echo "[$TIMESTAMP] Scan complete in ${DURATION}s. Found $TOTAL new jobs." >> "$LOG_FILE"
else
  echo "[$TIMESTAMP] Scan failed after ${DURATION}s." >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
