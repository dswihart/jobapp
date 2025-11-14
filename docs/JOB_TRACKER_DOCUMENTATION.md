# Job Tracker Application - Comprehensive Documentation

**Server:** jobapp.aigrowise.com
**Application Path:** /opt/job-tracker
**Last Updated:** October 20, 2025 (Updated with PENDING status and unified notifications)
**Version:** 0.1.0

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [AI Integration](#ai-integration)
7. [Components](#components)
8. [Deployment](#deployment)
9. [Configuration](#configuration)
10. [Job Monitoring System](#job-monitoring-system)
11. [Authentication & Authorization](#authentication--authorization)
12. [File Structure](#file-structure)
13. [Maintenance & Monitoring](#maintenance--monitoring)

---

## Application Overview

### Purpose
Job Tracker is an AI-powered job application tracking system designed to help job seekers manage their application pipeline with intelligent insights, automated job discovery, and progress visualization.

### Key Features
- **Application Management**: Track job applications through various stages (Draft, Pending, Applied, Interviewing, Rejected)
- **AI-Powered Job Matching**: Uses Anthropic Claude API to analyze job fit based on user profile
- **Automated Job Discovery**: Scans multiple job boards and RSS feeds for relevant opportunities
- **Resume Management**: Upload, manage, and tailor resumes for specific applications
- **Cover Letter Generation**: AI-assisted cover letter creation and management
- **Interview Tracking**: Schedule and track interviews with detailed notes
- **Contact Management**: Track recruiters and hiring managers
- **Follow-up Reminders**: Set reminders for follow-up actions
- **Progress Analytics**: Visualize application pipeline and track daily goals
- **Job Sources**: Configure custom job sources (RSS feeds, web scraping, APIs)
- **Alerts & Notifications**: Get notified about new job opportunities
- **Profile Extraction**: AI-powered CV parsing to extract candidate information

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5.6 (App Router)
- **React**: 19.0.0-rc
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS 4.1.14
- **UI Components**:
  - Headless UI (@headlessui/react 2.2.9)
  - Heroicons (@heroicons/react 2.2.0)
  - Lucide React (0.544.0)
- **Charts**: Recharts 3.3.0
- **Forms**: React Hook Form 7.63.0 with Zod 4.1.11 validation

### Backend
- **Runtime**: Node.js 20.19.5
- **Framework**: Next.js API Routes
- **ORM**: Prisma 6.16.3
- **Database**: PostgreSQL 17.6
- **Authentication**: NextAuth.js 5.0.0-beta.29
- **Password Hashing**: bcryptjs 3.0.2

### AI & Machine Learning
- **AI Provider**: Anthropic Claude API (@anthropic-ai/sdk 0.65.0)
- **Web Scraping**: Cheerio 1.1.2
- **Document Processing**:
  - Mammoth 1.11.0 (Word documents)
  - DOCX 9.5.1 (Word document generation)
  - File Saver 2.0.5

### Infrastructure
- **Web Server**: Nginx (reverse proxy)
- **SSL/TLS**: Let's Encrypt (Certbot managed)
- **Process Manager**: systemd
- **Package Manager**: npm 10.8.2

---

## Architecture

### Application Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (Port 80/443)                   │
│              SSL/TLS Termination & Reverse Proxy         │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js Server (Port 3000)                  │
│                  (Development Mode)                      │
├─────────────────────────────────────────────────────────┤
│  Frontend (React 19 + TypeScript)                       │
│  - Dashboard                                             │
│  - Application Management                                │
│  - Job Opportunities                                     │
│  - Profile Editor                                        │
│  - Resume Manager                                        │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              API Routes (Next.js)                        │
│  - /api/applications                                     │
│  - /api/ai/*                                             │
│  - /api/opportunities                                    │
│  - /api/auth/*                                           │
│  - /api/cron/scan-jobs                                   │
└────────────────────┬─────────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│  Prisma ORM      │      │  AI Services     │
│                  │      │  - Anthropic API │
│  PostgreSQL 17   │      │  - Job Matching  │
│  Port 5432       │      │  - CV Parsing    │
│  Database:       │      │  - Cover Letter  │
│  job_tracker     │      └──────────────────┘
└──────────────────┘
```

### Deployment Architecture

- **Domain**: jobapp.aigrowise.com
- **SSL**: Managed by Let's Encrypt
- **Reverse Proxy**: Nginx forwards traffic from ports 80/443 to Next.js on port 3000
- **Database**: PostgreSQL 17 running locally on port 5432
- **Additional Services**:
  - Prisma Studio: Port 5555 (database management UI)

---

## Database Schema

### Core Models

#### User
Stores user profile, preferences, and job search settings.

**Key Fields:**
- `id`: Unique identifier (CUID)
- `email`: User email (unique)
- `password`: Hashed password
- `name`: User's full name

**Profile Fields:**
- `skills`, `primarySkills`, `secondarySkills`, `learningSkills`: Skill categorization
- `experience`: Work experience description
- `yearsOfExperience`: Numeric experience value
- `seniorityLevel`: Career level (Junior, Mid, Senior, etc.)
- `summary`: Professional summary
- `location`: Current location
- `preferredCountries`: Preferred work locations
- `workPreference`: Remote/Hybrid/On-site
- `salaryExpectation`: Expected salary range

**Job Search Settings:**
- `jobTitles`: Preferred job titles
- `industries`: Target industries
- `excludeKeywords`: Keywords to filter out
- `minFitScore`: Minimum job match score (default: 40)
- `maxJobAgeDays`: Maximum job age to consider (default: 7)
- `autoScan`: Enable automatic job scanning
- `scanFrequency`: How often to scan (daily, twice_daily, weekly)
- `dailyApplicationGoal`: Target applications per day (default: 6)

**Relations:**
- One-to-many: Applications, Resumes, CoverLetters, JobOpportunities, Alerts, Contacts, FollowUps, UserJobSources

#### Application
Tracks job applications through the pipeline.

**Status Values:**
- `DRAFT`: Not yet submitted
- `PENDING`: Application prepared, awaiting submission
- `APPLIED`: Application submitted
- `INTERVIEWING`: In interview process
- `REJECTED`: Application rejected

**Interview Fields:**
- `interviewDate`: Date of interview
- `interviewTime`: Time of interview
- `interviewType`: Type (phone, video, in-person)
- `interviewRound`: Round number (1, 2, 3, etc.)
- `interviewNotes`: Interview notes and preparation

**Relations:**
- Belongs to: User, Resume (optional), CoverLetter (optional)
- Has many: Contacts, FollowUps

#### JobOpportunity
Stores discovered job opportunities from various sources.

**Key Fields:**
- `title`, `company`, `location`: Basic job info
- `description`, `requirements`: Job details
- `jobUrl`: Unique job posting URL
- `source`: Source name (LinkedIn, Indeed, etc.)
- `sourceUrl`: URL of the job board/feed
- `postedDate`: When job was posted
- `scrapedAt`: When we discovered it
- `fitScore`: AI-calculated match score (0-100)
- `isRead`, `isArchived`: User interaction flags
- `userFeedback`: User's feedback on the match

#### Resume
Manages multiple resumes per user.

**Fields:**
- `name`: Descriptive name (e.g., "Security Engineer Resume")
- `fileName`: Original file name
- `fileUrl`: Storage URL
- `fileType`: MIME type
- `fileSize`: Size in bytes
- `isPrimary`: Default resume flag
- `description`: Optional notes

#### CoverLetter
Stores cover letters with content.

**Fields:**
- `name`: Cover letter name
- `content`: Full text content
- `fileUrl`: Generated DOCX file URL
- `fileType`, `fileSize`: File metadata

#### FollowUp
Tracks follow-up tasks and reminders.

**Fields:**
- `title`: Task title
- `description`: Task details
- `dueDate`: When task is due
- `completed`: Completion status
- `priority`: low, medium, high
- `type`: general, interview, application, networking
- `notifyBefore`: Hours before due date to notify
- `notified`: Whether notification was sent

#### UserJobSource
Custom job sources configured by users.

**Source Types:**
- `rss`: RSS feed scraping
- `web_scrape`: Custom web scraping with CSS selectors
- `api`: API integration
- `job_board`: Standard job board integration

**Configuration:**
- `feedUrl`, `scrapeUrl`, `apiEndpoint`: Source URLs
- `titleSelector`, `companySelector`, `locationSelector`: CSS selectors
- `searchKeywords`, `excludeKeywords`: Filtering
- `rateLimitPerHour`: Rate limiting
- `enabled`: Enable/disable flag

### Additional Models

- **Contact**: Recruiters and hiring managers with contact info
- **Alert**: System notifications for new jobs and updates
- **BlockedJob**: Jobs explicitly blocked by user

---

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

#### POST /api/auth/[...nextauth]
NextAuth.js authentication handler (login, logout, session).

### Applications

#### GET /api/applications
Get all applications for authenticated user.

**Query Parameters:**
- `status`: Filter by status (DRAFT, PENDING, APPLIED, INTERVIEWING, REJECTED)

#### POST /api/applications
Create a new application.

#### PUT /api/applications/[id]
Update an application.

#### DELETE /api/applications/[id]
Delete an application.

#### POST /api/applications/create-from-job
Create application from a job opportunity.

#### POST /api/applications/[id]/interview
Add/update interview details.

### AI Services

#### POST /api/ai/analyze
Analyze job fit using AI.

**Returns:**
- Overall fit score (0-100)
- Component scores (skills, experience, title, location)
- Matched and missing skills
- Strengths and concerns
- Detailed reasoning

#### POST /api/ai/parse-job-url
Parse a job URL and extract job details.

#### POST /api/ai/tailor-resume
AI-assisted resume tailoring for specific job.

#### POST /api/ai/motivational-message
Generate a personalized motivational message.

#### GET /api/ai/health
Check AI service health.

### Job Opportunities

#### GET /api/opportunities
Get job opportunities for user.

**Query Parameters:**
- `unread`: Filter unread opportunities
- `minFitScore`: Minimum fit score filter

#### POST /api/opportunities
Create a new opportunity (manual add).

#### PUT /api/opportunities/[id]
Update opportunity (mark as read/archived).

#### DELETE /api/opportunities/[id]
Delete an opportunity.

#### POST /api/opportunities/feedback
Provide feedback on job match (used for learning).

### Profile Management

#### GET /api/profile
Get user profile.

#### PUT /api/profile
Update user profile.

#### POST /api/profile/upload-cv
Upload CV for profile extraction.

#### POST /api/profile/extract
Extract information from uploaded CV.

### Resume Management

#### GET /api/resumes
Get all resumes for user.

#### POST /api/resumes
Upload a new resume (multipart/form-data).

#### GET /api/resumes/[id]/content
Get resume content/download.

#### DELETE /api/resumes/[id]
Delete a resume.

#### POST /api/resumes/save-tailored
Save a tailored resume.

### Cover Letters

#### GET /api/cover-letter
Get all cover letters.

#### POST /api/cover-letter
Generate cover letter using AI.

#### POST /api/cover-letter/save
Save a cover letter.

### Contacts

#### GET /api/contacts
Get all contacts for user.

#### POST /api/contacts
Create a new contact.

### Follow-ups

#### GET /api/follow-ups
Get all follow-ups for user.

**Query Parameters:**
- `completed`: Filter by completion status
- `upcoming`: Show only upcoming

#### POST /api/follow-ups
Create a follow-up reminder.

#### PUT /api/follow-ups/[id]
Update follow-up (mark complete).

#### DELETE /api/follow-ups/[id]
Delete a follow-up.

### Job Sources

#### GET /api/sources
Get all job sources (built-in + user-defined).

#### POST /api/sources/add
Add a custom job source.

#### POST /api/sources/toggle
Enable/disable a job source.

#### DELETE /api/sources/delete
Delete a custom job source.

### Statistics

#### GET /api/stats
Get application statistics for user.

#### GET /api/stats/applications-by-date
Get application counts grouped by date.

#### GET /api/stats/user
Get detailed user statistics.

### Cron Jobs

#### POST /api/cron/scan-jobs
Scan job boards for new opportunities (requires CRON_SECRET header).

### Interviews

#### GET /api/interviews/upcoming
Get upcoming interviews.

---

## AI Integration

### Anthropic Claude API

The application uses Anthropic's Claude API for various AI-powered features.

**Environment Variable:** `ANTHROPIC_API_KEY`

### AI Services

#### 1. Job Fit Analysis (`src/lib/ai-service.ts`)

**Function:** `analyzeJobFitEnhanced()`

Analyzes how well a candidate matches a job posting based on:
- Primary, secondary, and learning skills
- Years of experience and seniority level
- Job title alignment (strict matching)
- Work history and achievements
- Location preferences (strictly enforced)
- Industry match

**Scoring Components:**
- `skillMatch`: 0-100 (primary skills heavily weighted)
- `experienceMatch`: 0-100
- `seniorityMatch`: 0-100
- `titleMatch`: 0-100 (strict - wrong domain = low score)
- `locationMatch`: 0-100 (critical - wrong location = disqualification)
- `overall`: 0-100 (weighted average)

**Critical Rules:**
- Job title MUST align with candidate's preferred titles
- Location requirements are STRICTLY enforced
- Domain mismatches result in scores <40

#### 2. Job URL Parsing

**Function:** `parseJobUrl()`

Fetches and parses job posting URLs to extract structured data:
- Job title, company name, location
- Salary information
- Full description and requirements

Uses Cheerio for HTML parsing and Claude for content extraction.

#### 3. CV/Profile Extraction (`src/lib/profile-extraction-service.ts`)

Extracts structured information from CVs (PDF/DOCX):
- Personal information
- Professional summary
- Work history with achievements
- Education and certifications
- Skills (automatically categorized)

#### 4. Cover Letter Generation (`src/lib/cover-letter-service.ts`)

Generates personalized cover letters based on:
- User profile and experience
- Job description and requirements
- Company research

Creates tailored content highlighting relevant experience.

#### 5. Resume Tailoring

Adapts resume content to match specific job requirements:
- Emphasizes relevant skills and experience
- Adjusts language to match job description
- Maintains truthfulness while optimizing presentation

#### 6. Pattern Learning (`src/lib/pattern-learning-service.ts`)

Learns from user feedback on job matches:
- Tracks rejected jobs
- Identifies rejection patterns
- Adjusts fit score penalties for similar jobs
- Improves future recommendations

---

## Job Monitoring System

### Overview

The job monitoring system automatically discovers job opportunities from multiple sources and matches them with user profiles.

**Location:** `src/lib/job-monitor.ts`

### Built-in Job Sources

The system includes 20+ pre-configured job sources in `src/lib/sources/`:

**Remote Job Boards:**
- Remotive (security-focused)
- RemoteOK Security
- We Work Remotely
- EU Remote Jobs

**Security-Specific:**
- InfoSec Jobs
- Cybersecurity Remote/EU/Spain
- Security Jobs 3 & 4

**Location-Specific:**
- Barcelona Security
- Indeed Security Spain

**General Tech:**
- Foorilla
- The Muse
- Techno Employe

### Job Discovery Workflow

1. **Cron Job Trigger**
   - Endpoint: `POST /api/cron/scan-jobs`
   - Requires: `CRON_SECRET` header
   - Runs for users with `autoScan: true`

2. **Source Fetching**
   - Fetches jobs from enabled sources
   - Parses RSS feeds, scrapes websites, or calls APIs
   - Extracts job details

3. **Duplicate Detection**
   - Checks if job URL already exists
   - Skips blocked jobs

4. **AI-Powered Matching**
   - Analyzes job fit using Claude API
   - Calculates fit score
   - Applies pattern learning penalties

5. **Filtering**
   - Minimum fit score threshold (default 40%)
   - Maximum job age (default 7 days)
   - Location matching
   - Excluded keywords

6. **Storage & Alerts**
   - Stores matching opportunities in database
   - Creates alerts for new high-fit jobs

### Monitoring Schedule

**Recommended Setup:**
- Daily scans for active job seekers
- Configurable frequency per user
- Use external cron service to trigger `/api/cron/scan-jobs`

**Example:**
```bash
curl -X POST https://jobapp.aigrowise.com/api/cron/scan-jobs \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## Components

### Main Components

#### Dashboard (`src/components/Dashboard.tsx`)
Main application interface showing:
- Application list/board view
- Progress charts
- Quick actions
- Daily application goal tracker
- Motivational messages

#### ApplicationList (`src/components/ApplicationList.tsx`)
Table/list view with:
- Sortable columns
- Status badges
- Interview scheduling
- Quick actions

#### ApplicationBoard (`src/components/ApplicationBoard.tsx`)
Kanban-style board with drag-and-drop:
- Columns: Draft, Applied, Interviewing, Rejected
- Visual pipeline management
- Interview indicators

#### ApplicationModal (`src/components/ApplicationModal.tsx`)
Form for creating/editing applications:
- Company and role fields
- Job URL parsing
- Resume/cover letter selection
- Interview scheduling

#### JobOpportunities (`src/components/JobOpportunities.tsx`)
Displays discovered job opportunities:
- Fit score visualization
- Job details
- "Create Application" button
- Mark as read/archive
- Provide feedback

#### EnhancedProfileEditor (`src/components/EnhancedProfileEditor.tsx`)
Comprehensive profile editing:
- Personal information
- Skills categorization
- Work history
- Job preferences
- Location preferences
- Job search settings

#### ResumeManager (`src/components/ResumeManager.tsx`)
Resume management:
- Upload multiple resumes
- Set primary resume
- Name and describe resumes
- Download/delete

#### JobSearchSettings (`src/components/JobSearchSettings.tsx`)
Configure job search automation:
- Enable/disable auto-scan
- Set minimum fit score
- Set maximum job age
- Daily application goal

#### JobSourcesManager (`src/components/JobSourcesManager.tsx`)
Manage job sources:
- View built-in sources
- Add custom sources
- Enable/disable sources
- Configure selectors

---

## Authentication & Authorization

### NextAuth.js Configuration

**File:** `src/lib/auth.ts`

**Provider:** Credentials (email/password)
**Session Strategy:** JWT
**Password Security:** bcryptjs hashing

### Authentication Flow

1. **Registration** (`/api/auth/register`)
   - User submits email, password, name
   - Password is hashed
   - User record created

2. **Login** (`/login`)
   - User submits credentials
   - NextAuth validates against database
   - JWT token issued
   - Session stored in secure HTTP-only cookie

3. **Protected Routes**
   - API routes check session using `auth()` helper
   - Redirect to /login if not authenticated

4. **Session Management**
   - JWT tokens include user ID
   - Tokens are automatically refreshed

### Authorization

**User-level access control:**
- Users can only access their own data
- API routes filter by `userId` from session
- Database queries include `userId` in WHERE clauses

---

## Deployment

### Current Deployment

**Server:** DigitalOcean Droplet (8GB RAM, Debian)
**Location:** Helsinki (hel1)
**Domain:** jobapp.aigrowise.com
**SSL:** Let's Encrypt (auto-renewed)

### Architecture

```
Internet → Nginx (80/443) → Next.js (3000) → PostgreSQL (5432)
                                           → Prisma Studio (5555)
```

### Nginx Configuration

**File:** `/etc/nginx/sites-available/jobapp`

**Features:**
- HTTPS redirect (port 80 → 443)
- SSL/TLS termination
- Reverse proxy to Next.js
- WebSocket support
- Request forwarding headers

### Running Services

**Next.js:**
- Currently running in development mode (`npm run dev`)
- Port: 3000 (bound to 127.0.0.1)
- Process: Multiple instances running

**PostgreSQL:**
- Version: 17.6
- Port: 5432
- Database: `job_tracker`
- Users: `postgres`, `jobtracker`

**Prisma Studio:**
- Port: 5555
- Access: Internal only

---

## Configuration

### Environment Variables

**File:** `/opt/job-tracker/.env`

**Required Variables:**

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# NextAuth
NEXTAUTH_URL="https://jobapp.aigrowise.com"
NEXTAUTH_SECRET="<random-secret-string>"

# Anthropic AI
ANTHROPIC_API_KEY="sk-ant-..."

# Cron Jobs
CRON_SECRET="<random-secret-for-cron-jobs>"
```

---

## Maintenance & Monitoring

### Database Backups

**Backup Files:** Located in `/root/` and `/opt/`

**Naming Convention:**
- `job-tracker-backup-YYYYMMDD-HHMMSS.tar.gz`: Full backup
- `job_tracker-db-backup-YYYYMMDD-HHMMSS.sql`: Database dump

**Latest Backups:**
- Full application backup: 323 MB (Oct 18, 2025)
- Database dump: 51 KB (Oct 15, 2025)

### Database Management

**Prisma Commands:**
```bash
cd /opt/job-tracker

# Generate Prisma Client
npm run db:generate

# Push schema changes
npm run db:push

# Create migration
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

**Prisma Studio:**
- URL: http://localhost:5555
- Currently running

**Direct Database Access:**
```bash
psql -U postgres job_tracker
```

### Service Management

**Next.js:**
```bash
cd /opt/job-tracker
npm run dev  # Development
npm run build && npm start  # Production
```

**Nginx:**
```bash
systemctl status nginx
systemctl restart nginx
systemctl reload nginx  # Graceful reload
```

**PostgreSQL:**
```bash
systemctl status postgresql@17-main
systemctl restart postgresql@17-main
```

### Monitoring

**Check Running Processes:**
```bash
ps aux | grep node
ps aux | grep postgres
ps aux | grep nginx
```

**Check Listening Ports:**
```bash
netstat -tulpn | grep -E ':(80|443|3000|5432|5555)'
```

### SSL Certificate Renewal

**Certbot:**
- Certificates managed by Certbot
- Auto-renewal enabled via systemd timer

**Check Certificate:**
```bash
certbot certificates
```

**Manual Renewal:**
```bash
certbot renew
systemctl reload nginx
```

---

## File Structure

```
/opt/job-tracker/
├── .env                        # Environment variables
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── next.config.ts              # Next.js configuration
├── Dockerfile                  # Docker image definition
├── docker-compose.yml          # Docker stack definition
├── README.md                   # Project README
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page (Dashboard)
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration page
│   │   ├── sources/            # Job sources page
│   │   ├── resume-tailor/      # Resume tailoring page
│   │   └── api/                # API Routes
│   │       ├── auth/           # Authentication
│   │       ├── applications/   # Application management
│   │       ├── opportunities/  # Job opportunities
│   │       ├── ai/             # AI services
│   │       ├── profile/        # Profile management
│   │       ├── resumes/        # Resume management
│   │       ├── cover-letter/   # Cover letters
│   │       ├── contacts/       # Contacts
│   │       ├── follow-ups/     # Follow-ups
│   │       ├── alerts/         # Alerts
│   │       ├── sources/        # Job sources
│   │       ├── stats/          # Statistics
│   │       ├── interviews/     # Interviews
│   │       ├── cron/           # Cron jobs
│   │       └── settings/       # Settings
│   │
│   ├── components/             # React Components
│   │   ├── Dashboard.tsx
│   │   ├── ApplicationList.tsx
│   │   ├── ApplicationBoard.tsx
│   │   ├── ApplicationModal.tsx
│   │   ├── JobOpportunities.tsx
│   │   ├── EnhancedProfileEditor.tsx
│   │   ├── ResumeManager.tsx
│   │   ├── JobSearchSettings.tsx
│   │   └── (... more components)
│   │
│   └── lib/                    # Utility Libraries
│       ├── prisma.ts           # Prisma client
│       ├── auth.ts             # NextAuth config
│       ├── ai-service.ts       # AI job matching
│       ├── job-monitor.ts      # Job board monitoring
│       ├── profile-extraction-service.ts
│       ├── cover-letter-service.ts
│       └── sources/            # Job source implementations
│           └── (20+ source files)
│
├── .next/                      # Next.js build output
└── node_modules/               # Dependencies (437 packages)
```

---

## Security Considerations

### Current Security Measures

1. **HTTPS Only** - SSL/TLS encryption via Let's Encrypt
2. **Password Security** - Bcrypt hashing with salt
3. **JWT Sessions** - Secure HTTP-only cookies
4. **API Protection** - Session-based authentication
5. **Database** - Parameterized queries via Prisma

### Recommendations

1. **Environment Variables** - Rotate secrets regularly
2. **Rate Limiting** - Implement on API endpoints
3. **CORS** - Configure appropriate policies
4. **Input Validation** - Validate all user inputs
5. **Monitoring** - Log suspicious activities
6. **Regular Updates** - Keep dependencies up to date

---

## Troubleshooting

### Common Issues

**Application Won't Start:**
```bash
npm run dev 2>&1 | tee /tmp/nextjs-error.log
npm install
npm run db:generate
```

**Database Connection Issues:**
```bash
systemctl status postgresql@17-main
psql -U postgres -h localhost -d job_tracker
```

**SSL Certificate Issues:**
```bash
certbot certificates
certbot renew --force-renewal
systemctl reload nginx
```

**Port Already in Use:**
```bash
lsof -i :3000
kill -9 <PID>
```

---

## Support & Contact

**Application Maintainer:** [Contact Information]
**Server Administrator:** root@jobapp.aigrowise.com
**Documentation Version:** 1.0
**Last Updated:** October 20, 2025 (Updated with PENDING status and unified notifications)

---



---

## Recent Changes

### October 20, 2025

#### 1. Added PENDING Status
- Added new `PENDING` status between DRAFT and APPLIED
- Visual design: Purple color scheme
- Integrated in all views: Board, List, Charts
- Updated database enum and all components

#### 2. Unified Notifications Panel
- Combined separate job alerts and follow-up notifications
- Single notification bell with unified dropdown
- Tabbed interface for All/Jobs/Tasks filtering
- Enhanced UX with auto-refresh and priority indicators
- Replaced `AlertsPanel` and `NotificationPanel` with `UnifiedNotificationsPanel`

---

**End of Documentation**
