# Constraints

No SPECs were classified in this ingest. All 20 inputs were DOC-type. This file captures technical constraints and contracts mentioned descriptively in the DOCs so downstream consumers can promote the load-bearing ones into formal SPECs.

---

## C-ext-anthropic-api
type: api-contract
source: `docs/ENHANCED_MATCHING_GUIDE.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`
Provider: Anthropic Claude 3.5 Sonnet via `@anthropic-ai/sdk`. Requires `ANTHROPIC_API_KEY` env variable. Rate limit: 50 requests/min on Tier 1. Observed latency: 10-20s for CV extraction (~2000 tokens), ~1.5-2s for job match (~1500 tokens). Documented cost baseline: ~$0.006 per extraction, ~$0.0045 per match.

## C-ext-remotive-api
type: api-contract
source: `docs/REMOTIVE_INTEGRATION_SUCCESS.md`
Endpoint: `https://remotive.com/api/remote-jobs`. No auth. Documented recommended max 4 requests/day. Job delay 24 hours. 1615+ jobs available. Response shape:
```json
{"jobs":[{"id": 2068040, "title": "...", "company_name": "...", "category": "...", "job_type": "...", "publication_date": "2025-10-02T08:50:22", "candidate_required_location": "...", "salary": null, "description": "<HTML>...", "tags": ["golang", "python", "react"], "url": "https://..."}]}
```

## C-ext-themuse-api
type: api-contract
source: `docs/JOB_BOARD_CUSTOMIZATION_GUIDE.md`, `docs/CUSTOMIZATION_QUICK_START.md`
Endpoint: `https://www.themuse.com/api/public/jobs`. No auth. Free. Includes company data.

## C-ext-adzuna-api
type: api-contract
source: `docs/JOB_BOARD_CUSTOMIZATION_GUIDE.md`
Endpoint: `https://api.adzuna.com/v1/api/jobs/us/search/1`. Requires `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`. Free tier: 1000 requests/month.

## C-ext-linkedin-scraping
type: protocol
source: `docs/LINKEDIN-BOOKMARKLET.md`, `docs/DEVELOPMENT-SESSION-SUMMARY.md`, `docs/JOB_BOARD_CUSTOMIZATION_GUIDE.md`
LinkedIn actively blocks automated server-side job parsing (returns HTTP 500). Workaround: browser-side bookmarklet using user's logged-in session cookies. Indeed RSS feeds may return HTTP 403 (known minor issue).

## C-schema-user-defaults
type: schema
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/job-scanning-fix-20251022.md`, `docs/DEVELOPMENT-SESSION-SUMMARY.md`
User model defaults (Prisma schema):
- `autoScan Boolean? @default(true)` — changed from `false` on 2025-10-22, also enforced in DB via `ALTER TABLE users ALTER COLUMN "autoScan" SET DEFAULT true`
- `minFitScore` default: 40 (per JOB_TRACKER_DOCUMENTATION.md) — conflicts with 50 cited elsewhere (see INGEST-CONFLICTS.md W-3)
- `maxJobAgeDays` default: 7
- `dailyApplicationGoal` default: 6

## C-schema-application-status-enum
type: schema
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/NEW_FEATURES_OCT2025.md`, `CRON_SETUP.md`, `AUTO_ARCHIVE_README.md`
`ApplicationStatus` enum values: `DRAFT`, `PENDING`, `APPLIED`, `INTERVIEWING`, `REJECTED`, `ARCHIVED`. PENDING added 2025-10-20. ARCHIVED used by archiving cron only (not in pipeline UI flow).

## C-schema-enhanced-profile
type: schema
source: `docs/ENHANCED_MATCHING_GUIDE.md`
User table fields added for enhanced matching:
```
summary TEXT
location VARCHAR(255)
salaryExpectation VARCHAR(255)
workPreference VARCHAR(255)
availability VARCHAR(255)
yearsOfExperience INTEGER
seniorityLevel VARCHAR(255)
primarySkills TEXT[]
secondarySkills TEXT[]
learningSkills TEXT[]
education TEXT[]
jobTitles TEXT[]
industries TEXT[]
excludeKeywords TEXT[]
workHistory JSONB
extractedProfile JSONB
lastExtracted TIMESTAMP
```

## C-schema-usersource-types
type: schema
source: `docs/JOB_TRACKER_DOCUMENTATION.md`
`UserJobSource.type` enum: `rss`, `web_scrape`, `api`, `job_board`.

## C-schema-joboppportunity-jobUrl-unique
type: schema
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/REMOTIVE_INTEGRATION_SUCCESS.md`
`JobOpportunity.jobUrl` is unique. Duplicate detection skips jobs already present by URL.

## C-nfr-file-upload-size
type: nfr
source: `docs/ENHANCED_MATCHING_GUIDE.md`
CV upload size limit: 5 MB. Accepted MIME types: PDF, DOC, DOCX, TXT (plus mammoth for DOCX server-side extraction).

## C-nfr-session-security
type: nfr
source: `docs/JOB_TRACKER_DOCUMENTATION.md`
Passwords hashed with bcryptjs. JWT tokens stored in secure HTTP-only cookies. Every protected API route filters by `userId` derived from session — users can only access their own data.

## C-nfr-ai-latency
type: nfr
source: `docs/ENHANCED_MATCHING_GUIDE.md`
Claude API calls for CV extraction can take 10-20 seconds. UI must show progress indicator. Match scoring ~1-2s. Pattern: filter candidate jobs by keyword first; only use AI for jobs passing initial filter to reduce cost and latency.

## C-nfr-cron-secret
type: nfr
source: `docs/JOB_TRACKER_DOCUMENTATION.md`
`POST /api/cron/scan-jobs` requires `x-cron-secret` header matching `CRON_SECRET` env var. Other cron endpoints (`/api/cron/archive-jobs`, `/api/cron/archive-old-jobs`) are documented as callable without auth by local curl — a security delta worth formalizing.

## C-env-required
type: nfr
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `DEPLOYMENT.md`, `DEPLOYMENT_SUMMARY.md`, `docs/ENHANCED_MATCHING_GUIDE.md`
Required env vars:
- `DATABASE_URL` — Postgres connection string
- `NEXTAUTH_URL` — e.g., `https://jobapp.aigrowise.com`
- `NEXTAUTH_SECRET` — random secret
- `ANTHROPIC_API_KEY` — Anthropic API key
- `CRON_SECRET` — random secret for cron endpoints
- `NODE_ENV=production`
Optional (per source): `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `LINKEDIN_API_KEY`, `INDEED_PUBLISHER_ID`.

## C-protocol-deploy-pipeline
type: protocol
source: `docs/AUTOMATED_SOURCE_ADDITION.md`, `docs/HOW_TO_ADD_JOB_SOURCES.md`, `docs/QUICK_ADD_SOURCE.md`, `docs/CUSTOMIZATION_QUICK_START.md`
Standard deploy rhythm on the production server:
```
cd /opt/job-tracker
npm run build
systemctl restart job-tracker
```
Full cycle after adding a new source via UI: file generation (instant) → `npm run build` (30-45s) → `systemctl restart job-tracker` (5-10s) ≈ 60s total.

## C-protocol-ssh
type: protocol
source: Multiple docs
Production SSH: `ssh root@jobapp.aigrowise.com -p 2222`. Application path: `/opt/job-tracker`. Prisma Studio on internal port 5555. Nginx config at `/etc/nginx/sites-available/jobapp`. Service logs via `journalctl -u job-tracker`.
