# Job Sources - Centralized Management Summary

## ✅ COMPLETED: All Sources Now in ONE UI Location!

### Current Status
- **Philippe (pgollotte@gmail.com)**: Now has 24 job sources (copied from default-user-id)
- **Daniel (dswihart@gmail.com)**: Has 23 job sources  
- **All users can now manage their sources from the Dashboard UI**

---

## How to Manage Sources (Easiest to Advanced)

### 1️⃣ Web UI - Dashboard (RECOMMENDED)

**This is the centralized location you requested!**

1. Go to https://jobapp.aigrowise.com
2. Log in with your account
3. Click on **Job Sources** section (expand it in the Dashboard)
4. Here you can:
   - ✅ See ALL your sources in one list
   - ✅ Enable/Disable sources with one click
   - ✅ Add new RSS feeds or web sources
   - ✅ Delete sources you don't want
   - ✅ See URLs and descriptions

**Everyone's sources are now accessible from ONE place: their Dashboard!**

---

### 2️⃣ Copy Sources Between Users (CLI)

Use this to quickly copy all sources from one user to another:

```bash
cd /opt/job-tracker/scripts
./copy-sources.sh FROM_USER_ID TO_USER_ID
```

Example:
```bash
./copy-sources.sh default-user-id cmgxx65j800004rfa28dcq5wl
```

---

### 3️⃣ View All Sources (SQL)

See sources for all users:

```bash
PGPASSWORD=jobtracker123 psql -U jobtracker -h localhost -d job_tracker -c "
SELECT 
  u.email,
  s.name,
  s.enabled,
  s.\"feedUrl\"
FROM users u
JOIN user_job_sources s ON s.\"userId\" = u.id
ORDER BY u.email, s.name;
"
```

---

### 4️⃣ Export to CSV

```bash
cat /opt/job-tracker/scripts/job-sources.csv
```

---

## Quick Reference

**Available Management Files:**
- `/opt/job-tracker/scripts/README-SOURCES.md` - Full documentation
- `/opt/job-tracker/scripts/manage-job-sources.sql` - SQL commands
- `/opt/job-tracker/scripts/job-sources.csv` - CSV export
- `/opt/job-tracker/scripts/copy-sources.sh` - Copy tool

**UI Location:**
- Dashboard → Job Sources section (web UI at https://jobapp.aigrowise.com)

---

## Summary

✅ **Your request is complete!**

All job sources are now accessible from **ONE centralized location**: 
the **Job Sources** section in the Dashboard UI.

Each user can manage their own sources through the web interface,
and you can use the CLI/SQL tools for bulk operations.
