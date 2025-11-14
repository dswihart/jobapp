import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'

const prisma = new PrismaClient()

// GET - Fetch a single follow-up
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
    const followUp = await prisma.followUp.findUnique({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        application: true,
        contact: true
      }
    })

    if (!followUp) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    }

    return NextResponse.json(followUp)
  } catch (error) {
    console.error('Failed to fetch follow-up:', error)
    return NextResponse.json({ error: 'Failed to fetch follow-up' }, { status: 500 })
  }
}

// PUT - Update a follow-up
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
    const {
      title,
      description,
      dueDate,
      completed,
      priority,
      type,
      notifyBefore,
      applicationId,
      contactId
    } = body

    // Verify ownership
    const existing = await prisma.followUp.findUnique({
      where: { id },
      select: { userId: true, completed: true }
    })

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate)
    if (completed !== undefined) {
      updateData.completed = completed
      if (completed && !existing.completed) {
        updateData.completedAt = new Date()
      }
    }
    if (priority !== undefined) updateData.priority = priority
    if (type !== undefined) updateData.type = type
    if (notifyBefore !== undefined) updateData.notifyBefore = notifyBefore
    if (applicationId !== undefined) updateData.applicationId = applicationId || null
    if (contactId !== undefined) updateData.contactId = contactId || null

    const followUp = await prisma.followUp.update({
      where: { id },
      data: updateData,
      include: {
        application: {
          select: {
            id: true,
            company: true,
            role: true
          }
        },
        contact: {
          select: {
            id: true,
            name: true,
            title: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(followUp)
  } catch (error) {
    console.error('Failed to update follow-up:', error)
    return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 })
  }
}

// DELETE - Delete a follow-up
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

    // Verify ownership
    const existing = await prisma.followUp.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    }

    await prisma.followUp.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Follow-up deleted successfully' })
  } catch (error) {
    console.error('Failed to delete follow-up:', error)
    return NextResponse.json({ error: 'Failed to delete follow-up' }, { status: 500 })
  }
}
