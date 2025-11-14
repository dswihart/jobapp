import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get upcoming interviews (next 30 days)
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const upcomingInterviews = await prisma.application.findMany({
      where: {
        userId,
        interviewDate: {
          gte: now,
          lte: thirtyDaysFromNow
        }
      },
      orderBy: {
        interviewDate: 'asc'
      },
      select: {
        id: true,
        company: true,
        role: true,
        interviewDate: true,
        interviewTime: true,
        interviewType: true,
        interviewRound: true,
        interviewNotes: true,
        status: true
      }
    })

    // Get interviews that need follow-up (past interviews without follow-up)
    const pastInterviews = await prisma.application.findMany({
      where: {
        userId,
        interviewDate: {
          lt: now
        },
        status: 'INTERVIEWING' // Still in interviewing status, needs follow-up
      },
      orderBy: {
        interviewDate: 'desc'
      },
      take: 10,
      select: {
        id: true,
        company: true,
        role: true,
        interviewDate: true,
        interviewType: true,
        interviewRound: true,
        status: true
      }
    })

    return NextResponse.json({
      upcoming: upcomingInterviews,
      needsFollowUp: pastInterviews,
      count: {
        upcoming: upcomingInterviews.length,
        needsFollowUp: pastInterviews.length
      }
    })
  } catch (error) {
    console.error('Error fetching upcoming interviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch upcoming interviews' },
      { status: 500 }
    )
  }
}