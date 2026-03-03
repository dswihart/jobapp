#\!/bin/bash

# Automated Job Scanning Script - runs every 2 hours
API_URL="http://localhost:3000/api/cron/scan-jobs"
LOG_FILE="/var/log/job-tracker-cron.log"

# Load environment variables
source /opt/job-tracker/.env

TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$TIMESTAMP] Starting automated job scan for all users..." >> "$LOG_FILE"

START_TIME=$(date +%s)

RESPONSE=$(curl -s -X POST "$API_URL"   -H "Content-Type: application/json"   -H "x-cron-secret: $CRON_SECRET"   2>&1)

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] Response: $RESPONSE" >> "$LOG_FILE"

if echo "$RESPONSE" | grep -q success:true; then
  TOTAL=$(echo "$RESPONSE" | grep -oP "\"totalJobsFound\":\K[0-9]+" || echo "0")
  echo "[$TIMESTAMP] Scan complete in ${DURATION}s. Found $TOTAL new jobs." >> "$LOG_FILE"
else
  echo "[$TIMESTAMP] Scan failed after ${DURATION}s." >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
