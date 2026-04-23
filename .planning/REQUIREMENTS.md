# Requirements: Job Application Tracker (jobapp)

**Defined:** 2026-04-23 (bootstrapped from `/gsd-ingest-docs` of 20 DOCs + `/gsd-explore` target-company-pipeline note)
**Core Value:** Surface high-fit job opportunities to the user without manual searching, and manage the application pipeline end-to-end from discovery through interview.

---

## v1 — Validated (shipped in production)

These requirements describe behavior already running in production at `https://jobapp.aigrowise.com`. They are LOCKED — changes go through targeted tech-debt or milestone work, not through this roadmap. Source: 20 intel DOCs via `/gsd-ingest-docs` on 2026-04-23.

### Authentication

- [x] **REQ-auth-register**: New users can register with email + password + name. `POST /api/auth/register` creates a user record with hashed password (bcryptjs) and sets `autoScan: true` explicitly. Schema default also `autoScan Boolean? @default(true)`.
- [x] **REQ-auth-login**: Credentials-based login via NextAuth.js with JWT session strategy. Sessions stored in secure HTTP-only cookies. Protected API routes use `auth()` helper and filter by `userId`.

### Application Pipeline

- [x] **REQ-application-crud**: Users can create, read, update, and delete job applications. Endpoints: `GET/POST /api/applications`, `PUT/DELETE /api/applications/[id]`. Filterable by `status`.
- [x] **REQ-application-status-pipeline**: Applications flow DRAFT → PENDING → APPLIED → INTERVIEWING → REJECTED (+ ARCHIVED for auto-archiving). PENDING added 2025-10-20 (purple).
- [x] **REQ-application-create-from-job**: `POST /api/applications/create-from-job` creates Application from JobOpportunity, carrying over title/company/URL metadata.
- [x] **REQ-interview-tracking**: Applications carry interview fields (`interviewDate`, `interviewTime`, `interviewType`, `interviewRound`, `interviewNotes`). `POST /api/applications/[id]/interview` sets/updates. `GET /api/interviews/upcoming` lists future.
- [x] **REQ-application-list-sortable**: Desktop list view sorts by Company / Role / Status / Applied Date / Created. Click-to-sort asc, second click desc. Default Created desc. Mobile retains default.
- [x] **REQ-kanban-board**: Drag-and-drop board view grouped by status columns (including PENDING).

### Dashboards & Analytics

- [x] **REQ-progress-charts**: Dashboard bar and pie charts of application status distribution via Recharts, includes PENDING status card.
- [x] **REQ-daily-goal-tracker**: Today's application count + past-7-days progress; configurable `dailyApplicationGoal` per user (1–20; default 6). Timezone-safe via YYYY-MM-DD string comparison.
- [x] **REQ-stats**: `GET /api/stats`, `GET /api/stats/applications-by-date`, `GET /api/stats/user`.

### CRM & Task Management

- [x] **REQ-contacts**: Recruiter / hiring manager contacts per application. `GET/POST /api/contacts`.
- [x] **REQ-followups**: FollowUp records (title, description, dueDate, completed, priority low/medium/high, type general/interview/application/networking, notifyBefore hours, notified). Full CRUD at `/api/follow-ups`.

### Notifications

- [x] **REQ-unified-notifications-panel**: `UnifiedNotificationsPanel` in top-right header. Tabbed (All / Jobs / Tasks). Auto-refresh 60s. Unread badge. Job alerts with sparkles + fit-score badge; upcoming tasks yellow check; overdue red clock + red background. Actions: delete job alerts, mark tasks complete, view job URL, clear-all.
- [x] **REQ-alerts**: Alert records created when new job opportunities pass `minFitScore` threshold during a scan. Include title, company, fit score.

### Resume & CV

- [x] **REQ-resume-management**: Multiple resumes per user (PDF/DOC/DOCX/TXT, 5 MB max). Primary flag, name, description. Full CRUD at `/api/resumes`. AI-assisted tailoring via `POST /api/ai/tailor-resume`; saved via `POST /api/resumes/save-tailored`.
- [x] **REQ-cv-upload-and-profile-extraction**: `POST /api/profile/upload-cv` + `POST /api/profile/extract` parse CV with Claude 3.5 Sonnet and populate skills (primary/secondary/learning), yearsOfExperience, seniorityLevel, workHistory (JSONB), education, etc. Result cached in `extractedProfile`. Re-extract only on new CV upload. Latency 10–20s.
- [x] **REQ-profile-editor**: Tabbed profile editor (CV Upload, Basic Info, Experience, Preferences). `GET/PUT /api/profile`.

### Cover Letter & Engagement

- [x] **REQ-cover-letter-generation**: Claude-generated cover letters. `GET/POST /api/cover-letter`, `POST /api/cover-letter/save`. DOCX stored; content text stored.
- [x] **REQ-motivational-message**: `POST /api/ai/motivational-message` returns personalized motivational message.

### Job Discovery & Ingestion

- [x] **REQ-job-fit-analysis**: `POST /api/ai/analyze` returns overall fit 0–100 + component breakdown, matched/missing skills, strengths, concerns, reasoning. Uses `analyzeJobFitEnhanced()` in `src/lib/ai-service.ts` with 6-component weighted formula (`Skill*0.35 + Exp*0.25 + Seniority*0.15 + Title*0.15 + Industry*0.05 + Location*0.05`). Title and Location are STRICT disqualifiers.
- [x] **REQ-job-url-parsing**: `POST /api/ai/parse-job-url` fetches URL (Cheerio), Claude extracts title/company/location/salary/description/requirements. LinkedIn blocked — bookmarklet workaround.
- [x] **REQ-linkedin-bookmarklet**: Bookmarklet at `/bookmarklet`. Client-side LinkedIn field extraction using user's session cookies. Creates draft application with fit score.
- [x] **REQ-job-sources-configurable**: Dashboard "Job Sources" section. Types: `rss`, `web_scrape`, `api`, `job_board`. Full CRUD. Per 2025-10-22 refactor, sources DB-backed only; hardcoded `src/lib/sources/index.ts` returns empty. Adding a source auto-generates skeleton TS file, runs `npm run build` + `systemctl restart job-tracker` (~60s).
- [x] **REQ-job-monitoring-cron**: `POST /api/cron/scan-jobs` protected by `CRON_SECRET`. Scans users with `autoScan=true`. System crontab (default 9 AM daily). Manual trigger via `POST /api/monitor`. `scanFrequency`: daily, twice_daily, weekly.
- [x] **REQ-archiving-cron**: Automated archiving of old applications to ARCHIVED. **UNRESOLVED**: two competing implementations documented (W-2). See Active REQ-archiving-cron-reconcile.
- [x] **REQ-job-matching-algorithm**: Pre-AI filters: (1) ≥1 user skill in `{title} {description}`, (2) within `maxJobAgeDays`, (3) fit score ≥ `minFitScore` (W-3 unresolved). Dedupe by `jobUrl`. Skip BlockedJob entries. Pass-through triggers JobOpportunity save + Alert.
- [x] **REQ-pattern-learning**: `POST /api/opportunities/feedback` feeds `src/lib/pattern-learning-service.ts`; tracks rejection patterns and penalizes future similar jobs.

### Infrastructure

- [x] **REQ-deployment**: Production on `https://jobapp.aigrowise.com`. Hetzner Debian arm64 droplet (Helsinki `hel1`, 8GB RAM). Nginx 80/443 → Next.js 3000 → Postgres 5432. SSL via Let's Encrypt + Certbot. systemd `job-tracker.service`. SSH port 2222. App path `/opt/job-tracker`. **Currently running `npm run dev`** (tech-debt per REQ-prod-build-migration).

---

## v1 — Active (Spain-based Job Hunt Enablement milestone)

Current-milestone requirements. Each maps to a phase in `.planning/ROADMAP.md`.

### Target Company Pipeline (Phase 1)

- [ ] **REQ-target-company-seed**: Seed ~100 `UserJobSource` records for US-HQ SMB tech companies with Spain operational presence. Initial list produced by one-time Exa-backed research pass (build-time, not a product capability). Each company entry records HQ country, size band (SMB = 10–500 employees placeholder, confirm in spec-phase), Spain-presence evidence, ATS platform, careers URL. Source: `.planning/notes/target-company-pipeline.md`.
- [ ] **REQ-target-company-model-decision**: In spec-phase, decide whether to introduce a first-class `Company` / `TargetCompany` Prisma model (with HQ country, size band, Spain-presence signal, ATS platform, last-scraped-at, still-qualifies flag) or tag via `UserJobSource` metadata. Whichever path, leave scaffolding so the v2 Automated Discovery Engine (seed) can plug in without migration churn. Schema should also record discovery source (manual vs. automated) and candidate-review state (pending/approved/rejected) for v2 readiness.
- [ ] **REQ-target-company-smb-definition**: In spec-phase, confirm the SMB definition (placeholder: 10–500 employees total) and the concrete "has Spain employees" signal set (LinkedIn presence, Spain-tagged job postings, public hiring statement, etc.). Source: `.planning/notes/target-company-pipeline.md`.
- [ ] **REQ-target-company-verify-profile-readiness**: Before seeding 100 sources, verify the user's profile (skills, preferences, seniority, titles, industries) is populated well enough for `analyzeJobFitEnhanced()` to produce meaningful fit scores. Avoid drowning the opportunities feed with low-relevance openings. Source: `.planning/notes/target-company-pipeline.md`.
- [ ] **REQ-target-company-success-metric**: Within 2 weeks of the Pipeline going live, ≥5 opportunities with `fitScore ≥ 50` from US-HQ SMB tech companies with Spain presence must appear in the opportunities feed without manual source additions. Source: bootstrap prompt user context.

### ATS Platform Adapters (Phase 2 — prerequisite for reliable ingestion of Phase 1 seeds)

- [ ] **REQ-ats-adapter-architecture**: Introduce platform-specific ATS adapters — minimum: Greenhouse (`boards-api.greenhouse.io/v1/boards/{slug}/jobs`), Lever (`api.lever.co/v0/postings/{slug}`), Ashby (JSON), Workable (JSON), plus a generic CSS-selector fallback for custom pages. Workday specifically flagged as JS-heavy — scope TBD by RQ-001. The adapter matrix composition is shaped by RQ-001 research (see `.planning/research/questions.md`). Each adapter normalizes to the existing `JobOpportunity` ingestion shape.
- [ ] **REQ-ats-adapter-selector-per-source**: Each `UserJobSource` record (or the new Company model) declares its ATS platform; the ingestion pipeline dispatches to the correct adapter. Generic `scrapeSelector` remains as fallback but is no longer relied on for the ~100 target companies.

### Doc Drift Reconciliation (Phase 3)

- [ ] **REQ-fit-score-cleanup**: Audit codebase for leftover references to the old 60/40 fit-score formula (`SkillMatch*0.6 + ExperienceMatch*0.4`). Confirm `analyzeJobFitEnhanced()` (6-component weighted) is the only live path. Update any docs still citing the old formula as runnable instruction ("edit line 149 of ai-service.ts"). Resolution of W-1.
- [ ] **REQ-archiving-cron-reconcile**: SSH to production (`ssh root@jobapp.aigrowise.com -p 2222`), run `crontab -l`, identify which archiving endpoint is actually scheduled (`/api/cron/archive-jobs` daily 2 AM 30d all-statuses OR `/api/cron/archive-old-jobs` hourly 45d REJECTED+DRAFT). Retire the other endpoint (code + doc). Lock canonical choice via ADR. Resolution of W-2.
- [ ] **REQ-fit-default-reconcile**: Read `prisma/schema.prisma` (`User.minFitScore`) and `src/lib/job-monitor.ts:56`. If schema is `40` and runtime is `>=50`, decide which is canonical and align the other. Push single source of truth. Resolution of W-3.
- [ ] **REQ-historical-docs-marking**: Mark `DEPLOYMENT.md` and `DEPLOYMENT_SUMMARY.md` (pointing at IP `46.62.205.150` and Docker/Vercel paths) as historical via header banner + a note referencing `docs/JOB_TRACKER_DOCUMENTATION.md` as canonical. Resolution of W-4.
- [ ] **REQ-cron-auth-delta**: Formalize the security delta: `archive-jobs` and `archive-old-jobs` cron endpoints are documented as callable unauthenticated from localhost. Decide whether to require `CRON_SECRET` on them (recommended) or document the intentional localhost-only guard.
- [ ] **REQ-prod-build-migration**: Migrate production from `npm run dev` to `next build` + `next start` via updated systemd unit. Verify no behavior regressions (especially HMR-dependent paths, if any).

---

## v2 — Deferred

Future-milestone scope. Not in current roadmap.

### Automated Discovery Engine (future milestone)

Source: `.planning/seeds/automated-discovery-engine.md`. Triggered after v1 validates with the initial 100-company seed. Rough REQs to refine when triggered:

- **REQ-discovery-scheduled-search**: Scheduled (daily/weekly) Exa-driven semantic search for "US-HQ SMB tech company hiring in Spain"
- **REQ-discovery-candidate-filter**: Candidate filter against negative list, existing target list, hard criteria (US HQ, SMB size band, Spain-presence signal)
- **REQ-discovery-review-queue**: `target_company_candidates` review queue with pending/approved/rejected states (schema scaffolded in v1)
- **REQ-discovery-auto-promote**: Approved candidates auto-convert to `UserJobSource` records
- **REQ-discovery-exa-budget**: Budget controls and dedup for Exa API spend

### Other v2 candidates (from docs "Future enhancements")

- More resume file formats (LinkedIn PDF exports, OCR for scans)
- Real-time skill gap analysis
- Career path / salary negotiation insights
- Email alerts for 95%+ fit jobs
- Source suggestions based on profile
- Diversifying beyond tech (Education, Business, HR sources)
- Bulk source enable/disable
- Puppeteer-based scraping for non-API boards
- Tiered notifications by fit-score band

---

## Out of Scope (this milestone)

| Feature | Reason |
|---------|--------|
| Multi-tenant target-companies directory | Dan's personal pipeline only; other 6 users not in scope |
| Scraper rewrite | Extend the existing scraper with ATS adapters; do not replace |
| User-facing target-list management UI | Admin / seed-script access is enough for v1 |
| Automated company discovery engine | Deferred to v2 (see seed); v1 ships with seeded 100 first |
| LinkedIn server-side automated scraping | LinkedIn blocks; bookmarklet is the only supported path |
| Docker / Vercel production deployment | Canonical deployment is Hetzner + systemd + Nginx; Docker compose file retained for dev only |

---

## Open Research Questions

Blocks specific phases (see ROADMAP.md).

- **RQ-001** (`.planning/research/questions.md`): ATS landscape for US SMB tech companies hiring in Spain. Blocks spec-phase / plan-phase for **Phase 1: Target Company Pipeline** and shapes **Phase 2: ATS Platform Adapters**.

---

## Traceability

Which phase covers which requirement. Phases are defined in `.planning/ROADMAP.md`.

**Validated (already shipped) — no phase mapping; listed for context:**

| Requirement | Status |
|-------------|--------|
| REQ-auth-register | Complete (in production) |
| REQ-auth-login | Complete (in production) |
| REQ-application-crud | Complete (in production) |
| REQ-application-status-pipeline | Complete (in production) |
| REQ-application-create-from-job | Complete (in production) |
| REQ-interview-tracking | Complete (in production) |
| REQ-application-list-sortable | Complete (in production) |
| REQ-kanban-board | Complete (in production) |
| REQ-progress-charts | Complete (in production) |
| REQ-daily-goal-tracker | Complete (in production) |
| REQ-stats | Complete (in production) |
| REQ-contacts | Complete (in production) |
| REQ-followups | Complete (in production) |
| REQ-unified-notifications-panel | Complete (in production) |
| REQ-alerts | Complete (in production) |
| REQ-resume-management | Complete (in production) |
| REQ-cv-upload-and-profile-extraction | Complete (in production) |
| REQ-profile-editor | Complete (in production) |
| REQ-cover-letter-generation | Complete (in production) |
| REQ-motivational-message | Complete (in production) |
| REQ-job-fit-analysis | Complete (in production) |
| REQ-job-url-parsing | Complete (in production) |
| REQ-linkedin-bookmarklet | Complete (in production) |
| REQ-job-sources-configurable | Complete (in production) |
| REQ-job-monitoring-cron | Complete (in production) |
| REQ-archiving-cron | Complete in production but W-2 unresolved |
| REQ-job-matching-algorithm | Complete in production but W-3 unresolved |
| REQ-pattern-learning | Complete (in production) |
| REQ-deployment | Complete (in production) |

**Active (Spain-based Job Hunt Enablement milestone):**

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-target-company-seed | Phase 1 | Pending (blocked by RQ-001 resolution) |
| REQ-target-company-model-decision | Phase 1 | Pending (spec-phase decision) |
| REQ-target-company-smb-definition | Phase 1 | Pending (spec-phase decision) |
| REQ-target-company-verify-profile-readiness | Phase 1 | Pending |
| REQ-target-company-success-metric | Phase 1 | Pending |
| REQ-ats-adapter-architecture | Phase 2 | Pending (blocked by RQ-001 resolution) |
| REQ-ats-adapter-selector-per-source | Phase 2 | Pending |
| REQ-fit-score-cleanup | Phase 3 | Pending |
| REQ-archiving-cron-reconcile | Phase 3 | Pending |
| REQ-fit-default-reconcile | Phase 3 | Pending |
| REQ-historical-docs-marking | Phase 3 | Pending |
| REQ-cron-auth-delta | Phase 3 | Pending |
| REQ-prod-build-migration | Phase 3 | Pending |

**Coverage:**
- v1 Active requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 (full coverage)

---

*Requirements defined: 2026-04-23*
*Last updated: 2026-04-23 after `/gsd-ingest-docs` bootstrap for Spain-based Job Hunt Enablement milestone*
