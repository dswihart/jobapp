# Job Tracker Observability Suite — Design Document

**Date:** 2026-03-07
**Status:** Approved
**Scope:** Score Explanation + Source Analytics + Smart Notifications

---

## Problem

The user cannot tell why a job scored the way it did, which sources produce the most relevant jobs, or when a standout match appears. Without this visibility, improving match quality and scanning coverage is pure guesswork.

---

## Solution Overview

Three independent features shipped in priority order:

1. **Score Explanation** — show why each job got its fit score
2. **Source Analytics** — show which sources deliver the best jobs
3. **Smart Notifications** — alert when a job scores above a threshold

---

## Feature 1: Score Explanation

### How it works

Modify `ai-service.ts` to return a `scoreBreakdown` plain-English string alongside the existing `fitScore`. The AI already reasons through this — we just capture and store it.

Example output:
> "Strong match: SIEM/EDR skills align well (+), cybersecurity domain (+), remote-friendly (+). Penalized: location preference Spain/Europe not confirmed (−), seniority level unclear (−)."

### Storage

Add `scoreBreakdown String? @db.Text` to `JobOpportunity` model in `prisma/schema.prisma`.
Apply via raw SQL `ALTER TABLE` (to avoid dropping non-Prisma tables).
Existing jobs without a breakdown show nothing — no backfill.

### Display

- Job card: collapsible breakdown text below the fit score badge, collapsed by default
- Job Detail Modal: breakdown shown in the description area alongside the score

### Touch points

- `src/lib/ai-service.ts` — update `scoreJob()` return type and prompt
- `prisma/schema.prisma` — add `scoreBreakdown` field
- `src/app/api/opportunities/import/route.ts` — store breakdown on import
- `src/lib/job-monitor.ts` — store breakdown during scans
- `src/components/JobOpportunities.tsx` — render collapsible breakdown on card
- `src/components/JobDetailModal.tsx` — render breakdown in modal

---

## Feature 2: Source Analytics

### How it works

Aggregate existing data from `job_opportunities` grouped by `source`. No new data collection. Display in a new Analytics tab on the existing Stats page (`/stats`).

### Data shown (per source)

| Column | Source |
|--------|--------|
| Jobs Found | COUNT of job_opportunities |
| Avg Fit Score | AVG(fitScore) |
| Thumbs Up | COUNT where userFeedback = 'GOOD_MATCH' |
| Applied | JOIN to applications table |

Sorted by avg fit score descending.

### API

New endpoint: `GET /api/stats/sources`
- Auth required (session.user.id)
- Single Prisma `groupBy` + raw SQL join for applied count
- Returns array: `{ source, jobCount, avgFitScore, thumbsUp, appliedCount }`

### Display

New "Source Performance" section added to the existing `/stats` page, below current content. Responsive table with mobile card fallback.

### Touch points

- `src/app/api/stats/sources/route.ts` — new endpoint
- `src/app/stats/page.tsx` or stats component — add Source Performance section

---

## Feature 3: Smart Notifications

### How it works

When a job is saved with `fitScore >= notificationThreshold`, automatically create an in-app alert using the existing notifications infrastructure.

Alert message format:
> "Strong match (87%): Senior Security Engineer at Airbus — View Job"

### Configuration

Add `notificationThreshold: Int @default(80)` to user settings (or Job Search Settings). A threshold of 0 disables notifications. Configurable via slider in Job Search Settings UI.

### Delivery

In-app only via the existing `UnifiedNotificationsPanel` (bell icon in TopBar). No email, no push — those are future enhancements.

### Touch points

- `src/lib/job-monitor.ts` — after saving a high-score job, create alert if score >= threshold
- `src/app/api/opportunities/import/route.ts` — same on URL import
- `src/components/JobSearchSettings.tsx` — add notification threshold slider
- Existing alerts/notifications table — no schema changes needed

---

## Implementation Priority

1. Score Explanation (highest daily value, most visible)
2. Source Analytics (helps tune scanning strategy)
3. Smart Notifications (nicest to have, builds on #1 data)

Each feature is independently deployable.

---

## Out of Scope

- Email notifications
- Push notifications
- Backfilling scoreBreakdown for existing jobs
- Source management actions from the analytics view
- Structured score breakdown (tags, JSON) — plain English only
