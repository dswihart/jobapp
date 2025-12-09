import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

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
    whereClause.applicationId = applicationId || { in: applicationIds }

    const interviews = await prisma.interview.findMany({
      where: whereClause,
      include: {
        interviewers: true,
      },
      orderBy: { scheduledDate: "desc" },
    })

    // Get application details for each interview
    const interviewsWithApplications = await Promise.all(
      interviews.map(async (interview) => {
        const application = await prisma.application.findUnique({
          where: { id: interview.applicationId },
          select: { id: true, company: true, role: true, status: true },
        })
        return { ...interview, application }
      })
    )

    return NextResponse.json({ interviews: interviewsWithApplications })
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

    // Create the interview
    const interview = await prisma.interview.create({
      data: {
        applicationId: data.applicationId,
        scheduledDate: new Date(data.scheduledDate),
        scheduledTime: data.scheduledTime || null,
        duration: data.duration || null,
        interviewType: data.interviewType || "video",
        round: data.round || 1,
        stage: data.stage || null,
        location: data.location || null,
        meetingLink: data.meetingLink || null,
        status: "scheduled",
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
      },
      include: {
        interviewers: true,
      },
    })

    // Update application status to INTERVIEWING if not already
    if (application.status !== "INTERVIEWING") {
      await prisma.application.update({
        where: { id: application.id },
        data: { status: "INTERVIEWING" },
      })
    }

    return NextResponse.json({ success: true, interview })
  } catch (error) {
    console.error("Error creating interview:", error)
    return NextResponse.json({ error: "Failed to create interview" }, { status: 500 })
  }
}
