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

    // Update user profile in database
    await prisma.user.update({
      where: { id: userId },
      data: {
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

        workHistory: extracted.workHistory as unknown as import("@prisma/client").Prisma.InputJsonValue, // Prisma Json type
        extractedProfile: extracted as unknown as import("@prisma/client").Prisma.InputJsonValue,
        lastExtracted: new Date()
      }
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
