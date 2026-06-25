# Current Status - March 7, 2026

## Scope

This document summarizes the current engineering state of the Job Tracker application after the March 7, 2026 review and follow-up fixes.

## Repository State

- Repository path: `/opt/job-tracker`
- Branch: `master`
- Remote tracking: `origin/master`
- Local branch status at time of writing: ahead with local commits and additional uncommitted work in progress
- Review target: live server deployment source on `jobapp.aigrowise.com:2222`

## Completed Since Review

### Security hardening shipped

Committed in `75d464c` (`security: enforce auth and ownership on API routes`):

- Added centralized API auth helpers.
- Locked down admin and user-management endpoints.
- Removed caller-controlled `userId` trust from profile and settings flows.
- Scoped contacts, stats, and application routes to the authenticated user.
- Added ownership checks to application creation from job opportunities.
- Restricted global stats access to admin users.

### Documentation shipped

Committed in `2d07bb9` (`docs: add review remediation and API contract guidance`):

- Added remediation checklist from review findings.
- Added API response contract guidance.
- Linked the new docs from the main README and docs index.

### UI and state-handling regression fixes shipped

Committed in `6324cf2` (`fix: restore opportunity UI state handling`):

- Fixed applied-job state loading in the opportunities UI.
- Moved `JobDetailModal` job-sync state resets out of render and into `useEffect`.
- Fixed the `scan-now` error path so failures no longer trigger a second exception.
- Cleaned touched files to pass targeted ESLint checks.

## Current Validation State

### Verified

- `npm run build` passes on the server.
- Targeted ESLint passes for:
  - `src/components/JobOpportunities.tsx`
  - `src/components/JobDetailModal.tsx`
  - `src/app/api/scan-now/route.ts`
- The earlier `user: true` data exposure issue is no longer present in active application/contact routes.

### Still open

- Production build still skips TypeScript validation.
- Production build still skips full ESLint enforcement.
- Repo-wide lint still has existing failures outside the latest regression-fix scope.
- There are still uncommitted working-tree changes in unrelated files.

## Highest Priority Remaining Risks

### P0 security issues still open

These were identified in the full application review and were not part of commit `6324cf2`:

1. Unauthenticated source-management endpoints can write files, toggle sources, delete source files, and trigger rebuild/restart behavior.
2. Unauthenticated alert, follow-up, interview, and interview-schedule endpoints still trust caller-controlled identifiers or object IDs.
3. `POST /api/ai/parse-job-url` remains an unauthenticated arbitrary-fetch and high-cost compute endpoint.
4. Cron/archive endpoints remain remotely triggerable, and the cron scan endpoint falls back to a predictable default secret if `CRON_SECRET` is unset.

### P1 engineering issues still open

1. Build gating remains disabled in `next.config.ts`.
2. Repo-wide lint debt remains, including files outside the active fix scope.
3. Current worktree includes unrelated modified files that should be reviewed before the next commit batch.

## Files Still Modified After Latest Commit

At the time this status document was written, the following files remained modified and uncommitted:

- `src/app/api/opportunities/[id]/fetch-full/route.ts`
- `src/app/api/settings/route.ts`
- `src/app/api/stats/sources/route.ts`
- `src/lib/ai-service.ts`
- `src/lib/job-monitor.ts`

These are not covered by commit `6324cf2` and should be reviewed independently before commit or deploy.

## Recommended Next Actions

1. Lock down the remaining unauthenticated mutation and reporting endpoints.
2. Remove default-secret behavior from cron routes and require explicit configuration.
3. Re-enable lint/type build gating only after clearing the existing repo-wide failures.
4. Review and either commit or discard the remaining uncommitted files deliberately.

## Related Documents

- `docs/CODE_REVIEW_ACTIONS_2026-03-07.md`
- `docs/API_RESPONSE_CONTRACTS.md`
- `docs/DEVELOPMENT-SESSION-SUMMARY.md`
