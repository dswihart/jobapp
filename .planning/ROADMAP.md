# Roadmap: Job Application Tracker (jobapp)

## Overview

`jobapp` is a production-deployed, single-tenant-in-spirit AI-powered job-application tracker at `https://jobapp.aigrowise.com`. The 27 validated requirements (auth, pipeline CRUD, dashboards, CV extraction, AI fit scoring, LinkedIn bookmarklet, cron scanning, etc.) are shipped and locked — not restated as phases. This roadmap covers the **Spain-based Job Hunt Enablement** milestone: making the tracker effective for Dan's Spain-based job search targeting US-HQ SMB tech companies with Spain operational presence. Three phases deliver the milestone, followed by a v2 placeholder for the Automated Discovery Engine.

## Milestones

- 🚧 **Spain-based Job Hunt Enablement** — Phases 1–3 (current milestone)
- 📋 **Automated Discovery Engine (v2)** — future milestone, triggered post-v1 validation (see `.planning/seeds/automated-discovery-engine.md`)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked INSERTED)

- [ ] **Phase 1: Target Company Pipeline (US→Spain Bridge)** - Seed ~100 US-HQ SMB tech companies with Spain presence into `UserJobSource`; existing scraper + fitScore do the rest
- [ ] **Phase 2: ATS Platform Adapters** - Platform-specific adapters (Greenhouse, Lever, Ashby, Workable, generic fallback) for reliable ingestion across heterogeneous careers pages; prerequisite for Phase 1 seed quality
- [ ] **Phase 3: Doc Drift Reconciliation & Prod Hardening** - Resolve the 4 ingest warnings (fit-score code cleanup, archiving cron reconcile, minFitScore reconcile, historical docs marking), formalize cron-auth delta, migrate `npm run dev` → `next start`

## Phase Details

### Phase 1: Target Company Pipeline (US→Spain Bridge)
**Goal**: Seed ~100 vetted US-HQ SMB tech companies that hire Spain-based talent into the existing `UserJobSource` ingestion pipeline, so Dan's opportunities feed surfaces fit-scored openings from them automatically.
**Depends on**: Nothing (first phase of milestone); but Phase 2 is a hard prerequisite for reliable ingestion of the seeded companies. See note below.
**Requirements**: REQ-target-company-seed, REQ-target-company-model-decision, REQ-target-company-smb-definition, REQ-target-company-verify-profile-readiness, REQ-target-company-success-metric
**Blocked by**: RQ-001 (ATS landscape research) must land before `spec-phase` for this phase; it shapes whether a first-class `Company` model is needed and how ingestion records each company's ATS platform.
**Context**: See `.planning/notes/target-company-pipeline.md` (canonical spec). Key open questions for spec-phase: (a) first-class `Company`/`TargetCompany` model vs. tag via `UserJobSource` — scaffolding for v2 discovery engine either way; (b) SMB size band (placeholder 10–500 employees); (c) Spain-presence signal set; (d) whether any user-facing target-list UI lands in v1 (default: no — admin/seed-script only).
**Success Criteria** (what must be TRUE):
  1. ~100 target companies are recorded in the schema (via `UserJobSource` or the new `Company` model), each with HQ country, SMB size band, Spain-presence evidence, ATS platform, careers URL.
  2. The user's profile is verified populated well enough for `analyzeJobFitEnhanced()` to produce meaningful fit scores (skills, preferences, seniority, titles, industries).
  3. The existing scan cron (`POST /api/cron/scan-jobs`) runs against the 100 seeded entries and surfaces JobOpportunity records into the feed.
  4. Within 2 weeks of the pipeline going live, **≥5 opportunities with `fitScore ≥ 50`** from seeded US-HQ SMB tech companies with Spain presence appear in the opportunities feed without manual source additions (milestone success metric).
  5. Schema leaves clean scaffolding for the v2 Automated Discovery Engine: discovery source (manual vs. automated), candidate-review state (pending/approved/rejected), per-company metadata stable enough that v2 doesn't require migration churn.
**Plans**: TBD (shaped by spec-phase after RQ-001)
**UI hint**: no (admin/seed-script access only in v1 per exploration note)

> **Dependency note**: Phase 1 and Phase 2 are tightly coupled. The seeded 100 companies are useless if ingestion can't actually read their jobs. After RQ-001 resolves, `spec-phase` for Phase 1 will decide whether to (a) run Phase 2 first, (b) deliver a minimum-viable Greenhouse+Lever adapter subset before seeding the Phase 1 data, or (c) sequence them as overlapping Phase 1 → Phase 2. Order is reversible; both REQs must be live for the milestone success metric to be achievable.

### Phase 2: ATS Platform Adapters
**Goal**: Replace trust in generic CSS-selector `UserJobSource.scrapeSelector` with platform-specific adapters (Greenhouse, Lever, Ashby, Workable, generic fallback), so the ~100 seeded companies can be ingested reliably.
**Depends on**: RQ-001 (ATS landscape research) resolution; may run before, in parallel with, or after Phase 1 per spec-phase decision.
**Requirements**: REQ-ats-adapter-architecture, REQ-ats-adapter-selector-per-source
**Context**: RQ-001 will report the ATS platform distribution across a sample of US SMB tech companies with Spain presence. That shapes the minimum adapter matrix. Known API shapes: Greenhouse `boards-api.greenhouse.io/v1/boards/{slug}/jobs`, Lever `api.lever.co/v0/postings/{slug}`, Ashby JSON per company, Workable JSON feed. Workday is JS-heavy — scope TBD (may defer to v2 or use Puppeteer from the existing "future enhancements" list). Each adapter normalizes to the existing `JobOpportunity` shape; the existing AI fit-score path does not change.
**Success Criteria** (what must be TRUE):
  1. At minimum, Greenhouse and Lever adapters work end-to-end: scan cron picks up a seeded company using either platform and the resulting openings land in `JobOpportunity` with valid title/company/location/description/url.
  2. Each `UserJobSource` record (or Company record, per Phase 1 schema decision) declares its ATS platform; the ingestion pipeline dispatches to the correct adapter based on that declaration.
  3. Generic CSS-selector scraping remains available as a fallback but is no longer the default for the 100 target companies.
  4. Adapter failures (e.g., slug not found, platform API down, rate-limit) log cleanly and do NOT poison the whole scan run for other sources or users.
**Plans**: TBD
**UI hint**: no (backend ingestion work; no user-facing UI)

### Phase 3: Doc Drift Reconciliation & Prod Hardening
**Goal**: Resolve the 4 ingest warnings (W-1 through W-4 from `.planning/INGEST-CONFLICTS.md`) that were deferred during bootstrap, formalize the cron-auth security delta, and migrate production off `npm run dev`.
**Depends on**: Can run in parallel with Phase 1 / Phase 2 (mostly independent work). Phase 3 is explicitly scoped as tech-debt work — it touches production-deployed behavior that is otherwise LOCKED per PROJECT.md `<decisions>`.
**Requirements**: REQ-fit-score-cleanup, REQ-archiving-cron-reconcile, REQ-fit-default-reconcile, REQ-historical-docs-marking, REQ-cron-auth-delta, REQ-prod-build-migration
**Context**:
  - **W-1 (fit-score)**: User's bootstrap decision was "enhanced 6-component is canonical, 60/40 is historical." Work here is code-hygiene: scan `src/lib/ai-service.ts` and docs for leftover 60/40 references.
  - **W-2 (archiving cron)**: Unresolved in bootstrap. Requires SSH to production to see which endpoint is actually scheduled before picking a canonical.
  - **W-3 (minFitScore default)**: Likely schema-vs-code bug (`prisma/schema.prisma` says `default 40`; `src/lib/job-monitor.ts:56` hardcodes `>=50`). Verify in code before picking canonical.
  - **W-4 (deployment drift)**: Resolved in bootstrap prompt — `jobapp.aigrowise.com` is canonical. Residual: mark old docs historical.
  - **Cron auth delta**: `archive-jobs` and `archive-old-jobs` callable unauthenticated from localhost; `scan-jobs` requires `CRON_SECRET`. Inconsistent.
  - **Prod build**: Known tech-debt noted in `docs/JOB_TRACKER_DOCUMENTATION.md` — Next.js running in dev mode in production.
**Success Criteria** (what must be TRUE):
  1. Codebase has no runnable reference to the old 60/40 fit-score formula (W-1 cleaned up); `analyzeJobFitEnhanced()` is the single path.
  2. Exactly one archiving cron endpoint exists and runs in production; the other is retired (code + docs); the canonical schedule + threshold are locked via ADR (W-2 resolved).
  3. `User.minFitScore` default is consistent between Prisma schema and `src/lib/job-monitor.ts` runtime check; single source of truth in place (W-3 resolved).
  4. `DEPLOYMENT.md` and `DEPLOYMENT_SUMMARY.md` carry a visible historical banner pointing at `docs/JOB_TRACKER_DOCUMENTATION.md` as canonical (W-4 residual cleanup).
  5. All cron endpoints require `CRON_SECRET` OR are intentionally gated at the network layer with documented rationale (cron-auth delta resolved).
  6. Production runs via `next build` + `next start` under the existing systemd unit, verified by a post-migration scan + fit-score sanity check (dev-mode migration complete).
**Plans**: TBD
**UI hint**: no (backend + docs + deployment work)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3. Phases 1 and 2 may overlap per spec-phase scheduling decision (see Phase 1 Dependency note). Phase 3 can run in parallel with Phases 1 and 2 — it's independent tech-debt.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Target Company Pipeline (US→Spain Bridge) | 0/TBD | Not started (blocked by RQ-001) | - |
| 2. ATS Platform Adapters | 0/TBD | Not started (blocked by RQ-001) | - |
| 3. Doc Drift Reconciliation & Prod Hardening | 0/TBD | Not started | - |

## Future Milestone: Automated Discovery Engine (v2)

**Milestone Goal**: Replace the one-time Exa research pass (v1) with a recurring Exa-driven discovery pipeline that proposes additional matching companies, filters them, queues them for user review, and auto-promotes approvals into `UserJobSource`.

**Trigger conditions** (any of):
- Initial 100 companies from Phase 1 are live and producing useful fit-scored opportunities
- User wants to widen the funnel beyond the initial seed
- Manual maintenance of the target list becomes painful

**Phases**: TBD — refine when triggered. Rough shape captured in `.planning/seeds/automated-discovery-engine.md`.

**Not yet planned**: explicit phases deliberately held off until v1 validates. The v1 schema must leave scaffolding for discovery source (manual vs. automated), candidate-review state, and per-company metadata so v2 migration is painless.

---

*Roadmap defined: 2026-04-23*
*Last updated: 2026-04-23 after `/gsd-ingest-docs` bootstrap for Spain-based Job Hunt Enablement milestone*
