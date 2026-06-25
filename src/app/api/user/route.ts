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
        dailyApplicationGoal: true,
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

    // Whitelist updatable fields — never spread the raw body into update(), which
    // would let a caller overwrite email, password, role, sync state, etc.
    const ALLOWED_FIELDS = [
      'name', 'skills', 'experience', 'resumeUrl', 'summary', 'location',
      'salaryExpectation', 'workPreference', 'availability', 'yearsOfExperience',
      'seniorityLevel', 'minFitScore', 'maxJobAgeDays', 'autoScan', 'scanFrequency',
      'dailyApplicationGoal', 'education', 'primarySkills', 'secondarySkills',
      'learningSkills', 'jobTitles', 'industries', 'excludeKeywords', 'workHistory',
      'extractedProfile',
    ] as const
    const data: Record<string, unknown> = {}
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) data[field] = body[field]
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
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
        dailyApplicationGoal: true,
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
