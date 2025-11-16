# Automatic Job Archiving Feature

## Overview
Jobs are automatically archived after 45 days to keep your active job list clean and organized.

## How It Works
- **Archive Trigger:** Applications older than 45 days are automatically moved to ARCHIVED status
- **Schedule:** Runs daily at 2:00 AM server time
- **Based On:** Uses  if available, otherwise uses  date

## Files Created

### 1. API Endpoint
`/opt/job-tracker/src/app/api/cron/archive-jobs/route.ts`
- REST API endpoint that performs the archiving
- Returns statistics about archived jobs
- Accessible at: `http://localhost:3000/api/cron/archive-jobs`

### 2. Cron Script
`/opt/job-tracker/scripts/run-archive-cron.sh`
- Shell script that calls the API endpoint
- Logs results to `/var/log/job-tracker-archive.log`

### 3. Crontab Entry
```
0 2 * * * /opt/job-tracker/scripts/run-archive-cron.sh
```

## Manual Testing

Test the archiving process:
```bash
# Via API endpoint
curl http://localhost:3000/api/cron/archive-jobs

# Via cron script
bash /opt/job-tracker/scripts/run-archive-cron.sh

# Check logs
tail -f /var/log/job-tracker-archive.log
```

## Configuration

To change the archive period, edit:
`/opt/job-tracker/src/app/api/cron/archive-jobs/route.ts`

Change this line:
```typescript
const ARCHIVE_AFTER_DAYS = 45; // Modify this number
```

Then rebuild and restart:
```bash
cd /opt/job-tracker
npm run build
# Server will auto-reload
```

## Monitoring

View cron job status:
```bash
# List all cron jobs
crontab -l

# View archive logs
tail -50 /var/log/job-tracker-archive.log

# Watch logs in real-time
tail -f /var/log/job-tracker-archive.log
```

## Statistics

The endpoint returns:
- `archivedCount`: Number of jobs archived in this run
- `statistics.total`: Total applications in database
- `statistics.archived`: Total archived applications
- `statistics.active`: Currently active applications
- `duration`: Time taken to complete archiving

## Troubleshooting

If archiving isn't working:

1. Check if cron service is running:
   ```bash
   systemctl status cron
   ```

2. Check cron logs:
   ```bash
   grep CRON /var/log/syslog | tail -20
   ```

3. Test the endpoint manually:
   ```bash
   curl -v http://localhost:3000/api/cron/archive-jobs
   ```

4. Verify the server is running:
   ```bash
   ps aux | grep next-server
   ```

## Created: November 16, 2025
## Last Updated: November 16, 2025
