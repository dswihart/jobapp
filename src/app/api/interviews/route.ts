import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createInterviewWithRound } from "@/lib/interview-rounds"

// GET - List all interviews for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get("applicationId")
    const status = searchParams.get("status")
    const upcoming = searchParams.get("upcoming") === "true"

    // Build where clause
    const whereClause: Record<string, unknown> = {}

    if (status) {
      whereClause.status = status
    }

    if (upcoming) {
      whereClause.scheduledDate = { gte: new Date() }
      whereClause.status = { in: ["scheduled", "rescheduled"] }
    }

    // Get all applications for the user first
    const userApplications = await prisma.application.findMany({
      where: { userId },
      select: { id: true },
    })

    const applicationIds = userApplications.map(app => app.id)
    // IDOR guard: only honor a client-supplied applicationId when it belongs
    // to this user; otherwise scope to all of the user's applications.
    whereClause.applicationId =
      applicationId && applicationIds.includes(applicationId)
        ? applicationId
        : { in: applicationIds }

    const interviews = await prisma.interview.findMany({
      where: whereClause,
      include: {
        interviewers: true,
        application: { select: { id: true, company: true, role: true, status: true, jobUrl: true } },
      },
      orderBy: { scheduledDate: "desc" },
    })

    return NextResponse.json({ interviews })
  } catch (error) {
    console.error("Error fetching interviews:", error)
    return NextResponse.json({ error: "Failed to fetch interviews" }, { status: 500 })
  }
}

// POST - Create a new interview
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const data = await request.json()

    // Verify user owns the application
    const application = await prisma.application.findFirst({
      where: {
        id: data.applicationId,
        userId,
      },
    })

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    // Round is assigned by the helper (monotonic, race-safe), never by the
    // client. A missing date is a valid "needs scheduling" create — guard
    // against new Date(undefined) becoming an Invalid Date / 1970.
    const { id } = await createInterviewWithRound(data.applicationId, {
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      scheduledTime: data.scheduledTime || null,
      duration: data.duration || null,
      interviewType: data.interviewType || "video",
      stage: data.stage || null,
      location: data.location || null,
      meetingLink: data.meetingLink || null,
      status: data.scheduledDate ? 'scheduled' : 'needs_scheduling',
      preparationNotes: data.preparationNotes || null,
      interviewers: data.interviewers?.length > 0 ? {
        create: data.interviewers.map((interviewer: { name: string; title?: string; department?: string; email?: string; linkedInUrl?: string }) => ({
          name: interviewer.name,
          title: interviewer.title || null,
          department: interviewer.department || null,
          email: interviewer.email || null,
          linkedInUrl: interviewer.linkedInUrl || null,
        })),
      } : undefined,
    })

    // recomputeApplicationStatus (inside the helper) promotes the application to
    // INTERVIEWING for this confirmed create.
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { interviewers: true },
    })

    return NextResponse.json({ success: true, interview })
  } catch (error) {
    console.error("Error creating interview:", error)
    return NextResponse.json({ error: "Failed to create interview" }, { status: 500 })
  }
}
