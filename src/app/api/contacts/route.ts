import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export async function GET() {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const contacts = await prisma.contact.findMany({
      where: { userId: authResult.user.id },
      include: {
        application: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Failed to fetch contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const body = await request.json()
    const { name, title, email, phone, notes, applicationId, userId } = body

    if (userId && userId !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (applicationId) {
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        select: { userId: true }
      })

      if (!application || application.userId !== authResult.user.id) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        title,
        email,
        phone,
        notes,
        userId: authResult.user.id,
        applicationId
      },
      include: {
        application: true
      }
    })

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    console.error('Failed to create contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
