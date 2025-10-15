# How to Add Your Own Job Sources

This guide shows you how to add custom job boards to the job tracker system.

---

## 📋 Matching Criteria

The job tracker matches jobs against your profile using:

### 1. **Skills Match (60% weight)**
- Compares your profile skills against job title, description, and requirements
- Case-insensitive matching
- Partial matches count (e.g., "React" matches "React.js")
- **Tech keywords** boost score: javascript, typescript, python, java, react, node, angular, vue, docker, kubernetes, aws, azure, sql, mongodb, git, ci/cd, rest, graphql

### 2. **Experience Match (40% weight)**
- Extracts years from job posting ("5+ years", "senior", "junior")
- Compares against your profile experience
- Formula: `100 - |userYears - jobYears| * 10` (capped at 0-100)
- Example: If you have 5 years and job wants 3-5 years → high match

### 3. **Minimum Fit Score Filter**
- Default: 50% minimum
- Only jobs scoring ≥50% are saved and trigger alerts
- Customizable in `/opt/job-tracker/src/lib/job-monitor.ts` line 56

### 4. **Recency Filter**
- Default: Last 7 days only
- Filters out old job postings
- Customizable per source

### 5. **Skill Presence Check**
- At least one of your skills must appear in job text
- Happens before AI scoring to reduce API calls
- Makes scanning faster

---

## 🚀 Quick Start: Add a New Source (5 Steps)

### Step 1: Copy the Template

```bash
ssh root@jobapp.aigrowise.com -p 2222
cd /opt/job-tracker/sources
cp TEMPLATE-source.ts linkedin-source.ts  # Replace 'linkedin' with your source name
```

### Step 2: Customize the Class

Edit `linkedin-source.ts`:

```typescript
import { BaseJobSource, JobPosting, JobSourceConfig } from '../job-source-interface'

// Define your API response format
interface LinkedInJob {
  jobId: string
  title: string
  companyName: string
  description: string
  location: string
  postedDate: string
  applyUrl: string
}

export class LinkedInSource extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'LinkedIn',           // Display name
    enabled: true,              // true = active, false = disabled
    type: 'api',                // 'api' or 'rss'
    rateLimitPerHour: 100      // Optional rate limit
  }

  private readonly API_URL = 'https://api.linkedin.com/v2/jobs'
  private readonly API_KEY = process.env.LINKEDIN_API_KEY  // If needed

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    try {
      this.log('Fetching jobs...')

      // Make API request
      const response = await fetch(`${this.API_URL}?limit=${limit}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`  // If needed
        }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const jobs = data.jobs || []

      this.log(`Received ${jobs.length} jobs`)

      // Filter by skills
      const skillFiltered = this.filterBySkills(
        jobs,
        skills,
        (job: LinkedInJob) => `${job.title} ${job.description}`
      )

      // Filter by recency (last 7 days)
      const recentJobs = this.filterByRecency(
        skillFiltered,
        7,
        (job: LinkedInJob) => new Date(job.postedDate)
      )

      // Map to standard format
      const standardJobs: JobPosting[] = recentJobs
        .slice(0, 20)
        .map((job: LinkedInJob) => ({
          title: job.title,
          company: job.companyName,
          description: job.description,
          location: job.location,
          jobUrl: job.applyUrl,
          postedDate: new Date(job.postedDate),
          source: this.config.name
        }))

      this.log(`Filtered to ${standardJobs.length} relevant jobs`)
      return standardJobs

    } catch (error) {
      this.log(`Error: ${error}`, 'error')
      return []
    }
  }
}
```

### Step 3: Register Your Source

Edit `/opt/job-tracker/sources/index.ts`:

```typescript
import { LinkedInSource } from './linkedin-source'  // Add import

export const SOURCES: JobSource[] = [
  new RemotiveSource(),
  new MuseSource(),
  new LinkedInSource(),  // Add here
]
```

### Step 4: Copy Files to Server

```bash
# From your local machine
scp -P 2222 sources/linkedin-source.ts root@jobapp.aigrowise.com:/opt/job-tracker/src/lib/sources/
scp -P 2222 sources/index.ts root@jobapp.aigrowise.com:/opt/job-tracker/src/lib/sources/
scp -P 2222 job-source-interface.ts root@jobapp.aigrowise.com:/opt/job-tracker/src/lib/
scp -P 2222 job-monitor-pluggable.ts root@jobapp.aigrowise.com:/opt/job-tracker/src/lib/job-monitor.ts
```

### Step 5: Deploy

```bash
ssh root@jobapp.aigrowise.com -p 2222
cd /opt/job-tracker
npm run build
systemctl restart job-tracker
```

**Done!** Your new source will automatically be included in all scans.

---

## 🔧 Advanced Customization

### Change Minimum Fit Score

Edit `/opt/job-tracker/src/lib/job-monitor.ts` line ~56:

```typescript
// More selective (70% minimum)
if (fitScore.overall >= 70) {

// More inclusive (40% minimum)
if (fitScore.overall >= 40) {
```

### Change Recency Filter

In your source file, change the `filterByRecency` parameter:

```typescript
// Last 24 hours
this.filterByRecency(jobs, 1, dateExtractor)

// Last 3 days
this.filterByRecency(jobs, 3, dateExtractor)

// Last 30 days
this.filterByRecency(jobs, 30, dateExtractor)
```

### Add Custom Filtering Logic

Override the `fetchJobs` method with additional filters:

```typescript
async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
  // ... fetch jobs ...

  // Add custom filter
  const seniorOnly = jobs.filter(job =>
    job.title.toLowerCase().includes('senior') ||
    job.title.toLowerCase().includes('lead')
  )

  // Add salary filter
  const withSalary = jobs.filter(job =>
    job.salary && parseInt(job.salary.replace(/\D/g, '')) >= 100000
  )

  return standardJobs
}
```

### Disable a Source Temporarily

Edit `/opt/job-tracker/sources/index.ts`:

```typescript
export const SOURCES: JobSource[] = [
  new RemotiveSource(),
  // new MuseSource(),  // Disabled - comment out or remove
  new LinkedInSource(),
]
```

Or set `enabled: false` in the source config:

```typescript
config: JobSourceConfig = {
  name: 'The Muse',
  enabled: false,  // Disabled
  type: 'api'
}
```

---

## 📦 Example Sources

### Example 1: Indeed API

```typescript
export class IndeedSource extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'Indeed',
    enabled: true,
    type: 'api'
  }

  private readonly API_URL = 'https://api.indeed.com/ads/apisearch'
  private readonly PUBLISHER_ID = process.env.INDEED_PUBLISHER_ID

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    const query = skills.join(' OR ')

    const response = await fetch(
      `${this.API_URL}?publisher=${this.PUBLISHER_ID}&q=${encodeURIComponent(query)}&limit=${limit}&format=json`
    )

    const data = await response.json()

    return data.results.map((job: any) => ({
      title: job.jobtitle,
      company: job.company,
      description: job.snippet,
      location: job.formattedLocation,
      jobUrl: job.url,
      postedDate: new Date(job.date),
      source: this.config.name
    }))
  }
}
```

### Example 2: RSS Feed Source

```typescript
export class WeWorkRemotelySource extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'We Work Remotely',
    enabled: true,
    type: 'rss'
  }

  private readonly RSS_URL = 'https://weworkremotely.com/remote-jobs.rss'

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    const response = await fetch(this.RSS_URL)
    const rssText = await response.text()

    // Simple XML parsing (use a proper parser in production)
    const itemRegex = /<item>(.*?)<\/item>/gs
    const items = Array.from(rssText.matchAll(itemRegex))

    return items
      .slice(0, limit)
      .map(match => {
        const xml = match[1]
        return {
          title: xml.match(/<title>(.*?)<\/title>/)?.[1] || '',
          company: 'Unknown',
          description: xml.match(/<description>(.*?)<\/description>/)?.[1] || '',
          jobUrl: xml.match(/<link>(.*?)<\/link>/)?.[1] || '',
          source: this.config.name
        } as JobPosting
      })
      .filter(job => {
        const text = `${job.title} ${job.description}`.toLowerCase()
        return skills.some(skill => text.includes(skill.toLowerCase()))
      })
  }
}
```

### Example 3: Stack Overflow RSS

```typescript
export class StackOverflowSource extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'Stack Overflow',
    enabled: true,
    type: 'rss'
  }

  private readonly RSS_URL = 'https://stackoverflow.com/jobs/feed'

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    // Similar to We Work Remotely example
    // Parse RSS and return JobPosting[]
  }
}
```

---

## 🧪 Testing Your Source

### Test Manually

```bash
ssh root@jobapp.aigrowise.com -p 2222

# Test the scan
curl -X POST http://localhost:3000/api/monitor \
  -H "Content-Type: application/json" \
  -d '{"userId":"default-user-id"}'

# Check logs
journalctl -u job-tracker -n 100 | grep '\[Your Source Name\]'
```

### Test Health Check

Add to your source:

```typescript
async healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(this.API_URL, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}
```

Test it:

```typescript
import { LinkedInSource } from './sources/linkedin-source'

const source = new LinkedInSource()
const isHealthy = await source.healthCheck()
console.log('LinkedIn source healthy:', isHealthy)
```

---

## 🔍 Debugging

### Check Logs

```bash
# Real-time logs
journalctl -u job-tracker -f

# Search for your source
journalctl -u job-tracker | grep '\[Your Source Name\]'

# Check for errors
journalctl -u job-tracker | grep -i error
```

### Common Issues

**Issue: "API error: 401"**
- Solution: Check your API key is set correctly in environment variables

**Issue: "Received 0 jobs"**
- Solution: Check your API endpoint and response format
- Verify the data extraction: `data.jobs` vs `data.results` vs `data.data`

**Issue: "Filtered to 0 relevant jobs"**
- Solution: Skills aren't matching job text
- Check skills in user profile: Update via Dashboard → Profile button

**Issue: Source not appearing in scans**
- Solution: Make sure it's imported and added to `SOURCES` array in `sources/index.ts`
- Check `enabled: true` in config

---

## 📚 Helper Methods Available

The `BaseJobSource` class provides these helpers:

### `filterBySkills(jobs, skills, textExtractor)`
Filters jobs that contain at least one skill

```typescript
const filtered = this.filterBySkills(
  jobs,
  ['React', 'Node.js'],
  (job) => `${job.title} ${job.description}`
)
```

### `filterByRecency(jobs, maxAgeDays, dateExtractor)`
Filters jobs posted within the last N days

```typescript
const recent = this.filterByRecency(
  jobs,
  7,  // last 7 days
  (job) => new Date(job.posted_date)
)
```

### `log(message, level)`
Logs with your source name prefix

```typescript
this.log('Fetching jobs...')  // [Your Source] Fetching jobs...
this.log('API failed', 'error')  // [Your Source] API failed
```

---

## 🎯 Best Practices

1. **Always return empty array on error** - Don't let one source crash the whole scan
2. **Use rate limiting** - Set `rateLimitPerHour` if API has limits
3. **Filter early** - Filter by skills before making expensive AI calls
4. **Test with small limits first** - Use `limit=5` for initial testing
5. **Log progress** - Use `this.log()` to track what's happening
6. **Handle missing fields gracefully** - Use `|| undefined` for optional fields
7. **Deduplicate at the source level** - If your API returns duplicates, filter them

---

## 📞 Need Help?

Check the template file: `/opt/job-tracker/sources/TEMPLATE-source.ts`

View existing implementations:
- `/opt/job-tracker/sources/remotive-source.ts` (API example)
- `/opt/job-tracker/sources/themuse-source.ts` (API with filtering)

Check logs for errors:
```bash
journalctl -u job-tracker -n 100 | grep -E 'error|Error|ERROR'
```
