#!/bin/bash

# Automated Job Scanning Script
API_URL="http://localhost:3000/api/cron/scan-jobs"
LOG_FILE="/var/log/job-tracker-cron.log"

# Load environment variables
source /opt/job-tracker/.env

echo "[2025-10-18 12:17:04] Starting automated job scan for all users..." >> "$LOG_FILE"

RESPONSE=$(curl -s -X POST "$API_URL"   -H "Content-Type: application/json"   -H "x-cron-secret: $CRON_SECRET"   2>&1)

echo "[2025-10-18 12:17:04] Response: $RESPONSE" >> "$LOG_FILE"

if echo "$RESPONSE" | grep -q '"success":true'; then
  TOTAL=$(echo "$RESPONSE" | grep -oP '"totalJobsFound":\K[0-9]+' || echo "0")
  USERS=$(echo "$RESPONSE" | grep -oP '"Scanned \K[0-9]+' || echo "0")
  echo "[2025-10-18 12:17:04] ✓ Scan complete. Scanned $USERS users, found $TOTAL new jobs." >> "$LOG_FILE"
else
  echo "[2025-10-18 12:17:04] ✗ Scan failed." >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
