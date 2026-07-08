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

    const whereClause: Record<string, unknown> = {
      userId: session.user.id
    }

    if (status && status !== 'ALL') {
      whereClause.status = status
    }

    let applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        resume: true,
        coverLetter: true,
        contacts: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (search && search.length > 0) {
      const searchTerms = search.split(/\s+/).filter(term => term.length > 0)

      applications = applications.filter(app => {
        const searchableText = [
          app.company,
          app.role,
          app.notes,
          app.jobUrl
        ].filter(Boolean).join(' ').toLowerCase()

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

    // Date-only picks (YYYY-MM-DD) stored at NOON UTC (not midnight) so the
    // calendar day is unambiguous under any timezone bucketing.
    const normApplied = (v: unknown): Date | null => {
      if (!v) return null
      const s = String(v)
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00.000Z`) : new Date(s)
    }
    let finalAppliedDate = appliedDate ? normApplied(appliedDate) : null
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
        // '' must be stored as NULL: the (userId, jobUrl) unique index exempts
        // NULLs but allows only one '' per user.
        jobUrl: jobUrl || null,
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
