import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json()
    const { opportunityId, status = 'APPLIED' } = body

    if (!opportunityId) {
      return NextResponse.json(
        { error: 'Opportunity ID is required' },
        { status: 400 }
      )
    }

    const opportunity = await prisma.jobOpportunity.findUnique({
      where: { id: opportunityId }
    })

    if (!opportunity || opportunity.userId !== userId) {
      return NextResponse.json(
        { error: 'Job opportunity not found' },
        { status: 404 }
      )
    }

    const existing = await prisma.application.findFirst({
      where: {
        userId,
        jobUrl: opportunity.jobUrl
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Application already exists for this job', application: existing },
        { status: 409 }
      )
    }

    const notesContent = []

    if (status === 'APPLIED') {
      notesContent.push('Applied via Job Tracker')
    } else {
      notesContent.push('Draft from Job Tracker')
    }

    notesContent.push(`Source: ${opportunity.source}`)
    if (opportunity.fitScore) {
      notesContent.push(`Fit Score: ${opportunity.fitScore}%`)
    }
    notesContent.push('')

    if (opportunity.description) {
      notesContent.push('JOB DESCRIPTION:')
      notesContent.push(opportunity.description)
      notesContent.push('')
    }

    if (opportunity.requirements) {
      notesContent.push('REQUIREMENTS:')
      notesContent.push(opportunity.requirements)
      notesContent.push('')
    }

    if (opportunity.location) {
      notesContent.push(`Location: ${opportunity.location}`)
    }

    if (opportunity.salary) {
      notesContent.push(`Salary: ${opportunity.salary}`)
    }

    if (opportunity.jobUrl) {
      notesContent.push(`Job URL: ${opportunity.jobUrl}`)
    }

    if (opportunity.postedDate) {
      notesContent.push(`Posted: ${new Date(opportunity.postedDate).toLocaleDateString()}`)
    }

    const notes = notesContent.join('\n')

    const application = await prisma.application.create({
      data: {
        company: opportunity.company,
        role: opportunity.title,
        jobUrl: opportunity.jobUrl,
        status,
        appliedDate: status === 'APPLIED' ? new Date() : null,
        notes,
        userId
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Application created successfully',
      application
    })
  } catch (error) {
    console.error('Create application error:', error)
    return NextResponse.json(
      { error: 'Failed to create application', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
