import { NextResponse } from "next/server"
import { PrismaClient, Prisma } from "@prisma/client"
import { extractProfileFromResume } from "@/lib/profile-extraction-service"

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { userId, resumeText, resumeUrl } = await request.json()

    if (!userId || !resumeText) {
      return NextResponse.json({ error: "Missing userId or resumeText" }, { status: 400 })
    }

    // Extract profile using AI
    const extracted = await extractProfileFromResume(resumeText)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    // Check if email is already taken by a different user
    let safeEmail = extracted.email || null
    if (safeEmail) {
      const emailOwner = await prisma.user.findUnique({
        where: { email: safeEmail }
      })
      // If email belongs to a different user, do not use it
      if (emailOwner && emailOwner.id !== userId) {
        safeEmail = null
      }
    }

    // For new users without a valid email, generate a placeholder
    // (email is required in schema)
    if (!existingUser && !safeEmail) {
      safeEmail = `user-${userId}@placeholder.local`
    }

    // Prepare user data for update (email optional for existing users)
    const updateData = {
      name: extracted.name,
      resumeUrl: resumeUrl || undefined,
      skills: [...extracted.primarySkills, ...extracted.secondarySkills],
      experience: extracted.yearsOfExperience ? `${extracted.yearsOfExperience} years` : undefined,
      summary: extracted.summary,
      location: extracted.location,
      salaryExpectation: extracted.salaryExpectation,
      workPreference: extracted.workPreference,
      availability: extracted.availability,
      yearsOfExperience: extracted.yearsOfExperience,
      seniorityLevel: extracted.seniorityLevel,
      education: extracted.education.map(e => `${e.degree} from ${e.institution}${e.year ? ` (${e.year})` : ""}`),
      primarySkills: extracted.primarySkills,
      secondarySkills: extracted.secondarySkills,
      learningSkills: extracted.learningSkills,
      jobTitles: extracted.jobTitles,
      industries: extracted.industries,
      workHistory: extracted.workHistory as unknown as Prisma.InputJsonValue,
      extractedProfile: extracted as unknown as Prisma.InputJsonValue,
      lastExtracted: new Date(),
      // Only update email if we have a valid one and user exists
      ...(existingUser && safeEmail ? { email: safeEmail } : {})
    }

    // Prepare create data (email required for new users)
    const createData = {
      id: userId,
      email: safeEmail as string, // Will be placeholder if no real email
      name: extracted.name,
      resumeUrl: resumeUrl || undefined,
      skills: [...extracted.primarySkills, ...extracted.secondarySkills],
      experience: extracted.yearsOfExperience ? `${extracted.yearsOfExperience} years` : undefined,
      summary: extracted.summary,
      location: extracted.location,
      salaryExpectation: extracted.salaryExpectation,
      workPreference: extracted.workPreference,
      availability: extracted.availability,
      yearsOfExperience: extracted.yearsOfExperience,
      seniorityLevel: extracted.seniorityLevel,
      education: extracted.education.map(e => `${e.degree} from ${e.institution}${e.year ? ` (${e.year})` : ""}`),
      primarySkills: extracted.primarySkills,
      secondarySkills: extracted.secondarySkills,
      learningSkills: extracted.learningSkills,
      jobTitles: extracted.jobTitles,
      industries: extracted.industries,
      workHistory: extracted.workHistory as unknown as Prisma.InputJsonValue,
      extractedProfile: extracted as unknown as Prisma.InputJsonValue,
      lastExtracted: new Date()
    }

    // Upsert user profile in database
    await prisma.user.upsert({
      where: { id: userId },
      create: createData,
      update: updateData
    })

    return NextResponse.json({
      success: true,
      profile: extracted
    })

  } catch (error) {
    console.error("Error extracting profile:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to extract profile"
    }, { status: 500 })
  }
}
