/**
 * The Muse Job Source
 * Example implementation for company culture + jobs
 */

import { BaseJobSource, JobPosting, JobSourceConfig } from '../job-source-interface'

interface MuseJob {
  id: number
  name: string
  company: {
    id: number
    name: string
  }
  locations: Array<{ name: string }>
  levels: Array<{ name: string }>
  categories: Array<{ name: string }>
  publication_date: string
  refs: {
    landing_page: string
  }
  contents: string
}

export class MuseSource extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'The Muse',
    enabled: true,
    type: 'api',
    rateLimitPerHour: 500
  }

  private readonly API_URL = 'https://www.themuse.com/api/public/jobs'

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    try {
      this.log('Fetching jobs...')

      const categories = ['Engineering', 'Data Science', 'IT']
      const categoryParam = categories.join(',')

      const response = await fetch(
        `${this.API_URL}?category=${encodeURIComponent(categoryParam)}&page=0&descending=true`,
        { headers: { 'Accept': 'application/json' } }
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid response format')
      }

      this.log(`Received ${data.results.length} jobs`)

      // Filter by skills and remote location
      const filtered = data.results.filter((job: MuseJob) => {
        const jobText = `${job.name} ${job.contents} ${job.categories.map(c => c.name).join(' ')}`
        const hasSkillMatch = this.filterBySkills([job], skills, () => jobText).length > 0

        const isRemote = job.locations.some(loc =>
          loc.name.toLowerCase().includes('remote') ||
          loc.name.toLowerCase().includes('flexible')
        )

        return hasSkillMatch && isRemote
      })

      // Map to standard format
      const jobs: JobPosting[] = filtered
        .slice(0, 15)
        .map((job: MuseJob) => ({
          title: job.name,
          company: job.company.name,
          description: job.contents,
          requirements: job.categories.map(c => c.name).join(', '),
          location: job.locations.map(l => l.name).join(', '),
          salary: undefined,
          jobUrl: job.refs.landing_page,
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
