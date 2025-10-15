#!/bin/bash

# Automated Job Scanning Script
API_URL="http://localhost:3000/api/monitor"
LOG_FILE="/var/log/job-tracker-cron.log"
USER_ID="default-user-id"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting automated job scan..." >> "$LOG_FILE"

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\"}" \
  2>&1)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Response: $RESPONSE" >> "$LOG_FILE"

if echo "$RESPONSE" | grep -q "\"success\":true"; then
  COUNT=$(echo "$RESPONSE" | grep -oP '"count":\K[0-9]+' || echo "0")
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Scan complete. Found $COUNT new jobs." >> "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ Scan failed." >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
