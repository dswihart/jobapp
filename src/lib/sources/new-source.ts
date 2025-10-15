/**
 * new Job Source
 * Auto-generated on 2025-10-04T19:59:50.662Z
 */

import { BaseJobSource, JobPosting, JobSourceConfig } from '../job-source-interface'

interface newSourceJob {
  // TODO: Adjust these fields based on your API's response format
  id: number | string
  title: string
  company: string
  description: string
  location?: string
  posted_date?: string
  url?: string
  // Add more fields as needed based on your API
}

export class newSource extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'new',
    enabled: true,
    type: 'rss' as 'api' | 'rss',
    rateLimitPerHour: 100
  }

  private readonly API_URL = 'https://rss.app/feeds/v1.1/Wx6YXVEG3lTdiekt.json'
  // If your API needs authentication, add:
  // private readonly API_KEY = process.env.NEW_API_KEY

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    try {
      this.log('Fetching jobs...')

      // Make API request
      const response = await fetch(`${this.API_URL}?limit=${limit}`, {
        headers: {
          'Accept': 'application/json',
          // Uncomment if API needs authentication:
          // 'Authorization': `Bearer ${this.API_KEY}`,
        }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      // TODO: Adjust this based on your API's response structure
      // Common patterns: data.jobs, data.results, data.data, or just data
      const jobs = data.jobs || data.results || data.data || (Array.isArray(data) ? data : [])

      if (!Array.isArray(jobs)) {
        throw new Error('Invalid response format - expected array')
      }

      this.log(`Received ${jobs.length} jobs`)

      // Filter by skills (matches jobs containing at least one of your skills)
      const skillFiltered = this.filterBySkills(
        jobs,
        skills,
        (job: newSourceJob) => `${job.title} ${job.description}`
      )

      // Filter by recency (last 7 days)
      const recentJobs = this.filterByRecency(
        skillFiltered,
        7,
        (job: newSourceJob) => new Date(job.posted_date || new Date())
      )

      // Map to standard JobPosting format
      const standardJobs: JobPosting[] = recentJobs
        .slice(0, 20)
        .map((job: newSourceJob) => ({
          title: job.title,
          company: job.company,
          description: job.description,
          requirements: undefined, // Add if your API provides this
          location: job.location || 'Not specified',
          salary: undefined, // Add if your API provides this
          jobUrl: job.url || `${this.API_URL}/${job.id}`,
          postedDate: job.posted_date ? new Date(job.posted_date) : undefined,
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
