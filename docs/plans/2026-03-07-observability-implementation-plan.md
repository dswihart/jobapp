# Job Tracker Observability Suite — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add score explanation, source analytics, and smart notifications to give visibility into why jobs score the way they do, which sources perform best, and when a standout job appears.

**Architecture:** Three independent features shipped in order: (1) capture and display AI score reasoning already present in `EnhancedFitScore.reasoning`, (2) aggregate source performance from existing DB data via a new API endpoint, (3) fire targeted in-app alerts when fit score exceeds a user-configurable threshold using the existing Alert model.

**Tech Stack:** Next.js 15 App Router, Prisma 6, PostgreSQL, Anthropic Claude Sonnet 4.5, Tailwind CSS. No test framework — verify with curl + visual check.

**Server:** `ssh -p 2222 -i ~/.ssh/id_ed25519 root@jobapp.aigrowise.com`, app at `/opt/job-tracker`. Build: `npm run build`. Restart: `sudo systemctl restart job-tracker`.

---

## FEATURE 1: Score Explanation

---

### Task 1: Add scoreBreakdown column to database

**Files:**
- Modify: `/opt/job-tracker/prisma/schema.prisma`

**Step 1: Add field to schema**

In `prisma/schema.prisma`, find the `JobOpportunity` model and add after `fitScore Int? @default(0)`:

```prisma
scoreBreakdown String? @db.Text
```

**Step 2: Apply via raw SQL (do NOT use prisma db push — it drops non-Prisma tables)**

```bash
sudo -u jobtracker psql job_tracker -c "ALTER TABLE job_opportunities ADD COLUMN IF NOT EXISTS \"scoreBreakdown\" TEXT;"
```

Expected: `ALTER TABLE`

**Step 3: Regenerate Prisma client**

```bash
cd /opt/job-tracker && npx prisma generate
```

Expected: `✓ Generated Prisma Client`

**Step 4: Verify column exists**

```bash
sudo -u jobtracker psql job_tracker -c "\d job_opportunities" | grep scoreBreakdown
```

Expected: `scoreBreakdown | text`

**Step 5: Commit**

```bash
cd /opt/job-tracker && git add prisma/schema.prisma && git commit -m "feat: add scoreBreakdown column to job_opportunities"
```

---

### Task 2: Update ai-service.ts to expose scoreBreakdown

**Files:**
- Modify: `/opt/job-tracker/src/lib/ai-service.ts`

**Context:** `analyzeJobFitEnhanced()` returns an `EnhancedFitScore` which already has a `reasoning` field. We need to surface this as `scoreBreakdown` — a concise plain-English summary — alongside the fit score.

**Step 1: Add scoreBreakdown to EnhancedFitScore interface**

Find `interface EnhancedFitScore` (line ~50) and add:

```typescript
scoreBreakdown: string
```

**Step 2: Build scoreBreakdown from existing reasoning + strengths/concerns**

Find the `return { overall: ..., reasoning: ... }` block at line ~302 and add:

```typescript
scoreBreakdown: [
  result.reasoning || '',
  result.strengths?.length ? `Strengths: ${result.strengths.slice(0, 2).join(', ')}.` : '',
  result.concerns?.length ? `Concerns: ${result.concerns.slice(0, 2).join(', ')}.` : '',
].filter(Boolean).join(' ').slice(0, 500),
```

**Step 3: Add scoreBreakdown to fallbackMatching return**

Find `function fallbackMatching` and add to its return:

```typescript
scoreBreakdown: `Skill match: ${matchedSkills.length} of ${userSkills.length} skills matched.`,
```

**Step 4: Build and verify no type errors**

```bash
cd /opt/job-tracker && npm run build 2>&1 | grep -E 'error|✓'
```

Expected: `✓ Compiled successfully`

**Step 5: Commit**

```bash
git add src/lib/ai-service.ts && git commit -m "feat: add scoreBreakdown to EnhancedFitScore"
```

---

### Task 3: Store scoreBreakdown in job-monitor.ts

**Files:**
- Modify: `/opt/job-tracker/src/lib/job-monitor.ts`

**Step 1: Pass scoreBreakdown into prisma.jobOpportunity.create**

Find the `prisma.jobOpportunity.create` call (line ~211). In the `data:` object, add:

```typescript
scoreBreakdown: fitScore.scoreBreakdown || null,
```

**Step 2: Build**

```bash
cd /opt/job-tracker && npm run build 2>&1 | grep -E 'error|✓'
```

Expected: `✓ Compiled successfully`

**Step 3: Test via scan**

```bash
curl -s -X POST http://localhost:3000/api/monitor \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat /tmp/test-cookie 2>/dev/null || echo '')" \
  -d '{}' | python3 -m json.tool | head -20
```

Then verify a new job has a breakdown:

```bash
sudo -u jobtracker psql job_tracker -c \
  "SELECT title, \"scoreBreakdown\" FROM job_opportunities WHERE \"scoreBreakdown\" IS NOT NULL ORDER BY \"createdAt\" DESC LIMIT 1;"
```

**Step 4: Commit**

```bash
git add src/lib/job-monitor.ts && git commit -m "feat: store scoreBreakdown from AI scoring in job-monitor"
```

---

### Task 4: Store scoreBreakdown in import route

**Files:**
- Modify: `/opt/job-tracker/src/app/api/opportunities/import/route.ts`

**Step 1: Read the file to find where fitScore is used**

Look for `fitScore: score.overall` or similar. Add alongside it:

```typescript
scoreBreakdown: score.scoreBreakdown || null,
```

**Step 2: Build and verify**

```bash
cd /opt/job-tracker && npm run build 2>&1 | grep -E 'error|✓'
```

**Step 3: Test via import (replace URL with a real job posting)**

```bash
# Get a valid session cookie from the browser devtools first, save to /tmp/test-cookie
# Then:
curl -s -X POST http://localhost:3000/api/opportunities/import \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example-job-url.com"}' | python3 -m json.tool
```

**Step 4: Commit**

```bash
git add src/app/api/opportunities/import/route.ts && git commit -m "feat: store scoreBreakdown on URL import"
```

---

### Task 5: Display scoreBreakdown on job cards (collapsible)

**Files:**
- Modify: `/opt/job-tracker/src/components/JobOpportunities.tsx`

**Context:** Job cards render in a `.map()` loop. The `JobOpportunity` interface needs `scoreBreakdown` added, and each card gets a collapsible breakdown section.

**Step 1: Add scoreBreakdown to JobOpportunity interface**

Find `interface JobOpportunity` and add:

```typescript
scoreBreakdown?: string
```

**Step 2: Add expandedBreakdown state**

After the existing state declarations, add:

```typescript
const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null)
```

**Step 3: Add breakdown toggle below the fit score badge on each job card**

Find the fit score badge render (the `w-16 h-16 rounded-lg` div). After the closing `</div>` of that block, add:

```tsx
{job.scoreBreakdown && (
  <button
    onClick={(e) => { e.stopPropagation(); setExpandedBreakdown(expandedBreakdown === job.id ? null : job.id) }}
    className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mt-1 underline"
  >
    {expandedBreakdown === job.id ? 'less' : 'why?'}
  </button>
)}
```

**Step 4: Add the expanded breakdown text inside each job card**

After the existing description/metadata block in the card, before the action buttons, add:

```tsx
{expandedBreakdown === job.id && job.scoreBreakdown && (
  <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
    {job.scoreBreakdown}
  </div>
)}
```

**Step 5: Build and visually verify**

```bash
cd /opt/job-tracker && npm run build 2>&1 | grep -E 'error|✓'
sudo systemctl restart job-tracker
```

Open the dashboard — jobs with a breakdown should show a "why?" link. Click it to expand.

**Step 6: Commit**

```bash
git add src/components/JobOpportunities.tsx && git commit -m "feat: add collapsible score breakdown on job cards"
```

---

### Task 6: Display scoreBreakdown in Job Detail Modal

**Files:**
- Modify: `/opt/job-tracker/src/components/JobDetailModal.tsx`

**Step 1: Add scoreBreakdown to the job prop type**

Find the job interface or prop type in the modal. Add:

```typescript
scoreBreakdown?: string
```

**Step 2: Add breakdown display in modal**

Find where `fitScore` is displayed in the modal. After that element, add:

```tsx
{job.scoreBreakdown && (
  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
    <span className="font-medium">Score reasoning: </span>{job.scoreBreakdown}
  </div>
)}
```

**Step 3: Build and verify visually**

```bash
cd /opt/job-tracker && npm run build 2>&1 | grep -E 'error|✓'
sudo systemctl restart job-tracker
```

Click a job with a breakdown — the modal should show the reasoning.

**Step 4: Commit**

```bash
git add src/components/JobDetailModal.tsx && git commit -m "feat: show score breakdown in job detail modal"
```

---

## FEATURE 2: Source Analytics

---

### Task 7: Create /api/stats/sources endpoint

**Files:**
- Create: `/opt/job-tracker/src/app/api/stats/sources/route.ts`

**Step 1: Create the directory**

```bash
mkdir -p /opt/job-tracker/src/app/api/stats/sources
```

**Step 2: Write the route**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Group opportunities by source
    const sourceGroups = await prisma.jobOpportunity.groupBy({
      by: ['source'],
      where: { userId },
      _count: { id: true },
      _avg: { fitScore: true },
    })

    // Count thumbs up per source
    const goodMatches = await prisma.jobOpportunity.groupBy({
      by: ['source'],
      where: { userId, userFeedback: 'GOOD_MATCH' },
      _count: { id: true },
    })

    // Count applied per source (via applications joined by jobUrl)
    const appliedRaw = await prisma.$queryRaw<{ source: string; count: bigint }[]>`
      SELECT jo.source, COUNT(a.id) as count
      FROM job_opportunities jo
      JOIN applications a ON a."jobUrl" = jo."jobUrl"
      WHERE jo."userId" = ${userId}
      GROUP BY jo.source
    `

    const goodMatchMap = Object.fromEntries(goodMatches.map(g => [g.source, g._count.id]))
    const appliedMap = Object.fromEntries(appliedRaw.map(r => [r.source, Number(r.count)]))

    const result = sourceGroups
      .map(g => ({
        source: g.source,
        jobCount: g._count.id,
        avgFitScore: Math.round(g._avg.fitScore ?? 0),
        thumbsUp: goodMatchMap[g.source] ?? 0,
        appliedCount: appliedMap[g.source] ?? 0,
      }))
      .sort((a, b) => b.avgFitScore - a.avgFitScore)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Source analytics error:', error)
    return NextResponse.json({ error: 'Failed to load source analytics' }, { status: 500 })
  }
}
```

**Step 3: Build and test**

```bash
cd /opt/job-tracker && npm run build 2>&1 | grep -E 'error|✓'
```

```bash
# Test endpoint (requires auth cookie)
curl -s http://localhost:3000/api/stats/sources | python3 -m json.tool | head -30
```

Expected: JSON array of source objects sorted by avg score.

**Step 4: Commit**

```bash
git add src/app/api/stats/sources/route.ts && git commit -m "feat: add /api/stats/sources endpoint for source analytics"
```

---

### Task 8: Add Source Analytics to Stats page

**Files:**
- Modify: `/opt/job-tracker/src/app/stats/page.tsx` (or the stats component — check which file renders the page content)

**Step 1: Find where Stats content lives**

```bash
ls /opt/job-tracker/src/app/stats/
cat /opt/job-tracker/src/app/stats/page.tsx | head -30
```

**Step 2: Add a SourceAnalytics component inline or as a new file**

Add a `SourceAnalytics` client component that fetches `/api/stats/sources` and renders a table:

```tsx
'use client'
import { useState, useEffect } from 'react'

interface SourceStat {
  source: string
  jobCount: number
  avgFitScore: number
  thumbsUp: number
  appliedCount: number
}

export default function SourceAnalytics() {
  const [stats, setStats] = useState<SourceStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats/sources')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-lg" />
  if (stats.length === 0) return <p className="text-gray-500 text-sm">No source data yet.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th className="pb-2 pr-4 font-medium">Source</th>
            <th className="pb-2 pr-4 font-medium text-right">Jobs</th>
            <th className="pb-2 pr-4 font-medium text-right">Avg Score</th>
            <th className="pb-2 pr-4 font-medium text-right">Liked</th>
            <th className="pb-2 font-medium text-right">Applied</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {stats.map(s => (
            <tr key={s.source} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{s.source}</td>
              <td className="py-2 pr-4 text-right text-gray-600 dark:text-gray-400">{s.jobCount}</td>
              <td className="py-2 pr-4 text-right">
                <span className={`font-medium ${s.avgFitScore >= 70 ? 'text-green-600 dark:text-green-400' : s.avgFitScore >= 50 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                  {s.avgFitScore}%
                </span>
              </td>
              <td className="py-2 pr-4 text-right text-gray-600 dark:text-gray-400">{s.thumbsUp}</td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{s.appliedCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 3: Add SourceAnalytics to the stats page**

Import and render it below the existing stats content, wrapped in a section:

```tsx
<section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Source Performance</h2>
  <SourceAnalytics />
</section>
```

**Step 4: Build and visually verify**

```bash
cd /opt/job-tracker && npm run build 2>&1 | grep -E 'error|✓'
sudo systemctl restart job-tracker
```

Navigate to `/stats` — should see Source Performance table below existing content.

**Step 5: Commit**

```bash
git add src/app/stats/ && git commit -m "feat: add Source Performance analytics to stats page"
```

---

## FEATURE 3: Smart Notifications

---

### Task 9: Add notificationThreshold to User schema and settings API

**Files:**
- Modify: `/opt/job-tracker/prisma/schema.prisma`
- Modify: `/opt/job-tracker/src/app/api/settings/route.ts`

**Step 1: Add field to schema**

In `prisma/schema.prisma`, find the User model. Add after `minFitScore`:

```prisma
notificationThreshold Int? @default(80)
```

**Step 2: Apply via raw SQL**

```bash
sudo -u jobtracker psql job_tracker -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS \"notificationThreshold\" INTEGER DEFAULT 80;"
```

Expected: `ALTER TABLE`

**Step 3: Regenerate Prisma client**

```bash
cd /opt/job-tracker && npx prisma generate
```

**Step 4: Update settings API GET to return notificationThreshold**

In `src/app/api/settings/route.ts`, find where `minFitScore` is returned in the GET handler. Add:

```typescript
notificationThreshold: user.notificationThreshold ?? 80,
```

**Step 5: Update settings API POST to accept notificationThreshold**

Find where `minFitScore: settings.minFitScore` is passed to `prisma.user.update`. Add:

```typescript
notificationThreshold: settings.notificationThreshold,
```

**Step 6: Build and verify**

```bash
cd /opt/job-tracker && npm run build 2>&1 | grep -E 'error|✓'
```

**Step 7: Commit**

```bash
git add prisma/schema.prisma src/app/api/settings/route.ts && git commit -m "feat: add notificationThreshold to user settings"
```

---

### Task 10: Fire high-score notifications in job-monitor and import

**Files:**
- Modify: `/opt/job-tracker/src/lib/job-monitor.ts`
- Modify: `/opt/job-tracker/src/app/api/opportunities/import/route.ts`

**Context:** `job-monitor.ts` already creates an Alert for every saved job. We need a SECOND alert only when the score exceeds the user's `notificationThreshold`. The existing alert says "New job match: X at Y (Z% fit)" — the new one should be more prominent and link to the job.

**Step 1: Load notificationThreshold in job-monitor.ts**

Find where `minFitScore` is read from the user (line ~85). Add:

```typescript
const notificationThreshold = user.notificationThreshold ?? 80
```

**Step 2: Fire high-score alert after saving the job**

Find the `prisma.alert.create` call that fires after `prisma.jobOpportunity.create`. After it, add:

```typescript
// Fire standout alert if score exceeds notification threshold
if (notificationThreshold > 0 && adjustedScore >= notificationThreshold) {
  await prisma.alert.create({
    data: {
      message: `Strong match (${adjustedScore}%): ${job.title} at ${job.company}`,
      type: 'HIGH_FIT_SCORE',
      userId,
      opportunityId: opportunity.id
    }
  })
}
```

**Step 3: Add same to import route**

In `src/app/api/opportunities/import/route.ts`, after the job opportunity is created and the fit score is known, load the user's threshold and fire the alert:

```typescript
const userSettings = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { notificationThreshold: true }
})
const threshold = userSettings?.notificationThreshold ?? 80
if (threshold > 0 && fitScore >= threshold) {
  await prisma.alert.create({
    data: {
      message: `Strong match (${fitScore}%): ${title} at ${company}`,
      type: 'HIGH_FIT_SCORE',
      userId: session.user.id,
      opportunityId: opportunity.id
    }
  })
}
```

**Step 4: Build**

```bash
cd /opt/job-tracker && npm run build 2>&1 | grep -E 'error|✓'
```

**Step 5: Test — import a high-scoring job and check for alert**

```bash
sudo -u jobtracker psql job_tracker -c \
  "SELECT message, type FROM alerts WHERE type = 'HIGH_FIT_SCORE' ORDER BY \"createdAt\" DESC LIMIT 3;"
```

**Step 6: Commit**

```bash
git add src/lib/job-monitor.ts src/app/api/opportunities/import/route.ts && git commit -m "feat: fire HIGH_FIT_SCORE alert when job exceeds notification threshold"
```

---

### Task 11: Add notification threshold slider to JobSearchSettings

**Files:**
- Modify: `/opt/job-tracker/src/components/JobSearchSettings.tsx`

**Step 1: Add notificationThreshold to SearchSettings interface**

Find `interface SearchSettings` and add:

```typescript
notificationThreshold: number
```

**Step 2: Add to default state**

Find `useState<SearchSettings>({ minFitScore: 40, ...` and add:

```typescript
notificationThreshold: 80,
```

**Step 3: Load from API**

Find where settings are loaded from the API response. Add:

```typescript
notificationThreshold: data.settings?.notificationThreshold ?? 80,
```

**Step 4: Add slider UI**

Find the `minFitScore` slider in the JSX — add a similar block after it:

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    Notification Threshold: {settings.notificationThreshold === 0 ? 'Off' : `${settings.notificationThreshold}%`}
  </label>
  <input
    type="range"
    min={0}
    max={100}
    step={5}
    value={settings.notificationThreshold}
    onChange={(e) => setSettings(prev => ({ ...prev, notificationThreshold: Number(e.target.value) }))}
    className="w-full"
  />
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
    Get notified when a job scores above this threshold. Set to 0 to disable.
  </p>
</div>
```

**Step 5: Build and visually verify**

```bash
cd /opt/job-tracker && npm run build 2>&1 | grep -E 'error|✓'
sudo systemctl restart job-tracker
```

Go to Settings → Job Search Settings → should see notification threshold slider.

**Step 6: Commit**

```bash
git add src/components/JobSearchSettings.tsx && git commit -m "feat: add notification threshold slider to job search settings"
```

---

## Done

All three features are now complete and independent. Verify end-to-end:

1. **Score Explanation:** Import a job URL — the card should show a "why?" link that expands the score reasoning
2. **Source Analytics:** Go to `/stats` — see Source Performance table sorted by avg score
3. **Smart Notifications:** Import or scan for a job scoring ≥ your threshold — bell icon should show a new alert
