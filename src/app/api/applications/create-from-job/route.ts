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

    const application = await prisma.application.create({
      data: {
        company: opportunity.company,
        role: opportunity.title,
        jobUrl: opportunity.jobUrl,
        status: status,
        appliedDate: status === 'APPLIED' ? new Date() : null,
        notes: status === 'APPLIED' 
          ? `Applied via Job Tracker. Source: ${opportunity.source}. Fit Score: ${opportunity.fitScore}%`
          : `Draft from Job Tracker. Source: ${opportunity.source}. Fit Score: ${opportunity.fitScore}%`,
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
