# Research Questions

Open questions that need deeper investigation. Each entry: question + context + when answer is needed.

---

## RQ-001: ATS landscape for US SMB tech companies hiring in Spain

**Question**: What ATS platforms do US-headquartered SMB tech companies actually use for engineering / remote roles, in what rough proportions, and what is the most reliable job-ingestion path per platform?

**Context**: Feature "Target Company Pipeline" (see `notes/target-company-pipeline.md`) seeds ~100 company careers pages as `UserJobSource` records for continuous scraping. Generic CSS-selector scraping will not work reliably across 100 heterogeneous careers pages. Known platforms with public JSON APIs: Greenhouse, Lever, Ashby, Workable. Workday is JavaScript-heavy. Custom pages require per-site adapters.

**Needed by**: Before `spec-phase` / `plan-phase` for the Target Company Pipeline feature. Answer shapes the ingestion architecture — specifically whether to introduce platform-specific adapters (Greenhouse / Lever / Ashby / Workable / Workday / generic fallback) or trust `UserJobSource.scrapeSelector` across the board.

**Suggested approach**: Exa + web search. Sample 30–50 SMB US tech companies that publicly employ in Spain, record the ATS platform each uses, confirm API availability / structure for each. Report proportions and a recommended adapter matrix.

**Raised**: 2026-04-23 (explore session)
