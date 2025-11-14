import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const contacts = await prisma.contact.findMany({
      include: {
        application: true,
        user: true
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
  try {
    const body = await request.json()
    const { name, title, email, phone, notes, userId, applicationId } = body

    const contact = await prisma.contact.create({
      data: {
        name,
        title,
        email,
        phone,
        notes,
        userId,
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
