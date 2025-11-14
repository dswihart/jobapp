import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, opportunityId, status = 'APPLIED' } = body

    if (!userId || !opportunityId) {
      return NextResponse.json(
        { error: 'User ID and Opportunity ID are required' },
        { status: 400 }
      )
    }

    const opportunity = await prisma.jobOpportunity.findUnique({
      where: { id: opportunityId }
    })

    if (!opportunity) {
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

    // Build comprehensive notes with all job details
    const notesContent = []

    // Add status header
    if (status === 'APPLIED') {
      notesContent.push(`✓ Applied via Job Tracker`)
    } else {
      notesContent.push(`📝 Draft from Job Tracker`)
    }

    // Add source and fit score
    notesContent.push(`Source: ${opportunity.source}`)
    if (opportunity.fitScore) {
      notesContent.push(`Fit Score: ${opportunity.fitScore}%`)
    }
    notesContent.push('') // Empty line

    // Add job description
    if (opportunity.description) {
      notesContent.push('JOB DESCRIPTION:')
      notesContent.push(opportunity.description)
      notesContent.push('') // Empty line
    }

    // Add requirements
    if (opportunity.requirements) {
      notesContent.push('REQUIREMENTS:')
      notesContent.push(opportunity.requirements)
      notesContent.push('') // Empty line
    }

    // Add location if available
    if (opportunity.location) {
      notesContent.push(`📍 Location: ${opportunity.location}`)
    }

    // Add salary if available
    if (opportunity.salary) {
      notesContent.push(`💰 Salary: ${opportunity.salary}`)
    }

    // Add job URL
    if (opportunity.jobUrl) {
      notesContent.push(`🔗 Job URL: ${opportunity.jobUrl}`)
    }

    // Add posted date if available
    if (opportunity.postedDate) {
      notesContent.push(`📅 Posted: ${new Date(opportunity.postedDate).toLocaleDateString()}`)
    }

    const notes = notesContent.join('\n')

    const application = await prisma.application.create({
      data: {
        company: opportunity.company,
        role: opportunity.title,
        jobUrl: opportunity.jobUrl,
        status: status,
        appliedDate: status === 'APPLIED' ? new Date() : null,
        notes: notes,
        userId
      }
    })

    console.log(`[Applications API] Created ${status} application for ${opportunity.title} at ${opportunity.company}`)

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
