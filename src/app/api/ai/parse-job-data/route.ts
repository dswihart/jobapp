import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeJobFitEnhanced } from '@/lib/ai-service'

// CORS headers for bookmarklet cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in first' },
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await request.json()
    const { url, company, role, location, description, salary, requirements, source } = body

    if (!company || !role) {
      return NextResponse.json(
        { error: 'Company and role are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log(`[Parse Job Data] Received from ${source}: ${role} at ${company}`)

    // Get user profile for fit score calculation
    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string }
    })

    let fitScore = null

    // Calculate fit score if we have user skills and job description
    if (user?.skills && description) {
      try {
        const jobFit = await analyzeJobFitEnhanced({
          role,
          company,
          description: description || '',
          requirements: requirements || ''
        }, user)

        fitScore = jobFit.overall
        console.log(`[Parse Job Data] Fit score: ${fitScore}%`)
      } catch (error) {
        console.error('[Parse Job Data] Error calculating fit score:', error)
      }
    }

    // Build notes content
    const notesContent = []
    if (description) {
      notesContent.push('Job Description:')
      notesContent.push(description.substring(0, 1500))
      notesContent.push('')
    }
    if (requirements) {
      notesContent.push('Requirements:')
      notesContent.push(requirements.substring(0, 1000))
      notesContent.push('')
    }
    if (salary) {
      notesContent.push(`Salary: ${salary}`)
      notesContent.push('')
    }
    if (location) {
      notesContent.push(`Location: ${location}`)
    }
    if (url) {
      notesContent.push(`Job URL: ${url}`)
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        userId: session.user.id as string,
        company,
        role,
        status: 'DRAFT',
        jobUrl: url,
        notes: notesContent.join('\n'),
        fitScore: fitScore,
        createdAt: new Date()
      }
    })

    console.log(`[Parse Job Data] Created application ${application.id} from ${source}`)

    return NextResponse.json({
      success: true,
      application,
      fitScore,
      message: 'Job added successfully'
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('[Parse Job Data] Error:', error)
    return NextResponse.json(
      { error: 'Failed to add job', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
