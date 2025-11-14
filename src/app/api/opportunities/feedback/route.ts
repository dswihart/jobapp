export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { learnFromRejection } from '@/lib/pattern-learning-service'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { opportunityId, userId, feedback } = await request.json()

    if (!opportunityId || !userId || !feedback) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['GOOD_MATCH', 'BAD_MATCH'].includes(feedback)) {
      return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 })
    }

    // Get the job details before deleting (for pattern learning)
    const job = await prisma.jobOpportunity.findUnique({
      where: { id: opportunityId }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // If BAD_MATCH, learn from the rejection before deleting
    if (feedback === 'BAD_MATCH') {
      // Extract and store rejection patterns
      await learnFromRejection(userId, {
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        location: job.location || undefined,
        source: job.source,
        fitScore: job.fitScore || 0
      })

      // Add to permanent block list to prevent re-scraping
      await prisma.$executeRaw`
        INSERT INTO blocked_jobs (user_id, job_url)
        VALUES (${userId}, ${job.jobUrl})
        ON CONFLICT (user_id, job_url) DO NOTHING
      `

      // Delete the opportunity
      await prisma.jobOpportunity.delete({
        where: { id: opportunityId }
      })

      console.log(`[Pattern Learning] Learned from rejection and blocked: ${job.title} at ${job.company}`)
      
      return NextResponse.json({ success: true, deleted: true })
    }

    // If GOOD_MATCH, save the feedback
    const updated = await prisma.jobOpportunity.update({
      where: { id: opportunityId },
      data: { userFeedback: feedback }
    })

    return NextResponse.json({ success: true, opportunity: updated })

  } catch (error) {
    console.error('Error saving feedback:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to save feedback'
    }, { status: 500 })
  }
}
