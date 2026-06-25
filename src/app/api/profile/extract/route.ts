import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { extractProfileFromResume } from "@/lib/profile-extraction-service"
import { requireAuthenticatedUser } from '@/lib/api-auth'


export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const { userId, resumeText, resumeUrl } = await request.json()

    if (!resumeText) {
      return NextResponse.json({ error: "Missing resumeText" }, { status: 400 })
    }

    if (userId && userId !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sessionUserId = authResult.user.id
    const extracted = await extractProfileFromResume(resumeText)

    const existingUser = await prisma.user.findUnique({
      where: { id: sessionUserId }
    })

    let safeEmail = extracted.email || null
    if (safeEmail) {
      const emailOwner = await prisma.user.findUnique({
        where: { email: safeEmail }
      })
      if (emailOwner && emailOwner.id !== sessionUserId) {
        safeEmail = null
      }
    }

    if (!existingUser && !safeEmail) {
      safeEmail = `user-${sessionUserId}@placeholder.local`
    }

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
      ...(existingUser && safeEmail ? { email: safeEmail } : {})
    }

    const createData = {
      id: sessionUserId,
      email: safeEmail as string,
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

    await prisma.user.upsert({
      where: { id: sessionUserId },
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
