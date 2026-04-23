---
title: Target Company Pipeline — US→Spain Bridge
date: 2026-04-23
context: Outcome of /gsd:explore session. Captures the decisions that shape the feature before it becomes a formal phase. Use as the `why` document for spec-phase / plan-phase.
---

# Target Company Pipeline — US→Spain Bridge

Outcome of `/gsd:explore` session, 2026-04-23.

## Real goal (not what the request literally said)

A personal job-hunt pipeline. Surface openings at US-headquartered SMB tech companies that are *already operationally/legally set up to hire Spain-based talent*. "Has employees in Spain" is a proxy signal for "can actually hire me from Spain" — not a generic directory filter.

## Feature shape

1. **Seed** ~100 `UserJobSource` records, one per target company (careers page / ATS feed).
2. **Existing scraper** pulls their openings into `JobOpportunity`.
3. **Existing `fitScore`** ranks them against the user's profile.
4. **User** reviews top-ranked openings in the opportunities feed. Set-and-forget.

Continuous scraping is the chosen ongoing behavior (option `a` from explore). Not a one-time snapshot. Not a manual refresh button.

## Sourcing strategy (hybrid)

Option `c` from explore — hybrid:

- **Now**: Exa-driven research pass produces the initial 100 vetted companies. This is *build-time* work (one-off), not a product capability.
- **Later**: Schema and scaffolding are designed so a recurring Exa-driven discovery engine can plug in without rework. See seed `automated-discovery-engine.md`.

## Biggest known risk

Careers-page heterogeneity. Generic CSS-selector scraping will not work reliably across 100 different sites. SMB tech companies typically use ATS platforms:

- **Greenhouse** — public JSON API (`boards-api.greenhouse.io/v1/boards/{slug}/jobs`)
- **Lever** — public JSON API (`api.lever.co/v0/postings/{slug}`)
- **Ashby** — JSON endpoint per company
- **Workable** — JSON feed available
- **Workday** — JavaScript-heavy, harder to scrape reliably
- **SmartRecruiters, Recruitee, Personio** — vary
- **Custom pages** — CSS-selector scraping, per-site adapter needed

Ingestion architecture should probably introduce **platform-specific adapters** rather than trusting generic `UserJobSource.scrapeSelector` config across all 100. Open research question captured (RQ-001).

## Schema implication (to decide in spec-phase)

Current schema stores `JobOpportunity.company` as a plain string. For this feature, the target-companies concept is richer: HQ country, SMB size band, Spain-presence signal, ATS platform, careers URL, last-scraped-at, "still qualifies" flag.

**Open question for spec-phase**: introduce a first-class `Company` / `TargetCompany` model, or tag companies via another mechanism? A first-class model unlocks the future discovery engine cleanly.

## What "SMB" means (unresolved)

Not pinned down in explore. Placeholder definition: **10–500 employees total**, with at least one Spain-based employee verifiable via public signal (LinkedIn presence, job postings tagged "Spain" / "Madrid" / "Barcelona" / "Remote — EU", public "hiring in Spain" statement, etc.). Confirm in spec-phase.

## What "qualified for" means

Delegated to existing `User.fitScore` / `JobOpportunity.fitScore` logic. This feature does not re-implement ranking. User's profile must be populated well enough for fitScore to be meaningful — verify before seeding to avoid drowning in low-relevance openings.

## Explicit non-goals (v1)

- Not building a multi-tenant "target companies" directory for other users of the site. This is personal-scope.
- Not replacing the existing scraper. Extending it, not rewriting it.
- Not building auto-discovery in v1. That is a seeded future phase (`seeds/automated-discovery-engine.md`).
- Not building user-facing UI for managing the target list in v1 unless cheap to include — admin/seed-script access is enough to start.
