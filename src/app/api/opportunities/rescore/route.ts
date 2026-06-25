import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeJobFitEnhanced } from '@/lib/ai-service'
import { calculateRejectionPenalty } from '@/lib/pattern-learning-service'
import { requireAuthenticatedUser } from '@/lib/api-auth'

// Track active rescore jobs to prevent concurrent runs
let rescoreInProgress = false

export async function POST() {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) return authResult.response

  const userId = authResult.user.id

  if (rescoreInProgress) {
    return NextResponse.json({ message: 'Rescore already in progress' }, { status: 409 })
  }

  // Start rescoring in background, return immediately
  rescoreInProgress = true

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    rescoreInProgress = false
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Cap the rescore loop: each job is a full AI scoring call, so an uncapped
  // run over every stored opportunity can burn millions of tokens in one click
  const MAX_RESCORE_JOBS = 500
  const jobs = await prisma.jobOpportunity.findMany({
    where: { userId, isArchived: false },
    orderBy: { createdAt: 'desc' },
    take: MAX_RESCORE_JOBS
  })

  // Run rescoring in background (fire and forget)
  ;(async () => {
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
          userId
        )

        const penalty = await calculateRejectionPenalty(userId, {
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
          data: {
            fitScore: adjustedScore,
            scoreBreakdown: fitResult.scoreBreakdown
          }
        })

        rescored++
        await new Promise(r => setTimeout(r, 1500))
      } catch (error) {
        console.error(`[Rescore] Error scoring "${job.title}":`, error instanceof Error ? error.message : error)
        errors++
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    console.log(`[Rescore] Complete: ${rescored} rescored, ${errors} errors`)
    rescoreInProgress = false
  })()

  return NextResponse.json({
    message: `Rescoring ${jobs.length} opportunities in background${jobs.length === MAX_RESCORE_JOBS ? ` (capped at ${MAX_RESCORE_JOBS} most recent)` : ''}`,
    count: jobs.length
  })
}

export async function GET() {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) return authResult.response

  return NextResponse.json({ inProgress: rescoreInProgress })
}
