-- ============================================
-- Job Sources Management Script
-- Edit sources in one central location
-- ============================================

-- View all current sources
SELECT 
    id,
    name,
    "sourceType",
    "feedUrl",
    enabled,
    "userId",
    "searchKeywords",
    "excludeKeywords"
FROM user_job_sources
ORDER BY name;

-- ============================================
-- DISABLE/ENABLE SOURCES
-- ============================================

-- Disable specific tech-only sources (uncomment to use)
-- UPDATE user_job_sources SET enabled = false WHERE name IN (
--     'Barcelona Security Jobs',
--     'CyberSecurity JobSite EU',
--     'CyberSecurity JobSite Spain',
--     'Indeed Security Engineer Spain'
-- );

-- Enable all sources
-- UPDATE user_job_sources SET enabled = true;

-- ============================================
-- ADD NEW SOURCES FOR NON-TECH ROLES
-- ============================================

-- Add Indeed Education Jobs
-- INSERT INTO user_job_sources (
--     id, name, description, "sourceType", "feedUrl", enabled, "userId", "createdAt", "updatedAt"
-- ) VALUES (
--     gen_random_uuid()::text,
--     'Indeed Education Jobs',
--     'Education and academic positions',
--     'rss',
--     'https://rss.indeed.com/rss?q=education+director&l=europe',
--     true,
--     'cmgxx65j800004rfa28dcq5wl',
--     NOW(),
--     NOW()
-- );

-- Add Indeed International Relations Jobs
-- INSERT INTO user_job_sources (
--     id, name, description, "sourceType", "feedUrl", enabled, "userId", "createdAt", "updatedAt"
-- ) VALUES (
--     gen_random_uuid()::text,
--     'Indeed International Relations',
--     'International relations and business development',
--     'rss',
--     'https://rss.indeed.com/rss?q=international+relations+director&l=europe',
--     true,
--     'cmgxx65j800004rfa28dcq5wl',
--     NOW(),
--     NOW()
-- );

-- Add LinkedIn Jobs RSS (if available)
-- INSERT INTO user_job_sources (
--     id, name, description, "sourceType", "feedUrl", enabled, "userId", "createdAt", "updatedAt"
-- ) VALUES (
--     gen_random_uuid()::text,
--     'LinkedIn Higher Education',
--     'Higher education management positions',
--     'rss',
--     'https://www.linkedin.com/jobs/search/?keywords=higher%20education%20director',
--     true,
--     'cmgxx65j800004rfa28dcq5wl',
--     NOW(),
--     NOW()
-- );

-- ============================================
-- DELETE SOURCES
-- ============================================

-- Delete specific source by name (uncomment to use)
-- DELETE FROM user_job_sources WHERE name = 'Source Name Here';

-- Delete all sources for a specific user (BE CAREFUL!)
-- DELETE FROM user_job_sources WHERE "userId" = 'user-id-here';

-- ============================================
-- UPDATE EXISTING SOURCES
-- ============================================

-- Change source URL
-- UPDATE user_job_sources 
-- SET "feedUrl" = 'https://new-url-here.com/feed'
-- WHERE name = 'Source Name';

-- Add search keywords to filter jobs
-- UPDATE user_job_sources 
-- SET "searchKeywords" = ARRAY['keyword1', 'keyword2', 'keyword3']
-- WHERE name = 'Source Name';

-- Add exclude keywords to filter out unwanted jobs
-- UPDATE user_job_sources 
-- SET "excludeKeywords" = ARRAY['junior', 'intern', 'entry level']
-- WHERE name = 'Source Name';

-- ============================================
-- USEFUL QUERIES
-- ============================================

-- Count sources by user
-- SELECT "userId", COUNT(*) as source_count
-- FROM user_job_sources
-- GROUP BY "userId";

-- Count enabled vs disabled sources
-- SELECT enabled, COUNT(*) as count
-- FROM user_job_sources
-- GROUP BY enabled;

-- Find sources with specific keywords
-- SELECT name, "feedUrl", "searchKeywords"
-- FROM user_job_sources
-- WHERE 'security' = ANY("searchKeywords");
