#!/bin/bash

# Automated Job Scanning Script
# Place this in /opt/job-tracker/scripts/scan-jobs-cron.sh
# Make executable: chmod +x /opt/job-tracker/scripts/scan-jobs-cron.sh

# Configuration
API_URL="http://localhost:3000/api/monitor"
LOG_FILE="/var/log/job-tracker-cron.log"
USER_ID="default-user-id"  # Change this to actual user ID

# Timestamp
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting automated job scan..." >> "$LOG_FILE"

# Call the monitor API
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\"}" \
  2>&1)

# Log response
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Response: $RESPONSE" >> "$LOG_FILE"

# Check if successful
if echo "$RESPONSE" | grep -q "\"success\":true"; then
  COUNT=$(echo "$RESPONSE" | grep -oP '"count":\K[0-9]+')
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Scan complete. Found $COUNT new jobs." >> "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ Scan failed." >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
