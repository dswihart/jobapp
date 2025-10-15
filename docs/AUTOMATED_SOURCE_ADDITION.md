# Fully Automated Job Source Addition

## ✅ Zero Manual Steps Required!

The system now automatically handles everything when you add a new job source through the web UI.

---

## 🚀 How to Add a Source (Via Web UI)

1. **Open your dashboard** at `http://jobapp.aigrowise.com`

2. **Locate "Job Sources" section** at the top (before Progress Chart)

3. **Click "Add Source" button**

4. **Fill in the form:**
   - **Source Name**: e.g., "LinkedIn", "Indeed", "Stack Overflow"
   - **API URL**: The endpoint for fetching jobs
   - **Type**: API or RSS Feed

5. **Click "Add Source & Deploy"**

6. **Wait ~60 seconds** - The system automatically:
   - ✅ Creates the source integration file
   - ✅ Rebuilds the application
   - ✅ Restarts the service
   - ✅ Your source is ready!

---

## 🎯 What Happens Automatically

### Step 1: File Generation (Instant)
```
✓ Creates /opt/job-tracker/src/lib/sources/your-source-source.ts
✓ Auto-generated with proper TypeScript types
✓ Includes filtering, skill matching, and date filtering
```

### Step 2: Build (30-45 seconds)
```
✓ Runs: npm run build
✓ Compiles TypeScript
✓ Optimizes for production
```

### Step 3: Deployment (5-10 seconds)
```
✓ Runs: systemctl restart job-tracker
✓ Service restarts with new source
✓ Source appears in dashboard immediately
```

### Step 4: Dynamic Loading
```
✓ No need to modify index.ts
✓ Source automatically discovered on startup
✓ Ready for job scanning!
```

---

## 🔧 What Gets Generated

When you add "LinkedIn" as a source, the system creates:

```typescript
// /opt/job-tracker/src/lib/sources/linkedin-source.ts

import { BaseJobSource, JobPosting, JobSourceConfig } from '../job-source-interface'

interface LinkedInSourceJob {
  id: number | string
  title: string
  company: string
  description: string
  location?: string
  posted_date?: string
  url?: string
}

export class LinkedInSource extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'LinkedIn',
    enabled: true,
    type: 'api',
    rateLimitPerHour: 100
  }

  private readonly API_URL = 'https://your-api-url.com'

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    // Fetch from API
    // Filter by skills (60% weight)
    // Filter by recency (7 days)
    // Map to standard format
    // Return jobs
  }
}
```

---

## 📊 Verify Source Added Successfully

### Check in Dashboard:
- Refresh the page
- Look at "Job Sources" section
- Your new source should appear with a green checkmark

### Check via API:
```bash
curl http://localhost:3000/api/sources
```

Expected output:
```json
{
  "sources": [
    {"name": "Remotive", "enabled": true, "type": "api"},
    {"name": "The Muse", "enabled": true, "type": "api"},
    {"name": "LinkedIn", "enabled": true, "type": "api"}
  ]
}
```

### Test Scanning:
Click "Scan Job Boards" button in dashboard - your new source will be included!

---

## 🛠 Customizing Generated Sources

The auto-generated source is a **template** that works for most APIs. You may need to customize:

### 1. API Response Format

If your API returns jobs in a different structure, edit:
```typescript
// Change this line to match your API
const jobs = data.jobs || data.results || data.data || []
```

### 2. Field Mapping

Update to match your API's field names:
```typescript
title: job.title,           // Or job.jobTitle, job.name, etc.
company: job.company,       // Or job.companyName, job.employer
description: job.description, // Or job.summary, job.details
```

### 3. Authentication

If your API requires authentication:
```typescript
private readonly API_KEY = process.env.LINKEDIN_API_KEY

// In fetchJobs():
headers: {
  'Authorization': `Bearer ${this.API_KEY}`,
  'Accept': 'application/json'
}
```

Add to `/opt/job-tracker/.env.local`:
```
LINKEDIN_API_KEY=your_key_here
```

### 4. Rate Limiting

Adjust request limits:
```typescript
config: JobSourceConfig = {
  name: 'LinkedIn',
  enabled: true,
  type: 'api',
  rateLimitPerHour: 50  // Lower for strict APIs
}
```

---

## 🔄 Enable/Disable Sources

**Via Web UI:**
- Toggle the switch next to any source
- Changes apply immediately to next scan

**Via API:**
```bash
# Disable a source
curl -X POST http://localhost:3000/api/sources/toggle \
  -H "Content-Type: application/json" \
  -d '{"name":"LinkedIn","enabled":false}'

# Enable a source
curl -X POST http://localhost:3000/api/sources/toggle \
  -H "Content-Type: application/json" \
  -d '{"name":"LinkedIn","enabled":true}'
```

---

## 🧪 Testing New Sources

### 1. Add the source via UI
Wait for auto-deployment (~60 seconds)

### 2. Check logs
```bash
ssh root@jobapp.aigrowise.com -p 2222
journalctl -u job-tracker -n 50 | grep '\[Your Source Name\]'
```

### 3. Trigger manual scan
Click "Scan Job Boards" button in dashboard

### 4. Check results
```bash
journalctl -u job-tracker -f | grep -E '\[Job Monitor\]|\[LinkedIn\]'
```

Expected output:
```
[LinkedIn] Fetching jobs...
[LinkedIn] Received 50 jobs
[LinkedIn] Filtered to 5 relevant jobs
[Job Monitor] Found 5 total jobs from all sources
```

---

## ⚠️ Troubleshooting

### Source not appearing after 60 seconds

**Check rebuild logs:**
```bash
journalctl -u job-tracker -n 100 | grep '\[Source Manager\]'
```

**Check for build errors:**
```bash
cd /opt/job-tracker && npm run build
```

### Source appears but returns 0 jobs

**Check API connection:**
```bash
curl https://your-api-url.com
```

**Check source logs:**
```bash
journalctl -u job-tracker -f | grep '\[Your Source Name\]'
```

**Common issues:**
- API URL incorrect
- API requires authentication (add API key)
- API response format different (customize field mapping)
- No jobs match your skills (check profile skills)

### Build fails after adding source

**View error details:**
```bash
cd /opt/job-tracker && npm run build 2>&1 | less
```

**Fix TypeScript errors:**
Edit: `/opt/job-tracker/src/lib/sources/your-source-source.ts`

**Rebuild manually:**
```bash
cd /opt/job-tracker
npm run build
systemctl restart job-tracker
```

---

## 📈 Current Active Sources

View all sources:
```bash
curl -s http://localhost:3000/api/sources | jq
```

Default sources:
- ✅ **Remotive** - 1600+ remote jobs, free API
- ✅ **The Muse** - Company culture + jobs, free API

---

## 🎓 Advanced: Manual Addition (Optional)

If you prefer manual control, you can still add sources the old way:

1. Copy template: `cp docs/TEMPLATE-source.example src/lib/sources/custom-source.ts`
2. Edit the file with your API details
3. Build: `npm run build`
4. Restart: `systemctl restart job-tracker`

The dynamic loader will discover it automatically!

---

## 🆘 Need Help?

- **Documentation**: `/opt/job-tracker/docs/HOW_TO_ADD_JOB_SOURCES.md`
- **Template**: `/opt/job-tracker/docs/TEMPLATE-source.example`
- **Quick Reference**: `/opt/job-tracker/docs/QUICK_ADD_SOURCE.md`

---

**System Status:** ✅ Fully Automated - No manual steps required!
