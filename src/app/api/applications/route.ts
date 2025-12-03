import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')?.toLowerCase().trim()
    const status = searchParams.get('status')

    // Build the where clause
    const whereClause: Record<string, unknown> = {
      userId: session.user.id
    }

    // Add status filter if specified
    if (status && status !== 'ALL') {
      whereClause.status = status
    }

    let applications = await prisma.application.findMany({
      where: whereClause,
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

    // Apply text search filter if provided
    if (search && search.length > 0) {
      const searchTerms = search.split(/\s+/).filter(term => term.length > 0)
      
      applications = applications.filter(app => {
        const searchableText = [
          app.company,
          app.role,
          app.notes,
          app.jobUrl
        ].filter(Boolean).join(' ').toLowerCase()

        // All search terms must match
        return searchTerms.every(term => searchableText.includes(term))
      })
    }

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
    const { company, role, status, notes, jobUrl, appliedDate, resumeId, coverLetterId } = body

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
        userId: session.user.id,
        resumeId: resumeId || null,
        coverLetterId: coverLetterId || null
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
