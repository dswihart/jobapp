#!/bin/bash
#
# Job Tracker Database Backup Script
# Runs daily at 3 AM via cron
#

set -e

# Configuration
BACKUP_BASE="/var/backups/job-tracker"
DB_NAME="job_tracker"
DB_USER="jobtracker"
DB_HOST="localhost"
LOG_FILE="/var/log/job-tracker-backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)
DAY_OF_MONTH=$(date +%d)

# Retention policy
DAILY_RETENTION=7
WEEKLY_RETENTION=4
MONTHLY_RETENTION=3

log() {
    echo "[$(date -Is)] $1" | tee -a "$LOG_FILE"
}

log "Starting database backup..."

# Create daily backup
DAILY_BACKUP="$BACKUP_BASE/daily/db_$DATE.sql.gz"
PGPASSWORD=jobtracker123 pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" 2>>"$LOG_FILE" | gzip > "$DAILY_BACKUP"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$DAILY_BACKUP" | cut -f1)
    log "Daily backup created: $DAILY_BACKUP ($SIZE)"
else
    log "ERROR: Daily backup failed!"
    exit 1
fi

# Weekly backup (on Sundays)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    cp "$DAILY_BACKUP" "$BACKUP_BASE/weekly/db_week_$DATE.sql.gz"
    log "Weekly backup created"
fi

# Monthly backup (on 1st of month)
if [ "$DAY_OF_MONTH" -eq "01" ]; then
    cp "$DAILY_BACKUP" "$BACKUP_BASE/monthly/db_month_$DATE.sql.gz"
    log "Monthly backup created"
fi

# Cleanup old backups
log "Cleaning up old backups..."
find "$BACKUP_BASE/daily" -name "db_*.sql.gz" -mtime +$DAILY_RETENTION -delete 2>/dev/null || true
find "$BACKUP_BASE/weekly" -name "db_week_*.sql.gz" -mtime +$((WEEKLY_RETENTION * 7)) -delete 2>/dev/null || true
find "$BACKUP_BASE/monthly" -name "db_month_*.sql.gz" -mtime +$((MONTHLY_RETENTION * 30)) -delete 2>/dev/null || true

# Report status
DAILY_COUNT=$(ls -1 "$BACKUP_BASE/daily"/*.sql.gz 2>/dev/null | wc -l)
WEEKLY_COUNT=$(ls -1 "$BACKUP_BASE/weekly"/*.sql.gz 2>/dev/null | wc -l)
MONTHLY_COUNT=$(ls -1 "$BACKUP_BASE/monthly"/*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_BASE" | cut -f1)

log "Backup complete. Daily: $DAILY_COUNT, Weekly: $WEEKLY_COUNT, Monthly: $MONTHLY_COUNT, Total size: $TOTAL_SIZE"
log "---"
