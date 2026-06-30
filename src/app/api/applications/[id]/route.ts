import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

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
        userId: session.user.id
      },
      include: {
        contacts: true,
        resume: true,
        coverLetter: true,
        interviews: { orderBy: { scheduledDate: 'desc' } },
      }
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json(application)
  } catch (error) {
    console.error('Failed to fetch application:', error)
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 })
  }
}

export async function PUT(
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
    const { company, role, status, notes, jobUrl, appliedDate, createdAt, resumeId, coverLetterId } = body

    const existing = await prisma.application.findUnique({
      where: { id },
      select: { userId: true, appliedDate: true }
    })

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    let finalAppliedDate = appliedDate ? new Date(appliedDate) : existing.appliedDate
    if ((status === 'APPLIED' || status === 'INTERVIEWING') && !finalAppliedDate) {
      finalAppliedDate = new Date()
    }

    // IDOR guard: a user may only attach their OWN resume / cover letter.
    if (resumeId) {
      const ownsResume = await prisma.resume.findFirst({ where: { id: resumeId, userId: session.user.id }, select: { id: true } })
      if (!ownsResume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }
    if (coverLetterId) {
      const ownsCover = await prisma.coverLetter.findFirst({ where: { id: coverLetterId, userId: session.user.id }, select: { id: true } })
      if (!ownsCover) return NextResponse.json({ error: 'Cover letter not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      company,
      role,
      status,
      notes,
      jobUrl,
      appliedDate: finalAppliedDate,
      resumeId: resumeId !== undefined ? (resumeId || null) : undefined,
      coverLetterId: coverLetterId !== undefined ? (coverLetterId || null) : undefined
    }

    if (createdAt) {
      updateData.createdAt = new Date(createdAt)
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    const application = await prisma.application.update({
      where: { id },
      data: updateData,
      include: {
        contacts: true,
        resume: true,
        coverLetter: true
      }
    })

    return NextResponse.json(application)
  } catch (error) {
    console.error('Failed to update application:', error)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.application.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    await prisma.application.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Application deleted successfully' })
  } catch (error) {
    console.error('Failed to delete application:', error)
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 })
  }
}
