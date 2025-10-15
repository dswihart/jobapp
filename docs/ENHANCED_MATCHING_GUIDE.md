# Enhanced Job Matching with CV Upload & LLM Integration

## 🚀 What's New

### 1. **CV/Resume Upload with AI Extraction**
- Upload PDF, DOC, DOCX, or TXT resumes
- AI automatically extracts:
  - Skills (primary, secondary, learning)
  - Work history with achievements
  - Education & certifications
  - Years of experience & seniority level
  - Job preferences & salary expectations
  - Professional summary

### 2. **Rich Profile Editor**
- **Basic Info**: Name, email, summary, location, seniority
- **Skills**: Organized into primary (core), secondary, and learning
- **Experience**: Complete work history with achievements
- **Preferences**: Work mode, availability, salary, job titles, industries

### 3. **Enhanced AI Matching**
- Uses Claude 3.5 Sonnet for intelligent matching
- Considers:
  - **Skill Match** (35% weight): Primary vs secondary vs learning skills
  - **Experience Match** (25%): Years and relevance
  - **Seniority Match** (15%): Level alignment
  - **Title Match** (15%): Past roles vs current opening
  - **Industry Match** (5%): Industry alignment
  - **Location Match** (5%): Work preference vs job location

### 4. **Detailed Match Analysis**
- Overall fit score (0-100%)
- Breakdown by category
- Matched skills list
- Missing skills to develop
- Personalized recommendations
- Key strengths highlighted
- Potential concerns identified

---

## 📋 Database Schema Updates

New fields added to `users` table:

```sql
-- Profile enrichment
summary TEXT
location VARCHAR(255)
salaryExpectation VARCHAR(255)
workPreference VARCHAR(255)
availability VARCHAR(255)

-- Experience details
yearsOfExperience INTEGER
seniorityLevel VARCHAR(255)

-- Skills categorization
primarySkills TEXT[]
secondarySkills TEXT[]
learningSkills TEXT[]

-- Career info
education TEXT[]
jobTitles TEXT[]
industries TEXT[]
excludeKeywords TEXT[]

-- Rich data
workHistory JSONB
extractedProfile JSONB
lastExtracted TIMESTAMP
```

---

## 🎯 How to Use

### For Users:

#### Step 1: Upload Your CV
1. Open your profile (click "Profile" button in dashboard)
2. Go to "Upload CV" tab
3. Select your resume file (PDF, DOC, DOCX, TXT)
4. Click "Upload & Extract Profile"
5. Wait 10-20 seconds for AI extraction

#### Step 2: Review & Edit
1. Check "Basic Info" tab - verify name, email, skills
2. Review "Experience" tab - see extracted work history
3. Update "Preferences" tab - set job preferences
4. Click "Save Profile"

#### Step 3: Better Job Matching
- Job scans now use your detailed profile
- Get more accurate fit scores
- See personalized recommendations
- View matched vs missing skills

### For Developers:

#### API Endpoints:

**Upload CV:**
```bash
POST /api/profile/upload-cv
Content-Type: multipart/form-data

file: <resume file>
userId: <user id>

Response:
{
  "fileUrl": "/uploads/resumes/...",
  "fileText": "extracted text content",
  "filename": "..."
}
```

**Extract Profile:**
```bash
POST /api/profile/extract
Content-Type: application/json

{
  "userId": "user-id",
  "resumeText": "full resume text",
  "resumeUrl": "/uploads/resumes/..."
}

Response:
{
  "success": true,
  "profile": {
    "name": "John Doe",
    "primarySkills": ["React", "Node.js"],
    "yearsOfExperience": 5,
    "workHistory": [...],
    ...
  }
}
```

**Get/Update Profile:**
```bash
GET /api/profile?userId=xxx
POST /api/profile
{
  "userId": "xxx",
  "profile": { ... }
}
```

---

## 🔧 Configuration

### Required Environment Variables:

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
```

Get your API key from: https://console.anthropic.com/

### Cost Estimation:

**Profile Extraction:**
- ~2000 tokens per resume
- Cost: ~$0.006 per extraction
- Model: Claude 3.5 Sonnet

**Job Matching:**
- ~1500 tokens per match
- Cost: ~$0.0045 per match
- Model: Claude 3.5 Sonnet

**Monthly estimate for 100 users:**
- 100 profile extractions: $0.60
- 1000 job matches: $4.50
- **Total: ~$5/month**

---

## 🎨 UI Components

### CVUpload Component
```typescript
<CVUpload
  userId={user.id}
  onProfileExtracted={() => loadProfile()}
/>
```

Features:
- Drag & drop file upload
- File type validation (PDF, DOC, DOCX, TXT)
- Size limit (5MB)
- Progress indicators
- Success/error messaging

### EnhancedProfileEditor Component
```typescript
<EnhancedProfileEditor
  userId={user.id}
  onClose={() => setShowProfile(false)}
/>
```

Features:
- Tabbed interface (CV Upload, Basic Info, Experience, Preferences)
- Skill categorization (primary/secondary/learning)
- Work history display
- Education timeline
- Job preferences

---

## 📊 Matching Algorithm

### Old Algorithm (Basic):
```
Overall Score = (Skill Match × 60%) + (Experience Match × 40%)
```

### New Algorithm (Enhanced):
```
Overall Score =
  (Skill Match × 35%) +
  (Experience Match × 25%) +
  (Seniority Match × 15%) +
  (Title Match × 15%) +
  (Industry Match × 5%) +
  (Location Match × 5%)
```

### Skill Match Calculation:
- Primary skill match: 100% weight
- Secondary skill match: 75% weight
- Learning skill match: 25% weight

Example:
- Job requires: React, Node.js, Docker
- User has:
  - Primary: React, Node.js
  - Secondary: Docker
  - Learning: Kubernetes

Score: (2×100% + 1×75%) / 3 = 92%

### Experience Match:
- Exact match (±0 years): 100%
- ±1-2 years: 90%
- ±3-4 years: 75%
- ±5+ years: 50%

### Seniority Match:
- Exact level: 100%
- One level off: 70%
- Two+ levels off: 40%

---

## 🧪 Testing

### Test Profile Extraction:

1. Create test resume (test-resume.txt):
```
John Doe
Software Engineer

Skills: React, Node.js, TypeScript, Python, AWS

Experience:
- Senior Developer at Tech Corp (2020-2023)
  • Built scalable microservices
  • Led team of 5 developers

- Developer at StartupCo (2018-2020)
  • Full-stack development
  • React and Node.js

Education:
BS Computer Science, MIT (2018)
```

2. Upload via UI or API:
```bash
curl -X POST http://localhost:3000/api/profile/upload-cv \
  -F "file=@test-resume.txt" \
  -F "userId=default-user-id"
```

3. Extract:
```bash
curl -X POST http://localhost:3000/api/profile/extract \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "default-user-id",
    "resumeText": "...",
    "resumeUrl": "/uploads/..."
  }'
```

4. Verify in database:
```sql
SELECT
  name,
  "primarySkills",
  "yearsOfExperience",
  "seniorityLevel",
  "workHistory"
FROM users
WHERE id = 'default-user-id';
```

---

## 🔄 Migration Steps

### 1. Update Database Schema
```bash
ssh root@jobapp.aigrowise.com -p 2222
sudo -u postgres psql -d job_tracker -f /opt/job-tracker/docs/migration-enhanced-profile.sql
```

### 2. Add API Key
```bash
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" >> /opt/job-tracker/.env.local
```

### 3. Install Dependencies
```bash
cd /opt/job-tracker
npm install @anthropic-ai/sdk pdf-parse
```

### 4. Copy Files & Build
```bash
# Files will be copied via scp
npm run build
systemctl restart job-tracker
```

### 5. Verify
- Upload a test resume
- Check profile extraction works
- Scan job boards
- Verify enhanced match scores appear

---

## 🐛 Troubleshooting

### Issue: "ANTHROPIC_API_KEY not configured"
**Solution:** Add API key to `.env.local` and restart service

### Issue: "PDF parsing failed"
**Solution:** Install pdf-parse: `npm install pdf-parse`

### Issue: Profile extraction takes too long
**Reason:** Claude API can take 10-20 seconds for complex resumes
**Solution:** This is normal, show progress indicator to user

### Issue: Match scores seem off
**Solution:** Check that user has filled out detailed profile (not just uploaded CV)

### Issue: Skills not categorized correctly
**Solution:** User can manually edit skills in Basic Info tab

---

## 📈 Performance Considerations

### Caching:
- Store extracted profile in `extractedProfile` JSONB field
- Only re-extract if user uploads new CV
- Cache match results for 24 hours

### Batch Processing:
- Don't call AI for every job
- Filter jobs first (basic keyword match)
- Only use AI for jobs passing initial filter

### Rate Limiting:
- Anthropic: 50 requests/min (Tier 1)
- Consider queueing if bulk processing

---

## 🎓 Best Practices

### For Users:
1. Upload a detailed, well-formatted resume
2. Review AI-extracted data for accuracy
3. Add any missing skills manually
4. Keep profile updated as you gain experience
5. Set realistic job preferences

### For Developers:
1. Handle AI API errors gracefully (fallback to basic matching)
2. Validate and sanitize all file uploads
3. Store resume files securely
4. Respect user privacy (allow profile deletion)
5. Monitor API costs and usage

---

## 📚 Additional Resources

- **Anthropic Documentation**: https://docs.anthropic.com/
- **Claude API Reference**: https://docs.anthropic.com/claude/reference/
- **PDF Parsing**: https://www.npmjs.com/package/pdf-parse
- **Prisma JSON Fields**: https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#json

---

## 🔮 Future Enhancements

- [ ] Support more file formats (LinkedIn PDF exports)
- [ ] OCR for scanned/image-based resumes
- [ ] Real-time skill gap analysis
- [ ] Career path recommendations
- [ ] Salary negotiation insights
- [ ] Interview preparation tips
- [ ] Resume improvement suggestions
- [ ] Cover letter generation
- [ ] Job application tracking from matches
- [ ] Email alerts for perfect matches (95%+ fit)

---

**Status:** ✅ Ready for deployment
**Last Updated:** 2025-10-03
