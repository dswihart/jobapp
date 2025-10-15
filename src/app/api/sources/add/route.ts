import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const { name, apiUrl, type } = await request.json()

    if (!name || !apiUrl || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Sanitize name for file/class names
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '')
    const fileName = name.toLowerCase().replace(/\s+/g, '-')
    const className = sanitizedName + 'Source'

    // Generate source file content
    const sourceCode = generateSourceCode(name, className, apiUrl, type)

    // Write source file
    const sourcePath = path.join(process.cwd(), 'src', 'lib', 'sources', `${fileName}-source.ts`)
    await fs.writeFile(sourcePath, sourceCode, 'utf-8')

    console.log(`[Source Manager] Created source file: ${sourcePath}`)

    // Trigger rebuild and restart in background
    setTimeout(async () => {
      try {
        console.log('[Source Manager] Starting rebuild...')

        // Build the application
        const { stdout: buildOutput, stderr: buildError } = await execAsync(
          'cd /opt/job-tracker && npm run build',
          { timeout: 120000 }
        )

        if (buildError && !buildOutput.includes('Compiled successfully')) {
          console.error('[Source Manager] Build failed:', buildError)
          return
        }

        console.log('[Source Manager] Build successful, restarting service...')

        // Restart the service
        await execAsync('systemctl restart job-tracker')

        console.log('[Source Manager] Service restarted successfully')
      } catch (error) {
        console.error('[Source Manager] Auto-deploy failed:', error)
      }
    }, 1000)

    return NextResponse.json({
      message: `Source "${name}" added successfully! Rebuilding and restarting automatically...`,
      success: true,
      filePath: sourcePath,
      autoDeployStarted: true
    })
  } catch (error) {
    console.error('Error adding source:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to add source'
    }, { status: 500 })
  }
}

function generateSourceCode(name: string, className: string, apiUrl: string, type: string): string {
  return `/**
 * ${name} Job Source
 * Auto-generated on ${new Date().toISOString()}
 */

import { BaseJobSource, JobPosting, JobSourceConfig } from '../job-source-interface'

interface ${className}Job {
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

export class ${className} extends BaseJobSource {
  config: JobSourceConfig = {
    name: '${name}',
    enabled: true,
    type: '${type}' as 'api' | 'rss',
    rateLimitPerHour: 100
  }

  private readonly API_URL = '${apiUrl}'
  // If your API needs authentication, add:
  // private readonly API_KEY = process.env.${name.toUpperCase().replace(/\s+/g, '_')}_API_KEY

  async fetchJobs(skills: string[], limit: number = 50): Promise<JobPosting[]> {
    try {
      this.log('Fetching jobs...')

      // Make API request
      const response = await fetch(\`\${this.API_URL}?limit=\${limit}\`, {
        headers: {
          'Accept': 'application/json',
          // Uncomment if API needs authentication:
          // 'Authorization': \`Bearer \${this.API_KEY}\`,
        }
      })

      if (!response.ok) {
        throw new Error(\`API error: \${response.status}\`)
      }

      const data = await response.json()

      // TODO: Adjust this based on your API's response structure
      // Common patterns: data.jobs, data.results, data.data, or just data
      const jobs = data.jobs || data.results || data.data || (Array.isArray(data) ? data : [])

      if (!Array.isArray(jobs)) {
        throw new Error('Invalid response format - expected array')
      }

      this.log(\`Received \${jobs.length} jobs\`)

      // Filter by skills (matches jobs containing at least one of your skills)
      const skillFiltered = this.filterBySkills(
        jobs,
        skills,
        (job: ${className}Job) => \`\${job.title} \${job.description}\`
      )

      // Filter by recency (last 7 days)
      const recentJobs = this.filterByRecency(
        skillFiltered,
        7,
        (job: ${className}Job) => new Date(job.posted_date || new Date())
      )

      // Map to standard JobPosting format
      const standardJobs: JobPosting[] = recentJobs
        .slice(0, 20)
        .map((job: ${className}Job) => ({
          title: job.title,
          company: job.company,
          description: job.description,
          requirements: undefined, // Add if your API provides this
          location: job.location || 'Not specified',
          salary: undefined, // Add if your API provides this
          jobUrl: job.url || \`\${this.API_URL}/\${job.id}\`,
          postedDate: job.posted_date ? new Date(job.posted_date) : undefined,
          source: this.config.name
        }))

      this.log(\`Filtered to \${standardJobs.length} relevant jobs\`)
      return standardJobs

    } catch (error) {
      this.log(\`Error: \${error}\`, 'error')
      return []
    }
  }
}
`
}
