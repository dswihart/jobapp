/**
 * Job Board Monitoring Service
 * Monitors job boards for new opportunities
 */

import { createHash } from 'crypto'
import { prisma } from './prisma'
import { analyzeJobFitEnhanced } from './ai-service'
import { calculateRejectionPenalty } from './pattern-learning-service'
// Hardcoded sources removed - all sources are DB-driven via user_job_sources

import { fetchFromUserSources } from './user-sources-fetcher'
import { fetchFromTargetCompanies } from './sources/target-companies-fetcher'
import { fetchFromExaDiscovery } from './sources/exa-discovery'
import { extractSkillsFromJob, saveSkillsToDatabase } from './skill-service'

/**
 * Paywalled job boards — the posting may be real, but the user cannot actually
 * view or apply without a paid membership, so these are noise. Drop any job
 * whose URL points at one of these hosts, regardless of which source surfaced
 * it (user feeds, target companies, or Exa). Keep this list NARROW: it is
 * applied globally, unlike the Exa-only AGGREGATOR_HOST_DENYLIST (which also
 * lists free boards the user pulls directly, e.g. remoteok/remotive).
 */
const PAYWALLED_HOST_DENYLIST = [
  'workingnomads', // Working Nomads — full listings gated behind paid plan
  'flexjobs',      // FlexJobs — subscription required to see/apply
]

function isPaywalledHost(url: string | undefined): boolean {
  if (!url) return false
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    return PAYWALLED_HOST_DENYLIST.some(d => host === d || host.includes(d))
  } catch {
    return false
  }
}

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
    where: { id: userId },
    select: {
      id: true,
      email: true,
      skills: true,
      primarySkills: true,
      secondarySkills: true,
      jobTitles: true,
      experience: true,
      yearsOfExperience: true,
      seniorityLevel: true,
      workPreference: true,
      summary: true,
      resumeUrl: true,
      minFitScore: true,
      maxJobAgeDays: true,
      notificationThreshold: true,
      preferredCountries: true,
    }
  })

  if (!user) {
    throw new Error('User not found')
  }

  const minFitScore = user.minFitScore ?? 40
  const maxJobAgeDays = user.maxJobAgeDays ?? 7
  const notificationThreshold = user.notificationThreshold ?? 80

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

  const seenTitleCompany = new Set<string>()
  const lowScoreCache = new Set<string>() // cache jobs that scored below threshold to avoid re-scoring from other sources

  // Hard cap on AI scoring calls per scan — bounds worst-case API spend when a
  // source floods the scan with new listings (June 2026 Exa incident).
  // Raised 150 -> 400 (2026-06-21) so newly-added target companies, scanned late
  // in the pipeline, get scored in a single pass instead of being deferred.
  const MAX_AI_CALLS_PER_SCAN = 400
  let aiCallCount = 0
  let aiCapSkipped = 0

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

      // In-memory dedup within this scan (prevents scoring same job from multiple sources)
      const titleCompanyKey = (job.title + '|||' + job.company).toLowerCase()
      if (seenTitleCompany.has(titleCompanyKey)) {
        continue
      }
      seenTitleCompany.add(titleCompanyKey)

      // Skip if this title+company already scored below threshold in this scan
      if (lowScoreCache.has(titleCompanyKey)) {
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
        const postedTime = new Date(job.postedDate).getTime()
        // Guard: if date is epoch (year < 2000) or NaN, skip the age check — treat as fresh
        if (!isNaN(postedTime) && new Date(postedTime).getFullYear() >= 2000) {
          const jobAgeInDays = Math.floor((Date.now() - postedTime) / (1000 * 60 * 60 * 24))
          if (jobAgeInDays > maxJobAgeDays) {
            console.log(`[Job Monitor] Skipping old job: ${job.title} (posted ${jobAgeInDays} days ago, max: ${maxJobAgeDays} days)`)
            continue
          }
        } else {
          console.log(`[Job Monitor] Skipping age check for ${job.title} — invalid postedDate`)
        }
      }

      // === PRE-FILTER: cheap relevance check before expensive AI call ===
      const jobText = (job.title + " " + job.description + " " + (job.requirements || "")).toLowerCase()
      const jobTitleLower = job.title.toLowerCase()
      const userSkills = [...((user.primarySkills || user.skills) as string[]), ...((user.secondarySkills || []) as string[])]
      const userTitles = ((user.jobTitles || []) as string[])

      // 1. Check if any full skill string appears in job text
      const skillHit = userSkills.some(s => jobText.includes(s.toLowerCase()))

      // 2. Check if job title matches any preferred title keyword
      const titleHit = userTitles.some(t => {
        const words = t.toLowerCase().split(" ").filter(w => w.length > 3 && !["senior","junior","lead","principal","engineer","analyst","manager","specialist","developer","consultant"].includes(w))
        return words.some(w => jobTitleLower.includes(w))
      })

      // 3. Check job title/text against domain keywords extracted from skills
      const domainKeywords = userSkills.flatMap(s => {
        const lower = s.toLowerCase()
        // Keep single-word skills as-is (e.g. "python", "splunk", "devsecops")
        if (!lower.includes(" ")) return lower.length > 3 ? [lower] : []
        // Split multi-word skills, keep domain-specific words
        const generic = ["management","engineering","testing","architecture","analytics","operations","response","detection","integration","integrations","design","strategy","development","solutions","network","systems","services","platform","data","lead","team","api","cli"]
        return lower.split(" ").filter(w => w.length > 3 && !generic.includes(w))
      })
      const uniqueDomainKeywords = [...new Set(domainKeywords)]
      const domainHit = uniqueDomainKeywords.some(kw => jobTitleLower.includes(kw))

      // Skip AI call if none of the three checks pass
      if (!skillHit && !titleHit && !domainHit) {
        console.log(`[Job Monitor] Pre-filter SKIP: ${job.title}`)
        continue
      }

      // === CACHE CHECK: skip jobs already scored in last 7 days ===
      const jobHash = createHash('md5').update(job.title + '|||' + job.company).digest('hex')
      const cached = await prisma.$queryRaw<Array<{ score: number }>>`
        SELECT score FROM scored_jobs_cache
        WHERE user_id = ${userId} AND job_hash = ${jobHash} AND scored_at > NOW() - INTERVAL '7 days'
        LIMIT 1
      `
      if (cached.length > 0) {
        console.log(`[Job Monitor] Cache HIT: ${job.title} (cached score: ${cached[0].score})`)
        // Refresh scored_at so listings that keep appearing in scan results stay
        // cached instead of being re-scored every time the TTL expires
        await prisma.$executeRaw`
          UPDATE scored_jobs_cache SET scored_at = NOW()
          WHERE user_id = ${userId} AND job_hash = ${jobHash}
        `.catch((e: unknown) => console.error('[Job Monitor] Cache refresh error:', e))
        if (cached[0].score < minFitScore) continue
        // If cached score was above threshold, the job was already added previously — skip
        continue
      }

      if (aiCallCount >= MAX_AI_CALLS_PER_SCAN) {
        if (aiCapSkipped === 0) {
          console.warn(`[Job Monitor] AI call cap (${MAX_AI_CALLS_PER_SCAN}) reached — deferring remaining new jobs to a later scan`)
        }
        aiCapSkipped++
        continue
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

      // Use enhanced AI matching — Haiku first (cheap), Sonnet for borderline
      const jobDesc = {
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements || '',
        location: job.location,
        salary: job.salary
      }
      let fitScore = await analyzeJobFitEnhanced(enhancedProfile, jobDesc, userId, undefined, minFitScore)
      aiCallCount++

      // Skip jobs the AI couldn't score (keyword fallback after an API failure,
      // e.g. credit exhaustion): don't cache or add them with junk scores —
      // they'll be re-encountered and properly scored on a later scan
      if ((fitScore._claudeScore ?? null) === null && (fitScore._miniMaxScore ?? null) === null) {
        console.log(`[Job Monitor] AI scoring unavailable — deferring job to a later scan: ${job.title}`)
        continue
      }

      // Re-score borderline jobs (45-60%) with Sonnet for better accuracy
      if (fitScore.overall >= 45 && fitScore.overall <= 60) {
        console.log(`[Job Monitor] Borderline ${fitScore.overall}% — re-scoring with Sonnet: ${job.title}`)
        const sonnetScore = await analyzeJobFitEnhanced(enhancedProfile, jobDesc, userId, 'claude-sonnet-4-6', minFitScore)
        aiCallCount++
        // Keep the Haiku result if the Sonnet call fell back to keyword scoring
        if ((sonnetScore._claudeScore ?? null) !== null || (sonnetScore._miniMaxScore ?? null) !== null) {
          fitScore = sonnetScore
        }
      }

      // Apply learned rejection patterns penalty
      const rejectionPenalty = await calculateRejectionPenalty(userId, {
        id: 'pending',
        title: job.title,
        company: job.company,
        description: job.description,
        location: job.location,
        source: job.source || 'Unknown',
        fitScore: fitScore.overall
      })

      const adjustedScore = Math.max(0, fitScore.overall - rejectionPenalty)

      // Cache the score so we skip this job in future scans
      const claudeScore = fitScore._claudeScore ?? null
      const miniMaxScore = fitScore._miniMaxScore ?? null
      await prisma.$executeRaw`
        INSERT INTO scored_jobs_cache (user_id, job_hash, score, claude_score, minimax_score)
        VALUES (${userId}, ${jobHash}, ${adjustedScore}, ${claudeScore}, ${miniMaxScore})
        ON CONFLICT (user_id, job_hash) DO UPDATE
          SET score = ${adjustedScore}, claude_score = ${claudeScore}, minimax_score = ${miniMaxScore}, scored_at = NOW()
      `.catch((e: unknown) => console.error('[Job Monitor] Cache write error:', e))

      console.log(`[Job Monitor] ${job.title} at ${job.company}: ${fitScore.overall}% fit (title: ${fitScore.titleMatch}%, skill: ${fitScore.skillMatch}%, exp: ${fitScore.experienceMatch}%)${rejectionPenalty > 0 ? ` - PENALTY: -${rejectionPenalty}% = ${adjustedScore}%` : ''}`)

      if (adjustedScore < minFitScore) {
        lowScoreCache.add(titleCompanyKey)
      }

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
            scoreBreakdown: fitScore.scoreBreakdown,
            userId
          }
        })

        await prisma.alert.create({
          data: {
            message: `New job match: ${job.title} at ${job.company} (${adjustedScore}% fit)`,
            type: 'NEW_JOB',
            userId,
            opportunityId: opportunity.id
          }
        })

        if (notificationThreshold > 0 && adjustedScore >= notificationThreshold) {
          await prisma.alert.create({
            data: {
              message: `Strong match (${adjustedScore}%): ${job.title} at ${job.company}`,
              type: 'HIGH_FIT_SCORE',
              userId,
              opportunityId: opportunity.id
            }
          })
        }

        // Save skills extracted by the fit scoring AI call (merged - no separate API call needed)
        if (fitScore.extractedJobSkills && fitScore.extractedJobSkills.length > 0) {
          const skillResult = {
            skills: fitScore.extractedJobSkills.map((s: any) => ({
              name: s.name,
              category: s.category || "Tool",
              isRequired: s.isRequired ?? true,
            })),
            jobTitle: job.title,
            company: job.company,
          }
          saveSkillsToDatabase(skillResult, job.jobUrl)
            .catch(err => console.error("[Job Monitor] Skill save error:", err))
        }
        console.log(`[Job Monitor] Added job: ${job.title} (${adjustedScore}% fit)`)
        addedCount++
      }
    } catch (error) {
      console.error('[Job Monitor] Error processing job:', error)
    }
  }

  console.log(`[Job Monitor] Scan complete. Added ${addedCount} new jobs.${aiCapSkipped > 0 ? ` AI call cap hit — ${aiCapSkipped} new jobs deferred.` : ''}`)
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

  // Fetch from target companies (Phase 1: US-HQ SMB tech with Spain presence).
  // Companies are global; the same jobs are considered for every user with autoScan.
  // Fit-score per-user handles relevance ranking. See .planning/phases/01-.../01-SPEC.md
  try {
    const targetJobs = await fetchFromTargetCompanies()
    console.log('[Job Aggregator] Found ' + targetJobs.length + ' Spain-filtered jobs from target companies')
    allJobs.push(...targetJobs)
  } catch (error) {
    console.error('[Job Aggregator] Error fetching target companies:', error)
  }

  // Fetch from Exa whole-web discovery (profile + GOOD_MATCH calibrated neural search).
  try {
    const exaJobs = await fetchFromExaDiscovery(userId)
    console.log('[Job Aggregator] Found ' + exaJobs.length + ' jobs from Exa discovery')
    allJobs.push(...exaJobs)
  } catch (error) {
    console.error('[Job Aggregator] Error fetching Exa discovery:', error)
  }

  // Remove duplicates by jobUrl
  const uniqueJobs = Array.from(
    new Map(allJobs.map(job => [job.jobUrl, job])).values()
  )

  // Drop paywalled job boards (e.g. Working Nomads, FlexJobs) — the user can't
  // access these without paying, so they should never reach the DB.
  const accessibleJobs = uniqueJobs.filter(job => !isPaywalledHost(job.jobUrl))
  const paywalledDropped = uniqueJobs.length - accessibleJobs.length

  console.log('[Job Aggregator] Summary:')
  console.log('  - Total: ' + allJobs.length + ' jobs (' + uniqueJobs.length + ' unique)')
  if (paywalledDropped > 0) {
    console.log('  - Dropped ' + paywalledDropped + ' paywalled-board jobs (Working Nomads / FlexJobs)')
  }

  return accessibleJobs
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
