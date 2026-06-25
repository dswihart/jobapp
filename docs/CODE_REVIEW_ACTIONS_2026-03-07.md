# Code Review Actions - March 7, 2026

This document captures high-impact findings from the March 7, 2026 review and provides a concrete remediation checklist.

## Scope

- Repository: /opt/job-tracker
- Branch state during review: master (ahead of origin by 1)
- Focus: pending API/UI changes around opportunities, applications, and resume match flow

## Priority Findings

### P0 - Build Breaker

1. ApplicationList is used in Dashboard.tsx but is not imported.
- Impact: dashboard page fails build/runtime.
- File: src/components/Dashboard.tsx
- Action: add import ApplicationList from ./ApplicationList and remove unused imports.

### P0 - AuthZ/Data Ownership Gap

2. POST /api/applications/create-from-job does not verify that the opportunity belongs to the authenticated user.
- Impact: if an attacker obtains another opportunity ID, they can create an application from another user's opportunity.
- File: src/app/api/applications/create-from-job/route.ts
- Action: enforce opportunity.userId equals session.user.id before reading opportunity fields.

### P0 - Sensitive Data Exposure Risk

3. GET /api/applications includes user relation in response.
- Impact: Prisma User model contains password; accidental exposure of hashed credentials to client is possible.
- File: src/app/api/applications/route.ts
- Action: remove user relation include, or replace with safe select fields only.

### P1 - React State Management Bug

4. JobDetailModal sets state during render (if job changed then setState logic).
- Impact: unstable rendering, StrictMode issues, potential re-render loops.
- File: src/components/JobDetailModal.tsx
- Action: move synchronization into useEffect with job id dependency.

### P1 - API Contract Drift

5. JobOpportunities.loadAppliedJobs expects { success, applications }, but /api/applications currently returns an array.
- Impact: applied markers can be incorrect due to dead-path parsing.
- Files:
  - src/components/JobOpportunities.tsx
  - src/app/api/applications/route.ts
- Action: standardize response shape and update all consumers.

### P1 - Schema/DB Synchronization

6. New JobOpportunity.notes field is present in schema and route logic.
- Impact: runtime errors if DB not migrated/pushed.
- File: prisma/schema.prisma
- Action: run npm run db:generate and npm run db:push (or migration workflow) before deploy.

## Remediation Checklist

- [ ] Fix missing ApplicationList import and remove dead imports in Dashboard.tsx.
- [ ] Add ownership check in create-from-job route.
- [ ] Remove user include from applications API response and verify no password fields ever leave server APIs.
- [ ] Refactor JobDetailModal state sync into useEffect.
- [ ] Align API response contracts between /api/applications and all consumers.
- [ ] Apply Prisma schema changes in DB and verify route writes for notes.
- [ ] Re-run lint/build after fixes (npm run lint, npm run build).

## Recommended Verification

1. Auth tests:
- cannot create application from another user's opportunity ID.
- cannot read/update/delete opportunity by non-owner.

2. API response tests:
- /api/applications response does not include password or sensitive user fields.
- consumers parse the same response shape in all paths.

3. UI tests:
- dashboard renders My Applications section without JSX undefined errors.
- opening/closing JobDetailModal does not trigger render warnings.

## Owner Notes

Keep this file updated as each checkbox is resolved. When complete, move unresolved items (if any) into backlog tickets with explicit owner and ETA.
