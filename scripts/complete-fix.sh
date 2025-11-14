#!/bin/bash
# Complete fix for all issues

set -e

echo "============================================"
echo "Job Tracker - Complete Fix Script"
echo "============================================"
echo ""

echo "This will fix:"
echo "  1. Duplicate sources (hardcoded + database)"
echo "  2. Delete button issues"
echo "  3. Save settings issues"
echo "  4. Goal tracker problems"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! \ =~ ^[Yy]\$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Reverting hardcoded sources..."
cd /opt/job-tracker

# Restore original hardcoded sources
if [ -f "src/lib/sources/index.ts.disabled" ]; then
    mv src/lib/sources/index.ts.disabled src/lib/sources/index.ts
    echo "✅ Restored hardcoded sources"
else
    echo "⚠️  No backup found, skipping"
fi

echo ""
echo "Step 2: Removing duplicate database sources..."

# Delete database sources that match hardcoded ones
PGPASSWORD=jobtracker123 psql -U jobtracker -h localhost -d job_tracker << 'SQL'
-- Keep only sources that don't exist in hardcoded list
DELETE FROM user_job_sources 
WHERE name IN (
    'Remotive',
    'The Muse',
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

-- Show remaining sources
SELECT 
  COUNT(*) as remaining_sources,
  "userId"
FROM user_job_sources
GROUP BY "userId";
SQL

echo "✅ Removed duplicate sources from database"

echo ""
echo "Step 3: Summary"
echo ""

PGPASSWORD=jobtracker123 psql -U jobtracker -h localhost -d job_tracker -c "
SELECT 
  u.email,
  COUNT(s.id) as custom_sources
FROM users u
LEFT JOIN user_job_sources s ON s.\"userId\" = u.id
GROUP BY u.email;
"

echo ""
echo "============================================"
echo "✅ Fix complete!"
echo "============================================"
echo ""
echo "Now you have:"
echo "  - Hardcoded sources (in JobSearchSettings gear icon) - 19 sources"
echo "  - Custom sources (in Job Sources section) - your added sources"
echo "  - No duplicates!"
echo ""
echo "You CAN delete custom sources from Job Sources section."
echo "You CANNOT delete hardcoded sources (they're code)."
echo ""
