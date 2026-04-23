# Job Application Tracker (jobapp)

## What This Is

An AI-powered job-application tracking and discovery tool, deployed in production as `https://jobapp.aigrowise.com`. It manages the full application pipeline (draft → pending → applied → interviewing → rejected/archived), automatically scrapes configurable job sources, scores each opportunity against the user's CV-derived profile using Claude 3.5 Sonnet, and assists with resume tailoring and cover-letter generation. Primary user is Dan (dswihart@gmail.com); 6 additional users also have accounts, but the system is designed single-tenant in spirit (each user's data is strictly siloed by `userId`).

## Core Value

**Surface high-fit job opportunities to the user without manual searching, and manage the application pipeline end-to-end from discovery through interview.** Everything else (dashboards, bookmarklets, cover-letter generation, CV tailoring) serves this outcome.

## Current Milestone

**Spain-based Job Hunt Enablement** — making the tracker effective for Dan's Spain-based job search targeting US-HQ SMB tech companies with Spain operational presence. See `.planning/ROADMAP.md` and `.planning/notes/target-company-pipeline.md`.

**Success metric:** Within 2 weeks of the Target Company Pipeline going live, ≥5 fit-scored opportunities (fitScore ≥ 50) from US-HQ SMB tech companies with Spain presence appear in the opportunities feed without Dan manually adding sources.

## Requirements

### Validated

<!-- Shipped in production and working. See .planning/REQUIREMENTS.md for REQ-IDs and full list. -->

All 27 intel REQs (REQ-auth-register through REQ-motivational-message, REQ-deployment) are observed working in production as of 2026-04-23.

See `.planning/REQUIREMENTS.md` "v1 — Validated (shipped)" section for the full mapped list.

### Active

<!-- Current scope. Spain-based Job Hunt Enablement milestone. -->

- [ ] **REQ-target-company-seed**: Seed ~100 `UserJobSource` records for US-HQ SMB tech companies with Spain operational presence (from one-time Exa-backed research pass)
- [ ] **REQ-ats-adapter-architecture**: Introduce platform-specific ATS adapters (Greenhouse / Lever / Ashby / Workable / Workday / generic fallback) so ingestion works reliably across heterogeneous careers pages
- [ ] **REQ-target-company-model-decision**: Decide (in spec-phase) whether to introduce a first-class `Company` / `TargetCompany` model or tag via `UserJobSource` metadata; leave scaffolding for v2 discovery engine either way
- [ ] **REQ-fit-score-cleanup**: Audit codebase for leftover references to the old 60/40 fit-score formula; confirm `analyzeJobFitEnhanced()` (6-component weighted) is the only live path
- [ ] **REQ-archiving-cron-reconcile**: Reconcile divergent archiving crons (`/api/cron/archive-jobs` daily/30d/all-statuses vs. `/api/cron/archive-old-jobs` hourly/45d/REJECTED+DRAFT); pick one as canonical, retire the other, lock via ADR
- [ ] **REQ-fit-default-reconcile**: Reconcile `User.minFitScore` default between Prisma schema (`default 40`) and hardcoded `>=50` in `src/lib/job-monitor.ts:56`; emit single canonical value
- [ ] **REQ-historical-docs-marking**: Mark `DEPLOYMENT.md` and `DEPLOYMENT_SUMMARY.md` (pointing at IP `46.62.205.150` and Docker/Vercel paths) as historical; `jobapp.aigrowise.com` on Hetzner Debian arm64 is canonical
- [ ] **REQ-prod-build-migration**: Migrate production from `npm run dev` to proper `next start` production build (known tech-debt)

### Out of Scope (v1)

<!-- Explicit boundaries on the current milestone. -->

- **Automated discovery engine (v2 of Target Company Pipeline)** — recurring Exa-driven search to grow the target list beyond the seeded 100. Seeded as `.planning/seeds/automated-discovery-engine.md`; triggers after v1 validates.
- **Multi-tenant target-companies directory** — Dan's personal pipeline only; not a shared catalog for the 6 other users.
- **Scraper rewrite** — the ATS adapter work extends the existing scraper, does not replace it.
- **User-facing target-list management UI** — admin/seed-script access is enough for v1; lightweight UI deferred unless trivial.
- **Multi-file-format resume uploads beyond PDF/DOC/DOCX/TXT** — LinkedIn PDF exports and OCR'd scans deferred to a future milestone.
- **Email alerts for 95%+ fit jobs** — listed in docs as a future enhancement; not in current milestone scope.

## Context

**Deployment reality (canonical as of 2026-04-23):**
- Production: `https://jobapp.aigrowise.com`
- Infrastructure: Hetzner Debian arm64 droplet in Helsinki (older docs say "DigitalOcean" — the provider reference was inaccurate; actual host is Hetzner)
- SSH: port 2222, application path `/opt/job-tracker`
- Systemd: `job-tracker.service` running on `localhost:3000`, fronted by Nginx on `80/443` with Let's Encrypt SSL
- **Currently running `npm run dev`** (development mode) — planned migration to `next start` is a tracked tech-debt item (REQ-prod-build-migration)

**Historical note:** `DEPLOYMENT.md` and `DEPLOYMENT_SUMMARY.md` reference a different host (IP `46.62.205.150:3000`, Docker/Vercel deployment paths). These are historical and superseded. See W-4 resolution in `.planning/INGEST-CONFLICTS.md`.

**User accounts (observed as of 2025-10-22):**
- `dswihart@gmail.com` — primary user (Dan), 29 sources enabled, tech/security profile, 324+ scraped opportunities
- `pgollotte@gmail.com` — secondary user (Philippe), 30 sources enabled, Education/International Relations profile
- 5 additional user accounts (not detailed in intel)

**Recent evolution highlights:**
- 2025-11-16: Automatic job archiving feature added (one of two competing cron implementations — see Known Issues)
- 2025-11-12: Column sorting added to `ApplicationList.tsx`
- 2025-10-22: LinkedIn bookmarklet; `autoScan` default flipped to `true`; unified job sources (hardcoded TypeScript sources migrated to `user_job_sources` DB table)
- 2025-10-20: `PENDING` status added between `DRAFT` and `APPLIED` (purple UI); `UnifiedNotificationsPanel` replaced separate panels
- 2025-10-03: Enhanced matching (6-component weighted) with CV upload + Claude-based profile extraction

**AI pipeline characteristics:**
- Claude 3.5 Sonnet via `@anthropic-ai/sdk` for fit-score analysis, CV extraction, cover-letter generation, resume tailoring, motivational messages
- Rate limit: 50 req/min on Tier 1
- Observed latency: CV extraction 10–20s (~2000 tokens), job match ~1.5–2s (~1500 tokens)
- Two-stage filtering (keyword prefilter → AI scoring) to reduce cost and latency

## Known Issues

Explicit tracking of unresolved issues flagged in `.planning/INGEST-CONFLICTS.md`. These feed requirements in the "Active" section.

- **W-2 (archiving cron)**: Two archiving endpoints documented with incompatible schedules/semantics. Ground truth against running cron is unverified. Addressed by REQ-archiving-cron-reconcile. **Action needed**: SSH to box, inspect `crontab -l`, identify which endpoint is actually firing, retire the other. Do NOT pick one arbitrarily from docs.
- **W-3 (minFitScore default)**: Prisma schema default is `40`; `src/lib/job-monitor.ts:56` hard-codes `>=50`. This is likely a schema-vs-code bug, not just documentation drift. Addressed by REQ-fit-default-reconcile. **Action needed**: read the schema and the line in job-monitor.ts, decide canonical value (probably `50` to match runtime behavior, unless intent was `40` and the runtime is wrong), push single source of truth.
- **W-4 (deployment drift)**: Resolved in canonical context above — `jobapp.aigrowise.com` on Hetzner is the live target. Residual cleanup: mark old deployment docs as historical (REQ-historical-docs-marking).
- **Indeed RSS 403**: Minor, logged, non-blocking.
- **Occasional "JSON Parse Error" runtime warning**: Failed network requests, cosmetic, non-blocking.
- **Next.js running in dev mode (`npm run dev`)**: Production-performance-impacting tech-debt; addressed by REQ-prod-build-migration.

## Constraints

- **Tech stack (LOCKED — see Key Decisions)**: Next.js 15 (App Router) + React 19 + TypeScript; Prisma 6.16.3 ORM; PostgreSQL 17.6; NextAuth.js 5.0 beta (Credentials provider, JWT sessions); Tailwind CSS 4
- **AI provider (LOCKED)**: Anthropic Claude (`@anthropic-ai/sdk` 0.65.0, model Claude 3.5 Sonnet) — primary. OpenAI SDK also present per project intro (use TBD in spec work). `ANTHROPIC_API_KEY` required; Tier 1 rate limit 50 req/min.
- **Deployment target (LOCKED)**: `jobapp.aigrowise.com` on Hetzner Debian arm64 (Helsinki), SSH port 2222, systemd-managed, Nginx reverse proxy, Let's Encrypt SSL. App path `/opt/job-tracker`.
- **Auth (LOCKED)**: NextAuth.js 5.0 beta, Credentials provider, bcryptjs password hashing, JWT sessions in HTTP-only cookies, every protected route filters by session-derived `userId`.
- **External dependencies**: Remotive API (no auth, 4 req/day recommended), The Muse API (no auth), Adzuna API (1000 req/month free tier), LinkedIn (server-side scraping blocked — bookmarklet workaround).
- **Deploy cycle**: `cd /opt/job-tracker && npm run build && systemctl restart job-tracker` (~60s total).
- **File upload limit**: CV uploads capped at 5 MB (PDF/DOC/DOCX/TXT).
- **Cron auth**: `POST /api/cron/scan-jobs` requires `x-cron-secret` header. Other cron endpoints (`archive-jobs`, `archive-old-jobs`) are callable unauthenticated from localhost — a known security delta to formalize.
- **Single-tenant spirit**: 7 users in DB but each user's data is strictly siloed; no multi-tenant features planned.

<decisions>

## Key Decisions (LOCKED tech stack)

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 15 (App Router) + React 19 | In production, shipping features | ✓ Good |
| Prisma 6.16.3 ORM + PostgreSQL 17.6 | Schema migrations working; `user_job_sources` table migration (2025-10-22) validated the workflow | ✓ Good |
| NextAuth.js 5.0 beta (Credentials + JWT) | Simple auth; beta caveat but working | — Pending (monitor for GA bump) |
| Anthropic Claude 3.5 Sonnet for AI | Fit-score accuracy acceptable; latency and cost characterized | ✓ Good |
| OpenAI SDK also available | Present in the tech mix per project intro — usage site TBD | — Pending |
| Production on Hetzner Debian arm64 (Helsinki `hel1`), `jobapp.aigrowise.com` | 8GB RAM sufficient, SSL via Let's Encrypt, systemd `job-tracker.service` | ✓ Good |
| Systemd + Nginx reverse proxy (not Docker in prod) | Simpler ops; Docker compose file present but not the prod path | ✓ Good |
| Database-backed `UserJobSource` (not hardcoded TypeScript list) | 2025-10-22 refactor; `src/lib/sources/index.ts` returns empty | ✓ Good |
| Enhanced 6-component fit-score formula (`Skill*0.35 + Exp*0.25 + Seniority*0.15 + Title*0.15 + Industry*0.05 + Location*0.05`) | Supersedes old 60/40 formula; W-1 resolution | ✓ Good (pending code cleanup per REQ-fit-score-cleanup) |
| LinkedIn bookmarklet (client-side) instead of server-side scraping | LinkedIn returns HTTP 500 to server-side scrape; client bookmarklet uses user's session cookies | ✓ Good |
| `autoScan` default `true` (schema + registration) | 2025-10-22 fix; onboarding flow expects discovery to start immediately | ✓ Good |

</decisions>

---
*Last updated: 2026-04-23 after `/gsd-ingest-docs` + bootstrap for Spain-based Job Hunt Enablement milestone*
