export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { learnFromRejection } from '@/lib/pattern-learning-service'


export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { opportunityId, feedback } = await request.json()

    if (!opportunityId || !feedback) {
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

      // Add to permanent block list to prevent re-scraping (use Prisma model)
      try {
        await prisma.blockedJob.create({
          data: {
            userId,
            jobUrl: job.jobUrl
          }
        })
      } catch (e: unknown) {
        // Ignore unique constraint violation (already blocked)
        if (!(e instanceof Error && 'code' in e && (e as { code: string }).code === 'P2002')) {
          throw e
        }
      }

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
