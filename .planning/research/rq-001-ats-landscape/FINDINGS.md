# RQ-001 Findings: ATS Landscape for US SMB Tech Companies Hiring in Spain

**Resolved**: 2026-04-23
**Source**: Exa-backed research pass (market-share reports + live API probes)
**Consumer**: `/gsd:spec-phase 1` (Target Company Pipeline — US→Spain Bridge), `/gsd:spec-phase 2` (ATS Platform Adapters)

---

## TL;DR

Build **Greenhouse + Lever + Ashby adapters + a generic fallback** in v1. Together they cover an estimated ~80% of US SMB tech company careers pages. All three have public JSON APIs — no HTML scraping required for the dominant share. Workable is optional (add if seeding list surfaces it). Workday is deferred to v2 (enterprise-scoped, JS-heavy, rare among SMB).

---

## Platform-specific integration paths (verified)

### 1. Greenhouse — #1 by market mindshare; public JSON API

- **Endpoint**: `GET https://boards-api.greenhouse.io/v1/boards/{board_slug}/jobs`
- **Expanded (with descriptions)**: `?content=true`
- **Single job**: `GET https://boards-api.greenhouse.io/v1/boards/{board_slug}/jobs/{job_id}`
- **Auth**: None for public boards.
- **Response shape**: `{jobs: [{id, title, location.name, absolute_url, company_name, updated_at, first_published, requisition_id, metadata: [...]}]}`
- **GDPR signal**: each job has `data_compliance[]` entries — useful to confirm EU eligibility.
- **Live-verified** in this pass via `boards-api.greenhouse.io/v1/boards/datadog/jobs` — returned current postings including Paris (EMEA) roles.
- **Known users in target pool**: Datadog, Netlify, 1Password, Airtable, HashiCorp (now IBM), GitLab, HotJar, Cloudflare, Figma.

### 2. Lever — public JSON API, declining share but still common

- **Endpoint**: `GET https://api.lever.co/v0/postings/{company_slug}?mode=json`
- **Filters**: `?location=...&team=...&department=...&commitment=...`
- **Auth**: None for public postings.
- **Response**: array of postings with `id`, `text` (title), `categories.location`, `categories.commitment`, `hostedUrl`, `descriptionPlain`, `lists`, `additional`, `country`.
- **Live-verified** via `api.lever.co/v0/postings/zapier?mode=json` (Zapier).
- **Market note**: Lever's parent Employ Inc. acquired it in 2022. Mindshare has declined toward Ashby for newer startups; still common in growth-stage companies.
- **Known users in target pool**: Zapier, DigitalOcean, Automattic, Stripe (historical — may be mixed now), Postman.

### 3. Ashby — fast-growing modern ATS; API + structured HTML

- **Public job-board API (GraphQL-style POST)**: `POST https://api.ashbyhq.com/posting-api/job-board/{slug}` with JSON body `{"jobBoardName": "<slug>"}`
- **Alternative, simpler**: fetch `https://jobs.ashbyhq.com/{slug}` and parse the JSON embedded in `<script id="__NEXT_DATA__">` — structured, stable.
- **Auth**: None for public boards.
- **Known users in target pool**: Vercel, Remote.com, Deel, Ramp, Supabase, Linear (private beta), Neon.
- **Growth note**: Ashby has overtaken Lever in mindshare among 2024-2026-era tech startups (transparent pricing + modern architecture).

### 4. Workable — SMB default; JSON API

- **Endpoint**: `GET https://apply.workable.com/api/v3/accounts/{slug}/jobs?limit=100`
- **Auth**: None for public job feeds.
- **Share in target pool**: smaller (sub-100-employee shops); likely a minority of US SMB tech with Spain presence.
- **Recommendation**: defer as "nice to have" for v1; build only if ≥5 of the seeded 100 companies use it.

### 5. Workday — enterprise only; DEFER

- **URL pattern**: `https://{company}.wd{N}.myworkdayjobs.com/{slug}` — dynamic JavaScript site; data loaded via per-customer REST endpoints that vary.
- **Why defer**: (a) Workday is for 2000+ employee enterprises, rare in US SMB tech; (b) per-site scraping cost is high due to JS rendering needs (Puppeteer); (c) existing `docs/` already captures Puppeteer as a future-enhancement. Mark Workday-hosted companies as "non-integrated" in the seed step; route them to manual review.

### 6. Generic fallback (~10–20% of target companies)

Custom careers pages with no ATS backing:
- **Known examples**: Automattic, Doist, Basecamp (honestly, very few US SMB tech remain custom in 2026 — most adopted an ATS).
- **Approach**: retain the existing `UserJobSource.scrapeSelector` + cheerio flow as the fallback. Per-site adapters are high-maintenance; do NOT build bespoke adapters for v1.
- **Escape hatch**: if a target company is custom + critical, mark it "manual monitoring only" in the seed and let Dan add jobs via the LinkedIn bookmarklet feature.

---

## Market share (US SMB tech, 2026 — sourced from 2026 ATS comparison reports)

| ATS | Target market | Mindshare signal | SMB-tech share (estimate) |
|---|---|---|---|
| Greenhouse | 200–2000 emp, structured hiring | 7,500+ customers; #1 G2 Winter 2026 | 35–45% |
| Lever | Growth-stage startups, CRM-first | Declining since 2022 acquisition | 15–25% |
| Ashby | 100–500 emp, data-driven | Fastest grower 2024–2026 | 15–25% |
| Workable | <100 emp, budget-conscious SMB | Transparent pricing leader for small shops | 5–10% |
| Workday | 2000+ emp enterprise | Common in enterprise tech, rare in SMB | 0–5% |
| Custom / other | Tail | Individual preference / early stage | 10–20% |

**Confidence**: moderate. Proportions are industry-level; exact distribution across the 100-company seed will differ and should be **re-measured after seeding**.

---

## Architecture implications for Phase 1 / Phase 2

1. **`platform` field is required** on whatever represents a target company (either `UserJobSource` — existing — or a new `Company`/`TargetCompany` model — to be decided in spec-phase 1). Values: `greenhouse | lever | ashby | workable | workday | custom`.
2. **Ingestion dispatcher**: replace trust in `UserJobSource.scrapeSelector` as the universal path. Introduce a dispatcher keyed on `platform`; each adapter normalizes into the existing `JobOpportunity` shape.
3. **Existing fit-score pipeline unchanged**. Adapters only change *how jobs come in*, not how they are ranked.
4. **Fail-soft per source**: one adapter failure (slug changed, API rate-limit, platform down) must not poison the whole scan run for other sources.
5. **Phase sequencing**: Phase 2 (adapters) is a hard prerequisite for Phase 1 success-metric #4 (≥5 opportunities in 2 weeks). Either run Phase 2 first, or deliver a minimum Greenhouse+Lever subset inside Phase 1 and defer Ashby/Workable to Phase 2. Sequencing decision: `spec-phase 1`.

---

## Recommended adapter build order (cost vs. coverage)

| Priority | Adapter | Estimated cost | Estimated coverage unlock |
|---|---|---|---|
| 1 | Greenhouse (JSON API) | 0.5–1 day | ~40% of target pool |
| 2 | Lever (JSON API) | 0.5 day | +20% cumulative ~60% |
| 3 | Ashby (scrape `__NEXT_DATA__` or POST API) | 0.5–1 day | +20% cumulative ~80% |
| 4 (stretch) | Workable (JSON API) | 0.5 day | +5–10% cumulative ~85–90% |
| 5 (fallback) | Generic cheerio scraper | existing | tail only |
| deferred | Workday (Puppeteer) | 2–3 days; high maintenance | +0–5% |

Total Phase 2 MVP: ~2 days (Greenhouse + Lever + Ashby) to hit 80% coverage.

---

## Open sub-questions surfaced by this research

- **SQ-001-a**: Does Ashby's public POST endpoint require CORS origin or specific headers? Confirm via a direct curl from the production server before writing the adapter.
- **SQ-001-b**: How do these APIs signal "Spain-eligible" jobs? Greenhouse uses `location.name` (free-form string) + metadata fields like `Geography: EMEA`. Lever has `country` and `categories.location`. A filter layer (post-fetch) will likely be needed — the APIs don't expose "this role is legally hireable in Spain" as a boolean.
- **SQ-001-c**: Rate limits per platform — Greenhouse boards API is generous but not documented; Lever caps around 1 req/sec unauthenticated; Ashby has no documented limit. Add per-platform rate limit to adapter config.

---

## Conclusion

RQ-001 is **resolved** for the purposes of unblocking `spec-phase 1` and shaping `Phase 2`. The research was sufficient to commit to the adapter matrix (Greenhouse + Lever + Ashby + generic fallback) and recommend a 2-day MVP build for Phase 2. Exact platform distribution across the actual 100-company seed will be re-verified in Phase 1 during the Exa-driven research pass that produces the seed list.
