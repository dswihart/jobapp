#!/bin/bash

# Automated GitHub Push Script
LOG_FILE="/var/log/job-tracker-github-push.log"
REPO_DIR="/opt/job-tracker"

cd "$REPO_DIR" || exit 1

# Log start time
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting automated GitHub push..." >> "$LOG_FILE"

# Check if there are any changes
if [ -z "$(git status --porcelain)" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] No changes to commit." >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
  exit 0
fi

# Add all changes
git add -A

# Commit with timestamp
COMMIT_MSG="Automated backup: $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1

# Push to GitHub
if git push origin master >> "$LOG_FILE" 2>&1; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Successfully pushed to GitHub" >> "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ Failed to push to GitHub" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
