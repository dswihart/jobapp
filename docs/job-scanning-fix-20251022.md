# Job Scanning Investigation and Fix - 2025-10-22

## Problem Statement
Job scanning was not working for new users.

## Investigation Summary

### Root Causes Identified

1. **autoScan Default Value Issue** ❌
   - Prisma schema had `autoScan Boolean? @default(false)`
   - Registration route did not explicitly enable autoScan
   - New users would not get job scanning enabled by default

2. **Limited Job Source Coverage** ⚠️
   - All 20+ job sources are tech/security focused
   - Users with non-tech profiles (e.g., International Relations, Education) get zero job matches
   - Example: User pgollotte@gmail.com has International Relations skills but gets 0 jobs

### Database Analysis

```
Users in system: 2
- default-user-id (dswihart@gmail.com): Tech/Security profile → 324 job opportunities
- cmgxx65j800004rfa28dcq5wl (pgollotte@gmail.com): Education/IR profile → 0 job opportunities
```

Both users had autoScan manually enabled, but new users would not have it enabled by default.

### Job Sources (All Tech/Security Focused)
- Barcelona Security Jobs
- CyberSecurity JobSite EU/Spain/Remote
- Indeed Security Engineer Spain
- RemoteOK Security
- Infosec-Jobs Remote
- Foorilla Security/Tech Jobs
- WeWorkRemotely, Remotive, etc.

## Fixes Applied

### 1. Updated Prisma Schema
```prisma
// BEFORE
autoScan Boolean? @default(false)

// AFTER  
autoScan Boolean? @default(true)
```

### 2. Updated Registration Route
File: `src/app/api/auth/register/route.ts`

```typescript
const user = await prisma.user.create({
  data: {
    email,
    password: hashedPassword,
    name: name || 'Job Seeker',
    skills: [],
    autoScan: true,  // ← ADDED THIS LINE
  },
})
```

### 3. Updated Database Default
```sql
ALTER TABLE users ALTER COLUMN "autoScan" SET DEFAULT true;
```

## Verification

```bash
# Verified autoScan default is now true
SELECT column_default FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'autoScan';
# Result: true ✓
```

## Recommendations

### Immediate Actions
1. ✅ New users will now have autoScan enabled by default
2. ✅ Registration explicitly sets autoScan=true

### Future Improvements
1. **Diversify Job Sources**
   - Add sources for non-tech roles (Education, Business, HR, etc.)
   - Allow users to add custom job sources based on their profile
   - Consider using generic job boards (LinkedIn, Glassdoor) with keyword filtering

2. **Profile-Based Source Suggestions**
   - Automatically suggest relevant job sources based on user skills/titles
   - Provide UI to easily add/remove sources per user

3. **Lower Fit Score Threshold**
   - Consider lowering minFitScore from 40 to capture more opportunities
   - Or implement tiered notifications (high/medium/low fit)

4. **Onboarding Flow**
   - Guide new users to add skills, job titles, and relevant job sources
   - Explain the job scanning feature and how to configure it

## Testing Plan

1. Create a new test user account
2. Verify autoScan is enabled by default
3. Check that cron job includes the new user in scans
4. Monitor logs for successful job scanning

## Files Modified

1. `prisma/schema.prisma` - Changed autoScan default to true
2. `src/app/api/auth/register/route.ts` - Added autoScan: true to user creation
3. Database: `ALTER TABLE users` to set default

## Related Information

- Cron job endpoint: `/api/cron/scan-jobs`
- Monitor endpoint: `/api/monitor` (authenticated)
- Job monitor lib: `src/lib/job-monitor.ts`
- Sources: `src/lib/sources/*.ts`

---
*Investigation completed by: Claude Code*
*Date: 2025-10-22*
