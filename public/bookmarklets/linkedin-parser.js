// LinkedIn Job Parser Bookmarklet
(function() {
  function extractLinkedInJob() {
    const data = {
      url: window.location.href,
      company: '',
      role: '',
      location: '',
      description: '',
      salary: '',
      requirements: '',
      source: 'linkedin-bookmarklet'
    };

    try {
      const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, .topcard__org-name-link, [data-test-job-posting-company-name]');
      if (companyEl) data.company = companyEl.textContent.trim();

      const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .topcard__title, h1.t-24');
      if (titleEl) data.role = titleEl.textContent.trim();

      const locationEl = document.querySelector('.job-details-jobs-unified-top-card__bullet, .topcard__flavor--bullet');
      if (locationEl) data.location = locationEl.textContent.trim();

      const descEl = document.querySelector('.jobs-description__content, .description__text');
      if (descEl) {
        data.description = descEl.textContent.trim().substring(0, 2000);
      }

      const salaryEl = document.querySelector('[class*=salary], [class*=compensation]');
      if (salaryEl) data.salary = salaryEl.textContent.trim();

      if (data.description) {
        const reqMatch = data.description.match(/(?:requirements?|qualifications?|skills?):?(.*?)(?:responsibilities?|benefits?|about|$)/is);
        if (reqMatch) {
          data.requirements = reqMatch[1].trim().substring(0, 1000);
        }
      }

      return data;
    } catch (error) {
      console.error('Error extracting job data:', error);
      return null;
    }
  }

  async function sendToJobTracker(jobData) {
    const APP_URL = 'https://jobapp.aigrowise.com';
    
    try {
      const response = await fetch(APP_URL + '/api/ai/parse-job-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(jobData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Job added successfully! Fit Score: ' + (result.fitScore || 'Calculating...') + '%');
          window.open(APP_URL, '_blank');
        } else {
          throw new Error(result.error || 'Failed to add job');
        }
      } else {
        throw new Error('Server error: ' + response.status);
      }
    } catch (error) {
      alert('Error: ' + error.message + ' - Please make sure you are logged in.');
    }
  }

  const jobData = extractLinkedInJob();
  
  if (!jobData || !jobData.company || !jobData.role) {
    alert('Could not extract job details. Make sure you are on a LinkedIn job posting page.');
    return;
  }

  const confirmMsg = 'Role: ' + jobData.role + '
Company: ' + jobData.company + '

Add to job tracker?';
  
  if (confirm(confirmMsg)) {
    sendToJobTracker(jobData);
  }
})();