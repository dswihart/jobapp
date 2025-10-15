-- Migration: Add enhanced profile fields to users table
-- Run this on the database to add new fields

ALTER TABLE users ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "salaryExpectation" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "workPreference" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS availability VARCHAR(255);

ALTER TABLE users ADD COLUMN IF NOT EXISTS "yearsOfExperience" INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "seniorityLevel" VARCHAR(255);

ALTER TABLE users ADD COLUMN IF NOT EXISTS education TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS "primarySkills" TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS "secondarySkills" TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS "learningSkills" TEXT[];

ALTER TABLE users ADD COLUMN IF NOT EXISTS "jobTitles" TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS industries TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS "excludeKeywords" TEXT[];

ALTER TABLE users ADD COLUMN IF NOT EXISTS "workHistory" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "extractedProfile" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastExtracted" TIMESTAMP;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_primary_skills ON users USING GIN("primarySkills");
CREATE INDEX IF NOT EXISTS idx_users_job_titles ON users USING GIN("jobTitles");
CREATE INDEX IF NOT EXISTS idx_users_seniority ON users("seniorityLevel");
