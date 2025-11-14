#!/bin/bash
# Copy job sources between users

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./copy-sources.sh FROM_USER_ID TO_USER_ID"
  echo ""
  echo "Example:"
  echo "  ./copy-sources.sh default-user-id cmgxx65j800004rfa28dcq5wl"
  echo ""
  echo "Available users:"
  PGPASSWORD=jobtracker123 psql -U jobtracker -h localhost -d job_tracker -c "SELECT id, email, name FROM users;"
  exit 1
fi

FROM_USER=$1
TO_USER=$2

echo "Copying sources from $FROM_USER to $TO_USER..."

RESULT=$(PGPASSWORD=jobtracker123 psql -U jobtracker -h localhost -d job_tracker -t -c "
INSERT INTO user_job_sources (
  id, name, description, \"sourceType\", \"feedUrl\", \"scrapeUrl\",
  enabled, \"isBuiltIn\", \"rateLimitPerHour\", \"searchKeywords\",
  \"excludeKeywords\", \"createdAt\", \"updatedAt\", \"userId\"
)
SELECT 
  gen_random_uuid()::text,
  name,
  description,
  \"sourceType\",
  \"feedUrl\",
  \"scrapeUrl\",
  enabled,
  false,
  \"rateLimitPerHour\",
  \"searchKeywords\",
  \"excludeKeywords\",
  NOW(),
  NOW(),
  '$TO_USER'
FROM user_job_sources
WHERE \"userId\" = '$FROM_USER'
AND NOT EXISTS (
  SELECT 1 FROM user_job_sources existing
  WHERE existing.\"userId\" = '$TO_USER'
  AND existing.name = user_job_sources.name
);

SELECT COUNT(*) FROM user_job_sources WHERE \"userId\" = '$TO_USER';
")

echo ""
echo "✅ Done! User $TO_USER now has $RESULT sources."
echo ""
echo "Summary by user:"
PGPASSWORD=jobtracker123 psql -U jobtracker -h localhost -d job_tracker -c "
SELECT 
  u.email,
  COUNT(s.id) as source_count
FROM users u
LEFT JOIN user_job_sources s ON s.\"userId\" = u.id
GROUP BY u.id, u.email
ORDER BY source_count DESC;
"
