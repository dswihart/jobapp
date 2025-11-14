"use client"

import { useState } from 'react'
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false)

  // Using template literal to avoid escaping hell
  const bookmarkletCode = `javascript:(function(){try{console.log('Bookmarklet started');function extractJob(){const data={url:window.location.href,company:'',role:'',location:'',description:'',salary:'',requirements:'',source:'linkedin-bookmarklet'};try{const companyEl=document.querySelector('.job-details-jobs-unified-top-card__company-name, .topcard__org-name-link, [data-test-job-posting-company-name]');if(companyEl)data.company=companyEl.textContent.trim();const titleEl=document.querySelector('.job-details-jobs-unified-top-card__job-title, .topcard__title, h1.t-24');if(titleEl)data.role=titleEl.textContent.trim();const locationEl=document.querySelector('.job-details-jobs-unified-top-card__bullet, .topcard__flavor--bullet');if(locationEl)data.location=locationEl.textContent.trim();const descEl=document.querySelector('.jobs-description__content, .description__text, .show-more-less-html__markup');if(descEl)data.description=descEl.textContent.trim().substring(0,2000);const salaryEl=document.querySelector('[class*="salary"], [class*="compensation"]');if(salaryEl)data.salary=salaryEl.textContent.trim();console.log('Extracted data:',data);return data}catch(err){console.error('Extract error:',err);alert('Extraction error: '+err.message);return null}}async function sendToTracker(jobData){const APP_URL='https://jobapp.aigrowise.com';try{console.log('Sending to tracker:',jobData);const response=await fetch(APP_URL+'/api/ai/parse-job-data',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify(jobData)});console.log('Response status:',response.status);const result=await response.json();console.log('Response data:',result);if(response.ok&&result.success){alert('Job added!
Role: '+jobData.role+'
Company: '+jobData.company+'
Fit Score: '+(result.fitScore||'Calculating...')+'%');window.open(APP_URL,'_blank')}else{throw new Error(result.error||'Server returned error')}}catch(error){console.error('Send error:',error);alert('Error: '+error.message+'

Make sure you are logged in to jobapp.aigrowise.com')}}const jobData=extractJob();if(!jobData||!jobData.company||!jobData.role){alert('Could not extract job details.

Make sure you are on a LinkedIn job posting page and it has fully loaded.');return}if(confirm('Add this job?

Role: '+jobData.role+'
Company: '+jobData.company+(jobData.location?'
Location: '+jobData.location:''))){sendToTracker(jobData)}}catch(e){console.error('Bookmarklet error:',e);alert('Bookmarklet error: '+e.message)}})();`

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">LinkedIn Job Parser Bookmarklet</h1>
          <div className="space-y-6">
            <p className="text-lg">Extract LinkedIn job postings with one click!</p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4">
              <h3 className="font-semibold mb-2">How to Install</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Press Ctrl+Shift+B (Cmd+Shift+B on Mac) to show bookmarks bar</li>
                <li>Click Copy button below</li>
                <li>Right-click bookmarks bar → Add bookmark</li>
                <li>Name: Add LinkedIn Job</li>
                <li>URL: Paste the code</li>
                <li>Save</li>
              </ol>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">Bookmarklet Code</h3>
                <button onClick={copyBookmarklet} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  {copied ? (<><CheckIcon className="h-5 w-5" />Copied!</>) : (<><ClipboardIcon className="h-5 w-5" />Copy Code</>)}
                </button>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded text-xs font-mono break-all max-h-32 overflow-auto">{bookmarkletCode}</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4">
              <h3 className="font-semibold mb-2">How to Use</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Log in to this site first (jobapp.aigrowise.com)</li>
                <li>Go to any LinkedIn job posting page</li>
                <li>Wait for the page to fully load</li>
                <li>Click the bookmarklet in your bookmarks bar</li>
                <li>Review the extracted data in the confirmation popup</li>
                <li>Click OK to add the job with AI fit score!</li>
              </ol>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
              <h3 className="font-semibold mb-2 text-red-900 dark:text-red-100">Troubleshooting</h3>
              <ul className="list-disc list-inside text-sm space-y-2">
                <li><strong>Open browser console</strong> (Press F12) for error messages</li>
                <li><strong>Check login</strong> - Must be logged in to jobapp.aigrowise.com</li>
                <li><strong>Verify page</strong> - Must be on a LinkedIn job posting URL</li>
                <li><strong>Check bookmark</strong> - URL should start with javascript:</li>
              </ul>
            </div>
            <div className="text-center space-y-4">
              <button onClick={copyBookmarklet} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold">
                {copied ? '✓ Copied!' : 'Copy Bookmarklet Code'}
              </button>
              <div><a href="/" className="text-blue-600 hover:underline">← Back to Dashboard</a></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}