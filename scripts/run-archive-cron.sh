#!/bin/bash
# Daily cron job to archive old job applications
LOG_FILE="/var/log/job-tracker-archive.log"

echo "[$(date -Is)] Running automatic job archiving..." >> "$LOG_FILE"

# Call the API endpoint
curl -s "http://localhost:3000/api/cron/archive-jobs" >> "$LOG_FILE" 2>&1

echo "" >> "$LOG_FILE"
