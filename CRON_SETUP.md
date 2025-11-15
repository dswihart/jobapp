# Cron Jobs Configuration

## Active Cron Jobs

### 1. Archive Old Applications (Every Hour)
**Schedule:** Every hour at minute 0
**Command:** `curl -s http://localhost:3000/api/cron/archive-old-jobs`
**Log File:** `/var/log/job-tracker-archive.log`

**What it does:**
- Archives REJECTED applications older than 45 days
- Archives DRAFT applications older than 45 days
- Changes their status to ARCHIVED
- Runs automatically every hour

**Cron Expression:**
```
0 * * * * curl -s http://localhost:3000/api/cron/archive-old-jobs >> /var/log/job-tracker-archive.log 2>&1
```

### 2. Scan Jobs (Daily)
**Schedule:** Daily at 9:00 AM
**Command:** `/opt/job-tracker/scripts/scan-jobs.sh`

**Cron Expression:**
```
0 9 * * * /opt/job-tracker/scripts/scan-jobs.sh
```

## Managing Cron Jobs

### View Current Cron Jobs
```bash
crontab -l
```

### Edit Cron Jobs
```bash
crontab -e
```

### View Archive Logs
```bash
# View last 20 lines
tail -20 /var/log/job-tracker-archive.log

# View in real-time
tail -f /var/log/job-tracker-archive.log

# View full log
cat /var/log/job-tracker-archive.log
```

### Clear Archive Logs
```bash
> /var/log/job-tracker-archive.log
```

## Manual Execution

You can manually trigger the archive process anytime:

### Using API
```bash
curl http://localhost:3000/api/cron/archive-old-jobs
```

### Using Script
```bash
cd /opt/job-tracker
node scripts/archive-old-jobs.mjs
```

## Cron Schedule Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

**Examples:**
- `0 * * * *` - Every hour at minute 0
- `0 2 * * *` - Every day at 2:00 AM
- `*/30 * * * *` - Every 30 minutes
- `0 9 * * 1` - Every Monday at 9:00 AM

## Troubleshooting

### Check if cron service is running
```bash
systemctl status cron
```

### Restart cron service
```bash
systemctl restart cron
```

### Check system logs for cron errors
```bash
grep CRON /var/log/syslog | tail -20
```
