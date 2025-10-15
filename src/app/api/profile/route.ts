import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Return enhanced profile
    const profile = {
      name: user.name,
      email: user.email,
      location: user.location,
      summary: user.summary,

      primarySkills: user.primarySkills || [],
      secondarySkills: user.secondarySkills || [],
      learningSkills: user.learningSkills || [],

      yearsOfExperience: user.yearsOfExperience,
      seniorityLevel: user.seniorityLevel,

      workHistory: user.workHistory || [],
      education: user.education || [],

      jobTitles: user.jobTitles || [],
      industries: user.industries || [],

      salaryExpectation: user.salaryExpectation,
      workPreference: user.workPreference,
      availability: user.availability
    }

    return NextResponse.json({ profile })

  } catch (error) {
    console.error('Error loading profile:', error)
    return NextResponse.json({
      error: 'Failed to load profile'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, profile } = await request.json()

    if (!userId || !profile) {
      return NextResponse.json({ error: 'Missing userId or profile' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: profile.name,
        email: profile.email,
        location: profile.location,
        summary: profile.summary,

        // Keep backward compatibility
        skills: [...(profile.primarySkills || []), ...(profile.secondarySkills || [])],
        experience: profile.yearsOfExperience ? `${profile.yearsOfExperience} years` : undefined,

        primarySkills: profile.primarySkills,
        secondarySkills: profile.secondarySkills,
        learningSkills: profile.learningSkills,

        yearsOfExperience: profile.yearsOfExperience,
        seniorityLevel: profile.seniorityLevel,

        workHistory: profile.workHistory as unknown as import("@prisma/client").Prisma.InputJsonValue,
        education: profile.education,

        jobTitles: profile.jobTitles,
        industries: profile.industries,

        salaryExpectation: profile.salaryExpectation,
        workPreference: profile.workPreference,
        availability: profile.availability
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error saving profile:', error)
    return NextResponse.json({
      error: 'Failed to save profile'
    }, { status: 500 })
  }
}
