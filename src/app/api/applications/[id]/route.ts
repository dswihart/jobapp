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
    const { company, role, status, notes, jobUrl, appliedDate } = body

    // First verify the application belongs to this user
    const existing = await prisma.application.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Automatically set appliedDate when status changes to APPLIED
    let finalAppliedDate = appliedDate ? new Date(appliedDate) : null
    if (status === 'APPLIED' && !appliedDate) {
      finalAppliedDate = new Date()
    }

    const application = await prisma.application.update({
      where: { id },
      data: {
        company,
        role,
        status,
        notes,
        jobUrl,
        appliedDate: finalAppliedDate
      },
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
