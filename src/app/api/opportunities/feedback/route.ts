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
    const { opportunityId, feedback, reasons, customNote } = await request.json()

    if (!opportunityId || !feedback) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['GOOD_MATCH', 'BAD_MATCH'].includes(feedback)) {
      return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 })
    }

    // Get the job details before deleting (for pattern learning)
    const job = await prisma.jobOpportunity.findFirst({
      where: { id: opportunityId, userId }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // If BAD_MATCH, delete the opportunity even if the learning side effects fail.
    // This keeps thumbs-down usable when pattern storage or blocklist writes hit data issues.
    if (feedback === 'BAD_MATCH') {
      try {
        await learnFromRejection(userId, {
          id: job.id,
          title: job.title,
          company: job.company,
          description: job.description,
          location: job.location || undefined,
          source: job.source,
          fitScore: job.fitScore || 0
        }, reasons, customNote)
      } catch (error) {
        console.warn('[Feedback] Failed to learn from rejection, continuing with delete:', error)
      }

      if (job.jobUrl) {
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
            console.warn('[Feedback] Failed to persist blocked job, continuing with delete:', e)
          }
        }
      }

      // Delete the opportunity
      await prisma.jobOpportunity.delete({
        where: { id: opportunityId }
      })

      console.log(`[Pattern Learning] Learned from rejection and blocked: ${job.title} at ${job.company} | reasons: ${(reasons || []).join(', ') || 'none'}`)

      return NextResponse.json({ success: true, deleted: true })
    }

    // If GOOD_MATCH, save the feedback with reasons
    const notes = []
    if (reasons && reasons.length > 0) {
      notes.push('Good match reasons: ' + reasons.join(', '))
    }
    if (customNote) {
      notes.push('Note: ' + customNote)
    }

    const updateData: Record<string, unknown> = { userFeedback: feedback }
    if (notes.length > 0) {
      // Append to existing notes
      const existingNotes = job.notes || ''
      updateData.notes = existingNotes ? existingNotes + '\n' + notes.join('; ') : notes.join('; ')
    }

    const updated = await prisma.jobOpportunity.update({
      where: { id: opportunityId },
      data: updateData
    })

    if (reasons && reasons.length > 0) {
      console.log(`[Feedback] Good match: ${job.title} at ${job.company} | reasons: ${reasons.join(', ')}`)
    }

    return NextResponse.json({ success: true, opportunity: updated })

  } catch (error) {
    console.error('Error saving feedback:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to save feedback'
    }, { status: 500 })
  }
}
