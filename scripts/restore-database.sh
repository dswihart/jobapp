#!/bin/bash
#
# Job Tracker Database Restore Script
# Usage: ./restore-database.sh [backup_file.sql.gz]
#

set -e

BACKUP_FILE="$1"
DB_NAME="job_tracker"
DB_USER="jobtracker"
DB_HOST="localhost"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    echo "-- Daily:"
    ls -lh /var/backups/job-tracker/daily/*.sql.gz 2>/dev/null || echo "  (none)"
    echo "-- Weekly:"
    ls -lh /var/backups/job-tracker/weekly/*.sql.gz 2>/dev/null || echo "  (none)"
    echo "-- Monthly:"
    ls -lh /var/backups/job-tracker/monthly/*.sql.gz 2>/dev/null || echo "  (none)"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "=========================================================="
echo "WARNING: This will OVERWRITE the current database!"
echo "Backup file: $BACKUPEBILE"
echo "========================================================="
echo ""
read -p "Type 'YES' to confirm: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Stopping job-tracker service..."
systemctl stop job-tracker || true

echo "Dropping and recreating database..."
PGPASSWORD=jobtracker123 psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
PGPASSWORD=jobtracker123 psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

echo "Restoring from backup..."
zcat "$BACKUP_FILE" | PGPASSWORD=jobtracker123 psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"

echo "Starting job-tracker service..."
systemctl start job-tracker

echo ""
echo "Restore complete!"
echo "Verifying..."
PGPASSWORD=jobtracker123 psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) as users FROM users; SELECT COUNT(*) as applications FROM applications;"
