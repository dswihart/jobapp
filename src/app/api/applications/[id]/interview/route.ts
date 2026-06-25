import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

function getInterviewStatusForDate(interviewDate: Date) {
  return interviewDate.getTime() >= Date.now() ? 'scheduled' : 'completed'
}

function normalizeInterviewTime(interviewTime?: string | null) {
  const trimmed = interviewTime?.trim()
  if (!trimmed) {
    return null
  }

  const hhmm = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/)
  if (hhmm) {
    return `${hhmm[1].padStart(2, '0')}:${hhmm[2]}`
  }

  const hourOnly = trimmed.match(/^([01]?\d|2[0-3])$/)
  if (hourOnly) {
    return `${hourOnly[1].padStart(2, '0')}:00`
  }

  const ampm = trimmed.match(/^(\d{1,2})(?::([0-5]\d))?\s*(am|pm)$/i)
  if (ampm) {
    let hours = Number(ampm[1])
    const minutes = ampm[2] || '00'
    const meridiem = ampm[3].toLowerCase()

    if (hours < 1 || hours > 12) {
      throw new Error('INVALID_INTERVIEW_TIME')
    }

    if (meridiem === 'pm' && hours !== 12) {
      hours += 12
    }

    if (meridiem === 'am' && hours === 12) {
      hours = 0
    }

    return `${String(hours).padStart(2, '0')}:${minutes}`
  }

  throw new Error('INVALID_INTERVIEW_TIME')
}

function parseInterviewDateTime(interviewDate: string | null, interviewTime?: string | null) {
  if (!interviewDate) {
    return null
  }

  const hasExplicitTime = interviewDate.includes('T')
  const normalizedTime = normalizeInterviewTime(interviewTime) || '00:00'

  const parsed = new Date(hasExplicitTime ? interviewDate : `${interviewDate}T${normalizedTime}`)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('INVALID_INTERVIEW_DATE')
  }

  return parsed
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      interviewDate,
      interviewTime,
      interviewType,
      interviewRound,
      interviewNotes,
      interviewStatus,
      postInterviewNotes,
      transcript,
      companyFeedback,
    } = body

    const application = await prisma.application.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        userId: true,
        company: true,
        role: true,
        status: true,
        appliedDate: true,
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    let parsedInterviewDate: Date | null
    let normalizedInterviewTime: string | null
    try {
      parsedInterviewDate = parseInterviewDateTime(interviewDate, interviewTime)
      normalizedInterviewTime = normalizeInterviewTime(interviewTime)
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_INTERVIEW_TIME') {
        return NextResponse.json({ error: 'Invalid interview time' }, { status: 400 })
      }

      return NextResponse.json({ error: 'Invalid interview date' }, { status: 400 })
    }

    const normalizedInterviewStatus =
      typeof interviewStatus === 'string' && interviewStatus.trim()
        ? interviewStatus.trim()
        : parsedInterviewDate
          ? getInterviewStatusForDate(parsedInterviewDate)
          : null

    const updatedApplication = await prisma.application.update({
      where: { id },
      data: {
        interviewDate: parsedInterviewDate,
        interviewTime: normalizedInterviewTime,
        interviewType: interviewType || null,
        interviewRound: interviewRound || 1,
        interviewNotes: interviewNotes || null,
        status: parsedInterviewDate ? 'INTERVIEWING' : application.status,
        appliedDate: parsedInterviewDate && !application.appliedDate ? new Date() : undefined,
      },
    })

    if (parsedInterviewDate) {
      const existingInterview = await prisma.interview.findFirst({
        where: {
          applicationId: application.id,
        },
        orderBy: {
          scheduledDate: 'desc',
        },
      })

      const interviewData = {
        applicationId: application.id,
        scheduledDate: parsedInterviewDate,
        scheduledTime: normalizedInterviewTime,
        interviewType: interviewType || 'video',
        round: interviewRound || 1,
        status: normalizedInterviewStatus || getInterviewStatusForDate(parsedInterviewDate),
        preparationNotes: interviewNotes || null,
        postInterviewNotes: postInterviewNotes || null,
        transcript: transcript || null,
        companyFeedback: companyFeedback || null,
      }

      if (existingInterview) {
        await prisma.interview.update({
          where: { id: existingInterview.id },
          data: interviewData,
        })
      } else {
        await prisma.interview.create({
          data: interviewData,
        })
      }

      await prisma.followUp.createMany({
        data: [
          {
            title: `Prepare for ${updatedApplication.company} interview`,
            description: `Review company info and practice answers for ${updatedApplication.role} position`,
            dueDate: new Date(parsedInterviewDate.getTime() - 24 * 60 * 60 * 1000),
            priority: 'high',
            type: 'interview',
            notifyBefore: 4,
            userId: updatedApplication.userId,
            applicationId: updatedApplication.id,
          },
          {
            title: `Follow up after ${updatedApplication.company} interview`,
            description: `Send thank you email and check on interview status`,
            dueDate: new Date(parsedInterviewDate.getTime() + 24 * 60 * 60 * 1000),
            priority: 'high',
            type: 'interview',
            notifyBefore: 2,
            userId: updatedApplication.userId,
            applicationId: updatedApplication.id,
          },
        ],
      })
    } else {
      await prisma.interview.updateMany({
        where: {
          applicationId: application.id,
          status: { in: ['scheduled', 'rescheduled'] },
        },
        data: {
          status: 'cancelled',
        },
      })
    }

    return NextResponse.json({
      success: true,
      application: updatedApplication,
    })
  } catch (error) {
    console.error('Error updating interview details:', error)
    return NextResponse.json(
      { error: 'Failed to update interview details' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const application = await prisma.application.findFirst({
      where: {
        id,
        userId: session.user.id,
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
        status: true,
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const latestInterview = await prisma.interview.findFirst({
      where: {
        applicationId: application.id,
      },
      orderBy: {
        scheduledDate: 'desc',
      },
      select: {
        id: true,
        status: true,
        postInterviewNotes: true,
        transcript: true,
        companyFeedback: true,
      },
    })

    return NextResponse.json({
      ...application,
      interviewStatus: latestInterview?.status || null,
      postInterviewNotes: latestInterview?.postInterviewNotes || null,
      transcript: latestInterview?.transcript || null,
      companyFeedback: latestInterview?.companyFeedback || null,
      interviewId: latestInterview?.id || null,
    })
  } catch (error) {
    console.error('Error fetching interview details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch interview details' },
      { status: 500 }
    )
  }
}
