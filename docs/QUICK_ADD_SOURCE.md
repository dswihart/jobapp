# Quick Reference: Add a Job Source

## 5-Step Process

### 1. Copy Template
```bash
ssh root@jobapp.aigrowise.com -p 2222
cd /opt/job-tracker/docs
cp TEMPLATE-source.example ../src/lib/sources/indeed-source.ts
```

### 2. Edit Your Source File
```bash
nano /opt/job-tracker/src/lib/sources/indeed-source.ts
```

Change:
- Class name: `YourNameSource` → `IndeedSource`
- Display name: `'Your Job Board Name'` → `'Indeed'`
- API URL: Update to your job board's API
- Mapping logic: Update to match your API's response format

### 3. Register Source
```bash
nano /opt/job-tracker/src/lib/sources/index.ts
```

Add:
```typescript
import { IndeedSource } from './indeed-source'

export const SOURCES: JobSource[] = [
  new RemotiveSource(),
  new MuseSource(),
  new IndeedSource(),  // ← Add this
]
```

### 4. Deploy
```bash
cd /opt/job-tracker
npm run build
systemctl restart job-tracker
```

### 5. Test
```bash
# Test scan
curl -X POST http://localhost:3000/api/monitor \
  -H "Content-Type: application/json" \
  -d '{"userId":"default-user-id"}'

# Check logs
journalctl -u job-tracker -n 50 | grep '\[Indeed\]'
```

---

## Matching Algorithm

Jobs are matched using:

1. **Skills Match (60%)** - Your profile skills vs job text
2. **Experience Match (40%)** - Your years vs job requirements
3. **Minimum Fit: 50%** - Only jobs ≥50% are saved
4. **Recency: 7 days** - Only recent jobs
5. **At least 1 skill match** - Required before AI scoring

---

## Disable a Source

Edit `/opt/job-tracker/src/lib/sources/index.ts`:

```typescript
export const SOURCES: JobSource[] = [
  new RemotiveSource(),
  // new MuseSource(),  // ← Comment out to disable
]
```

Or in the source file, set:
```typescript
config: JobSourceConfig = {
  name: 'The Muse',
  enabled: false,  // ← Set to false
  type: 'api'
}
```

---

## Full Documentation

- `/opt/job-tracker/docs/HOW_TO_ADD_JOB_SOURCES.md` - Complete guide with examples
- `/opt/job-tracker/docs/TEMPLATE-source.example` - Copy-paste template
- `/opt/job-tracker/docs/CUSTOMIZATION_QUICK_START.md` - UI customization

---

## Current Active Sources

```bash
# Check what sources are active
journalctl -u job-tracker -n 20 | grep "Active sources:"
```

Currently enabled:
- ✅ Remotive (1600+ remote jobs)
- ✅ The Muse (company culture + jobs)
