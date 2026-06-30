#!/bin/bash
# Daily cron job to archive old job applications
LOG_FILE="/var/log/job-tracker-archive.log"

echo "[$(date -Is)] Running automatic job archiving..." >> "$LOG_FILE"

# Call the API endpoint
curl -s -H "x-cron-secret: 428fdd5e260a7d482cc9158e0067e2c4ea07c58015086d6273b2ae45c7025c4c" "http://localhost:3000/api/cron/archive-jobs" >> "$LOG_FILE" 2>&1

echo "" >> "$LOG_FILE"
