# Context

Freeform notes from DOC-level sources, organized by topic. Every claim traces to a source. This is the narrative companion to `decisions.md`, `requirements.md`, and `constraints.md`.

---

## Project identity
source: `README.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`, `DEPLOYMENT_SUMMARY.md`, `SITE_DOCUMENTATION.md`
"jobapp" / "Job Tracker" is an AI-powered job application tracking system. Version 0.1.0 per `docs/JOB_TRACKER_DOCUMENTATION.md`. Production URL: `https://jobapp.aigrowise.com`. Target user persona: job seekers who want automated discovery of relevant openings plus pipeline management of their applications.

Core value proposition described across docs: (1) manage the application pipeline with status tracking, (2) automatically surface jobs matched to the user's profile via AI scoring, (3) assist with resume tailoring and cover letter generation, (4) track interviews and follow-ups.

## Architecture snapshot
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `SITE_DOCUMENTATION.md`, `DEPLOYMENT.md`
```
Internet → Nginx (80/443, SSL) → Next.js (3000) → PostgreSQL (5432)
                                                → Anthropic Claude API (external)
                                                → Prisma Studio (5555, internal only)
```
- Next.js 15.5.6 with App Router, React 19.0.0-rc, TypeScript 5.x
- Prisma 6.16.3 ORM against PostgreSQL 17.6
- NextAuth.js 5.0 beta with Credentials provider, JWT sessions
- Tailwind CSS 4.1.14 styling; Headless UI, Heroicons, Lucide React for components
- Recharts 3.3.0 for analytics
- React Hook Form 7.63.0 with Zod 4.1.11 validation
- Cheerio 1.1.2 for HTML parsing; Mammoth 1.11.0 + DOCX 9.5.1 for Word doc work; pdf-parse for CVs
- `@anthropic-ai/sdk` 0.65.0 for Claude integration
- Infrastructure: Nginx, Let's Encrypt (Certbot), systemd

## Deployment topology evolution
source: `DEPLOYMENT.md`, `DEPLOYMENT_SUMMARY.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/README.md`
Older docs (`DEPLOYMENT.md`, `DEPLOYMENT_SUMMARY.md`) treat `46.62.205.150:3000` as the deployment target and describe both Docker (`docker-compose up -d`) and manual (`scp -r . root@46.62.205.150:/opt/job-tracker/`) paths. They also entertain Vercel deployment.

Newer docs (`docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/README.md`, `SITE_DOCUMENTATION.md`) describe the actual current deployment: DigitalOcean Droplet (8GB RAM, Debian, Helsinki hel1), domain `jobapp.aigrowise.com`, SSH on port 2222, app at `/opt/job-tracker`, SSL via Let's Encrypt. Nginx reverse-proxies 80/443 to Next.js on `127.0.0.1:3000`. Next.js is run under systemd (`job-tracker.service`). Currently flagged in JOB_TRACKER_DOCUMENTATION.md that Next.js runs in **development mode** (`npm run dev`), not production build.

Prisma Studio is noted as running on 5555 for DB admin (internal only).

## Recent development timeline (reverse chronological)
source: `docs/DEVELOPMENT-SESSION-SUMMARY.md`, `docs/NEW_FEATURES_OCT2025.md`, `SORTING_FEATURE.md`, `AUTO_ARCHIVE_README.md`, `docs/LINKEDIN-BOOKMARKLET.md`, `docs/job-scanning-fix-20251022.md`, `docs/ENHANCED_MATCHING_GUIDE.md`, `docs/REMOTIVE_INTEGRATION_SUCCESS.md`

- **2025-11-16:** Automatic job archiving feature added — cron job archives applications older than 30 days to ARCHIVED status, runs daily at 2 AM, endpoint `/api/cron/archive-jobs`, logs at `/var/log/job-tracker-archive.log`.
- **2025-11-12:** Column sorting added to ApplicationList.tsx for Company, Role, Status, Applied Date, Created columns. Default sort: Created desc. Visual indicators (Chevron up/down from Heroicons). Desktop only; mobile retains default sort.
- **2025-10-22:** LinkedIn bookmarklet released (`/bookmarklet` page). Job scanning fix: `autoScan` default flipped to `true`, registration explicitly sets `autoScan: true`, DB column default updated via ALTER TABLE.
- **2025-10-21/22:** Unified job sources system — 19 hardcoded TypeScript sources migrated to database `user_job_sources` table for all users. `src/lib/sources/index.ts` disabled (returns empty). `isBuiltIn` deletion restrictions and "Built-in" badges removed from UI. Job sources removed from the JobSearchSettings modal (moved entirely to the Dashboard "Job Sources" section). Goal tracker timezone fix: switched from timestamp comparison (timezone-dependent) to YYYY-MM-DD string comparison.
- **2025-10-20:** PENDING application status added between DRAFT and APPLIED (purple). UnifiedNotificationsPanel replaced separate AlertsPanel and NotificationPanel. Auto-refresh every 60 seconds.
- **2025-10-03:** Enhanced matching with CV upload + profile extraction service using Claude 3.5 Sonnet. New user schema fields for primary/secondary/learning skills, workHistory JSONB, extractedProfile JSONB.
- **Earlier:** Remotive API integration (no auth, free, 1615+ remote jobs). Fallback to sample jobs if API fails.

## AI matching — detail
source: `docs/ENHANCED_MATCHING_GUIDE.md`, `docs/JOB_BOARD_CUSTOMIZATION_GUIDE.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`

Two generations of scoring documented:

**Old (basic) algorithm (60/40 weights):**
```
Overall = (SkillMatch × 0.6) + (ExperienceMatch × 0.4)
```
- SkillMatch: `(matched_skills / max(your_skills, 5)) * 100`
- ExperienceMatch: tiered (>=required → 100%, >=75% → 75%, >=50% → 50%, else 25%); alt formula `100 - |userYears - jobYears|*10`

**Enhanced algorithm (6 components):**
```
Overall = (SkillMatch × 0.35) + (ExperienceMatch × 0.25) + (SeniorityMatch × 0.15)
        + (TitleMatch × 0.15) + (IndustryMatch × 0.05) + (LocationMatch × 0.05)
```
- Skill sub-weights: primary 100%, secondary 75%, learning 25%
- Experience: exact → 100%, ±1-2y → 90%, ±3-4y → 75%, ±5+y → 50%
- Seniority: exact → 100%, one level off → 70%, two+ off → 40%
- TitleMatch and LocationMatch are STRICT — wrong location = disqualification; domain mismatch → score <40
- Uses Claude 3.5 Sonnet; function `analyzeJobFitEnhanced()` in `src/lib/ai-service.ts`

**Tech keyword boost list** (observed in older docs):
```
javascript, typescript, python, java, react, node, angular, vue, docker,
kubernetes, aws, azure, gcp, sql, nosql, mongodb, postgresql, redis,
git, ci/cd, agile, scrum, rest, graphql, api
```
Additional keywords suggested: svelte, nextjs, nuxt, remix, astro, golang, rust, c++, c#, .net, terraform, ansible, jenkins, gitlab, kafka, rabbitmq, elasticsearch, nginx, flutter, react-native, swift, kotlin, machine-learning, ai, data-science, mlops.

## Job discovery pipeline
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/REMOTIVE_INTEGRATION_SUCCESS.md`, `docs/HOW_TO_ADD_JOB_SOURCES.md`

```
Cron Trigger (CRON_SECRET)
  ↓
POST /api/cron/scan-jobs
  ↓
For each user with autoScan=true:
  1. Load profile (skills, experience, preferences)
  2. For each enabled source:
     - Fetch (RSS / API / scrape)
     - Dedupe by jobUrl
     - Skip blocked jobs (BlockedJob table)
     - Skill-presence check (at least one skill in job text)
     - Recency filter (maxJobAgeDays)
  3. AI-score surviving candidates via Claude
  4. Apply pattern-learning penalties from prior feedback
  5. If score ≥ minFitScore: save JobOpportunity + create Alert
```

Built-in pre-configured source families named in docs (pre-2025-10-22 refactor):
- Remote: Remotive, RemoteOK Security, We Work Remotely, EU Remote Jobs
- Security-specific: InfoSec Jobs, Cybersecurity Remote/EU/Spain, Security Jobs 3 & 4
- Location-specific: Barcelona Security, Indeed Security Spain
- General tech: Foorilla, The Muse, Techno Employe

`docs/job-scanning-fix-20251022.md` flags these as heavily tech/security skewed, penalizing users with non-tech profiles (example: user with International Relations skills found 0 matches).

## User accounts (observed)
source: `docs/job-scanning-fix-20251022.md`, `docs/DEVELOPMENT-SESSION-SUMMARY.md`
Two known user accounts as of 2025-10-22:
- `dswihart@gmail.com` (default-user-id): 29 sources enabled, tech/security profile, 324+ job opportunities
- `pgollotte@gmail.com` (Philippe, `cmgxx65j800004rfa28dcq5wl`): 30 sources enabled, Education/International Relations profile — had 0 opportunities pre-refactor

## Bookmarklet design
source: `docs/LINKEDIN-BOOKMARKLET.md`
LinkedIn blocks server-side scraping (HTTP 500), so bookmarklet runs client-side in a tab where the user is already logged into LinkedIn. It extracts company, title, location, description, requirements, salary (if listed) via CSS selectors, then POSTs JSON to an authenticated jobapp endpoint using the user's session cookies. Creates a draft application with a server-computed fit score. Works in Chrome/Edge/Firefox/Safari/Opera/Brave.

## Customization patterns documented
source: `docs/CUSTOMIZATION_QUICK_START.md`, `docs/JOB_BOARD_CUSTOMIZATION_GUIDE.md`, `docs/HOW_TO_ADD_JOB_SOURCES.md`, `docs/AUTOMATED_SOURCE_ADDITION.md`
Non-coding customizations via Dashboard UI: skills, minFitScore, maxJobAgeDays, autoScan toggle, scanFrequency, dailyApplicationGoal (1-20), daily goal tracker.
Code-level customizations documented (by editing files under `/opt/job-tracker/src/lib/`): changing the fit-score threshold at line ~56 of job-monitor.ts, adjusting AI weights at line ~149 of ai-service.ts, extending the tech-keyword list, adding custom source classes extending `BaseJobSource`.

## Database schema models (non-exhaustive)
source: `docs/JOB_TRACKER_DOCUMENTATION.md`
- `User` — profile fields + jobsearch config
- `Application` — title, company, status, resumeId?, coverLetterId?, interview fields
- `JobOpportunity` — title, company, location, description, requirements, jobUrl (unique), source, sourceUrl, postedDate, scrapedAt, fitScore, isRead, isArchived, userFeedback
- `Resume` — name, fileName, fileUrl, fileType, fileSize, isPrimary, description
- `CoverLetter` — name, content, fileUrl, fileType, fileSize
- `FollowUp` — title, description, dueDate, completed, priority, type, notifyBefore, notified
- `Contact` — per-application recruiter/hiring manager
- `Alert` — notification record
- `BlockedJob` — explicit user block list
- `UserJobSource` — type/rss/web_scrape/api/job_board config

## Known minor issues
source: `docs/DEVELOPMENT-SESSION-SUMMARY.md`
- Indeed RSS returns HTTP 403 for some feeds (non-blocking, logged).
- Occasional "JSON Parse Error" runtime console warning — likely failed network requests, does not affect functionality.
- JOB_TRACKER_DOCUMENTATION.md reports Next.js is running in dev mode (`npm run dev`) rather than production build — should be formalized.

## Future enhancements mentioned
source: `docs/ENHANCED_MATCHING_GUIDE.md`, `docs/DEVELOPMENT-SESSION-SUMMARY.md`, `docs/JOB_BOARD_CUSTOMIZATION_GUIDE.md`
- More file formats for resumes (LinkedIn PDF exports, OCR for scans)
- Real-time skill gap analysis
- Career path / salary negotiation insights
- Email alerts for 95%+ fit jobs
- Source suggestions based on profile
- Diversifying beyond tech (Education, Business, HR sources)
- Bulk source enable/disable
- Puppeteer-based scraping for non-API boards
- Tiered notifications by fit score band
