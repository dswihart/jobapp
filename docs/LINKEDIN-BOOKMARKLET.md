# LinkedIn Job Parser Bookmarklet

## Overview

The LinkedIn Bookmarklet allows you to extract job details directly from LinkedIn job posting pages with one click, bypassing LinkedIn's anti-scraping protection.

## Why Use the Bookmarklet?

LinkedIn blocks automated job parsing (returns HTTP 500), so the standard Add from URL feature doesn't work for LinkedIn jobs. The bookmarklet runs in your browser, where you're already logged in, extracting data from the page you're viewing.

## Installation

### Method 1: Drag and Drop
1. Visit https://jobapp.aigrowise.com/bookmarklet
2. Show your browser's bookmarks bar (Ctrl+Shift+B or Cmd+Shift+B)
3. Drag the green Add LinkedIn Job button to your bookmarks bar

### Method 2: Manual Installation
1. Show your bookmarks bar
2. Right-click the bookmarks bar and select Add page or Add bookmark
3. Name it Add LinkedIn Job
4. Paste the bookmarklet code as the URL
5. Save

## How to Use

1. **Log in** to your job tracker at https://jobapp.aigrowise.com
2. **Browse LinkedIn** and open any job posting
3. **Click the bookmarklet** in your bookmarks bar
4. **Review** the extracted data in the confirmation popup
5. **Click OK** to add the job to your tracker

The job will be added with:
- Company name
- Job title
- Location
- Full description
- Requirements
- Salary (if listed)
- Your calculated fit score
- URL for reference

## What Gets Extracted

The bookmarklet uses CSS selectors to extract:
-  - Company
-  - Role
-  - Location
-  - Description
- Salary and benefits (if available)

## Technical Details

### API Endpoint
- **URL**: 
- **Auth**: Requires active session (cookies)
- **Data**: JSON with company, role, description, etc.
- **Response**: Creates draft application with fit score

### Files
- Bookmarklet code: 
- API endpoint: 
- Instruction page: 

### Security
- Requires authentication (session cookies)
- Only works on LinkedIn job pages
- No data stored client-side
- Calculates fit score server-side using user profile

## Troubleshooting

### Could not extract job details
- Make sure you're on a LinkedIn job posting page
- Wait for the page to fully load before clicking
- Try refreshing the page

### Please make sure you are logged in
- Log in to https://jobapp.aigrowise.com first
- Keep that tab open while using the bookmarklet
- Check that cookies are enabled

### Job Not Appearing
- Check your Dashboard for draft applications
- Refresh the dashboard page
- Check browser console for errors (F12)

## Browser Compatibility

Works in all modern browsers:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Opera
- ✅ Brave

## Date Created
October 22, 2025
