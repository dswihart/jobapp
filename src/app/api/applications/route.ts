import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const applications = await prisma.application.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        resume: true,
        coverLetter: true,
        contacts: true,
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(applications)
  } catch (error) {
    console.error('Failed to fetch applications:', error)
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { company, role, status, notes, jobUrl, appliedDate } = body

    // Automatically set appliedDate when status is APPLIED or INTERVIEWING
    let finalAppliedDate = appliedDate ? new Date(appliedDate) : null
    const finalStatus = status || 'APPLIED'
    if ((finalStatus === 'APPLIED' || finalStatus === 'INTERVIEWING') && !appliedDate) {
      finalAppliedDate = new Date()
    }

    const application = await prisma.application.create({
      data: {
        company,
        role,
        status: finalStatus,
        notes,
        jobUrl,
        appliedDate: finalAppliedDate,
        userId: session.user.id
      },
      include: {
        resume: true,
        coverLetter: true,
        contacts: true
      }
    })

    return NextResponse.json(application)
  } catch (error) {
    console.error('Failed to create application:', error)
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }
}
