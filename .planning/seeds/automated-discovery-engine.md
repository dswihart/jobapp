---
title: Automated Discovery Engine for Target Companies
trigger_condition: Initial 100 target companies are live in the opportunities feed, producing useful ranked results, and the user wants to grow the list without manual research
planted_date: 2026-04-23
---

# Seed: Automated Discovery Engine for Target Companies

## What this is

v2 of the Target Company Pipeline. Where v1 seeds 100 manually-researched companies, v2 runs a recurring Exa-driven search that discovers additional matching companies and queues them for review.

## Trigger conditions (any of)

- Initial 100 companies are live and producing useful fit-scored opportunities
- User wants to widen the funnel beyond the initial seed list
- Manual maintenance of the target list becomes painful (companies drift out of "still hiring in Spain" state, new matches emerge)

## Rough shape (refine when triggered)

- Scheduled job (daily/weekly) queries Exa with tuned semantic prompts for "US-HQ SMB tech company hiring in Spain"
- Candidates filtered against negative list, existing target list, and hard criteria (US HQ, SMB size band, Spain-presence signal)
- New candidates land in a `target_company_candidates` review queue
- User approves/rejects — approved ones are converted to `UserJobSource` records automatically

## Why seed, not build now

- v1 delivers shippable value this week; v2 requires v1 to be validated first
- Discovery pipeline design benefits from seeing what "good" vs. "bad" candidates actually look like in practice, which requires v1 to be running
- v2 is a significantly larger engineering effort (Exa budget, duplicate detection, ranking, review UI) — not worth it if v1 doesn't pay off

## Schema scaffolding v1 should leave room for

- A first-class `Company` / `TargetCompany` model (not just string on `JobOpportunity`)
- Per-company metadata: HQ country, size band, Spain-presence evidence, ATS platform, status (active / paused / rejected)
- A way to record "discovery source" (manual vs. Exa-automated) for audit
- A candidate-review state (pending / approved / rejected) that v2 can adopt without migration churn
