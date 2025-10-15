import { BaseJobSource, JobPosting, JobSourceConfig } from '../job-source-interface'

export class CyberSecSpainSource extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'CyberSecurity JobSite Spain',
    enabled: true,
    type: 'rss' as const,
    rateLimitPerHour: 100
  }

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    try {
      this.log('Fetching jobs from CyberSecurity JobSite Spain...')

      const response = await fetch('https://rss.app/feeds/v1.1/A3zJXmli7QilaybJ.json')

      if (!response.ok) {
        throw new Error(`JSON feed error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const jobs = this.parseJSONFeed(data, limit)

      this.log(`Received ${jobs.length} jobs from CyberSecurity JobSite Spain`)

      const filtered = this.filterBySkills(
        jobs,
        skills,
        (job) => `${job.title} ${job.description}`
      )

      this.log(`Filtered to ${filtered.length} relevant jobs`)
      return filtered

    } catch (error) {
      this.log(`Error fetching jobs: ${error}`, 'error')
      return []
    }
  }

  private parseJSONFeed(data: { items?: Array<{ title?: string; url?: string; content_text?: string; content_html?: string; authors?: Array<{ name?: string }>; date_published?: string }> }, limit: number): JobPosting[] {
    const jobs: JobPosting[] = []

    if (!data.items || !Array.isArray(data.items)) {
      return jobs
    }

    for (let i = 0; i < Math.min(data.items.length, limit); i++) {
      const item = data.items[i]

      // Skip items with login URLs
      if (!item.url || item.url.includes('/logon/') || item.title === 'sign in, create an account') {
        continue
      }

      jobs.push({
        title: item.title || 'Untitled',
        company: item.authors?.[0]?.name || 'Unknown Company',
        description: item.content_text || item.content_html || '',
        jobUrl: item.url,
        location: 'Spain',
        postedDate: item.date_published ? new Date(item.date_published) : new Date(),
        source: this.config.name
      })
    }

    return jobs
  }
}
