import { BaseJobSource, JobPosting, JobSourceConfig } from '../job-source-interface'

interface RSSAppItem {
  id: string
  url: string
  title: string
  content_html?: string
  content_text?: string
  date_published: string
}

export class SecurityJobs3Source extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'Security Jobs Feed 3',
    enabled: true,
    type: 'rss' as const,
    rateLimitPerHour: 100
  }

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    try {
      this.log('Fetching jobs from Security RSS 3...')

      const response = await fetch('https://rss.app/feeds/v1.1/Dphao3rl7Yywrt77.json')
      
      if (!response.ok) {
        throw new Error(`RSS feed error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.items || !Array.isArray(data.items)) {
        this.log('No items in RSS feed', 'error')
        return []
      }

      this.log(`Received ${data.items.length} jobs from RSS feed`)

      const jobs: JobPosting[] = data.items
        .slice(0, limit)
        .map((item: RSSAppItem) => {
          let jobTitle = item.title
          let company = 'Unknown Company'

          // Format: Job Title - Company Name
          const dashMatch = item.title.match(/^(.+?)\s+-\s+(.+)$/)
          if (dashMatch) {
            jobTitle = dashMatch[1].trim()
            company = dashMatch[2].trim()
          } else {
            // Format: Job Title at Company Name
            const atMatch = item.title.split(' at ')
            if (atMatch.length > 1) {
              jobTitle = atMatch[0].trim()
              company = atMatch.slice(1).join(' at ').trim()
            }
          }

          const description = (item.content_html || item.content_text || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

          return {
            title: jobTitle,
            company: company,
            description: description.substring(0, 2000) || 'No description available',
            requirements: description.substring(0, 500),
            location: 'Spain',
            jobUrl: item.url,
            postedDate: item.date_published ? new Date(item.date_published) : new Date(),
            source: this.config.name
          }
        })

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
}
