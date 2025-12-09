import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET - Get a single interview with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { id } = await params

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        interviewers: true,
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    // Verify user owns the related application
    const application = await prisma.application.findFirst({
      where: {
        id: interview.applicationId,
        userId,
      },
    })

    if (!application) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      interview: {
        ...interview,
        application: {
          id: application.id,
          company: application.company,
          role: application.role,
          status: application.status,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching interview:", error)
    return NextResponse.json({ error: "Failed to fetch interview" }, { status: 500 })
  }
}

// PATCH - Update an interview
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { id } = await params
    const data = await request.json()

    // Find the interview
    const existingInterview = await prisma.interview.findUnique({
      where: { id },
    })

    if (!existingInterview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    // Verify user owns the related application
    const application = await prisma.application.findFirst({
      where: {
        id: existingInterview.applicationId,
        userId,
      },
    })

    if (!application) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (data.scheduledDate !== undefined) updateData.scheduledDate = new Date(data.scheduledDate)
    if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime
    if (data.actualDate !== undefined) updateData.actualDate = data.actualDate ? new Date(data.actualDate) : null
    if (data.duration !== undefined) updateData.duration = data.duration
    if (data.interviewType !== undefined) updateData.interviewType = data.interviewType
    if (data.round !== undefined) updateData.round = data.round
    if (data.stage !== undefined) updateData.stage = data.stage
    if (data.location !== undefined) updateData.location = data.location
    if (data.meetingLink !== undefined) updateData.meetingLink = data.meetingLink
    if (data.status !== undefined) updateData.status = data.status
    if (data.outcome !== undefined) updateData.outcome = data.outcome
    if (data.preparationNotes !== undefined) updateData.preparationNotes = data.preparationNotes
    if (data.postInterviewNotes !== undefined) updateData.postInterviewNotes = data.postInterviewNotes
    if (data.transcript !== undefined) updateData.transcript = data.transcript
    if (data.companyFeedback !== undefined) updateData.companyFeedback = data.companyFeedback
    if (data.aiAnalysis !== undefined) updateData.aiAnalysis = data.aiAnalysis
    if (data.followUpSteps !== undefined) updateData.followUpSteps = data.followUpSteps
    if (data.analyzedAt !== undefined) updateData.analyzedAt = data.analyzedAt ? new Date(data.analyzedAt) : null

    // Update the interview
    const interview = await prisma.interview.update({
      where: { id },
      data: updateData,
      include: {
        interviewers: true,
      },
    })

    return NextResponse.json({ success: true, interview })
  } catch (error) {
    console.error("Error updating interview:", error)
    return NextResponse.json({ error: "Failed to update interview" }, { status: 500 })
  }
}

// DELETE - Delete an interview
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { id } = await params

    // Find the interview
    const interview = await prisma.interview.findUnique({
      where: { id },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    // Verify user owns the related application
    const application = await prisma.application.findFirst({
      where: {
        id: interview.applicationId,
        userId,
      },
    })

    if (!application) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete the interview (cascade will delete interviewers)
    await prisma.interview.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting interview:", error)
    return NextResponse.json({ error: "Failed to delete interview" }, { status: 500 })
  }
}
