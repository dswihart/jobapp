import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuthenticatedUser } from '@/lib/api-auth'

function parseEducation(eduStrings: string[]): Array<{degree: string, institution: string, year?: string}> {
  return eduStrings.map(e => {
    const match = e.match(/^(.+?)s+froms+(.+?)(?:s*((d{4})))?$/)
    if (match) return { degree: match[1], institution: match[2], year: match[3] || undefined }
    return { degree: e, institution: '', year: undefined }
  })
}

function normalizeWorkHistory(value: unknown): Prisma.InputJsonValue {
  return Array.isArray(value) ? (value as Prisma.InputJsonValue) : []
}

export async function GET(request: Request) {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('userId')

    if (requestedUserId && requestedUserId !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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
      education: parseEducation(user.education || []),
      jobTitles: user.jobTitles || [],
      industries: user.industries || [],
      preferredCountries: user.preferredCountries || [],
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
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const { userId, profile } = await request.json()

    if (!profile) {
      return NextResponse.json({ error: 'Missing profile' }, { status: 400 })
    }

    if (userId && userId !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        name: profile.name,
        email: profile.email,
        location: profile.location,
        summary: profile.summary,
        skills: [...(profile.primarySkills || []), ...(profile.secondarySkills || [])],
        experience: profile.yearsOfExperience ? `${profile.yearsOfExperience} years` : undefined,
        primarySkills: profile.primarySkills,
        secondarySkills: profile.secondarySkills,
        learningSkills: profile.learningSkills,
        yearsOfExperience: profile.yearsOfExperience,
        seniorityLevel: profile.seniorityLevel,
        workHistory: normalizeWorkHistory(profile.workHistory),
        education: Array.isArray(profile.education) ? profile.education.map((e: {degree?: string, institution?: string, year?: string} | string) => typeof e === 'string' ? e : `${e.degree || ''}${e.institution ? ' from ' + e.institution : ''}${e.year ? ' (' + e.year + ')' : ''}`).filter(Boolean) : [],
        jobTitles: profile.jobTitles,
        industries: profile.industries,
        preferredCountries: profile.preferredCountries,
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
