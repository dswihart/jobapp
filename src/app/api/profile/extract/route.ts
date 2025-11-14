import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { extractProfileFromResume } from '@/lib/profile-extraction-service'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { userId, resumeText, resumeUrl } = await request.json()

    if (!userId || !resumeText) {
      return NextResponse.json({ error: 'Missing userId or resumeText' }, { status: 400 })
    }

    // Extract profile using AI
    const extracted = await extractProfileFromResume(resumeText)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    // Prepare user data
    const userData = {
      name: extracted.name,
      email: extracted.email || undefined,
      resumeUrl: resumeUrl || undefined,

      // Basic fields (keep for backward compatibility)
      skills: [...extracted.primarySkills, ...extracted.secondarySkills],
      experience: extracted.yearsOfExperience ? `${extracted.yearsOfExperience} years` : undefined,

      // Enhanced fields
      summary: extracted.summary,
      location: extracted.location,
      salaryExpectation: extracted.salaryExpectation,
      workPreference: extracted.workPreference,
      availability: extracted.availability,

      yearsOfExperience: extracted.yearsOfExperience,
      seniorityLevel: extracted.seniorityLevel,

      education: extracted.education.map(e => `${e.degree} from ${e.institution}${e.year ? ` (${e.year})` : ''}`),

      primarySkills: extracted.primarySkills,
      secondarySkills: extracted.secondarySkills,
      learningSkills: extracted.learningSkills,

      jobTitles: extracted.jobTitles,
      industries: extracted.industries,

      workHistory: extracted.workHistory as unknown as import("@prisma/client").Prisma.InputJsonValue,
      extractedProfile: extracted as unknown as import("@prisma/client").Prisma.InputJsonValue,
      lastExtracted: new Date()
    }

    // For new users, check if email is already taken by another user
    let createData = { id: userId, ...userData }
    if (!existingUser && userData.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      // If email is taken by another user, don't include it in create
      if (emailTaken) {
        const { email, ...dataWithoutEmail } = createData
        createData = dataWithoutEmail
      }
    }

    // Upsert user profile in database (create if doesn't exist, update if exists)
    await prisma.user.upsert({
      where: { id: userId },
      create: createData,
      update: userData
    })

    return NextResponse.json({
      success: true,
      profile: extracted
    })

  } catch (error) {
    console.error('Error extracting profile:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to extract profile'
    }, { status: 500 })
  }
}
