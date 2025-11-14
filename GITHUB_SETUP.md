# GitHub Repository Setup Instructions

## Automatic Setup (Recommended)

1. Authenticate with GitHub CLI:
   ```bash
   gh auth login
   ```
   Follow the prompts to authenticate with your GitHub account.

2. Create and push the repository:
   ```bash
   cd /opt/job-tracker
   
   # Create GitHub repository (private by default)
   gh repo create job-tracker-app --private --source=. --push
   
   # Or make it public:
   # gh repo create job-tracker-app --public --source=. --push
   ```

## Manual Setup

If you prefer to create the repository manually:

1. Go to GitHub and create a new repository named 'job-tracker-app'

2. Add the remote and push:
   ```bash
   cd /opt/job-tracker
   git remote add origin https://github.com/YOUR_USERNAME/job-tracker-app.git
   git add .
   git commit -m "Initial commit with ARCHIVED status feature"
   git push -u origin master
   ```

## Current Changes Ready to Commit

The following features have been implemented and are ready to be committed:

1. **ARCHIVED Status Feature**
   - Added ARCHIVED status to application workflow
   - Applications automatically archive after 45 days (REJECTED and DRAFT statuses)
   - Auto-archive script: `scripts/archive-old-jobs.mjs`
   - Auto-archive API endpoint: `/api/cron/archive-old-jobs`
   - Frontend components updated to display ARCHIVED status

2. **Bug Fixes**
   - Fixed job counting to use local timezone instead of UTC
   - Fixed backend API to count only by appliedDate (no fallback to updatedAt)
   - Centered daily goal achievements on community stats page

## Setting Up Auto-Archive Cron Job

To automatically run the archive job daily, add this to crontab:

```bash
# Run archive script daily at 2 AM
0 2 * * * cd /opt/job-tracker && node scripts/archive-old-jobs.mjs >> /var/log/job-tracker-archive.log 2>&1
```

Or use the API endpoint with curl:

```bash
# Run archive via API daily at 2 AM
0 2 * * * curl -s http://localhost:3000/api/cron/archive-old-jobs >> /var/log/job-tracker-archive.log 2>&1
```
