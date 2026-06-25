/**
 * One-off: rescore jobs created during the Jun 9 2026 Anthropic credit outage
 * (08:03-23:05 UTC), which were added with keyword-fallback fitScores.
 * Run with: npx -y tsx src/scripts/rescore-outage-jobs.ts
 */

import { prisma } from '../lib/prisma'
import { analyzeJobFitEnhanced } from '../lib/ai-service'
import { calculateRejectionPenalty } from '../lib/pattern-learning-service'

const USER_ID = 'default-user-id'
const WINDOW_START = new Date('2026-06-09T08:03:00Z')
const WINDOW_END = new Date('2026-06-09T23:05:00Z')

async function rescore() {
  const user = await prisma.user.findUnique({ where: { id: USER_ID } })
  if (!user) {
    console.error('[Rescore] User not found')
    process.exit(1)
  }

  const userProfile = {
    primarySkills: (user.primarySkills || user.skills || []) as string[],
    secondarySkills: (user.secondarySkills || []) as string[],
    learningSkills: (user.learningSkills || []) as string[],
    yearsOfExperience: user.yearsOfExperience || parseInt(user.experience?.replace(/\D/g, '') || '0'),
    seniorityLevel: user.seniorityLevel || undefined,
    jobTitles: (user.jobTitles || []) as string[],
    industries: (user.industries || []) as string[],
    summary: user.summary || undefined,
    workPreference: user.workPreference || undefined,
    preferredCountries: (user.preferredCountries || []) as string[],
    salaryExpectation: user.salaryExpectation || undefined
  }

  const jobs = await prisma.jobOpportunity.findMany({
    where: {
      userId: USER_ID,
      isArchived: false,
      createdAt: { gte: WINDOW_START, lte: WINDOW_END }
    },
    orderBy: { createdAt: 'asc' }
  })

  console.log(`[Rescore] ${jobs.length} outage-window jobs to rescore`)

  let rescored = 0
  let failed = 0
  let belowThreshold = 0
  const minFitScore = user.minFitScore ?? 35

  for (const job of jobs) {
    try {
      const fitResult = await analyzeJobFitEnhanced(
        userProfile,
        {
          title: job.title,
          company: job.company,
          description: job.description,
          location: job.location || undefined,
          salary: job.salary || undefined,
          requirements: job.requirements || undefined
        },
        USER_ID
      )

      // Don't overwrite junk with more junk if the AI call failed again
      if ((fitResult as any)._claudeScore == null && (fitResult as any)._miniMaxScore == null) {
        console.error(`[Rescore] AI unavailable for "${job.title}" — leaving as-is`)
        failed++
        await new Promise(r => setTimeout(r, 2000))
        continue
      }

      const penalty = await calculateRejectionPenalty(USER_ID, {
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        location: job.location || undefined,
        source: job.source,
        fitScore: fitResult.overall
      })
      const adjustedScore = Math.max(0, fitResult.overall - penalty)

      await prisma.jobOpportunity.update({
        where: { id: job.id },
        data: { fitScore: adjustedScore, scoreBreakdown: fitResult.scoreBreakdown }
      })

      if (adjustedScore < minFitScore) belowThreshold++
      console.log(`[Rescore] ${job.title} @ ${job.company}: ${job.fitScore} -> ${adjustedScore}`)
      rescored++
      await new Promise(r => setTimeout(r, 1000))
    } catch (error) {
      console.error(`[Rescore] Error on "${job.title}":`, error instanceof Error ? error.message : error)
      failed++
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  console.log(`[Rescore] Done: ${rescored} rescored, ${failed} failed, ${belowThreshold} now below threshold ${minFitScore}`)
  await prisma.$disconnect()
}

rescore()
