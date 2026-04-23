# Research Questions

Open questions that need deeper investigation. Each entry: question + context + when answer is needed.

---

## RQ-001: ATS landscape for US SMB tech companies hiring in Spain ✓ RESOLVED

**Status**: RESOLVED 2026-04-23 — see `rq-001-ats-landscape/FINDINGS.md` for the full answer.

**Question**: What ATS platforms do US-headquartered SMB tech companies actually use for engineering / remote roles, in what rough proportions, and what is the most reliable job-ingestion path per platform?

**Answer (TL;DR)**: Build **Greenhouse + Lever + Ashby adapters + a generic fallback** in v1 — covers ~80% of US SMB tech careers pages. All three have public JSON APIs (no HTML scraping required for the dominant share). Workable is optional. Workday is deferred to v2.

**Estimated share across US SMB tech (100–2000 emp)**:
- Greenhouse ~35–45% (public JSON API verified live: `boards-api.greenhouse.io/v1/boards/{slug}/jobs`)
- Lever ~15–25% (public JSON API: `api.lever.co/v0/postings/{slug}?mode=json`)
- Ashby ~15–25% (JSON-in-`__NEXT_DATA__` on `jobs.ashbyhq.com/{slug}` OR POST `api.ashbyhq.com/posting-api/job-board/{slug}`)
- Workable ~5–10% (`apply.workable.com/api/v3/accounts/{slug}/jobs`)
- Workday ~0–5% (enterprise; defer)
- Custom / other ~10–20% (generic fallback via existing `UserJobSource.scrapeSelector`)

**Architectural recommendation**: add a `platform` field on the target-company record (new `Company` model OR existing `UserJobSource` — decision in spec-phase 1); dispatch ingestion by platform; each adapter normalizes into the existing `JobOpportunity` shape; fit-score pipeline unchanged.

**Recommended adapter build order** (~2-day Phase 2 MVP): Greenhouse → Lever → Ashby → (Workable stretch) → generic fallback.

**Sub-questions raised by this research** (carried forward, non-blocking):
- SQ-001-a: Does Ashby's public POST endpoint require specific headers or an origin? Confirm via curl before writing the adapter.
- SQ-001-b: APIs don't expose "Spain-eligible" as a boolean — filter layer post-fetch on `location`/`country` + job text.
- SQ-001-c: Rate limits — Lever ~1 req/sec unauthenticated; Greenhouse undocumented; Ashby undocumented. Per-platform throttle config in the adapter.

**Context**: Feature "Target Company Pipeline" (see `notes/target-company-pipeline.md`) seeds ~100 company careers pages for continuous scraping. Generic CSS-selector scraping would not work reliably across 100 heterogeneous careers pages. This research confirmed platform-specific adapters are the right architecture.

**Raised**: 2026-04-23 (explore session)
**Resolved**: 2026-04-23 (Exa research pass) — full findings in `rq-001-ats-landscape/FINDINGS.md`
