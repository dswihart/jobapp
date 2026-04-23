## Conflict Detection Report

### BLOCKERS (0)

(None. All 20 inputs were DOC-type with no locked decisions, so no LOCKED-vs-LOCKED or LOCKED-vs-existing contradictions are possible from this ingest.)

### WARNINGS (4)

[WARNING] W-1: Competing job-fit-score algorithm weights across DOCs
  Found: Two different scoring formulas are documented for the same subsystem (`src/lib/ai-service.ts` `analyzeJobFitEnhanced()`).
    - "Old basic" algorithm — `Overall = SkillMatch*0.6 + ExperienceMatch*0.4` — source: `docs/HOW_TO_ADD_JOB_SOURCES.md`, `docs/JOB_BOARD_CUSTOMIZATION_GUIDE.md`, `docs/QUICK_ADD_SOURCE.md`, `docs/CUSTOMIZATION_QUICK_START.md`, `docs/REMOTIVE_INTEGRATION_SUCCESS.md`
    - "Enhanced" algorithm — `Overall = Skill*0.35 + Experience*0.25 + Seniority*0.15 + Title*0.15 + Industry*0.05 + Location*0.05` — source: `docs/ENHANCED_MATCHING_GUIDE.md`, `docs/JOB_TRACKER_DOCUMENTATION.md`
  Impact: Downstream roadmapper / routing may implement whichever weights appear first, losing the intent that the enhanced algorithm supersedes the basic one. The "old" references also carry runnable instructions ("edit line 149 of ai-service.ts") that would regress the system if followed.
  → User must explicitly declare the enhanced 6-component formula as the current truth (and mark the 60/40 references as historical), or split into REQ-fit-score-v1 and REQ-fit-score-v2 with explicit status. Recommended: record as an ADR via `/gsd-decide`.

[WARNING] W-2: Divergent auto-archiving schedules and semantics
  Found: Two incompatible archiving regimes documented:
    - `AUTO_ARCHIVE_README.md` (2025-11-16): endpoint `/api/cron/archive-jobs`; daily at 2 AM; archives **all** applications older than 30 days to ARCHIVED; log file `/var/log/job-tracker-archive.log`; script `/opt/job-tracker/scripts/run-archive-cron.sh`.
    - `CRON_SETUP.md`: endpoint `/api/cron/archive-old-jobs`; **every hour** at minute 0; archives only REJECTED and DRAFT applications older than **45 days**.
  Impact: These are two different scheduled jobs with different URLs, thresholds, and eligibility rules. If both are active they over-archive; if only one exists, the docs disagree on which. Downstream routing cannot pick without losing intent.
  → User must resolve: which endpoint and schedule is the current truth? One candidate resolution: keep the broader `/api/cron/archive-jobs` (30-day, daily, all statuses) and retire `/api/cron/archive-old-jobs`, or vice versa. Whichever wins should become REQ-archiving-cron with explicit acceptance criteria. Lock the decision via ADR.

[WARNING] W-3: Default `minFitScore` conflicts across DOCs
  Found: Two default values for the same schema field (`User.minFitScore`):
    - `40` — source: `docs/JOB_TRACKER_DOCUMENTATION.md` ("default 40"), `docs/job-scanning-fix-20251022.md` ("minFitScore from 40...")
    - `50` — source: `docs/JOB_BOARD_CUSTOMIZATION_GUIDE.md`, `docs/HOW_TO_ADD_JOB_SOURCES.md`, `docs/QUICK_ADD_SOURCE.md`, `docs/CUSTOMIZATION_QUICK_START.md`, `docs/REMOTIVE_INTEGRATION_SUCCESS.md` ("≥50%", "line 56 of job-monitor.ts")
  Impact: Pipeline documentation says 50% is the threshold embedded in `job-monitor.ts` line 56, while the schema and newer documentation say 40. Cannot tell whether this is a schema vs. runtime mismatch (the schema default could be 40 while the code guard is hardcoded 50) or simply drift.
  → User must confirm the canonical default. If the schema default is 40 but the code still has a hardcoded `>= 50`, that is a bug that should be surfaced as REQ-fit-score-default with a single value. Recommend reading `prisma/schema.prisma` and `src/lib/job-monitor.ts` line ~56 to establish ground truth before routing.

[WARNING] W-4: Deployment target drift (IP vs. domain)
  Found: Older docs reference `46.62.205.150:3000` as the production target:
    - `DEPLOYMENT.md` ("Production Deployment to 46.62.205.150"), `DEPLOYMENT_SUMMARY.md` ("Target Server: 46.62.205.150, Port: 3000, URL: http://46.62.205.150:3000").
    Newer docs reference `jobapp.aigrowise.com` (DigitalOcean Droplet, Helsinki hel1) as the current production target with SSL:
    - `docs/JOB_TRACKER_DOCUMENTATION.md`, `docs/README.md`, `SITE_DOCUMENTATION.md`, `AUTO_ARCHIVE_README.md`, `docs/LINKEDIN-BOOKMARKLET.md` (URL `https://jobapp.aigrowise.com`), `docs/CUSTOMIZATION_QUICK_START.md` (SSH port 2222).
  Impact: Downstream roadmap or deployment tasks could target the stale IP. The older docs also describe Docker and Vercel paths that are not the current reality.
  → User should confirm `jobapp.aigrowise.com` is the single current target and mark `DEPLOYMENT.md` + `DEPLOYMENT_SUMMARY.md` as historical, or update them before routing. The newer docs also report Next.js is running in **development mode** (`npm run dev`) rather than a production build — this deserves its own decision.

### INFO (3)

[INFO] I-1: No cross-reference cycles detected
  Note: Cross-ref graph built from 20 classifications was traversed (DFS, max depth 50). No cycles present. Docs form a DAG rooted at `README.md` and `docs/README.md`. Traversal depth cap not reached.

[INFO] I-2: Job source count drift is explained, not a conflict
  Note: `docs/JOB_TRACKER_DOCUMENTATION.md` says "20+ pre-configured job sources"; `docs/DEVELOPMENT-SESSION-SUMMARY.md` says Philippe has 30 and Daniel has 29 sources. The 30/29 counts reflect state **after** the 2025-10-22 migration of 19 hardcoded sources to the database plus user-added sources. Not a contradiction — a before/after snapshot. No action needed.

[INFO] I-3: autoScan default change is documented as an evolution
  Note: `docs/job-scanning-fix-20251022.md` and `docs/DEVELOPMENT-SESSION-SUMMARY.md` both state that the Prisma schema default for `autoScan` was changed from `false` to `true` on 2025-10-22, with registration explicitly setting `autoScan: true` and a DB `ALTER TABLE` applied. These two docs agree and describe the same fix. Precedence rules did not need to be applied. No action needed.

---

## Notes on bucket population

- This ingest contains no ADRs, SPECs, or PRDs. The maximum possible severity from this set is WARNING (there are no locked decisions to contradict).
- No auto-resolved precedence decisions were made, because all sources are the same precedence level (DOC). Where DOCs contradict, the contradictions surface as WARNING rather than being silently merged — preserving user intent in line with the precedence policy for same-level sources.
- No entries were dropped for UNKNOWN classification confidence. One classification was `medium` confidence (`JOB_TRACKER_DOCUMENTATION.md`) with explicit synthesizer-notes indicating DOC was chosen over SPEC because the content is descriptive/observational. This is not a BLOCKER; it is flagged here as transparency.
