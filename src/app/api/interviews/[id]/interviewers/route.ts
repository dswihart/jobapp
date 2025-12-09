import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// POST - Add an interviewer to an interview
export async function POST(
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

    // Create the interviewer
    const interviewer = await prisma.interviewer.create({
      data: {
        interviewId: id,
        name: data.name,
        title: data.title || null,
        department: data.department || null,
        email: data.email || null,
        linkedInUrl: data.linkedInUrl || null,
        notes: data.notes || null,
        impression: data.impression || null,
        topics: data.topics || [],
      },
    })

    return NextResponse.json({ success: true, interviewer })
  } catch (error) {
    console.error("Error adding interviewer:", error)
    return NextResponse.json({ error: "Failed to add interviewer" }, { status: 500 })
  }
}

// PUT - Update interviewers for an interview (bulk replace)
export async function PUT(
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

    // Delete existing interviewers and create new ones
    await prisma.interviewer.deleteMany({
      where: { interviewId: id },
    })

    if (data.interviewers && data.interviewers.length > 0) {
      await prisma.interviewer.createMany({
        data: data.interviewers.map((interviewer: { name: string; title?: string; department?: string; email?: string; linkedInUrl?: string; notes?: string; impression?: string; topics?: string[] }) => ({
          interviewId: id,
          name: interviewer.name,
          title: interviewer.title || null,
          department: interviewer.department || null,
          email: interviewer.email || null,
          linkedInUrl: interviewer.linkedInUrl || null,
          notes: interviewer.notes || null,
          impression: interviewer.impression || null,
          topics: interviewer.topics || [],
        })),
      })
    }

    // Fetch updated interview with interviewers
    const updatedInterview = await prisma.interview.findUnique({
      where: { id },
      include: { interviewers: true },
    })

    return NextResponse.json({ success: true, interview: updatedInterview })
  } catch (error) {
    console.error("Error updating interviewers:", error)
    return NextResponse.json({ error: "Failed to update interviewers" }, { status: 500 })
  }
}
