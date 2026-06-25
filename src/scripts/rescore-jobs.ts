/**
 * Rescore all active job opportunities using current feedback patterns.
 * Run with: npx tsx src/scripts/rescore-jobs.ts
 */

import { prisma } from '../lib/prisma'
import { analyzeJobFitEnhanced } from '../lib/ai-service'
import { calculateRejectionPenalty } from '../lib/pattern-learning-service'

const USER_ID = 'default-user-id'

async function rescore() {
  console.log('[Rescore] Starting rescore of all active opportunities...')

  const user = await prisma.user.findUnique({
    where: { id: USER_ID }
  })

  if (!user) {
    console.error('[Rescore] User not found')
    process.exit(1)
  }

  const userProfile = {
    primarySkills: user.primarySkills || user.skills || [],
    secondarySkills: user.secondarySkills || [],
    learningSkills: user.learningSkills || [],
    yearsOfExperience: user.yearsOfExperience || parseInt(user.experience || '0'),
    seniorityLevel: user.seniorityLevel || undefined,
    jobTitles: user.jobTitles || [],
    industries: user.industries || [],
    summary: user.summary || undefined,
    workPreference: user.workPreference || undefined,
    salaryExpectation: user.salaryExpectation || undefined
  }

  const jobs = await prisma.jobOpportunity.findMany({
    where: {
      userId: USER_ID,
      isArchived: false
    },
    orderBy: { createdAt: 'desc' }
  })

  console.log(`[Rescore] Found ${jobs.length} active opportunities to rescore`)

  let rescored = 0
  let errors = 0

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
          requirements: job.requirements || undefined,
          employmentType: job.employmentType || undefined,
          experienceLevel: job.experienceLevel || undefined
        },
        USER_ID
      )

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
      const oldScore = job.fitScore || 0

      await prisma.jobOpportunity.update({
        where: { id: job.id },
        data: {
          fitScore: adjustedScore,
          scoreBreakdown: fitResult.scoreBreakdown
        }
      })

      const penaltyStr = penalty > 0 ? ` penalty:-${penalty}` : ''
      const changeStr = adjustedScore !== oldScore ? ` (was ${oldScore}%)` : ' (unchanged)'
      console.log(`[Rescore] ${job.title} at ${job.company}: ${adjustedScore}%${penaltyStr}${changeStr}`)
      rescored++

      // Delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1500))
    } catch (error) {
      console.error(`[Rescore] Error scoring "${job.title}":`, error instanceof Error ? error.message : error)
      errors++
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  console.log(`\n[Rescore] Complete: ${rescored} rescored, ${errors} errors`)
  await prisma.$disconnect()
}

rescore().catch(err => {
  console.error('[Rescore] Fatal error:', err)
  process.exit(1)
})
