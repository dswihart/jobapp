/**
 * Job Board Monitoring Service
 * Monitors job boards for new opportunities
 */

import { prisma } from './prisma'
import { analyzeJobFitEnhanced } from './ai-service'
import { calculateRejectionPenalty } from './pattern-learning-service'
// Hardcoded sources removed - all sources are DB-driven via user_job_sources

import { fetchFromUserSources } from './user-sources-fetcher'
import { extractSkillsFromJob, saveSkillsToDatabase } from './skill-service'

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
  const allJobs: JobPosting[] = await fetchFromAllSources(userId)
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
        preferredCountries: (user.preferredCountries || []) as string[],
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

        // Extract and save skills to database asynchronously
        extractSkillsFromJob(job.description, job.title, job.company, job.requirements)
          .then(result => saveSkillsToDatabase(result, job.jobUrl))
          .catch(err => console.error("[Job Monitor] Skill extraction error:", err))
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
async function fetchFromAllSources(userId: string): Promise<JobPosting[]> {
  const allJobs: JobPosting[] = []

  // Fetch from user-configured DB sources (the only source system now)
  try {
    const userJobs = await fetchFromUserSources(userId)
    console.log('[Job Aggregator] Found ' + userJobs.length + ' jobs from user sources')
    allJobs.push(...userJobs)
  } catch (error) {
    console.error('[Job Aggregator] Error fetching user sources:', error)
  }

  // Remove duplicates by jobUrl
  const uniqueJobs = Array.from(
    new Map(allJobs.map(job => [job.jobUrl, job])).values()
  )

  console.log('[Job Aggregator] Summary:')
  console.log('  - Total: ' + allJobs.length + ' jobs (' + uniqueJobs.length + ' unique)')

  return uniqueJobs
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
  console.log('[DEBUG getJobOpportunities] Called with userId:', userId)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredCountries: true }
  })
  const preferredCountries = user?.preferredCountries || []

  console.log('[DEBUG getJobOpportunities] Preferred countries:', preferredCountries)

  const allJobs = await prisma.jobOpportunity.findMany({
    where: {
      userId,
      isArchived: false
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  console.log('[DEBUG getJobOpportunities] Found', allJobs.length, 'unarchived jobs')

  if (preferredCountries.length === 0) {
    console.log('[DEBUG] No preferred countries - returning all jobs')
    return allJobs
  }

  const filteredJobs = allJobs.filter(job => {
    const location = (job.location || '').toLowerCase()
    const title = (job.title || '').toLowerCase()
    const description = (job.description || '').toLowerCase()

    if (!job.location || job.location.trim() === '') {
      console.log('[DEBUG] Including (no location):', job.title)
      return true
    }

    if (location.includes('remote') || location.includes('worldwide') ||
        location.includes('anywhere') || location.includes('global') ||
        title.includes('remote') || description.includes('remote')) {
      console.log('[DEBUG] Including (remote):', job.title)
      return true
    }

    const matches = preferredCountries.some(country => {
      const countryLower = country.toLowerCase()

      if (location.includes(countryLower)) {
        return true
      }

      const locationVariations: Record<string, string[]> = {
        'spain': ['spain', 'españa', 'spanish', 'barcelona', 'madrid', 'valencia', 'seville'],
        'barcelona': ['barcelona', 'spain', 'españa'],
        'españa': ['españa', 'spain', 'spanish', 'barcelona'],
        'europe': ['europe', 'european', 'eu ', ' eu', 'emea'],
        'uk': ['uk', 'united kingdom', 'britain', 'british', 'london', 'manchester', 'edinburgh'],
        'usa': ['usa', 'united states', 'america', 'us ', ' us'],
        'germany': ['germany', 'german', 'berlin', 'munich', 'hamburg'],
        'france': ['france', 'french', 'paris', 'lyon'],
        'netherlands': ['netherlands', 'dutch', 'amsterdam', 'rotterdam'],
        'portugal': ['portugal', 'portuguese', 'lisbon', 'porto']
      }

      const variations = locationVariations[countryLower]
      if (variations) {
        return variations.some(variant => location.includes(variant))
      }

      return false
    })

    if (matches) {
      console.log('[DEBUG] Including (match):', job.title, '-', job.location)
    } else {
      console.log('[DEBUG] Filtering out:', job.title, '-', job.location)
    }

    return matches
  })

  console.log('[DEBUG getJobOpportunities] Returning', filteredJobs.length, 'jobs')

  return filteredJobs
}
