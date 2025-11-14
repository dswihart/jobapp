# Server Restart Procedure

## When to Use This
If you encounter "internal server error" or build manifest errors like:
```
Error: ENOENT: no such file or directory, open '/opt/job-tracker/.next/server/pages/_app/build-manifest.json'
```

## Solution

### 1. Stop All Processes
```bash
pkill -9 -f 'next-server' && pkill -9 -f 'next dev' && pkill -9 node
```

### 2. Clear Build Cache
```bash
cd /opt/job-tracker
rm -rf .next
```

### 3. Start Fresh Dev Server
```bash
cd /opt/job-tracker
PORT=3000 npm run dev > /tmp/nextjs-dev.log 2>&1 &
```

### 4. Monitor Logs
```bash
tail -f /tmp/nextjs-dev.log
```

Wait for: `✓ Ready in XXXXms`

### 5. Verify Server Status
```bash
curl -I http://localhost:3000
# Should return HTTP 307 (redirect to login)
```

## Root Cause
Multiple overlapping Next.js dev server instances can create corrupted build artifacts, causing manifest file lookup failures.

## Date Fixed
October 21, 2025
