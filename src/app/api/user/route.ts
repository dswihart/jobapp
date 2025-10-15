import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        skills: true,
        experience: true,
        resumeUrl: true,
        summary: true,
        location: true,
        salaryExpectation: true,
        workPreference: true,
        availability: true,
        yearsOfExperience: true,
        seniorityLevel: true,
        minFitScore: true,
        maxJobAgeDays: true,
        autoScan: true,
        scanFrequency: true,
        education: true,
        primarySkills: true,
        secondarySkills: true,
        learningSkills: true,
        jobTitles: true,
        industries: true,
        excludeKeywords: true,
        workHistory: true,
        extractedProfile: true,
        lastExtracted: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const userId = session.user.id

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
      select: {
        id: true,
        email: true,
        name: true,
        skills: true,
        experience: true,
        resumeUrl: true,
        summary: true,
        location: true,
        salaryExpectation: true,
        workPreference: true,
        availability: true,
        yearsOfExperience: true,
        seniorityLevel: true,
        minFitScore: true,
        maxJobAgeDays: true,
        autoScan: true,
        scanFrequency: true,
        education: true,
        primarySkills: true,
        secondarySkills: true,
        learningSkills: true,
        jobTitles: true,
        industries: true,
        excludeKeywords: true,
        workHistory: true,
        extractedProfile: true,
        lastExtracted: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
