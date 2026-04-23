# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-23)

**Core value:** Surface high-fit job opportunities to the user without manual searching, and manage the application pipeline end-to-end from discovery through interview.
**Current focus:** Phase 1 — Target Company Pipeline (US→Spain Bridge)
**Current milestone:** Spain-based Job Hunt Enablement

## Current Position

Phase: 1 of 3 (Target Company Pipeline (US→Spain Bridge))
Plan: 0 of TBD in current phase
Status: **Unblocked — ready to spec**
Last activity: 2026-04-23 — `/gsd-ingest-docs` ran against 20 DOCs, then bootstrap produced PROJECT/REQUIREMENTS/ROADMAP/STATE. RQ-001 (ATS landscape) **resolved** via Exa research pass; findings in `.planning/research/rq-001-ats-landscape/FINDINGS.md`. Phase 1 is no longer blocked; `/gsd:spec-phase 1` is the next workflow.

Progress: [░░░░░░░░░░] 0% (milestone just started; v1 production features are validated/shipped but not part of this roadmap)

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Target Company Pipeline | 0/TBD | — | — |
| 2. ATS Platform Adapters | 0/TBD | — | — |
| 3. Doc Drift Reconciliation & Prod Hardening | 0/TBD | — | — |

**Recent Trend:**
- Last 5 plans: none yet
- Trend: n/a

*Updated after each plan completion*

## Accumulated Context

### Decisions

Full list in PROJECT.md `<decisions>` block. Recent decisions affecting current work:

- Tech stack LOCKED at bootstrap: Next.js 15 + React 19 + Prisma 6 + Postgres 17 + NextAuth 5 beta + Anthropic Claude 3.5 Sonnet + OpenAI SDK (site TBD); deployment LOCKED at Hetzner Debian arm64 Helsinki, `jobapp.aigrowise.com`, systemd + Nginx, SSH port 2222.
- W-1 resolved at bootstrap: Enhanced 6-component fit-score formula is canonical; 60/40 references are historical. Code cleanup tracked as REQ-fit-score-cleanup in Phase 3.
- W-4 resolved at bootstrap: `jobapp.aigrowise.com` on Hetzner is canonical deployment target. `DEPLOYMENT.md` and `DEPLOYMENT_SUMMARY.md` (IP 46.62.205.150) are historical. Residual cleanup tracked as REQ-historical-docs-marking in Phase 3.
- **RQ-001 resolved 2026-04-23**: ATS adapter matrix for Phase 2 = Greenhouse + Lever + Ashby + generic fallback (≈80% coverage). Workable optional; Workday deferred to v2. All three primary platforms have public JSON APIs. Architectural implication: add `platform` field on target-company record; ingestion dispatches by platform. See `.planning/research/rq-001-ats-landscape/FINDINGS.md`.

### Pending Todos

See `.planning/todos/pending/`.

- `bootstrap-gsd.md` — meta-todo satisfied by this bootstrap. Safe to move to done after commit.

### Blockers/Concerns

- ~~**Phase 1 blocked by RQ-001**~~ — **resolved 2026-04-23**. Findings in `.planning/research/rq-001-ats-landscape/FINDINGS.md`. Adapter matrix locked to Greenhouse + Lever + Ashby + generic fallback. Three sub-questions (SQ-001-a/b/c) remain as non-blocking follow-ups captured in `research/questions.md`.
- **W-2 unresolved (archiving cron)**: Two competing cron implementations; ground truth requires SSH to production (`crontab -l`). Tracked as REQ-archiving-cron-reconcile in Phase 3.
- **W-3 unresolved (minFitScore default)**: Likely schema-vs-code bug (Prisma `default 40` vs. `src/lib/job-monitor.ts:56` hardcoded `>=50`). Requires reading both to establish canonical. Tracked as REQ-fit-default-reconcile in Phase 3.
- **Production tech-debt**: `job-tracker.service` running `npm run dev` rather than `next start`. Tracked as REQ-prod-build-migration in Phase 3.

## Deferred Items

Items acknowledged and carried forward:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 feature | Automated Discovery Engine (Exa-driven recurring discovery) | Seed in `.planning/seeds/automated-discovery-engine.md` | 2026-04-23 (explore) |
| v2 feature | Email alerts for 95%+ fit jobs | Noted in docs "Future enhancements" | 2026-04-23 (bootstrap) |
| v2 feature | Puppeteer-based scraping for Workday / non-API boards | Noted in docs "Future enhancements" | 2026-04-23 (bootstrap) |

## Session Continuity

Last session: 2026-04-23
Stopped at: Bootstrap complete + RQ-001 resolved. Phase 1 is fully unblocked; ready for `/gsd:spec-phase 1`. Outputs: PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, intel/, INGEST-CONFLICTS.md, research/rq-001-ats-landscape/FINDINGS.md. Exploration artifacts preserved.
Resume file: None. Next workflow: `/gsd:spec-phase 1` (Target Company Pipeline — US→Spain Bridge).
