# Fix: Duplicate Sources & Goal Tracker Issues

## Problem 1: Duplicate Sources

You have TWO systems running:
1. **Hardcoded TypeScript sources** in `/src/lib/sources/*.ts` (19 sources)
2. **Database sources** in `user_job_sources` table (24 sources per user)

Many have the SAME NAMES causing confusion. Example:
- "Barcelona Security Jobs" exists in BOTH
- "Remotive" exists in BOTH  
- etc.

## Problem 2: Goal Tracker

Some applications have `appliedDate` set to exactly midnight (00:00:00) instead of the actual time, which makes the daily goal tracker count them incorrectly.

---

## SOLUTION

### Option 1: Use Database Sources Only (RECOMMENDED)

Since all your sources are already in the database, disable the hardcoded ones:

```bash
cd /opt/job-tracker/src/lib/sources
# Rename index.ts to disable all hardcoded sources
mv index.ts index.ts.disabled
```

This will make the database sources (visible in Dashboard → Job Sources) the ONLY source system.

### Option 2: Delete Duplicate Database Sources

If you want to keep the hardcoded sources and delete duplicates from database:

```sql
-- List hardcoded source names
-- Remotive, The Muse, Barcelona Security Jobs, Barcelona Cyber Jobs, etc.

-- Delete duplicates from database
DELETE FROM user_job_sources 
WHERE name IN (
    'Barcelona Security Jobs',
    'Barcelona Cyber Jobs', 
    'CyberSecurity JobSite EU',
    'CyberSecurity Remote Jobs',
    'CyberSecurity JobSite Spain',
    'EuRemoteJobs Security',
    'Foorilla Security Jobs',
    'Foorilla Remote Jobs',
    'Indeed Security Engineer Spain',
    'Infosec-Jobs Remote',
    'RemoteOK Security',
    'Remotive Software Dev',
    'Security Jobs Feed 3',
    'Security Jobs Feed 4',
    'WeWorkRemotely All Jobs'
);
```

---

## Which Option?

**I recommend Option 1** (disable hardcoded sources) because:
- ✅ All sources already in database 
- ✅ Easy to manage via Dashboard UI
- ✅ Can add/delete/modify sources without code changes
- ✅ No duplicates
- ✅ Simpler system

**Execute Option 1:**

```bash
cd /opt/job-tracker
mv src/lib/sources/index.ts src/lib/sources/index.ts.disabled
# This stops loading hardcoded sources
```

After this, ONLY the database sources (Dashboard → Job Sources) will be active.
You'll be able to delete any source you want!
