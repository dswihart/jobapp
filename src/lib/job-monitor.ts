/**
 * Job Board Monitoring Service
 * Monitors job boards for new opportunities
 */

import { PrismaClient } from '@prisma/client'
import { analyzeJobFitEnhanced } from './ai-service'
import { calculateRejectionPenalty } from './pattern-learning-service'
import { getEnabledSources } from './sources'

import { fetchFromUserSources } from './user-sources-fetcher'

/**
 * DEPRECATED: Location filtering now handled by AI based on user preferences
 * Each user can set their own location preferences in their profile
 */
/*
function matchesLocationRequirement(jobLocation: string | undefined): boolean {
  if (!jobLocation) return false
  
  const loc = jobLocation.toLowerCase()
  
  // Accept remote jobs
  if (loc.includes('remote') || loc.includes('worldwide') || loc.includes('anywhere')) {
    return true
  }
  
  // Accept Barcelona jobs
  if (loc.includes('barcelona')) {
    return true
  }
  
  // Accept Spain jobs (could be remote from Spain)
  if (loc.includes('spain') || loc.includes('españa') || loc.includes('madrid') || loc.includes('valencia')) {
    return true
  }
  
  // Accept European remote
  if (loc.includes('europe') && loc.includes('remote')) {
    return true
  }
  
  // Reject everything else (USA, Egypt, India, etc.)
  return false
}
*/

const prisma = new PrismaClient()

interface JobPosting {
  title: string
  company: string
  description: string
  requirements?: string
  location?: string
  salary?: string
  jobUrl: string
  postedDate?: Date
  source?: string
}

interface RemotiveJob {
  id: number
  url: string
  title: string
  company_name: string
  company_logo: string
  category: string
  job_type: string
  publication_date: string
  candidate_required_location: string
  salary: string
  description: string
  tags: string[]
}

export async function monitorJobBoards(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  const minFitScore = user.minFitScore ?? 40
  const maxJobAgeDays = user.maxJobAgeDays ?? 7

  console.log(`[Job Monitor] Starting scan for user ${userId}`)
  console.log(`[Job Monitor] User Profile:`, {
    primarySkills: user.primarySkills || user.skills,
    secondarySkills: user.secondarySkills || [],
    jobTitles: user.jobTitles || [],
    seniorityLevel: user.seniorityLevel,
    experience: user.experience,
    workPreference: user.workPreference,
    yearsOfExperience: user.yearsOfExperience,
    summary: user.summary ? 'Present' : 'Not set'
  })
  console.log(`[Job Monitor] Settings: Min Fit Score = ${minFitScore}%, Max Age = ${maxJobAgeDays} days`)

  // Fetch from all enabled sources
  const allJobs: JobPosting[] = await fetchFromAllSources(userId, user.primarySkills || user.skills)
  console.log(`[Job Monitor] Found ${allJobs.length} total jobs from all sources`)

  let addedCount = 0

  for (const job of allJobs) {
    try {
      // Check if job is blocked (previously rejected)
      const blocked = await prisma.$queryRaw<Array<{ "userId": string }>>`
        SELECT "userId" FROM blocked_jobs
        WHERE "userId" = ${userId} AND "jobUrl" = ${job.jobUrl}
        LIMIT 1
      `
      
      if (blocked.length > 0) {
        console.log(`[Job Monitor] Skipping blocked job: ${job.title}`)
        continue
      }

      // Check for existing job by URL or by title+company combination
      const existing = await prisma.jobOpportunity.findFirst({
        where: {
          userId,
          OR: [
            { jobUrl: job.jobUrl },
            {
              AND: [
                { title: job.title },
                { company: job.company }
              ]
            }
          ]
        }
      })
      if (existing) {
        console.log(`[Job Monitor] Skipping duplicate job: ${job.title} (archived: ${existing.isArchived})`)
        continue
      }

      // Check job age
      if (job.postedDate) {
        const jobAgeInDays = Math.floor((Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24))
        if (jobAgeInDays > maxJobAgeDays) {
          console.log(`[Job Monitor] Skipping old job: ${job.title} (posted ${jobAgeInDays} days ago, max: ${maxJobAgeDays} days)`)
          continue
        }
      }

      // Build enhanced user profile for better AI matching
      const enhancedProfile = {
        primarySkills: (user.primarySkills || user.skills) as string[],
        secondarySkills: (user.secondarySkills || []) as string[],
        learningSkills: (user.learningSkills || []) as string[],
        yearsOfExperience: user.yearsOfExperience || parseInt(user.experience?.replace(/\D/g, '') || '0'),
        seniorityLevel: user.seniorityLevel || undefined,
        workHistory: (user.workHistory as Array<{
          company: string
          role: string
          duration: string
          achievements: string[]
        }>) || [],
        jobTitles: (user.jobTitles || []) as string[],
        industries: (user.industries || []) as string[],
        summary: user.summary || undefined,
        workPreference: user.workPreference || undefined,
        salaryExpectation: user.salaryExpectation || undefined
      }

      // Use enhanced AI matching
      const fitScore = await analyzeJobFitEnhanced(
        enhancedProfile,
        {
          title: job.title,
          company: job.company,
          description: job.description,
          requirements: job.requirements || '',
          location: job.location,
          salary: job.salary
        }
      )


      // Apply learned rejection patterns penalty
      // DISABLED temporarily until rejection_patterns table is created
      const rejectionPenalty = 0

      const adjustedScore = Math.max(0, fitScore.overall - rejectionPenalty)

      console.log(`[Job Monitor] ${job.title} at ${job.company}: ${fitScore.overall}% fit (title: ${fitScore.titleMatch}%, skill: ${fitScore.skillMatch}%, exp: ${fitScore.experienceMatch}%)${rejectionPenalty > 0 ? ` - PENALTY: -${rejectionPenalty}% = ${adjustedScore}%` : ''}`)

      if (adjustedScore >= minFitScore) {
        const opportunity = await prisma.jobOpportunity.create({
          data: {
            title: job.title,
            company: job.company,
            description: job.description,
            requirements: job.requirements,
            location: job.location,
            salary: job.salary,
            jobUrl: job.jobUrl,
            source: job.source || 'Unknown',
            postedDate: job.postedDate,
            fitScore: adjustedScore,
            userId
          }
        })

        await prisma.alert.create({
          data: {
            message: `New job match: ${job.title} at ${job.company} (${fitScore.overall}% fit)`,
            type: 'NEW_JOB',
            userId,
            opportunityId: opportunity.id
          }
        })

        console.log(`[Job Monitor] Added job: ${job.title} (${fitScore.overall}% fit)`)
        addedCount++
      }
    } catch (error) {
      console.error('[Job Monitor] Error processing job:', error)
    }
  }

  console.log(`[Job Monitor] Scan complete. Added ${addedCount} new jobs.`)
  return addedCount
}
async function fetchFromAllSources(userId: string, skills: string[]): Promise<JobPosting[]> {
  const allJobs: JobPosting[] = []
  const sourceCounts: Record<string, number> = {}

  // Fetch from user-configured sources
  try {
    const userJobs = await fetchFromUserSources(userId, skills)
    console.log(`[Job Aggregator] Found ${userJobs.length} jobs from user sources`)
    allJobs.push(...userJobs)
  } catch (error) {
    console.error('[Job Aggregator] Error fetching user sources:', error)
  }

  // Fetch from hardcoded sources
  const enabledSources = getEnabledSources()
  console.log(`[Job Aggregator] Scanning ${enabledSources.length} enabled sources...`)

  for (const source of enabledSources) {
    try {
      console.log(`[${source.config.name}] Fetching jobs...`)
      const jobs = await source.fetchJobs(skills, 50)

      // Map to include source name
      const jobsWithSource = jobs.map(job => ({
        ...job,
        source: source.config.name
      }))

      sourceCounts[source.config.name] = jobsWithSource.length
      allJobs.push(...jobsWithSource)
      console.log(`[${source.config.name}] Filtered to ${jobsWithSource.length} relevant jobs`)
    } catch (error) {
      console.error(`[${source.config.name}] Error fetching jobs:`, error)
      sourceCounts[source.config.name] = 0
    }
  }

  // Log summary
  console.log(`[Job Aggregator] Summary:`)
  for (const [sourceName, count] of Object.entries(sourceCounts)) {
    console.log(`  - ${sourceName}: ${count} jobs`)
  }

  // Remove duplicates by jobUrl
  const uniqueJobs = Array.from(
    new Map(allJobs.map(job => [job.jobUrl, job])).values()
  )

  console.log(`[Job Aggregator] Summary:`)
  console.log(`  - Total: ${allJobs.length} jobs (${uniqueJobs.length} unique)`)
  console.log(`  - Time: ${Date.now() / 1000}s`)

  return uniqueJobs
}

async function fetchJobPostings(skills: string[]): Promise<JobPosting[]> {
  try {
    console.log('[Remotive API] Fetching jobs...')

    const response = await fetch('https://remotive.com/api/remote-jobs?limit=50', {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Remotive API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.jobs || !Array.isArray(data.jobs)) {
      throw new Error('Invalid response format from Remotive API')
    }

    console.log(`[Remotive API] Received ${data.jobs.length} total jobs`)

    const jobs: JobPosting[] = data.jobs
      .filter((job: RemotiveJob) => {
        const jobText = `${job.title} ${job.description} ${job.category}`.toLowerCase()
        const hasSkillMatch = skills.some(skill =>
          jobText.includes(skill.toLowerCase())
        )

        const isRecent = new Date(job.publication_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        return hasSkillMatch && isRecent
      })
      .slice(0, 20)
      .map((job: RemotiveJob) => ({
        title: job.title,
        company: job.company_name,
        description: job.description,
        requirements: job.tags.join(', '),
        location: job.candidate_required_location || 'Remote',
        salary: job.salary || undefined,
        jobUrl: job.url,
        postedDate: new Date(job.publication_date)
      }))

    console.log(`[Remotive API] Filtered to ${jobs.length} relevant jobs matching skills`)

    return jobs

  } catch (error) {
    console.error('[Remotive API] Error fetching jobs:', error)

    console.log('[Remotive API] Falling back to sample jobs for testing')
    return getSampleJobs(skills)
  }
}

function getSampleJobs(skills: string[]): JobPosting[] {
  const sampleJobs: JobPosting[] = [
    {
      title: 'Senior Full Stack Developer',
      company: 'Tech Corp',
      description: 'We are seeking an experienced Full Stack Developer to join our growing team. You will work with React, Node.js, and PostgreSQL to build scalable web applications.',
      requirements: 'React, Node.js, TypeScript, PostgreSQL, 5+ years experience',
      location: 'Remote',
      salary: '$120k-$150k',
      jobUrl: 'https://example.com/jobs/senior-full-stack-' + Date.now(),
      postedDate: new Date()
    },
    {
      title: 'Frontend Engineer',
      company: 'StartupXYZ',
      description: 'Join our team building next-generation user interfaces with React and TypeScript.',
      requirements: 'React, TypeScript, CSS, 3+ years experience',
      location: 'San Francisco, CA',
      salary: '$100k-$130k',
      jobUrl: 'https://example.com/jobs/frontend-engineer-' + Date.now(),
      postedDate: new Date()
    }
  ]

  return sampleJobs.filter(job => {
    const jobText = `${job.title} ${job.description} ${job.requirements || ''}`.toLowerCase()
    return skills.some(skill => jobText.includes(skill.toLowerCase()))
  })
}

export async function getUnreadAlerts(userId: string) {
  return await prisma.alert.findMany({
    where: {
      userId,
      isRead: false
    },
    include: {
      opportunity: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function markAlertAsRead(alertId: string) {
  return await prisma.alert.update({
    where: { id: alertId },
    data: { isRead: true }
  })
}

export async function getJobOpportunities(userId: string) {
  return await prisma.jobOpportunity.findMany({
    where: {
      userId,
      isArchived: false
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}
