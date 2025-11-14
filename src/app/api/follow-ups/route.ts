import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'

const prisma = new PrismaClient()

// GET - Fetch all follow-ups for the user
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const completed = searchParams.get('completed')
    const applicationId = searchParams.get('applicationId')

    const where: any = { userId: session.user.id }
    
    if (completed !== null) {
      where.completed = completed === 'true'
    }
    
    if (applicationId) {
      where.applicationId = applicationId
    }

    const followUps = await prisma.followUp.findMany({
      where,
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
      },
      orderBy: [
        { completed: 'asc' },
        { dueDate: 'asc' }
      ]
    })

    return NextResponse.json(followUps)
  } catch (error) {
    console.error('Failed to fetch follow-ups:', error)
    return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 })
  }
}

// POST - Create a new follow-up
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      dueDate, 
      priority = 'medium',
      type = 'general',
      notifyBefore = 24,
      applicationId,
      contactId
    } = body

    if (!title || !dueDate) {
      return NextResponse.json(
        { error: 'Title and due date are required' },
        { status: 400 }
      )
    }

    const followUp = await prisma.followUp.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        priority,
        type,
        notifyBefore,
        userId: session.user.id,
        applicationId: applicationId || null,
        contactId: contactId || null
      },
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

    return NextResponse.json(followUp, { status: 201 })
  } catch (error) {
    console.error('Failed to create follow-up:', error)
    return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 })
  }
}
