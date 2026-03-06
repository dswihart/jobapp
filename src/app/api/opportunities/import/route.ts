export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { isAllowedUrl } from '@/lib/url-validation'
import { extractJobFromHtml, analyzeJobFitEnhanced } from '@/lib/ai-service'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // SSRF check
    const urlCheck = isAllowedUrl(url)
    if (!urlCheck.allowed) {
      return NextResponse.json({ error: `URL not allowed: ${urlCheck.reason}` }, { status: 400 })
    }

    // Duplicate check
    const existing = await prisma.jobOpportunity.findFirst({
      where: { userId, jobUrl: url }
    })

    if (existing) {
      console.log(`[Import] URL already exists: ${existing.title} at ${existing.company}`)
      return NextResponse.json({ success: true, existing: true, opportunity: existing })
    }

    // Fetch page HTML
    console.log(`[Import] Fetching: ${url}`)
    let html: string
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      })

      if (!response.ok) {
        return NextResponse.json({ error: `Failed to fetch page: HTTP ${response.status}` }, { status: 400 })
      }

      html = await response.text()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fetch failed'
      console.error(`[Import] Fetch error: ${msg}`)
      return NextResponse.json({ error: `Failed to fetch page: ${msg}` }, { status: 400 })
    }

    // AI extraction
    console.log(`[Import] Extracting job details with AI...`)
    const extracted = await extractJobFromHtml(html, url)

    if ('error' in extracted) {
      console.log(`[Import] Extraction failed: ${extracted.error}`)
      return NextResponse.json({ error: extracted.error }, { status: 422 })
    }

    console.log(`[Import] Extracted: ${extracted.title} at ${extracted.company}`)

    // Build user profile for scoring
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const enhancedProfile = {
      primarySkills: (user.primarySkills || user.skills) as string[],
      secondarySkills: (user.secondarySkills || []) as string[],
      learningSkills: (user.learningSkills || []) as string[],
      yearsOfExperience: user.yearsOfExperience || parseInt(user.experience?.replace(/\D/g, '') || '0'),
      seniorityLevel: user.seniorityLevel || undefined,
      workHistory: (user.workHistory as Array<{ company: string; role: string; duration: string; achievements: string[] }>) || [],
      jobTitles: (user.jobTitles || []) as string[],
      industries: (user.industries || []) as string[],
      summary: user.summary || undefined,
      workPreference: user.workPreference || undefined,
      preferredCountries: (user.preferredCountries || []) as string[],
      salaryExpectation: user.salaryExpectation || undefined
    }

    // AI scoring
    console.log(`[Import] Scoring fit...`)
    const fitScore = await analyzeJobFitEnhanced(
      enhancedProfile,
      {
        title: extracted.title,
        company: extracted.company,
        description: extracted.description,
        requirements: extracted.requirements || '',
        location: extracted.location,
        salary: extracted.salary
      },
      userId
    )

    // Extract domain for source field
    const source = parsedUrl.hostname.replace('www.', '')

    // Save to database
    const opportunity = await prisma.jobOpportunity.create({
      data: {
        title: extracted.title,
        company: extracted.company,
        description: extracted.description,
        requirements: extracted.requirements,
        location: extracted.location,
        salary: extracted.salary,
        jobUrl: url,
        source,
        fitScore: fitScore.overall,
        postedDate: new Date(),
        userId
      }
    })

    console.log(`[Import] Saved: ${extracted.title} at ${extracted.company} (${fitScore.overall}% fit)`)

    return NextResponse.json({ success: true, opportunity }, { status: 201 })

  } catch (error) {
    console.error('[Import] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Import failed'
    }, { status: 500 })
  }
}
