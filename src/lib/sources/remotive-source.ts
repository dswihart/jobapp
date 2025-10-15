/**
 * Remotive Job Source
 * Example implementation of a job source plugin
 */

import { BaseJobSource, JobPosting, JobSourceConfig } from '../job-source-interface'

interface RemotiveJob {
  id: number
  url: string
  title: string
  company_name: string
  category: string
  publication_date: string
  candidate_required_location: string
  salary: string
  description: string
  tags: string[]
}

export class RemotiveSource extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'Remotive',
    enabled: true,
    type: 'api',
    rateLimitPerHour: 100
  }

  private readonly API_URL = 'https://remotive.com/api/remote-jobs'

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    try {
      this.log('Fetching jobs...')

      const response = await fetch(`${this.API_URL}?limit=${limit}`, {
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.jobs || !Array.isArray(data.jobs)) {
        throw new Error('Invalid response format')
      }

      this.log(`Received ${data.jobs.length} jobs`)

      // Filter by skills
      const skillFiltered = this.filterBySkills(
        data.jobs,
        skills,
        (job: RemotiveJob) => `${job.title} ${job.description} ${job.category}`
      )

      // Filter by recency (last 7 days)
      const recentJobs = this.filterByRecency(
        skillFiltered,
        7,
        (job: RemotiveJob) => new Date(job.publication_date)
      )

      // Map to standard format
      const jobs: JobPosting[] = recentJobs
        .slice(0, 20)
        .map((job: RemotiveJob) => ({
          title: job.title,
          company: job.company_name,
          description: job.description,
          requirements: job.tags.join(', '),
          location: job.candidate_required_location || 'Remote',
          salary: job.salary || undefined,
          jobUrl: job.url,
          postedDate: new Date(job.publication_date),
          source: this.config.name
        }))

      this.log(`Filtered to ${jobs.length} relevant jobs`)
      return jobs

    } catch (error) {
      this.log(`Error: ${error}`, 'error')
      return []
    }
  }
}
