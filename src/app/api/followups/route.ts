import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Always scope to the authenticated user — never trust a client-supplied id.
    const userId = session.user.id

    const now = new Date()
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Get follow-ups that are due within 24 hours and not completed
    const upcomingFollowUps = await prisma.followUp.findMany({
      where: {
        userId,
        completed: false,
        dueDate: {
          lte: oneDayFromNow
        }
      },
      orderBy: {
        dueDate: 'asc'
      },
      include: {
        application: {
          select: {
            company: true,
            role: true,
            status: true
          }
        }
      }
    })

    // Get overdue follow-ups
    const overdueFollowUps = await prisma.followUp.findMany({
      where: {
        userId,
        completed: false,
        dueDate: {
          lt: now
        }
      },
      orderBy: {
        dueDate: 'asc'
      },
      include: {
        application: {
          select: {
            company: true,
            role: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json({
      upcoming: upcomingFollowUps,
      overdue: overdueFollowUps,
      count: {
        upcoming: upcomingFollowUps.length,
        overdue: overdueFollowUps.length,
        total: upcomingFollowUps.length + overdueFollowUps.length
      }
    })
  } catch (error) {
    console.error('Error fetching follow-ups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups' },
      { status: 500 }
    )
  }
}

// Mark follow-up as completed
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { followUpId, completed } = body

    if (!followUpId) {
      return NextResponse.json(
        { error: 'Follow-up ID is required' },
        { status: 400 }
      )
    }

    // Verify the follow-up belongs to the authenticated user before mutating.
    const existing = await prisma.followUp.findUnique({
      where: { id: followUpId },
      select: { userId: true },
    })
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    }

    const followUp = await prisma.followUp.update({
      where: { id: followUpId },
      data: {
        completed: completed !== undefined ? completed : true,
        completedAt: completed !== false ? new Date() : null
      }
    })

    return NextResponse.json({
      success: true,
      followUp
    })
  } catch (error) {
    console.error('Error updating follow-up:', error)
    return NextResponse.json(
      { error: 'Failed to update follow-up' },
      { status: 500 }
    )
  }
}
