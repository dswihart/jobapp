import { BaseJobSource, JobPosting, JobSourceConfig } from '../job-source-interface'

interface RSSAppItem {
  id: string
  url: string
  title: string
  content_html: string
  date_published: string
}

export class BarcelonaSecuritySource extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'Barcelona Security Jobs',
    enabled: true,
    type: 'rss' as const,
    rateLimitPerHour: 100
  }

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    try {
      this.log('Fetching jobs from Barcelona Security RSS...')

      const response = await fetch('https://rss.app/feeds/v1.1/C5zHjN9WFy1WI1sN.json')
      
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

          // Parse Spanish format: Company busca personal para el cargo de Job Title en Location
          const spanishMatch = item.title.match(/^(.+?)\s+busca personal para el cargo de\s+(.+?)\s+en\s+(.+)$/)
          if (spanishMatch) {
            company = spanishMatch[1].trim()
            jobTitle = spanishMatch[2].trim()
          } else {
            // Try English format: Job Title at Company
            const englishMatch = item.title.split(' at ')
            if (englishMatch.length > 1) {
              jobTitle = englishMatch[0].trim()
              company = englishMatch.slice(1).join(' at ').trim()
            }
          }

          const description = item.content_html
            ? item.content_html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
            : 'No description available'

          return {
            title: jobTitle,
            company: company,
            description: description.substring(0, 2000),
            requirements: description.substring(0, 500),
            location: 'Barcelona, Spain',
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
