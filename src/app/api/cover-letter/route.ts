import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCoverLetter } from '@/lib/cover-letter-service'
import { auth } from '@/lib/auth'
import * as cheerio from 'cheerio'

async function fetchJobDescription(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Remove script and style tags
    $('script').remove()
    $('style').remove()
    
    // Try to extract job description from common selectors
    const selectors = [
      '.job-description',
      '#job-description', 
      '[class*="description"]',
      '[id*="description"]',
      'article',
      'main',
      '.content',
      'body'
    ]
    
    let description = ''
    for (const selector of selectors) {
      const element = $(selector)
      if (element.length > 0) {
        description = element.text().trim()
        if (description.length > 100) {
          break
        }
      }
    }
    
    // Clean up the description
    description = description
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .substring(0, 5000) // Limit to 5000 characters
    
    return description || 'Job description not available'
  } catch (error) {
    console.error('Error fetching job description:', error)
    return 'Job description could not be fetched'
  }
}


// GET /api/cover-letter - List all cover letters for the current user
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const coverLetters = await prisma.coverLetter.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    })

    return NextResponse.json(coverLetters)
  } catch (error) {
    console.error("Error fetching cover letters:", error)
    return NextResponse.json(
      { error: "Failed to fetch cover letters" },
      { status: 500 }
    )
  }
}

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

    // Get job description: use notes if available, otherwise fetch from URL
    let jobDescription = notes
    
    if (!jobDescription && jobUrl) {
      console.log(`Fetching job description from URL: ${jobUrl}`)
      jobDescription = await fetchJobDescription(jobUrl)
    }
    
    if (!jobDescription) {
      jobDescription = `Position: ${role} at ${company}`
    }

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
