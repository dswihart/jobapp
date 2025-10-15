import { BaseJobSource, JobPosting, JobSourceConfig } from '../job-source-interface'

export class Foorilla2Source extends BaseJobSource {
  config: JobSourceConfig = {
    name: 'Foorilla Remote Jobs',
    enabled: true,
    type: 'rss' as const,
    rateLimitPerHour: 100
  }

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    try {
      this.log('Fetching jobs from Foorilla Remote RSS...')

      const response = await fetch('https://foorilla.com/account/feed/N7bL10Q0T9GGbac/rss/')

      if (!response.ok) {
        throw new Error(`RSS feed error: ${response.status} ${response.statusText}`)
      }

      const xmlText = await response.text()
      const jobs = this.parseXMLFeed(xmlText, limit)

      this.log(`Received ${jobs.length} jobs from Foorilla Remote RSS`)

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

    // Extract items using regex (simple XML parsing)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    let count = 0

    while ((match = itemRegex.exec(xmlText)) !== null && count < limit) {
      const itemContent = match[1]

      const title = this.extractTag(itemContent, 'title')
      const link = this.extractTag(itemContent, 'link')
      const description = this.extractTag(itemContent, 'description')
      const company = this.extractTag(itemContent, 'dc:creator')
      const pubDate = this.extractTag(itemContent, 'pubDate')

      if (title && link) {
        // Extract location from description (first line usually has format: "Location [Type] Salary")
        const descLines = description.split('\n')
        const locationLine = descLines[0] || ''
        const locationMatch = locationLine.match(/^([^[]+)/)
        const location = locationMatch ? locationMatch[1].trim() : 'Remote'

        jobs.push({
          title: this.decodeHtml(title),
          company: company || 'Unknown Company',
          description: this.decodeHtml(description).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
          requirements: this.extractRequirements(description),
          location: location,
          jobUrl: link,
          postedDate: pubDate ? new Date(pubDate) : new Date(),
          source: this.config.name
        })
        count++
      }
    }

    return jobs
  }

  private extractTag(content: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i')
    const match = content.match(regex)
    return match ? match[1].trim() : ''
  }

  private extractRequirements(description: string): string {
    // Extract bullet points from description as requirements
    const bullets = description.match(/\* [^\n]+/g)
    if (bullets) {
      return bullets.slice(0, 10).join(', ').substring(0, 500)
    }
    return description.substring(0, 500)
  }

  private decodeHtml(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]*>/g, '')
  }
}
