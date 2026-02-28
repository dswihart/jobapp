# Test Coverage Analysis

## Current State: No Tests Exist

The codebase currently has **zero test files**, **no testing framework installed**, and **no test configuration**. The project contains **134 source files** across 59 API routes, 32 React components, and 31 library/service modules — all running without any automated test coverage.

The `.gitignore` includes a `/coverage` entry, suggesting testing was planned but never implemented.

---

## Priority 1: Pure Logic & Utility Functions (Quick Wins)

These modules contain pure or near-pure functions that are highly testable without mocking databases or external services. They should be the **first tests written**.

### `src/lib/safe-path.ts` — Security-Critical Path Sanitization
- **Why:** This is a security boundary. Bugs here could enable path traversal attacks.
- **What to test:**
  - `sanitizeFilename`: rejects `..`, `/`, `\`, null bytes, empty strings, and `.`/`..` literals
  - `safePathJoin`: prevents directory traversal (e.g., `../../etc/passwd`), handles mixed separators, validates resolved paths stay within `baseDir`
  - `validateUrlPath`: strips leading slashes, rejects `..` and null bytes, normalizes components
- **Estimated tests:** 15–20 cases

### `src/app/api/stats/export/route.ts` — Statistics Helper Functions
- **Why:** Contains 8 pure helper functions (`toDateString`, `startOfDay`, `daysBetween`, `getWeekStart`, `getWeekNumber`, `generateFunnelStats`, `generateDailyStats`, `convertToCSV`) with complex date math and aggregation logic.
- **What to test:**
  - Date formatting across timezones and edge cases (month/year boundaries)
  - Week number calculation (ISO week edge cases, year transitions)
  - Funnel stats with various status distributions (empty input, all same status, mixed)
  - CSV generation for each export type (applications, daily, weekly, monthly, funnel, summary)
  - Edge cases: empty arrays, single item, DST transitions
- **Estimated tests:** 30–40 cases
- **Note:** These functions would ideally be extracted to a `src/lib/stats-utils.ts` to make them independently importable for testing.

### `src/lib/pattern-learning-service.ts` — `extractTitleKeywords`
- **Why:** Pure function that filters generic words from job titles. Directly impacts rejection pattern learning accuracy.
- **What to test:**
  - Filters generic words (engineer, specialist, analyst, etc.)
  - Filters short words (≤3 chars)
  - Handles special characters in titles
  - Returns unique keywords
  - Case normalization
- **Estimated tests:** 8–10 cases

---

## Priority 2: Service Layer with Mockable Dependencies

These services contain significant business logic that can be tested by mocking `prisma` and external API calls.

### `src/lib/ai-service.ts` — `fallbackMatching` Function
- **Why:** The fallback matching logic is used when the AI API is unavailable. It contains a complex scoring algorithm (skill matching, seniority matching, title matching with word analysis) that determines which jobs users see.
- **What to test:**
  - Skill matching: exact match, partial match, no match, case insensitivity
  - Title matching: exact title match, partial word overlap, wrong-role penalty (`data engineer` vs `security engineer`), generic words filtering
  - Seniority matching: senior candidate vs senior role, junior vs senior mismatch
  - Experience scoring: various years of experience values
  - Overall score calculation: verify the weighted formula (30% skill + 20% experience + 10% seniority + 30% title + 5% + 5%)
  - Edge cases: empty skills, empty job description, missing fields
- **Estimated tests:** 20–25 cases

### `src/lib/skill-service.ts` — `fallbackSkillExtraction`
- **Why:** Keyword-based skill extraction is the fallback when AI is unavailable. It drives the skill database.
- **What to test:**
  - Detects skills from known categories (`SKILL_CATEGORIES`)
  - Case-insensitive matching
  - No duplicates in results
  - All categories covered (Programming Language, Frontend Framework, Security, etc.)
  - Skills not present in text are excluded
- **Estimated tests:** 10–12 cases

### `src/lib/pattern-learning-service.ts` — `calculateRejectionPenalty`
- **Why:** Penalty calculation affects which jobs are surfaced to users. Bugs could hide good matches or promote bad ones.
- **What to test (with mocked `getRejectionPatterns`):**
  - No patterns → penalty = 0
  - Title keyword match → adds 15 * weight
  - Company match → adds 20 * weight
  - Source match → adds 10 * weight
  - Location match → adds 12 * weight
  - Weight capped at 1.0 (frequency/10)
  - Total penalty capped at 50
  - Multiple overlapping patterns accumulate correctly
- **Estimated tests:** 12–15 cases

### `src/lib/user-sources-fetcher.ts` — Feed Parsing Functions
- **Why:** `parseJSONFeed`, `parseXMLFeed`, `extractTag`, and `decodeHtml` are pure functions that handle external data parsing. Malformed feeds could crash the scanner.
- **What to test:**
  - JSON feed parsing: "Title at Company" splitting, HTML stripping from `content_html`, description truncation, missing fields
  - XML feed parsing: standard RSS items, CDATA sections, missing tags, empty feed
  - `extractTag`: valid tags, missing tags, nested content, attributes on tags
  - `decodeHtml`: all entity types (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`), HTML tag stripping, whitespace normalization
- **Estimated tests:** 20–25 cases

---

## Priority 3: API Route Testing

These routes handle authentication, input validation, and database operations. Testing them requires mocking `auth()` and `prisma`.

### `src/app/api/auth/register/route.ts`
- **What to test:**
  - Missing email/password → 400
  - Duplicate email → 400
  - Successful registration → 201 with correct response shape
  - Password is hashed (not stored in plain text)
  - Default values set correctly (name = "Job Seeker", skills = [], autoScan = true)

### `src/app/api/applications/route.ts`
- **What to test:**
  - **GET:** Unauthenticated → 401; filters by status; search across company/role/notes/jobUrl; multi-term search (all terms must match)
  - **POST:** Unauthenticated → 401; auto-sets `appliedDate` for APPLIED/INTERVIEWING status; defaults status to APPLIED; associates resume and cover letter

### `src/app/api/applications/[id]/route.ts`
- **What to test:**
  - GET/PUT/DELETE with valid/invalid/unauthorized IDs
  - Cannot modify another user's application

### `src/middleware.ts`
- **What to test:**
  - Unauthenticated users redirected to `/login`
  - Login/register pages accessible without auth
  - `/api/auth/*`, `/api/mobile/*`, `/api/cron/*` bypass auth
  - `/uploads/*` static files bypass auth
  - Authenticated users pass through

---

## Priority 4: Component Testing

These are the most complex UI components with significant client-side logic.

### `src/components/Dashboard.tsx` (758 lines)
- State management, data fetching, tab navigation, search/filter logic

### `src/components/InterviewDetailModal.tsx` (930 lines)
- Largest component. Interview management, AI analysis integration, multi-step forms

### `src/components/ApplicationList.tsx` (471 lines)
- Search, sort, filter, status updates, bulk operations

### `src/components/ResumeTailor.tsx` (454 lines)
- AI-powered resume tailoring flow, file upload, multi-step process

### `src/components/JobOpportunities.tsx` (462 lines)
- Job listing, fit score display, filtering, archiving

---

## Priority 5: Integration & E2E Testing

Once unit tests are in place, these end-to-end flows should be tested:

1. **Registration → Login → Create Application → Track Status** — Full user lifecycle
2. **Job Scan → Fit Analysis → Opportunity Display → Apply** — Job discovery pipeline
3. **Resume Upload → Parse → Tailor → Download** — Resume workflow
4. **Cron Job Scan → Deduplication → Alert Creation** — Background scanning

---

## Recommended Testing Setup

### Framework: Vitest
Vitest is the best fit for this Next.js/TypeScript project because:
- Native TypeScript and ESM support
- Compatible with the Next.js build pipeline
- Jest-compatible API (easy learning curve)
- Fast execution with Vite-based architecture

### Required Packages
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

### Suggested Configuration
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**', 'src/app/api/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Directory Structure
```
src/
  test/
    setup.ts              # Global test setup
    mocks/
      prisma.ts           # Prisma client mock
      auth.ts             # NextAuth mock
  lib/
    __tests__/
      safe-path.test.ts
      ai-service.test.ts
      skill-service.test.ts
      pattern-learning-service.test.ts
      user-sources-fetcher.test.ts
  app/
    api/
      auth/register/
        __tests__/
          route.test.ts
      applications/
        __tests__/
          route.test.ts
```

---

## Estimated Impact

| Priority | Area | Files | Est. Tests | Risk Mitigated |
|----------|------|-------|------------|----------------|
| P1 | Pure logic & utilities | 3 | 55–70 | Path traversal, stat errors, data corruption |
| P2 | Service layer | 4 | 65–80 | Bad job matches, broken skill extraction, wrong penalties |
| P3 | API routes | 5+ | 30–40 | Auth bypass, data leaks, input validation |
| P4 | Components | 5 | 25–35 | UI regressions, state bugs |
| P5 | Integration/E2E | — | 10–15 | Workflow breakages |
| **Total** | | **17+** | **185–240** | |

Starting with P1 and P2 alone would cover the most critical business logic with approximately 120–150 tests and could be implemented without any infrastructure changes beyond installing Vitest.
