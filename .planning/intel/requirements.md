# Requirements

No PRDs were classified in this ingest. All 20 inputs were DOC-type. This file captures feature/behavior claims extracted descriptively from the DOCs so downstream consumers can use them as raw material for formal requirements via `/gsd-plan`. None of these are acceptance-criteria locked; they are observed behaviors that must be turned into REQs before routing.

---

## REQ-auth-register
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/job-scanning-fix-20251022.md`, `docs/DEVELOPMENT-SESSION-SUMMARY.md`
Description: New users can register with email + password + name. `POST /api/auth/register` creates a user record with hashed password (bcryptjs) and must set `autoScan: true` explicitly at creation time. Schema default is also `autoScan Boolean? @default(true)`.
Scope: authentication, onboarding

## REQ-auth-login
source: `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: Credentials-based login via NextAuth.js. JWT session strategy. Sessions stored in secure HTTP-only cookies. Protected API routes use `auth()` helper and filter by `userId`.
Scope: authentication, session management

## REQ-application-crud
source: `README.md`, `DEPLOYMENT_SUMMARY.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`, `SITE_DOCUMENTATION.md`
Description: Users can create, read, update, and delete job applications. Endpoints: `GET/POST /api/applications`, `PUT/DELETE /api/applications/[id]`. Can be filtered by `status` query parameter.
Scope: application management

## REQ-application-status-pipeline
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/NEW_FEATURES_OCT2025.md`
Description: Applications flow through states: DRAFT → PENDING → APPLIED → INTERVIEWING → REJECTED. PENDING was added October 20, 2025 between DRAFT and APPLIED. Visual treatment: purple theme. Additional ARCHIVED state exists for auto-archiving (see REQ-archiving-cron).
Scope: application pipeline

## REQ-application-create-from-job
source: `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: `POST /api/applications/create-from-job` creates an Application from a JobOpportunity, carrying over title/company/URL metadata.
Scope: application management, job discovery integration

## REQ-interview-tracking
source: `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: Applications carry interview fields: `interviewDate`, `interviewTime`, `interviewType` (phone/video/in-person), `interviewRound`, `interviewNotes`. `POST /api/applications/[id]/interview` sets/updates. `GET /api/interviews/upcoming` lists future interviews.
Scope: application management, interview management

## REQ-application-list-sortable
source: `SORTING_FEATURE.md`, `SITE_DOCUMENTATION.md`
Description: Desktop list view of applications supports column sorting on Company, Role, Status, Applied Date, Created. Single-click sorts ascending; second click toggles to descending. Default sort: Created desc. Sorting is client-side, works through status filter, hidden on mobile.
Scope: UI — ApplicationList component

## REQ-kanban-board
source: `README.md`, `DEPLOYMENT_SUMMARY.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: Drag-and-drop board view grouped by status columns (including the new purple PENDING column).
Scope: UI — ApplicationBoard component

## REQ-progress-charts
source: `README.md`, `DEPLOYMENT_SUMMARY.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: Dashboard shows bar and pie charts of application status distribution. Uses Recharts. Includes PENDING status card after Oct 20 2025.
Scope: UI — ProgressChart component

## REQ-daily-goal-tracker
source: `docs/DEVELOPMENT-SESSION-SUMMARY.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: Dashboard shows today's application count and past-7-days progress; configurable `dailyApplicationGoal` per user. Must count by calendar date using YYYY-MM-DD string comparison (not timestamp comparison) to be timezone-safe. Green/red indicators for goals met/missed. Default goal per `JOB_TRACKER_DOCUMENTATION.md`: 6. UI supports range 1-20 per `DEVELOPMENT-SESSION-SUMMARY.md`.
Scope: dashboard, analytics

## REQ-contacts
source: `README.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`, `SITE_DOCUMENTATION.md`
Description: Recruiter and hiring manager contacts can be logged per application. `GET/POST /api/contacts`.
Scope: CRM-lite

## REQ-followups
source: `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: FollowUp records with `title`, `description`, `dueDate`, `completed`, `priority` (low/medium/high), `type` (general/interview/application/networking), `notifyBefore` hours, `notified` bool. Endpoints: `GET /api/follow-ups` (filterable by completed/upcoming), `POST /api/follow-ups`, `PUT /api/follow-ups/[id]`, `DELETE /api/follow-ups/[id]`.
Scope: task management

## REQ-unified-notifications-panel
source: `docs/NEW_FEATURES_OCT2025.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: `UnifiedNotificationsPanel` replaces separate `AlertsPanel` and `NotificationPanel`. Single bell icon in top-right header. Tabbed filtering: All / Jobs / Tasks. Auto-refresh every 60 seconds. Red badge shows unread count. Job alerts show blue sparkles icon + fit score badge; upcoming tasks show yellow check; overdue tasks show red clock + red background. Actions: delete job alerts, mark tasks complete, view job URL, "Clear all job alerts".
Scope: notifications UI

## REQ-alerts
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/REMOTIVE_INTEGRATION_SUCCESS.md`
Description: System creates alert records when new job opportunities pass the minimum fit score threshold during a scan. Alerts include job title, company, and fit score percentage.
Scope: notifications

## REQ-resume-management
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/ENHANCED_MATCHING_GUIDE.md`
Description: Users can upload multiple resumes (PDF/DOC/DOCX/TXT, max 5MB). Can set one as primary. Can name and describe each. Endpoints: `GET/POST /api/resumes`, `GET /api/resumes/[id]/content`, `DELETE /api/resumes/[id]`. AI-assisted resume tailoring via `POST /api/ai/tailor-resume`; tailored versions saved via `POST /api/resumes/save-tailored`.
Scope: resume management

## REQ-cv-upload-and-profile-extraction
source: `docs/ENHANCED_MATCHING_GUIDE.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: `POST /api/profile/upload-cv` accepts multipart/form-data (file + userId), returns `{fileUrl, fileText, filename}`. `POST /api/profile/extract` accepts `{userId, resumeText, resumeUrl}` and uses Claude 3.5 Sonnet to populate: name, primarySkills[], secondarySkills[], learningSkills[], yearsOfExperience, seniorityLevel, workHistory JSONB, education[], etc. Result cached in `extractedProfile` JSONB field; only re-extract on new CV upload. Expected latency 10-20s.
Scope: profile, AI

## REQ-profile-editor
source: `docs/ENHANCED_MATCHING_GUIDE.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: Tabbed profile editor: CV Upload, Basic Info, Experience, Preferences. Supports skills categorization (primary/secondary/learning), work history display, education timeline, job preferences (workPreference, availability, salary, titles, industries). `GET/PUT /api/profile`.
Scope: profile UI

## REQ-cover-letter-generation
source: `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: AI-generated cover letters via Claude. Endpoints: `GET/POST /api/cover-letter`, `POST /api/cover-letter/save`. Generated DOCX file stored; content text also stored.
Scope: cover letter, AI

## REQ-job-fit-analysis
source: `docs/ENHANCED_MATCHING_GUIDE.md`, `docs/JOB_BOARD_CUSTOMIZATION_GUIDE.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/HOW_TO_ADD_JOB_SOURCES.md`, `docs/REMOTIVE_INTEGRATION_SUCCESS.md`
Description: `POST /api/ai/analyze` returns overall fit score 0-100 plus component breakdown, matched/missing skills, strengths, concerns, reasoning. Uses Claude 3.5 Sonnet. Enforces two critical rules: job title MUST align with candidate's preferred titles; location requirements STRICTLY enforced (wrong location = disqualification). Domain mismatches result in scores <40.
Scope: AI fit scoring
NOTE: Two competing scoring-weight formulas are documented across the doc set. See INGEST-CONFLICTS.md entry W-1.

## REQ-job-url-parsing
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/LINKEDIN-BOOKMARKLET.md`
Description: `POST /api/ai/parse-job-url` fetches a job URL (Cheerio HTML parse) and extracts title, company, location, salary, description, requirements via Claude. LinkedIn is known to return HTTP 500 against automated parse — workaround is the LinkedIn bookmarklet that runs in the user's browser with their session cookies.
Scope: job ingestion

## REQ-linkedin-bookmarklet
source: `docs/LINKEDIN-BOOKMARKLET.md`, `SITE_DOCUMENTATION.md`
Description: Browser bookmarklet installable from `https://jobapp.aigrowise.com/bookmarklet` via drag-and-drop or manual bookmark. Extracts LinkedIn job posting fields (company, title, location, description, salary) client-side. Posts to authenticated API endpoint using session cookies. Creates draft application with server-calculated fit score.
Scope: browser extension, LinkedIn integration

## REQ-job-sources-configurable
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/DEVELOPMENT-SESSION-SUMMARY.md`, `docs/AUTOMATED_SOURCE_ADDITION.md`, `docs/HOW_TO_ADD_JOB_SOURCES.md`, `docs/QUICK_ADD_SOURCE.md`
Description: Users can add custom job sources through the Dashboard "Job Sources" section. Source types: `rss`, `web_scrape`, `api`, `job_board`. Configuration fields: `feedUrl`/`scrapeUrl`/`apiEndpoint`, CSS selectors (`titleSelector`, `companySelector`, `locationSelector`), `searchKeywords`, `excludeKeywords`, `rateLimitPerHour`, `enabled`. Endpoints: `GET /api/sources`, `POST /api/sources/add`, `POST /api/sources/toggle`, `DELETE /api/sources/delete`, `GET/POST /api/user-job-sources`. Per Oct 22, 2025 refactor, sources are stored in the database only; hardcoded TypeScript source list (`src/lib/sources/index.ts`) returns empty. Auto-generates skeleton TypeScript source file on add; runs `npm run build` + `systemctl restart job-tracker` automatically (~60s).
Scope: job source management

## REQ-job-monitoring-cron
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `CRON_SETUP.md`, `docs/CUSTOMIZATION_QUICK_START.md`
Description: Job scanning runs via `POST /api/cron/scan-jobs` protected by `CRON_SECRET` header (`x-cron-secret`). Scans users with `autoScan: true`. Scheduled via system crontab (default 9 AM daily). Alternative endpoint `POST /api/monitor` for authenticated manual triggers. `scanFrequency` options: `daily`, `twice_daily`, `weekly`.
Scope: automation, cron

## REQ-archiving-cron
source: `AUTO_ARCHIVE_README.md`, `CRON_SETUP.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: Automated archiving of old applications to ARCHIVED status via cron-triggered API endpoint.
Scope: housekeeping, cron
NOTE: Two divergent archiving schedules and semantics documented. See INGEST-CONFLICTS.md entry W-2.

## REQ-job-matching-algorithm
source: `docs/HOW_TO_ADD_JOB_SOURCES.md`, `docs/JOB_BOARD_CUSTOMIZATION_GUIDE.md`, `docs/ENHANCED_MATCHING_GUIDE.md`, `docs/REMOTIVE_INTEGRATION_SUCCESS.md`, `docs/QUICK_ADD_SOURCE.md`, `docs/CUSTOMIZATION_QUICK_START.md`
Description: Before saving, each candidate job is filtered on: (1) at least one user skill present in `{title} {description}` text, (2) recency within configured `maxJobAgeDays`, (3) minimum fit score threshold. Fit score calculated by Claude API via `analyzeJobFitEnhanced()`; jobs passing threshold are stored in JobOpportunity table and trigger alerts. Dedupe by `jobUrl` unique constraint. Blocked jobs (BlockedJob table) are skipped.
Scope: job discovery pipeline
NOTE: Default `minFitScore` varies across docs (40 vs 50). See INGEST-CONFLICTS.md entry W-3.

## REQ-pattern-learning
source: `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: User feedback on job opportunities (`POST /api/opportunities/feedback`) feeds a pattern-learning service (`src/lib/pattern-learning-service.ts`) that tracks rejection patterns and penalizes future fit scores for similar jobs.
Scope: ML / personalization

## REQ-stats
source: `docs/JOB_TRACKER_DOCUMENTATION.md`
Description: Statistics endpoints: `GET /api/stats`, `GET /api/stats/applications-by-date`, `GET /api/stats/user`.
Scope: analytics

## REQ-motivational-message
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `SITE_DOCUMENTATION.md`
Description: `POST /api/ai/motivational-message` generates a personalized motivational message for the user.
Scope: UX / engagement

## REQ-deployment
source: `docs/JOB_TRACKER_DOCUMENTATION.md`, `DEPLOYMENT.md`, `DEPLOYMENT_SUMMARY.md`, `SITE_DOCUMENTATION.md`
Description: Production deployment on a DigitalOcean Droplet at `jobapp.aigrowise.com`. Nginx reverse proxy (80/443) → Next.js (3000) → PostgreSQL (5432). SSL via Let's Encrypt + Certbot. systemd manages `job-tracker.service`. SSH on port 2222. Local dev on `http://localhost:3000`.
Scope: deployment
NOTE: Older docs reference `46.62.205.150:3000` as the target; newer docs reference `jobapp.aigrowise.com`. See INGEST-CONFLICTS.md entry W-4.
