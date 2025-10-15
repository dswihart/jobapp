# Job Board Monitoring Customization Guide

## Overview

The job monitoring system works in 3 steps:
1. **Fetch jobs** from job boards based on your skills
2. **Analyze each job** using AI to calculate a fit score (0-100%)
3. **Save jobs with ≥50% fit** and create alerts

---

## Current Matching Algorithm

### Your Profile Data Used:
- **Skills**: Array of technologies/skills (e.g., `['React', 'Node.js', 'TypeScript']`)
- **Experience**: Years of experience (e.g., `'5 years'`)

### How Fit Score is Calculated:

```
Overall Score = (Skill Match × 60%) + (Experience Match × 40%)
```

#### 1. Skill Match (60% weight)
- Checks how many of YOUR skills appear in the job description
- Identifies missing skills you might need to learn
- Score formula: `(matched_skills / max(your_skills, 5)) × 100`

**Example:**
- Your skills: `['React', 'Node.js', 'TypeScript']`
- Job requires: `'React, Node.js, PostgreSQL'`
- Matched: 2/3 = 67% skill match

#### 2. Experience Match (40% weight)
- Extracts years from job requirements (e.g., "5+ years experience")
- Compares to your experience
- Scoring:
  - You have ≥ required years: 100%
  - You have ≥ 75% of required: 75%
  - You have ≥ 50% of required: 50%
  - Less than 50%: 25%

**Example:**
- Job requires: "5+ years"
- You have: 5 years → 100% experience match

**Final Score:** `(67% × 0.6) + (100% × 0.4) = 80%` ✅ Saved!

---

## Customization Options

### 1. Adjust Minimum Fit Score Threshold

**Current:** Jobs with ≥50% fit are saved

**To change:** Edit `/opt/job-tracker/src/lib/job-monitor.ts` line ~56:

```typescript
// Current
if (fitScore.overall >= 50) {

// Options
if (fitScore.overall >= 60) {  // More selective
if (fitScore.overall >= 40) {  // More inclusive
```

### 2. Change Score Weighting

**Current:** 60% skills, 40% experience

**To change:** Edit `/opt/job-tracker/src/lib/ai-service.ts` line ~149:

```typescript
// Current
const overall = Math.round(
  skillAnalysis.score * 0.6 + experienceMatch * 0.4
)

// Options
const overall = Math.round(
  skillAnalysis.score * 0.8 + experienceMatch * 0.2  // Prioritize skills
)

const overall = Math.round(
  skillAnalysis.score * 0.5 + experienceMatch * 0.5  // Equal weight
)
```

### 3. Add More Tech Keywords

**Current:** Limited to ~25 keywords

**To add more:** Edit `/opt/job-tracker/src/lib/ai-service.ts` line ~69-75:

```typescript
const techKeywords = [
  // Current keywords
  'javascript', 'typescript', 'python', 'java', 'react', 'node',
  'angular', 'vue', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',

  // Add your keywords here
  'svelte', 'nextjs', 'graphql', 'prisma', 'tailwind',
  'jenkins', 'terraform', 'ansible', 'mongodb', 'redis',
  'microservices', 'devops', 'cicd'
]
```

### 4. Update Your Profile Skills

The system uses YOUR profile skills for matching. To update:

1. Click **Profile** button in the dashboard
2. Add/edit your skills (comma-separated)
3. Update years of experience
4. Save

**Important:** Be specific with skills!
- ✅ Good: `['React', 'React Hooks', 'TypeScript', 'Next.js']`
- ❌ Too general: `['JavaScript', 'Frontend']`

---

## Integrating Real Job Boards

### Current Status
The system uses **sample demo jobs** from `fetchJobPostings()` function.

### Integration Options

#### Option 1: Job Board RSS Feeds (Easiest)
Many job boards offer RSS feeds:

- **LinkedIn:** `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=react&location=Remote`
- **Indeed:** `https://www.indeed.com/rss?q=react+developer&l=remote`
- **Stack Overflow:** `https://stackoverflow.com/jobs/feed?q=react`

**How to implement:**
1. Install XML parser: `npm install fast-xml-parser`
2. Replace `fetchJobPostings()` in `/opt/job-tracker/src/lib/job-monitor.ts`
3. Parse RSS feeds to extract job data

#### Option 2: Job API Services (Recommended)
Professional job search APIs:

**1. Adzuna API** (Free tier available)
```bash
# Sign up: https://developer.adzuna.com/
# Get API keys
# 1000 requests/month free
```

**2. The Muse API** (Free)
```bash
# Endpoint: https://www.themuse.com/api/public/jobs
# No auth required
# Includes company data
```

**3. Remotive API** (Free)
```bash
# Endpoint: https://remotive.com/api/remote-jobs
# Remote jobs only
# No auth required
```

**Implementation example (Adzuna):**

```typescript
async function fetchJobPostings(skills: string[]): Promise<JobPosting[]> {
  const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID
  const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY

  const query = skills.join(' ')
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&where=remote&max_days_old=7`

  const response = await fetch(url)
  const data = await response.json()

  return data.results.map((job: any) => ({
    title: job.title,
    company: job.company.display_name,
    description: job.description,
    requirements: '',
    location: job.location.display_name,
    salary: job.salary_min ? `$${job.salary_min}-${job.salary_max}` : undefined,
    jobUrl: job.redirect_url,
    postedDate: new Date(job.created)
  }))
}
```

#### Option 3: Web Scraping (Advanced)
For sites without APIs, use Puppeteer or Cheerio.

**⚠️ Caution:** Respect robots.txt and terms of service

```bash
npm install puppeteer
```

```typescript
import puppeteer from 'puppeteer'

async function scrapeJobBoard(url: string): Promise<JobPosting[]> {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(url)

  const jobs = await page.evaluate(() => {
    // Extract job data from DOM
    return Array.from(document.querySelectorAll('.job-card')).map(card => ({
      title: card.querySelector('.title')?.textContent,
      company: card.querySelector('.company')?.textContent,
      // ... etc
    }))
  })

  await browser.close()
  return jobs
}
```

---

## Advanced: Add Search Preferences

To add more control, extend the User model with preferences:

### 1. Update Prisma Schema

Add to `/opt/job-tracker/prisma/schema.prisma`:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  skills    String[]
  experience String?

  // Add these fields
  targetRoles      String[]  @default([])
  preferredLocations String[] @default([])
  remoteOnly       Boolean   @default(false)
  minSalary        Int?
  minFitScore      Int       @default(50)
  excludeKeywords  String[]  @default([])

  // ... rest of fields
}
```

### 2. Run Migration

```bash
ssh root@jobapp.aigrowise.com
cd /opt/job-tracker
npm run db:push
```

### 3. Update Filtering Logic

In `job-monitor.ts`, add filtering:

```typescript
async function fetchJobPostings(skills: string[], userPreferences: any): Promise<JobPosting[]> {
  let jobs = await fetchFromAPI(skills)

  // Filter by location
  if (userPreferences.remoteOnly) {
    jobs = jobs.filter(job =>
      job.location?.toLowerCase().includes('remote')
    )
  }

  // Filter by excluded keywords
  if (userPreferences.excludeKeywords.length > 0) {
    jobs = jobs.filter(job => {
      const jobText = `${job.title} ${job.description}`.toLowerCase()
      return !userPreferences.excludeKeywords.some(keyword =>
        jobText.includes(keyword.toLowerCase())
      )
    })
  }

  // Filter by salary
  if (userPreferences.minSalary) {
    jobs = jobs.filter(job =>
      extractSalary(job.salary) >= userPreferences.minSalary
    )
  }

  return jobs
}
```

---

## Automated Scanning

### Option 1: Cron Job (Linux)

```bash
# Edit crontab
crontab -e

# Add line to scan daily at 9 AM
0 9 * * * curl -X POST http://localhost:3000/api/monitor -H "Content-Type: application/json" -d '{"userId":"your-user-id"}'
```

### Option 2: Node-cron (In-app)

```bash
npm install node-cron
```

Create `/opt/job-tracker/src/lib/scheduler.ts`:

```typescript
import cron from 'node-cron'
import { monitorJobBoards } from './job-monitor'

// Run every day at 9 AM
export function startScheduler(userId: string) {
  cron.schedule('0 9 * * *', async () => {
    console.log('Running scheduled job scan...')
    await monitorJobBoards(userId)
  })
}
```

---

## Testing Your Configuration

### 1. Test with Sample Data (Current)
- Click "Scan Job Boards"
- Should find 2 demo jobs with your profile

### 2. Test Skill Matching
Update your profile skills and scan again:
- Add `React` → Should match "Frontend Engineer"
- Add `Node.js` → Should match "Full Stack Developer"
- Remove all skills → Should find 0 jobs

### 3. Test Fit Score Threshold
Temporarily lower threshold to see more results:
```typescript
if (fitScore.overall >= 30) {  // Show almost everything
```

### 4. Check Database
```bash
ssh root@jobapp.aigrowise.com
sudo -u postgres psql -d job_tracker -c "SELECT title, company, \"fitScore\" FROM job_opportunities ORDER BY \"fitScore\" DESC;"
```

---

## Troubleshooting

### No Jobs Found
1. ✅ Check your profile has skills set
2. ✅ Check fitScore threshold (default: 50%)
3. ✅ Verify `fetchJobPostings()` is returning data
4. ✅ Check logs: `journalctl -u job-tracker -n 100`

### Too Many Irrelevant Jobs
1. ✅ Increase minimum fit score threshold
2. ✅ Add excludeKeywords filter
3. ✅ Make your skills more specific

### Jobs Not Appearing in Alerts
1. ✅ Check if jobs already exist (no duplicates)
2. ✅ Verify fit score ≥ threshold
3. ✅ Check alerts API: `curl http://localhost:3000/api/alerts?userId=your-id`

---

## Next Steps

1. **Choose a job board API** from options above
2. **Get API credentials** (if needed)
3. **Update `fetchJobPostings()`** function with real API
4. **Test thoroughly** with your profile
5. **Set up automated scheduling** (optional)
6. **Refine matching algorithm** based on results

See `job-board-integrations.ts` for ready-to-use code examples!
