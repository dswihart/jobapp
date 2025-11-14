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
    const application = await prisma.application.findUnique({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        contacts: true,
        user: true
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
    const { company, role, status, notes, jobUrl, appliedDate, createdAt } = body

    // First verify the application belongs to this user and get current data
    const existing = await prisma.application.findUnique({
      where: { id },
      select: { userId: true, appliedDate: true }
    })

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Automatically set appliedDate when status changes to APPLIED or INTERVIEWING
    // Only set if not already provided in the request and not already set in database
    let finalAppliedDate = appliedDate ? new Date(appliedDate) : existing.appliedDate
    if ((status === 'APPLIED' || status === 'INTERVIEWING') && !finalAppliedDate) {
      finalAppliedDate = new Date()
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      company,
      role,
      status,
      notes,
      jobUrl,
      appliedDate: finalAppliedDate
    }

    // Only update createdAt if it's provided
    if (createdAt) {
      updateData.createdAt = new Date(createdAt)
    }

    const application = await prisma.application.update({
      where: { id },
      data: updateData,
      include: {
        contacts: true
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

    // First verify the application belongs to this user
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
