import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCoverLetter } from '@/lib/cover-letter-service'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { applicationId, company, role, jobUrl, notes } = await request.json()

    if (!applicationId || !company || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: applicationId, company, role' },
        { status: 400 }
      )
    }

    // Verify the application belongs to this user
    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    })

    if (!application || application.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      )
    }

    // Fetch user profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Use notes as job description, or a default if not available
    const jobDescription = notes || `Position: ${role} at ${company}${jobUrl ? ` - ${jobUrl}` : ''}`

    // Generate cover letter
    const coverLetter = await generateCoverLetter({
      jobTitle: role,
      company: company,
      jobDescription: jobDescription,
      userProfile: {
        name: user.name || 'Job Seeker',
        email: user.email || '',
        yearsOfExperience: user.yearsOfExperience || 0,
        primarySkills: user.primarySkills || [],
        workHistory: typeof user.workHistory === 'string' ? user.workHistory : undefined
      }
    })

    return NextResponse.json({
      success: true,
      coverLetter
    })
  } catch (error) {
    console.error('Cover letter generation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate cover letter' 
      },
      { status: 500 }
    )
  }
}
