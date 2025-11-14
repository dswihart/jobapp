# Job Application Tracker - Site Documentation

## Overview
This is a Next.js-based job application tracking system hosted at https://jobapp.aigrowise.com

## Architecture
- **Framework**: Next.js (React)
- **Server**: Nginx reverse proxy to port 3000
- **Process**: next-server (PID: 414982)
- **Location**: /opt/job-tracker/

## Key Features
1. **Job Application Management**
   - Add applications manually or via URL parsing
   - Track application status (Draft, Applied, Interviewing, Rejected)
   - Store contacts for each application
   - Attach resumes and cover letters

2. **Dashboard Views**
   - List view (table format)
   - Board view (Kanban-style)
   - Progress charts
   - Daily/weekly goal tracking

3. **Additional Features**
   - Resume tailor functionality
   - AI-powered job parsing from URLs
   - LinkedIn bookmarklet integration
   - Cover letter generation
   - Interview scheduling
   - Job source monitoring
   - Motivational messages

## File Structure
/opt/job-tracker/
  src/
    app/               # Next.js app directory
      api/             # API routes
      admin/           # Admin pages
      bookmarklet/     # Bookmarklet page
      cover-letters/   # Cover letter pages
      login/           # Authentication
      register/        # User registration
      resume-tailor/   # Resume tailoring
      sources/         # Job sources
    components/        # React components
      Dashboard.tsx    # Main dashboard
      ApplicationList.tsx  # Table view
      ApplicationBoard.tsx # Board view
    lib/               # Utilities and helpers
  prisma/              # Database schema
  public/              # Static assets
  package.json         # Dependencies

## Components Overview

### Dashboard.tsx
Main component that orchestrates the application:
- Manages view mode (list/board)
- Handles application CRUD operations
- Displays goal tracking banners
- Contains collapsible sections for sources, resumes, and opportunities

### ApplicationList.tsx
Table view of job applications:
- Displays applications in a responsive grid/table
- Shows: Company, Role, Status, Dates, Resume, Cover Letter, Contacts
- Includes status filtering
- Has mobile-responsive card view
- **Updated**: Now includes column sorting functionality

### ApplicationBoard.tsx
Kanban-style board view grouped by status

## Current State
- Applications can be filtered by status
- Column sorting now implemented for all major columns
- Both desktop and mobile views available
- Integration with resume and cover letter management
- Contact tracking per application

## Database
Uses Prisma ORM (schema in /opt/job-tracker/prisma/)

## Authentication
Next-Auth integration with login/register flows

## Deployment
- Running as jobtracker user
- SSL certificate via Let's Encrypt
- Nginx configuration at /etc/nginx/sites-available/jobapp
