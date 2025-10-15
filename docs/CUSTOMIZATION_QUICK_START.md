# Job Search Customization - Quick Start Guide

## 🎯 Easy Customizations (No Coding)

### 1. Change Your Skills (Most Important!)

**Where:** Dashboard → Click "Profile" button

**What to do:**
1. Click the "Profile" button in the top right
2. Edit "Skills" field
3. Add comma-separated skills: `React, Node.js, TypeScript, Python, AWS`
4. Update "Years of Experience": `5`
5. Click "Save"

**Why it matters:**
- Jobs are filtered by YOUR skills
- More specific skills = better matches
- Example: Instead of "JavaScript", use "React, Vue.js, Next.js"

---

### 2. Adjust Minimum Fit Score

**File:** `/opt/job-tracker/src/lib/job-monitor.ts`
**Line:** 56
**Current:** `if (fitScore.overall >= 50) {`

**Options:**
```typescript
// More selective (fewer, better matches)
if (fitScore.overall >= 70) {

// More inclusive (more jobs, some stretches)
if (fitScore.overall >= 40) {

// Very selective (only perfect matches)
if (fitScore.overall >= 80) {
```

**How to apply:**
```bash
ssh root@jobapp.aigrowise.com -p 2222
nano /opt/job-tracker/src/lib/job-monitor.ts
# Change line 56
# Save: Ctrl+X, Y, Enter
cd /opt/job-tracker && npm run build
systemctl restart job-tracker
```

---

### 3. Change Job Age Filter

**File:** `/opt/job-tracker/src/lib/job-monitor.ts`
**Line:** ~145
**Current:** Last 7 days

**Options:**
```typescript
// Last 24 hours only
const isRecent = new Date(job.publication_date) > new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)

// Last 3 days
const isRecent = new Date(job.publication_date) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

// Last 14 days
const isRecent = new Date(job.publication_date) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

// Last 30 days
const isRecent = new Date(job.publication_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
```

---

### 4. Adjust AI Scoring Weights

**File:** `/opt/job-tracker/src/lib/ai-service.ts`
**Line:** 149
**Current:** 60% skills, 40% experience

**Options:**
```typescript
// Prioritize skills over experience
const overall = Math.round(
  skillAnalysis.score * 0.8 + experienceMatch * 0.2
)

// Equal weight
const overall = Math.round(
  skillAnalysis.score * 0.5 + experienceMatch * 0.5
)

// Prioritize experience over skills
const overall = Math.round(
  skillAnalysis.score * 0.3 + experienceMatch * 0.7
)

// Skills only (ignore experience)
const overall = Math.round(skillAnalysis.score)
```

---

## 🔧 Medium Customizations

### 5. Enable Multiple Job Boards

**Current:** Remotive only
**Available:** Remotive + The Muse

**File:** `/opt/job-tracker/src/lib/job-monitor.ts`

**Replace entire file with:**
```bash
cd /opt/job-tracker
cp docs/job-monitor-multi-source.ts src/lib/job-monitor.ts
npm run build
systemctl restart job-tracker
```

**What this does:**
- Adds The Muse API (company culture + jobs)
- Fetches from both sources in parallel
- Removes duplicates automatically
- Shows source in alerts: "New job from Remotive: ..."

---

### 6. Add More Tech Keywords

**File:** `/opt/job-tracker/src/lib/ai-service.ts`
**Line:** 69-75

**Current keywords:**
```typescript
const techKeywords = [
  'javascript', 'typescript', 'python', 'java', 'react', 'node',
  'angular', 'vue', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
  'sql', 'nosql', 'mongodb', 'postgresql', 'redis', 'git',
  'ci/cd', 'agile', 'scrum', 'rest', 'graphql', 'api'
]
```

**Add yours:**
```typescript
const techKeywords = [
  // Existing...
  'javascript', 'typescript', 'python', 'java', 'react', 'node',

  // Add these:
  'svelte', 'nextjs', 'nuxt', 'remix', 'astro',
  'golang', 'rust', 'c++', 'c#', '.net',
  'terraform', 'ansible', 'jenkins', 'gitlab',
  'kafka', 'rabbitmq', 'elasticsearch', 'nginx',
  'flutter', 'react-native', 'swift', 'kotlin',
  'machine-learning', 'ai', 'data-science', 'mlops'
]
```

---

## ⏰ Automated Scanning

### 7. Set Up Daily Auto-Scan

**Step 1:** Create the script
```bash
ssh root@jobapp.aigrowise.com -p 2222
mkdir -p /opt/job-tracker/scripts
nano /opt/job-tracker/scripts/scan-jobs.sh
```

**Paste this:**
```bash
#!/bin/bash
curl -X POST http://localhost:3000/api/monitor \
  -H "Content-Type: application/json" \
  -d '{"userId":"default-user-id"}' \
  >> /var/log/job-tracker-cron.log 2>&1
```

**Step 2:** Make executable
```bash
chmod +x /opt/job-tracker/scripts/scan-jobs.sh
```

**Step 3:** Add to crontab
```bash
crontab -e
```

**Add one of these lines:**

```bash
# Every day at 9 AM
0 9 * * * /opt/job-tracker/scripts/scan-jobs.sh

# Twice daily (9 AM and 6 PM)
0 9,18 * * * /opt/job-tracker/scripts/scan-jobs.sh

# Every hour (9 AM to 6 PM, Monday-Friday)
0 9-18 * * 1-5 /opt/job-tracker/scripts/scan-jobs.sh

# Every Monday at 9 AM
0 9 * * 1 /opt/job-tracker/scripts/scan-jobs.sh
```

**Step 4:** Verify it works
```bash
# Run manually first
/opt/job-tracker/scripts/scan-jobs.sh

# Check the log
tail -f /var/log/job-tracker-cron.log
```

---

## 🎨 UI Customization

### 8. Add Settings Panel to Dashboard

**File:** `/opt/job-tracker/src/components/Dashboard.tsx`

**Find line with imports:**
```typescript
import JobFitAnalyzer from './JobFitAnalyzer'
import AlertsPanel from './AlertsPanel'
```

**Add:**
```typescript
import JobSearchSettings from './JobSearchSettings'
```

**Find where AlertsPanel is used (~line 161):**
```typescript
{user?.id && <AlertsPanel userId={user.id} />}
```

**Add after it:**
```typescript
{user?.id && <JobSearchSettings userId={user.id} />}
```

**Copy the component:**
```bash
cd /opt/job-tracker
# Component file will be provided
npm run build
systemctl restart job-tracker
```

This adds a **gear icon** ⚙️ to dashboard with settings UI!

---

## 📊 View Your Configuration

### Check Current Settings

```bash
# View minimum fit score
grep -n "fitScore.overall >=" /opt/job-tracker/src/lib/job-monitor.ts

# View job age filter
grep -n "isRecent = new Date" /opt/job-tracker/src/lib/job-monitor.ts

# View AI weights
grep -n "skillAnalysis.score \*" /opt/job-tracker/src/lib/ai-service.ts

# View tech keywords
grep -A 5 "const techKeywords" /opt/job-tracker/src/lib/ai-service.ts
```

---

## 🧪 Testing Your Changes

### Test Locally (Before Deploying)

```bash
# 1. SSH to server
ssh root@jobapp.aigrowise.com -p 2222

# 2. Navigate to project
cd /opt/job-tracker

# 3. Make your changes
nano src/lib/job-monitor.ts

# 4. Rebuild
npm run build

# 5. Restart
systemctl restart job-tracker

# 6. Test manually
curl -X POST http://localhost:3000/api/monitor \
  -H "Content-Type: application/json" \
  -d '{"userId":"default-user-id"}'

# 7. Check logs
journalctl -u job-tracker -n 50 | grep -E '\[Job Monitor\]|\[Remotive\]'
```

---

## 🔍 Common Customization Scenarios

### Scenario 1: "I'm getting too many irrelevant jobs"

**Solutions:**
1. ✅ Update your profile with MORE SPECIFIC skills
2. ✅ Increase minimum fit score to 70%
3. ✅ Reduce job age to last 3 days
4. ✅ Add more tech keywords you know

### Scenario 2: "I'm not finding enough jobs"

**Solutions:**
1. ✅ Lower minimum fit score to 40%
2. ✅ Increase job age to last 14 days
3. ✅ Add broader skills (e.g., "Full Stack", "JavaScript")
4. ✅ Enable multiple job boards (The Muse)

### Scenario 3: "Jobs don't match my experience level"

**Solutions:**
1. ✅ Adjust AI weight to prioritize experience:
   ```typescript
   skillAnalysis.score * 0.3 + experienceMatch * 0.7
   ```
2. ✅ Update your profile "Years of Experience"
3. ✅ Add level-specific keywords to filter

### Scenario 4: "I want only senior-level roles"

**File:** `/opt/job-tracker/src/lib/job-monitor.ts`

**Add filter after line 140:**
```typescript
.filter((job: RemotiveJob) => {
  const jobText = `${job.title} ${job.description}`.toLowerCase()
  const hasSkillMatch = skills.some(skill => jobText.includes(skill.toLowerCase()))
  const isRecent = new Date(job.publication_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Add this:
  const isSeniorLevel = jobText.includes('senior') || jobText.includes('lead') || jobText.includes('principal')

  return hasSkillMatch && isRecent && isSeniorLevel  // Changed
})
```

---

## 📚 Reference Files

All on server at `/opt/job-tracker/docs/`:

1. **`JOB_BOARD_CUSTOMIZATION_GUIDE.md`**
   - Complete algorithm explanation
   - All customization options
   - Integration examples

2. **`job-board-integrations.ts`**
   - Code for LinkedIn, Indeed, etc.
   - RSS feed parsers
   - API examples

3. **`REMOTIVE_INTEGRATION_SUCCESS.md`**
   - Current setup details
   - Test results
   - Troubleshooting

4. **`CUSTOMIZATION_QUICK_START.md`** (this file)
   - Quick reference
   - Copy-paste code snippets
   - Common scenarios

---

## 🆘 Getting Help

### Check Logs
```bash
# Real-time logs
journalctl -u job-tracker -f

# Last 100 lines
journalctl -u job-tracker -n 100

# Search for errors
journalctl -u job-tracker | grep -i error

# Job monitor specific
journalctl -u job-tracker | grep '\[Job Monitor\]'
```

### Test Components

```bash
# Test Remotive API directly
curl -s 'https://remotive.com/api/remote-jobs?limit=5' | head -50

# Test your monitor endpoint
curl -X POST http://localhost:3000/api/monitor \
  -H "Content-Type: application/json" \
  -d '{"userId":"default-user-id"}'

# Test alerts endpoint
curl 'http://localhost:3000/api/alerts?userId=default-user-id' | head -100
```

### Verify Database

```bash
# Check recent jobs
sudo -u postgres psql -d job_tracker -c \
  "SELECT title, company, \"fitScore\", source FROM job_opportunities ORDER BY \"createdAt\" DESC LIMIT 5;"

# Check alerts
sudo -u postgres psql -d job_tracker -c \
  "SELECT message, \"isRead\" FROM alerts ORDER BY \"createdAt\" DESC LIMIT 5;"

# Check user skills
sudo -u postgres psql -d job_tracker -c \
  "SELECT skills, experience FROM users WHERE id='default-user-id';"
```

---

## 🚀 Quick Start Checklist

- [ ] Update your profile with specific skills
- [ ] Set minimum fit score (50% = balanced, 70% = selective)
- [ ] Choose job age filter (7 days = balanced)
- [ ] Test manual scan: "Scan Job Boards" button
- [ ] Check alerts: Bell icon should show results
- [ ] (Optional) Enable multiple job boards
- [ ] (Optional) Set up daily auto-scan
- [ ] (Optional) Add settings UI to dashboard

---

**Need more help?** Check `/opt/job-tracker/docs/` for detailed guides!
