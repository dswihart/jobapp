import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

function isPublicDanielAccount(user: { email?: string | null; name?: string | null }) {
  const email = (user.email || '').toLowerCase()
  const name = (user.name || '').toLowerCase()

  return (
    email.includes('dswihart') ||
    email.includes('swihart') ||
    name.includes('daniel swihart')
  )
}

function getInterviewBoundary(interviewDate: Date, interviewTime?: string | null) {
  if (!interviewTime) {
    const endOfDay = new Date(interviewDate)
    endOfDay.setHours(23, 59, 59, 999)
    return endOfDay
  }

  const timeMatch = interviewTime.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (!timeMatch) {
    const fallback = new Date(interviewDate)
    fallback.setHours(23, 59, 59, 999)
    return fallback
  }

  const boundary = new Date(interviewDate)
  boundary.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0)
  return boundary
}

function getStartOfWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - day)
  return start
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const searchParams = request.nextUrl.searchParams
    const fallbackUserId = searchParams.get('userId')
    const userId = session?.user?.id || fallbackUserId
    const days = Math.max(1, Math.min(30, Number(searchParams.get('days') || '30')))
    const pastDays = Math.max(1, Math.min(30, Number(searchParams.get('pastDays') || '14')))
    const scope = searchParams.get('scope')

    const now = new Date()
    const recentPastStart = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000)
    const currentWeekStart = getStartOfWeek(now)
    const nextWeekEnd = new Date(currentWeekStart)
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 14)
    nextWeekEnd.setMilliseconds(nextWeekEnd.getMilliseconds() - 1)

    if (!session?.user?.id && userId) {
      const publicUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          name: true,
        },
      })

      if (!publicUser || !isPublicDanielAccount(publicUser)) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
    }

    const applications = await prisma.application.findMany({
      where: userId ? { userId } : undefined,
      select: {
        id: true,
        company: true,
        role: true,
        status: true,
        userId: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    const applicationById = new Map(applications.map((application) => [application.id, application]))

    const interviews = await prisma.interview.findMany({
      where: {
        applicationId: {
          in: applications.map((application) => application.id),
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    })

    const upcoming = interviews
      .filter((interview) =>
        interview.scheduledDate != null &&
        getInterviewBoundary(interview.scheduledDate, interview.scheduledTime) >= now &&
        (
          scope === 'calendar-two-weeks'
            ? interview.scheduledDate >= currentWeekStart && interview.scheduledDate <= nextWeekEnd
            : true
        ) &&
        ['scheduled', 'rescheduled'].includes(interview.status)
      )
      .map((interview) => {
        const application = applicationById.get(interview.applicationId)
        if (!application) {
          return null
        }

        return {
          id: application.id,
          interviewId: interview.id,
          company: application.company,
          role: application.role,
          interviewDate: interview.scheduledDate,
          interviewTime: interview.scheduledTime,
          interviewType: interview.interviewType,
          interviewRound: interview.round,
          interviewNotes: interview.preparationNotes,
          status: application.status,
          interviewStatus: interview.status,
          userId: application.userId,
          userName: application.user?.name || 'User',
        }
      })
      .filter(Boolean)

    const needsFollowUp = interviews
      .filter((interview) =>
        interview.scheduledDate != null &&
        getInterviewBoundary(interview.scheduledDate, interview.scheduledTime) >= recentPastStart &&
        getInterviewBoundary(interview.scheduledDate, interview.scheduledTime) < now &&
        ['scheduled', 'rescheduled', 'completed'].includes(interview.status)
      )
      .sort((a, b) => (b.scheduledDate?.getTime() ?? 0) - (a.scheduledDate?.getTime() ?? 0))
      .slice(0, 10)
      .map((interview) => {
        const application = applicationById.get(interview.applicationId)
        if (!application) {
          return null
        }

        return {
          id: application.id,
          interviewId: interview.id,
          company: application.company,
          role: application.role,
          interviewDate: interview.scheduledDate,
          interviewTime: interview.scheduledTime,
          interviewType: interview.interviewType,
          interviewRound: interview.round,
          interviewNotes: interview.preparationNotes,
          status: application.status,
          interviewStatus: interview.status,
          userId: application.userId,
          userName: application.user?.name || 'User',
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      upcoming,
      needsFollowUp,
      count: {
        upcoming: upcoming.length,
        needsFollowUp: needsFollowUp.length,
      },
      windowDays: days,
      pastDays,
      scope: scope || 'rolling',
    })
  } catch (error) {
    console.error('Error fetching upcoming interviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch upcoming interviews' },
      { status: 500 }
    )
  }
}
