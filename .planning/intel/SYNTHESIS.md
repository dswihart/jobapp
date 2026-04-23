# Synthesis Summary

Entry point for downstream consumers of the `/gsd-ingest-docs` intel, produced by `gsd-doc-synthesizer`.

## Input shape

- Classifications consumed: 20 files from `/Users/dan/code/jobapp/.planning/intel/classifications/`
- Type breakdown:
  - ADR: 0
  - SPEC: 0
  - PRD: 0
  - DOC: 20
  - UNKNOWN: 0
- Confidence breakdown:
  - high: 19
  - medium: 1 (`JOB_TRACKER_DOCUMENTATION.md` — synthesizer notes record deliberate DOC classification over SPEC because content is descriptive/observational rather than prescriptive contracts)
  - low: 0
- Mode: `new` (bootstrap; no existing `.planning/` to merge against)
- Precedence: default `["ADR", "SPEC", "PRD", "DOC"]` — no per-doc overrides

## Cross-ref graph

- Cycle detection: run. No cycles detected. Docs form a DAG rooted at top-level `README.md` and `docs/README.md`.
- Max traversal depth reached: well below the 50 cap.

## Synthesized output

- Decisions locked: **0** (no ADRs). Implicit technology/product choices captured descriptively in `decisions.md` as candidates for future ADRs via `/gsd-decide`.
- Requirements extracted: **27** (REQ-* entries, all derived from DOC descriptions, not PRD acceptance criteria — see `requirements.md` for IDs)
- Constraints: **17** (api-contract: 5; schema: 5; nfr: 5; protocol: 2)
- Context topics: **13** (identity, architecture, deployment topology, dev timeline, AI matching, job discovery pipeline, user accounts, bookmarklet, customization patterns, DB models, known issues, future enhancements, deployment pipeline)

## Conflicts summary

- BLOCKERS: **0**
- WARNINGS: **4**
  - W-1: Competing fit-score algorithm weights (old 60/40 vs. enhanced 6-component)
  - W-2: Divergent auto-archiving schedules (/api/cron/archive-jobs 2AM/30d vs. /api/cron/archive-old-jobs hourly/45d)
  - W-3: Default `minFitScore` conflicts (40 vs. 50)
  - W-4: Deployment target drift (IP 46.62.205.150 vs. domain jobapp.aigrowise.com)
- INFO: **3**
  - I-1: No cross-reference cycles
  - I-2: Source count drift explained by migration timeline
  - I-3: autoScan default change is a documented evolution, not a conflict

See `/Users/dan/code/jobapp/.planning/INGEST-CONFLICTS.md` for full detail and recommended actions.

## Intel file index

Downstream consumers (especially `gsd-roadmapper`) should read these in this order:

1. `/Users/dan/code/jobapp/.planning/intel/SYNTHESIS.md` (this file)
2. `/Users/dan/code/jobapp/.planning/INGEST-CONFLICTS.md` — review WARNINGS and resolve W-1..W-4 before routing
3. `/Users/dan/code/jobapp/.planning/intel/decisions.md` — empty for locked decisions; lists implicit technology choices
4. `/Users/dan/code/jobapp/.planning/intel/requirements.md` — 27 REQ-* descriptions
5. `/Users/dan/code/jobapp/.planning/intel/constraints.md` — 17 constraints across api-contract/schema/nfr/protocol
6. `/Users/dan/code/jobapp/.planning/intel/context.md` — running topic notes

## Gate status

Because there are WARNINGS (no BLOCKERS), the doc-conflict-engine gate requires user approval before routing to the roadmapper. Recommended resolutions: (1) run `/gsd-decide` on W-1 and W-2 to promote the canonical choices to ADR, (2) reconcile W-3 by inspecting `prisma/schema.prisma` + `src/lib/job-monitor.ts` and emitting the canonical value, (3) on W-4, mark `DEPLOYMENT.md` + `DEPLOYMENT_SUMMARY.md` as historical or update them to reflect the aigrowise.com deployment.
