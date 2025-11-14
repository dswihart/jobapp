import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { interviewDate, interviewTime, interviewType, interviewRound, interviewNotes } = body

    // Get current application to check appliedDate
    const currentApp = await prisma.application.findUnique({
      where: { id },
      select: { appliedDate: true }
    })

    // Update the application with interview details
    const application = await prisma.application.update({
      where: { id },
      data: {
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        interviewTime,
        interviewType,
        interviewRound,
        interviewNotes,
        // If setting an interview date, update status to INTERVIEWING
        status: interviewDate ? 'INTERVIEWING' : undefined,
        // Set appliedDate to today if not already set and scheduling an interview
        appliedDate: interviewDate && !currentApp?.appliedDate ? new Date() : undefined
      }
    })

    // If interview date is set, create automatic follow-ups
    if (interviewDate) {
      const interviewDateTime = new Date(interviewDate)

      // Create follow-up for 1 day before interview
      await prisma.followUp.create({
        data: {
          title: `Prepare for ${application.company} interview`,
          description: `Review company info and practice answers for ${application.role} position`,
          dueDate: new Date(interviewDateTime.getTime() - 24 * 60 * 60 * 1000), // 1 day before
          priority: 'high',
          type: 'interview',
          notifyBefore: 4, // Notify 4 hours before due date
          userId: application.userId,
          applicationId: application.id
        }
      })

      // Create follow-up for 1 day after interview
      await prisma.followUp.create({
        data: {
          title: `Follow up after ${application.company} interview`,
          description: `Send thank you email and check on interview status`,
          dueDate: new Date(interviewDateTime.getTime() + 24 * 60 * 60 * 1000), // 1 day after
          priority: 'high',
          type: 'interview',
          notifyBefore: 2, // Notify 2 hours before due date
          userId: application.userId,
          applicationId: application.id
        }
      })
    }

    return NextResponse.json({
      success: true,
      application
    })
  } catch (error) {
    console.error('Error updating interview details:', error)
    return NextResponse.json(
      { error: 'Failed to update interview details' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve interview schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const application = await prisma.application.findUnique({
      where: { id },
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

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(application)
  } catch (error) {
    console.error('Error fetching interview details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch interview details' },
      { status: 500 }
    )
  }
}