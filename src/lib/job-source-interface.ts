/**
 * Job Source Plugin Interface
 * Implement this interface to add a new job source
 */

export interface JobPosting {
  title: string
  company: string
  description: string
  requirements?: string
  location?: string
  salary?: string
  jobUrl: string
  postedDate?: Date
  source: string
  sourceUrl?: string  // URL of the job board or RSS feed
}

export interface JobSourceConfig {
  name: string           // Display name (e.g., "Remotive", "LinkedIn")
  enabled: boolean       // Whether this source is active
  type: 'api' | 'rss'   // Source type
  rateLimitPerHour?: number  // Optional rate limiting
}

export interface JobSource {
  config: JobSourceConfig

  /**
   * Fetch jobs from this source
   * @param skills - User's skills to filter by
   * @param limit - Maximum number of jobs to return
   * @returns Array of job postings
   */
  fetchJobs(skills: string[], limit?: number): Promise<JobPosting[]>

  /**
   * Test if the source is accessible
   * @returns true if source is working
   */
  healthCheck(): Promise<boolean>
}

/**
 * Base class for job sources - extend this to create a new source
 */
export abstract class BaseJobSource implements JobSource {
  abstract config: JobSourceConfig

  abstract fetchJobs(skills: string[], limit?: number): Promise<JobPosting[]>

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetchJobs(['test'], 1)
      return true
    } catch (error) {
      console.error(`[${this.config.name}] Health check failed:`, error)
      return false
    }
  }

  /**
   * Helper: Filter jobs by skill match
   */
  protected filterBySkills<T>(jobs: T[], skills: string[], textExtractor: (job: T) => string): T[] {
    return jobs.filter(job => {
      const jobText = textExtractor(job).toLowerCase()
      return skills.some(skill => jobText.includes(skill.toLowerCase()))
    })
  }

  /**
   * Helper: Filter jobs by recency
   */
  protected filterByRecency<T>(jobs: T[], maxAgeDays: number, dateExtractor: (job: T) => Date): T[] {
    const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
    return jobs.filter(job => {
      const jobDate = dateExtractor(job)
      return jobDate > cutoffDate
    })
  }

  /**
   * Helper: Log fetching progress
   */
  protected log(message: string, level: 'info' | 'error' = 'info') {
    const prefix = `[${this.config.name}]`
    if (level === 'error') {
      console.error(prefix, message)
    } else {
      console.log(prefix, message)
    }
  }
}
