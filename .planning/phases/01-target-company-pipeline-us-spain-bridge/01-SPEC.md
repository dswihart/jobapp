# Phase 1: Target Company Pipeline (US→Spain Bridge) — Specification

**Created:** 2026-04-23
**Ambiguity score:** 0.11 (gate: ≤ 0.20)
**Requirements:** 14 locked

> **Scope note:** This spec merges the original ROADMAP's Phase 1 (seed + schema) and Phase 2 (ATS adapters) into a single delivered phase, per Round 1 decision. Phase 2 in ROADMAP.md should be retired or narrowed to Workable + Workday (deferred).

## Goal

Seed ~100 US-HQ SMB tech companies with Spain operational presence into a new thin `Company` Prisma model, wired to Greenhouse / Lever / Ashby / generic-fallback ingestion adapters so their Spain-tagged openings flow into the existing `JobOpportunity` feed and are ranked by the existing `analyzeJobFitEnhanced()` fit-score pipeline. Success when ≥5 `JobOpportunity` rows with `fitScore ≥ 50` and `companyId → Company` exist in the feed within 2 weeks of phase completion (best-effort metric; see Known Risks).

## Background

**What exists today** (grounded in codebase 2026-04-23):

- `prisma/schema.prisma` defines `UserJobSource` (per-user, `sourceType` enum = `rss | web_scrape | api | job_board`) and `JobOpportunity` (`company` is a plain string, no foreign key).
- `src/lib/user-sources-fetcher.ts` reads enabled `UserJobSource` rows and dispatches to RSS / cheerio-scrape / API paths. Uses hardcoded `USER_AGENT` + 15s timeout.
- `src/lib/job-source-interface.ts` defines a `JobSource` interface + `BaseJobSource` abstract class, but only types `'api' | 'rss'` — no ATS concept.
- `src/lib/sources/index.ts` is the built-in sources registry.
- `src/lib/job-monitor.ts` runs fit-scoring; has the hardcoded `>= 50` check (W-3 — Phase 3 work, out of scope here).
- `src/app/api/cron/scan-jobs/route.ts` is the live scan scheduler (auth-gated via `CRON_SECRET`).
- `prisma/seed-job-sources.ts` is an existing seed-script precedent.
- RQ-001 resolved (`.planning/research/rq-001-ats-landscape/FINDINGS.md`): Greenhouse + Lever + Ashby + generic fallback covers ~80%. All three primary platforms have public JSON APIs.

**What does NOT exist** (the delta Phase 1 closes):

- No `Company` model. `JobOpportunity.company` is a free-form string with no entity behind it.
- No `ats_platform` field on any record — scraping is by `sourceType`, which is too coarse.
- No Greenhouse / Lever / Ashby adapters.
- No seed list of US-HQ SMB tech companies with Spain presence.
- No CRUD UI for target companies.
- No Spain-eligibility filter — jobs are ingested regardless of location.
- No per-company last-scraped-at / status tracking.

## Requirements

1. **Company model (thin)**: Introduce a first-class `Company` Prisma model with the minimal fields needed to seed, ingest, and track.
   - Current: No `Company` model. `JobOpportunity.company` is a plain string.
   - Target: New model `Company` with columns `id` (cuid), `name`, `careers_url`, `ats_platform` (enum: `greenhouse | lever | ashby | workable | workday | custom`), `ats_slug` (nullable; the `{slug}` segment for the ATS URL), `status` (enum: `active | paused | rejected`, default `active`), `spain_presence_evidence` (enum: `manual | careers-page`), `spain_presence_url` (nullable text), `hq_country` (string, default `'US'`), `size_band` (nullable string, e.g. `"10-50" | "50-200" | "200-500" | "500-1000"`), `discovery_source` (enum: `manual | automated`, default `manual` for v1), `last_scraped_at` (nullable datetime), `created_at`, `updated_at`. Unique constraint on `(name)` OR `(careers_url)`.
   - Acceptance: Prisma migration applies cleanly; `SELECT * FROM companies LIMIT 1` works; all non-nullable columns enforce their type. Schema diff checked into `prisma/migrations/`.

2. **UserJobSource ← Company link**: Link existing ingestion records to the new Company model.
   - Current: `UserJobSource` has no reference to a Company.
   - Target: Add nullable `company_id` FK on `UserJobSource` (references `Company.id`, `ON DELETE SET NULL`). Existing rows get `company_id = NULL` (backward compatible).
   - Acceptance: `SELECT * FROM user_job_sources WHERE company_id IS NOT NULL` returns rows after seed runs; pre-existing `UserJobSource` rows with `company_id = NULL` continue to dispatch via the legacy path unchanged.

3. **ATS platform enum**: Introduce a single source-of-truth enum for ATS platforms.
   - Current: No enum; scraping type is `UserJobSource.sourceType` which is too coarse.
   - Target: TypeScript + Prisma enum `AtsPlatform = 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'workday' | 'custom'`. Used on `Company.ats_platform`.
   - Acceptance: Attempting to insert `ats_platform = 'foo'` via Prisma fails with enum validation error.

4. **Greenhouse adapter**: Fetch & normalize jobs from the Greenhouse public boards API.
   - Current: No adapter exists.
   - Target: `src/lib/sources/greenhouse.ts` fetches `GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`, parses the `jobs[]` array, and emits `JobPosting[]` normalized to the existing interface (title, company, description, location, jobUrl, postedDate, source='greenhouse', sourceUrl). No auth.
   - Acceptance: Unit test against a recorded fixture for at least one company (e.g., Datadog) produces ≥1 normalized `JobPosting` with expected `title`, `jobUrl`, `source='greenhouse'`.

5. **Lever adapter**: Fetch & normalize jobs from the Lever public postings API.
   - Current: No adapter exists.
   - Target: `src/lib/sources/lever.ts` fetches `GET https://api.lever.co/v0/postings/{slug}?mode=json`, parses the array, normalizes to `JobPosting`. No auth. Respects `categories.location` and `country`.
   - Acceptance: Unit test against a recorded fixture for at least one company (e.g., Zapier) produces ≥1 normalized `JobPosting` with `source='lever'`.

6. **Ashby adapter**: Fetch & normalize jobs from Ashby, preferring the simpler of the two options.
   - Current: No adapter exists.
   - Target: `src/lib/sources/ashby.ts` fetches `https://jobs.ashbyhq.com/{slug}`, parses the JSON embedded in `<script id="__NEXT_DATA__">`, normalizes to `JobPosting`. Fallback path: POST `https://api.ashbyhq.com/posting-api/job-board/{slug}` if the HTML endpoint fails. `source='ashby'`.
   - Acceptance: Unit test against a recorded fixture (e.g., Vercel) produces ≥1 normalized `JobPosting` with `source='ashby'`.

7. **Generic fallback adapter**: Retain the existing cheerio-based web-scrape path for `ats_platform='custom'` companies.
   - Current: `src/lib/user-sources-fetcher.ts` already does this per-`UserJobSource` using `scrapeSelector`.
   - Target: When a Company's `ats_platform='custom'`, dispatch falls through to the existing `web_scrape` path using a linked `UserJobSource.scrapeUrl`/`scrapeSelector`. No new adapter code.
   - Acceptance: A Company seeded with `ats_platform='custom'` + a valid `UserJobSource` with scrape config produces ≥1 `JobOpportunity` from a mocked cheerio fixture.

8. **Ingestion dispatcher by platform**: Replace the current `sourceType`-only dispatch with a platform-aware path.
   - Current: `user-sources-fetcher.ts` dispatches only on `UserJobSource.sourceType`.
   - Target: Introduce a dispatcher keyed on `Company.ats_platform` (via the `UserJobSource.company_id` link). If `company_id IS NULL`, fall through to legacy `sourceType` dispatch (backward compat). If `company_id` is set, route to the ATS-specific adapter. Adapters emit `JobPosting[]`; the existing persistence + fit-score path is unchanged.
   - Acceptance: With a mixed dataset (some `UserJobSource` rows with `company_id`, some without), a scan run correctly dispatches each to the expected adapter path; legacy RSS/scrape sources keep working.

9. **Fail-soft adapter isolation**: One adapter failure does NOT poison the whole scan run.
   - Current: Existing scraping code uses try/catch per source (verified in `user-sources-fetcher.ts`); continue this discipline.
   - Target: Each adapter call is wrapped; exceptions are logged with `{source, company_id, ats_platform, error}` and the dispatcher continues with the next source. Aggregated error count surfaced in the scan-jobs route response.
   - Acceptance: In a mocked scan run where 1 of 3 adapters throws, the other 2 complete and the route returns a `{ok: true, errors: [{...}]}` response.

10. **Strict Spain location filter at ingestion**: Ingested jobs must pass a Spain-location match before insert into `JobOpportunity`.
    - Current: No such filter; all scraped jobs are inserted.
    - Target: Before inserting a fetched job as `JobOpportunity`, check `job.location` (case-insensitive) for substring match against `['Spain', 'España', 'Madrid', 'Barcelona', 'Valencia']`. If no match, drop the job (do not insert; log at DEBUG level). Matcher lives in a single helper used by all adapters (`src/lib/sources/spain-filter.ts`).
    - Acceptance: Unit tests: location `"Madrid, Spain"` passes; `"Paris, France"` fails; `"Remote — EMEA"` fails (per strict-filter decision); case-insensitive (`"MADRID"` passes); empty-string location fails.

11. **Seed script — 100 companies via Exa**: A one-time build-time script populates the `Company` table with ~100 vetted entries.
    - Current: No seed script for target companies.
    - Target: `prisma/seed-target-companies.ts` (separate from the existing `seed-job-sources.ts`) that reads a human-curated JSON/YAML input file (`prisma/seeds/target-companies.json`) and upserts `Company` rows. The input file is produced by a separate Exa-driven research pass (manual or agent-assisted — outside the script's concern). Script behavior: idempotent upsert on `careers_url`; logs a summary of created/updated/unchanged.
    - Acceptance: Running the script on a fixture input of 100 entries creates 100 `Company` rows with required fields populated; re-running makes 0 changes (idempotent).

12. **CRUD UI for target companies**: A new page with full create/read/update/delete + disable.
    - Current: No UI for target companies; the only way to add a `UserJobSource` is the existing `/sources` page (unrelated to target companies).
    - Target: New page at `/companies` (or `/target-companies`) with a table listing all Company rows (columns: name, careers_url, ats_platform, status, last_scraped_at, opportunity_count). Actions per row: Edit (open form), Disable (toggle `status='paused'`), Delete. New-company form (name, careers_url, ats_platform, ats_slug, hq_country, size_band, spain_presence_evidence, spain_presence_url, initial status). Client-side validation + server-side validation via zod.
    - Acceptance: Logged-in user can create a Company via the form, see it appear in the list, edit it, disable it (status becomes 'paused'), and delete it. All writes gated by NextAuth session.

13. **CRUD API routes**: Backing REST endpoints for the UI.
    - Current: Does not exist.
    - Target: `src/app/api/companies/route.ts` (GET list, POST create) + `src/app/api/companies/[id]/route.ts` (GET one, PATCH update, DELETE). All routes require `await auth()` session; validate payloads with zod. `GET list` supports query params `?status=active|paused|rejected&platform=greenhouse|...`.
    - Acceptance: Unauthenticated requests return 401. Authenticated POST with valid payload returns 201 + the new row. PATCH on non-existent id returns 404. DELETE soft-deletes (sets `status='rejected'`) OR hard-deletes (cascade to `UserJobSource.company_id = NULL`) — decision in discuss-phase.

14. **Success metric (best-effort)**: The 2-week test that the pipeline works end-to-end.
    - Current: No target companies wired; 0 Spain-targeted opportunities surface from US-HQ SMB tech companies.
    - Target: Within 14 days of phase merge, the `JobOpportunity` table contains ≥5 rows where `fitScore ≥ 50` AND `companyId` references a `Company` row where `hq_country='US'` AND `status='active'`, and the job's location passed the Spain filter.
    - Acceptance: SQL query `SELECT count(*) FROM job_opportunities jo JOIN companies c ON jo.company_id = c.id WHERE jo.fit_score >= 50 AND c.hq_country = 'US' AND c.status = 'active' AND jo.created_at > (now() - interval '14 days')` returns ≥ 5. **Best-effort metric** — see Known Risks.

## Boundaries

**In scope:**

- `Company` Prisma model (thin) with specified fields + enum + migration
- `UserJobSource.company_id` nullable FK
- `AtsPlatform` enum (greenhouse | lever | ashby | workable | workday | custom)
- Greenhouse adapter (JSON API)
- Lever adapter (JSON API)
- Ashby adapter (`__NEXT_DATA__` parse or POST fallback)
- Generic fallback (reuses existing cheerio flow for `ats_platform='custom'`)
- Ingestion dispatcher keyed on `Company.ats_platform`
- Fail-soft per-adapter isolation
- Strict Spain location filter (Spain/España/Madrid/Barcelona/Valencia substring match)
- Seed script (`prisma/seed-target-companies.ts`) + input JSON file (separate concern)
- CRUD UI at `/companies`
- CRUD API routes (`/api/companies`, `/api/companies/[id]`)
- Integration with existing scan-jobs cron (no changes to the cron itself; dispatcher changes flow through)
- Integration with existing `analyzeJobFitEnhanced()` fit-score pipeline (consumed as-is)

**Out of scope:**

- **Workable adapter** — optional per RQ-001; add only if seeding surfaces ≥5 Workable companies. Otherwise deferred to a later phase.
- **Workday adapter** — enterprise ATS, rare among SMB, JavaScript-heavy. Explicit v2 deferral (noted in docs "Future enhancements" as Puppeteer-based).
- **Automated company discovery engine** — v2 feature; trigger captured in `.planning/seeds/automated-discovery-engine.md`. v1 seeds are manual (Exa-assisted but build-time curation).
- **Multi-tenant target-company lists** — this is personal-scope; target companies are global (not per-user). Other users of the site will see the same list if they use the feature; that's acceptable for v1.
- **Profile-readiness pre-flight gate** — chose best-effort; if success metric fails, iterate. Means the `fitScore ≥ 50` test is confounded by profile quality — noted as Known Risk.
- **Cross-source deduplication** — if the same job is on both a target company's careers page and a legacy LinkedIn/RSS source, it may surface twice. `JobOpportunity.jobUrl` uniqueness prevents exact URL duplicates; cross-URL semantic dedupe is v2.
- **Per-site HTML scrapers for custom careers pages** — companies with `ats_platform='custom'` use the existing generic cheerio flow; no bespoke adapters per custom site.
- **Automatic SMB verification** — size_band is self-reported in the seed input; no automated company-size verification (Crunchbase API, LinkedIn employee count, etc.).
- **Automatic Spain-presence re-verification** — spain_presence_evidence is captured at seed time and not refreshed automatically. If a company stops hiring in Spain, no auto-retirement; manual via CRUD UI (set `status='paused'`).
- **Rate-limit tuning beyond sane defaults** — per-platform concrete throttle decisions happen in discuss-phase / plan-phase; the SPEC only locks that rate-limiting MUST exist per adapter.
- **Email/push alerts for high-fit Spain jobs** — v2 backlog.
- **Migration of existing free-form `JobOpportunity.company` strings to `company_id` FK** — no backfill; new ingestions via the adapter path get the FK, older rows remain string-only.
- **Workday/Recruitee/Personio/SmartRecruiters adapters** — not in the primary matrix; revisit in a future phase if seed list demands it.

## Constraints

- **API paths locked by RQ-001 findings**:
  - Greenhouse: `GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`
  - Lever: `GET https://api.lever.co/v0/postings/{slug}?mode=json`
  - Ashby: `GET https://jobs.ashbyhq.com/{slug}` parse `__NEXT_DATA__`, fallback `POST https://api.ashbyhq.com/posting-api/job-board/{slug}` with body `{"jobBoardName": "<slug>"}`.
- **Rate limiting per adapter**: Lever ≤ 1 request/sec (documented). Greenhouse + Ashby undocumented — default to ≤ 2 req/sec with exponential backoff on 429. Concrete config lives in discuss-phase, but "rate-limiting exists per adapter" is a hard constraint.
- **SMB 10–500 employees is a SOFT preference** — used only during build-time Exa research to prioritize candidates. Not enforced at ingestion; a company with `size_band='500-1000'` can still be seeded if it has strong Spain evidence.
- **Spain filter is STRICT** — only `Spain|España|Madrid|Barcelona|Valencia` (case-insensitive substring). EMEA / Remote / EU matches are NOT accepted. Known false-negative risk; accepted per user choice.
- **Fail-soft is mandatory** — no single adapter's failure may abort the scan-jobs cron.
- **NextAuth protection on all new API routes** — no anonymous CRUD.
- **Prisma migration must be reversible** — down-migration removes `company_id` FK, drops `companies` table, drops enum.
- **Seed script is idempotent** — re-running produces 0 changes on unchanged input.
- **No changes to the existing scan-jobs cron route** except adding the dispatcher call; the cron's auth gate, error shape, and schedule stay identical.
- **No schema changes to `JobOpportunity` table** in Phase 1 — `company` string stays; the new `company_id` linkage lives on `UserJobSource`. (A future v2 migration can normalize `JobOpportunity.company_id` if needed.)

## Acceptance Criteria

- [ ] `Company` Prisma model applied with all required fields + AtsPlatform enum; migration file checked in
- [ ] `UserJobSource.company_id` nullable FK exists and references `companies(id)` with `ON DELETE SET NULL`
- [ ] ≥ 100 `Company` rows seeded via `prisma/seed-target-companies.ts` from `prisma/seeds/target-companies.json`, each with valid `careers_url` and non-null `ats_platform`
- [ ] Greenhouse adapter unit test passes against a recorded fixture — emits ≥1 normalized `JobPosting` with `source='greenhouse'`
- [ ] Lever adapter unit test passes against a recorded fixture — emits ≥1 normalized `JobPosting` with `source='lever'`
- [ ] Ashby adapter unit test passes against a recorded fixture — emits ≥1 normalized `JobPosting` with `source='ashby'`
- [ ] Generic fallback path exercised by a `Company` with `ats_platform='custom'` + linked `UserJobSource.scrapeSelector` — produces ≥1 `JobOpportunity` from a mocked cheerio fixture
- [ ] Dispatcher routes by `Company.ats_platform` when `UserJobSource.company_id` is set; falls through to legacy `sourceType` dispatch when NULL
- [ ] Spain filter unit tests: `"Madrid, Spain"` passes, `"Paris, France"` fails, `"Remote — EMEA"` fails, `"MADRID"` passes, `""` fails
- [ ] One forced adapter failure does NOT abort the others in the same scan run (fail-soft test)
- [ ] `GET /api/companies` returns 401 when unauthenticated; returns 200 + list when authenticated
- [ ] `POST /api/companies` with valid body returns 201 + the new row; invalid body returns 400
- [ ] `PATCH /api/companies/[id]` updates existing rows; returns 404 on non-existent id
- [ ] `DELETE /api/companies/[id]` removes or soft-deletes the row per discuss-phase decision
- [ ] `/companies` page renders the table, form, and action buttons; end-to-end test covers create-edit-delete flow
- [ ] **SUCCESS METRIC (best-effort, 14 days post-merge)**: SQL query returns ≥5 `JobOpportunity` rows with `fit_score ≥ 50` joined to a `Company` with `hq_country='US'` and `status='active'`, where the job's location passed the Spain filter

## Known Risks (flagged for discuss-phase / plan-phase / verifier)

1. **Strict Spain filter + best-effort profile** — if the user's profile under-scores jobs (profile not fully populated), the 14-day success metric may fail for reasons orthogonal to Phase 1 quality. Accepted per user choice (Round 4). Verifier should distinguish "pipeline works but fit-score low" from "pipeline broken."
2. **Lever declining mindshare** — some companies in the seed may migrate off Lever during the 14-day window; stale `ats_slug` values cause silent 404s. Mitigated by adapter error logging + `status='paused'` toggle via CRUD UI.
3. **No Spain-presence re-verification** — companies that laid off their Spain team will still be scraped until manually paused. Acceptable for v1 given personal scope.
4. **Cross-source duplication** — if Dan's existing LinkedIn/RSS sources also surface the same job, it may appear twice. Accepted for v1.
5. **ATS slug accuracy** — the seed input requires correct `ats_slug` per company; typos cause whole-company silent failures. Adapter error logs surface this but don't auto-correct.

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                          |
|--------------------|-------|------|--------|------------------------------------------------|
| Goal Clarity       | 0.92  | 0.75 | ✓      | Measurable success metric; risks acknowledged  |
| Boundary Clarity   | 0.92  | 0.70 | ✓      | Explicit in/out lists; 12 out-of-scope items   |
| Constraint Clarity | 0.82  | 0.65 | ✓      | API paths, rate limits, Spain filter locked    |
| Acceptance Criteria| 0.85  | 0.70 | ✓      | 15 pass/fail criteria, each binary             |
| **Ambiguity**      | 0.11  | ≤0.20| ✓      |                                                |

## Interview Log

| Round | Perspective        | Question summary                                | Decision locked                                                                                                  |
|-------|--------------------|-------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| 1     | Researcher+Bndry   | First-class Company model?                      | Hybrid — thin `Company` model (id, name, careers_url, ats_platform + minimal metadata); unlocks v2 cleanly        |
| 1     | Researcher+Bndry   | Phase 1 ↔ Phase 2 sequencing?                   | Merge Phase 1 + Phase 2 — single phase delivers seed + Greenhouse/Lever/Ashby + generic fallback                  |
| 2     | Simplifier+Bndry   | V1 UI for target companies?                     | Full CRUD UI — /companies page with add/edit/delete/disable (expanded from "admin only" default)                  |
| 2     | Simplifier+Bndry   | SMB definition?                                 | 10–500 employees, SOFT preference (drives Exa ranking during seed; not a hard ingestion filter)                   |
| 3     | Boundary Keeper    | Spain-presence evidence standard?               | Either manual or careers-page evidence accepted; source tracked in schema (`spain_presence_evidence` enum + URL)  |
| 3     | Boundary Keeper    | When does a company count as "seeded"?          | Minimal: row exists + careers_url + ats_platform declared. Decoupled from adapter reliability                     |
| 4     | Failure Analyst    | Profile-readiness pre-flight gate?              | Best-effort, iterate. No gate. Accept risk that 14-day metric could fail due to profile quality                   |
| 4     | Failure Analyst    | Spain location filter strictness?               | STRICT — only Spain/España/Madrid/Barcelona/Valencia substring match. Known false-negative risk accepted         |

---

*Phase: 01-target-company-pipeline-us-spain-bridge*
*Spec created: 2026-04-23*
*Next step: /gsd:discuss-phase 1 — implementation decisions (rate-limit config, hard vs soft delete on CRUD, migration rollout sequencing, adapter error-log format, seed input file schema, etc.)*
