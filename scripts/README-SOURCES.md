# Job Sources Management Guide

All job sources are now centralized and can be managed in **one location**.

## Files Created

1. **`scripts/manage-job-sources.sql`** - SQL script with ready-to-use commands
2. **`scripts/job-sources.csv`** - CSV export of all current sources
3. **This README** - How to use them

## Quick Start

### View All Sources

```bash
PGPASSWORD=jobtracker123 psql -U jobtracker -h localhost -d job_tracker   -f scripts/manage-job-sources.sql
```

Or view the CSV:
```bash
cat scripts/job-sources.csv
```

### Edit Sources

**Option 1: Edit SQL file directly**

1. Open `scripts/manage-job-sources.sql`
2. Uncomment the commands you want to run
3. Execute: `PGPASSWORD=jobtracker123 psql -U jobtracker -h localhost -d job_tracker -f scripts/manage-job-sources.sql`

**Option 2: Run SQL commands directly**

```bash
PGPASSWORD=jobtracker123 psql -U jobtracker -h localhost -d job_tracker << 'SQL'
-- Your SQL commands here
SQL
```

## Common Tasks

### 1. Disable Tech-Only Sources

```sql
UPDATE user_job_sources 
SET enabled = false 
WHERE name IN (
    'Barcelona Security Jobs',
    'CyberSecurity JobSite EU',
    'RemoteOK Security',
    'Indeed Security Engineer Spain'
);
```

### 2. Add New Source for Non-Tech Jobs

```sql
INSERT INTO user_job_sources (
    id, name, description, "sourceType", "feedUrl", 
    enabled, "userId", "createdAt", "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    'Indeed Education Jobs Europe',
    'Education and academic positions in Europe',
    'rss',
    'https://rss.indeed.com/rss?q=education+director&l=europe',
    true,
    'cmgxx65j800004rfa28dcq5wl',  -- Philippe's user ID
    NOW(),
    NOW()
);
```

### 3. Update Existing Source URL

```sql
UPDATE user_job_sources 
SET "feedUrl" = 'https://new-url-here.com/rss'
WHERE name = 'Source Name';
```

### 4. Delete a Source

```sql
DELETE FROM user_job_sources 
WHERE name = 'Unwanted Source Name';
```

### 5. View All Sources Summary

```bash
PGPASSWORD=jobtracker123 psql -U jobtracker -h localhost -d job_tracker -c "
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN enabled THEN 1 ELSE 0 END) as enabled,
    SUM(CASE WHEN enabled THEN 0 ELSE 1 END) as disabled
FROM user_job_sources;
"
```

## Current Situation

- **Total Sources**: 24
- **All are tech/security focused**
- **Default user** (dswihart@gmail.com): Has all 24 sources
- **Philippe** (pgollotte@gmail.com): Has 1 source ("brazil")

## Recommended Sources for Philippe

Add these sources for International Relations/Education roles:

```sql
-- Indeed International Relations
INSERT INTO user_job_sources (
    id, name, description, "sourceType", "feedUrl", enabled, "userId", "createdAt", "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    'Indeed International Relations EU',
    'International relations positions in Europe',
    'rss',
    'https://rss.indeed.com/rss?q=international+relations&l=europe',
    true,
    'cmgxx65j800004rfa28dcq5wl',
    NOW(),
    NOW()
);

-- HigherEdJobs
INSERT INTO user_job_sources (
    id, name, description, "sourceType", "feedUrl", enabled, "userId", "createdAt", "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    'HigherEdJobs International',
    'Higher education administration jobs',
    'rss',
    'https://www.higheredjobs.com/search/advanced_action.cfm?JobCat=177&PosType=1&Keyword=international',
    true,
    'cmgxx65j800004rfa28dcq5wl',
    NOW(),
    NOW()
);

-- Academic Jobs EU
INSERT INTO user_job_sources (
    id, name, description, "sourceType", "feedUrl", enabled, "userId", "createdAt", "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    'Academic Positions EU',
    'Academic and research positions',
    'rss',
    'https://academicpositions.com/find-jobs/rss',
    true,
    'cmgxx65j800004rfa28dcq5wl',
    NOW(),
    NOW()
);
```

## Tips

1. **Test sources first**: Add one source, trigger a scan, verify it works
2. **Use searchKeywords**: Filter results with `"searchKeywords" = ARRAY['keyword1', 'keyword2']`
3. **Refresh CSV**: Re-export after changes: `\COPY (SELECT ...) TO 'scripts/job-sources.csv'`
4. **Backup before major changes**: `pg_dump -U jobtracker job_tracker > backup.sql`

## Execute Commands

To run any SQL from this guide:

```bash
cd /opt/job-tracker
PGPASSWORD=jobtracker123 psql -U jobtracker -h localhost -d job_tracker << 'SQL'
-- Paste your SQL commands here
SQL
```
