import { BaseJobSource, JobPosting, JobSourceConfig } from '../job-source-interface'

export class CyberSecEUSource extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'CyberSecurity JobSite EU',
    enabled: true,
    type: 'rss' as const,
    rateLimitPerHour: 100
  }

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    try {
      this.log('Fetching jobs from CyberSecurity JobSite EU RSS...')

      const response = await fetch('https://www.cybersecurityjobsite.com/jobsrss/?keywords=security+engineer&location=europe')

      if (!response.ok) {
        throw new Error(`RSS feed error: ${response.status} ${response.statusText}`)
      }

      const xmlText = await response.text()
      const jobs = this.parseXMLFeed(xmlText, limit)

      this.log(`Received ${jobs.length} jobs from CyberSecurity JobSite EU`)

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

  private parseXMLFeed(xmlText: string, limit: number): JobPosting[] {
    const jobs: JobPosting[] = []

    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    let count = 0

    while ((match = itemRegex.exec(xmlText)) !== null && count < limit) {
      const itemContent = match[1]

      const title = this.extractTag(itemContent, 'title')
      const link = this.extractTag(itemContent, 'link')
      const description = this.extractTag(itemContent, 'description')
      const pubDate = this.extractTag(itemContent, 'pubDate')

      if (title && link) {
        jobs.push({
          title,
          company: 'Various',
          description: description || '',
          jobUrl: link,
          location: 'Europe',
          postedDate: pubDate ? new Date(pubDate) : new Date(),
          source: this.config.name
        })
        count++
      }
    }

    return jobs
  }

  private extractTag(content: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>([\s\S]*?)</${tagName}>`, 'i')
    const match = content.match(regex)
    if (match && match[1]) {
      return match[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '')
        .trim()
    }
    return ''
  }
}
