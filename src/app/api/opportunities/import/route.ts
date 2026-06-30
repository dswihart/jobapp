export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { isAllowedUrl, safeFetch } from '@/lib/url-validation'
import { extractJobFromHtml, extractJobFromText, analyzeJobFitEnhanced } from '@/lib/ai-service'
import { fetchRenderedHtml } from '@/lib/browser-fetch'

function isBotBlockedPage(html: string, fetchedUrl: string) {
  const lowerHtml = html.toLowerCase()
  const lowerUrl = fetchedUrl.toLowerCase()

  return [
    'distil/distil/captcha.xhtml',
    'captcha',
    'verify you are human',
    "verify you're human",
    'access denied',
    'robot or human',
    'cf-chl-',
    '/sorry/',
  ].some((marker) => lowerHtml.includes(marker) || lowerUrl.includes(marker))
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { url, text } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const urlCheck = isAllowedUrl(url)
    if (!urlCheck.allowed) {
      return NextResponse.json({ error: `URL not allowed: ${urlCheck.reason}` }, { status: 400 })
    }

    const existing = await prisma.jobOpportunity.findFirst({
      where: { userId, jobUrl: url }
    })

    if (existing) {
      console.log(`[Import] URL already exists: ${existing.title} at ${existing.company}`)
      return NextResponse.json({ success: true, existing: true, opportunity: existing })
    }

    let extracted: Awaited<ReturnType<typeof extractJobFromHtml>>
    const pastedText = typeof text === 'string' ? text.trim() : ''

    if (pastedText.length > 0) {
      if (pastedText.length < 100) {
        return NextResponse.json({ error: 'Pasted text is too short — paste the full job description.' }, { status: 400 })
      }
      console.log(`[Import] Extracting from pasted text (${pastedText.length} chars)...`)
      extracted = await extractJobFromText(pastedText, url)
    } else {
      console.log(`[Import] Fetching: ${url}`)
      let html: string
      let fetchedUrl = url
      try {
        const response = await safeFetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(15000),
        })

        fetchedUrl = response.url || url

        if (!response.ok) {
          const botBlocked = [403, 405, 429, 503, 999].includes(response.status)
          return NextResponse.json({
            error: botBlocked
              ? `This site blocks automated import (HTTP ${response.status}). Paste the job description text instead.`
              : `Failed to fetch page: HTTP ${response.status}`,
            botBlocked,
          }, { status: 400 })
        }

        html = await response.text()
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Fetch failed'
        console.error(`[Import] Fetch error: ${msg}`)
        return NextResponse.json({ error: `Failed to fetch page: ${msg}`, botBlocked: true }, { status: 400 })
      }

      if (isBotBlockedPage(html, fetchedUrl)) {
        console.log(`[Import] Bot-blocked page detected for ${parsedUrl.hostname}`)
        return NextResponse.json({
          error: 'This site returned a captcha or bot-check page instead of the job posting. Paste the job description text instead.',
          botBlocked: true,
        }, { status: 422 })
      }

      console.log(`[Import] Extracting job details with AI...`)
      extracted = await extractJobFromHtml(html, url)

      if ('error' in extracted && extracted.error.includes('requires JavaScript')) {
        console.log(`[Import] Page requires JS rendering, trying headless browser...`)
        try {
          const rendered = await fetchRenderedHtml(url)
          console.log(`[Import] Browser rendered ${rendered.text.length} chars of text`)
          extracted = await extractJobFromText(rendered.text, url)
        } catch (browserError) {
          console.error(`[Import] Browser fetch failed:`, browserError)
          return NextResponse.json({
            error: 'Page requires JavaScript and browser rendering failed. Paste the job description text instead.',
            botBlocked: true,
          }, { status: 422 })
        }
      }
    }

    if ('error' in extracted) {
      console.log(`[Import] Extraction failed: ${extracted.error}`)
      return NextResponse.json({ error: extracted.error, botBlocked: pastedText.length === 0 }, { status: 422 })
    }

    console.log(`[Import] Extracted: ${extracted.title} at ${extracted.company}`)

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

    const source = parsedUrl.hostname.replace('www.', '')

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
        scoreBreakdown: fitScore.scoreBreakdown,
        employmentType: extracted.employmentType || null,
        experienceLevel: extracted.experienceLevel || null,
        postedDate: new Date(),
        userId
      }
    })

    console.log(`[Import] Saved: ${extracted.title} at ${extracted.company} (${fitScore.overall}% fit)`)

    const threshold = user.notificationThreshold ?? 80
    if (threshold > 0 && fitScore.overall >= threshold) {
      await prisma.alert.create({
        data: {
          message: `Strong match (${fitScore.overall}%): ${extracted.title} at ${extracted.company}`,
          type: 'HIGH_FIT_SCORE',
          userId: session.user.id,
          opportunityId: opportunity.id
        }
      })
    }

    return NextResponse.json({ success: true, opportunity }, { status: 201 })

  } catch (error) {
    console.error('[Import] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Import failed'
    }, { status: 500 })
  }
}
