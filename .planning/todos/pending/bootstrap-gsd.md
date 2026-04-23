---
title: Bootstrap GSD (.planning/) for jobapp
date: 2026-04-23
priority: high
---

# Bootstrap GSD for jobapp

The `jobapp` repo (fresh clone at `/Users/dan/code/jobapp`) has no `PROJECT.md`, no `ROADMAP.md`, no `REQUIREMENTS.md`. Only this minimal `.planning/` skeleton created during the explore session. GSD phase-oriented commands (`/gsd:spec-phase`, `/gsd:plan-phase`, `/gsd:add-phase`, `/gsd:execute-phase`, etc.) all require the full structure to exist.

## Two viable paths

**Option A — `/gsd:ingest-docs`**: repo already has `docs/`, `README.md`, `CHANGELOG.md`, `SITE_DOCUMENTATION.md`, `DEPLOYMENT.md`, `AUTO_ARCHIVE_README.md`, `CRON_SETUP.md`, `GITHUB_SETUP.md`, `DEPLOYMENT_SUMMARY.md`, `PUSH_TO_GITHUB.md`. The ingest-docs workflow classifies existing docs as ADR/PRD/SPEC/DOC and synthesizes a starting `.planning/`. Faster, preserves existing context, likely the right choice.

**Option B — `/gsd:new-project`**: full initialize-from-scratch workflow with deep context gathering and research. Slower, would duplicate / override project understanding that already lives in the repo's docs.

Recommendation: **A** (`/gsd:ingest-docs`).

## Why this is blocking

Until `.planning/PROJECT.md` and `.planning/ROADMAP.md` exist, the Target Company Pipeline feature (see `notes/target-company-pipeline.md`) can only live as exploration notes — not as a proper GSD phase with spec, plan, and execution trail.

## Next step after bootstrap

1. `/gsd:add-phase` — append "Target Company Pipeline (US→Spain Bridge)" as the next phase on the roadmap, referencing `notes/target-company-pipeline.md` as context.
2. `/gsd:spec-phase` — resolve open questions from the note (SMB definition, first-class Company model yes/no, scope of user-facing UI in v1).
3. Resolve `RQ-001` (ATS landscape) via an Exa-backed research pass.
4. `/gsd:plan-phase`.
5. `/gsd:execute-phase`.
