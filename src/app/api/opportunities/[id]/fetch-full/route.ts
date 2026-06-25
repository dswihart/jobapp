export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { isAllowedUrl } from '@/lib/url-validation'
import { extractJobFromHtml, extractJobFromText } from '@/lib/ai-service'
import { fetchRenderedHtml } from '@/lib/browser-fetch'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const job = await prisma.jobOpportunity.findUnique({ where: { id } })

    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // If description is already long enough, return it
    if (job.description.length >= 500) {
      return NextResponse.json({
        success: true,
        description: job.description,
        requirements: job.requirements,
        alreadyFull: true
      })
    }

    // SSRF check
    const urlCheck = isAllowedUrl(job.jobUrl)
    if (!urlCheck.allowed) {
      return NextResponse.json({ error: `URL not allowed: ${urlCheck.reason}` }, { status: 400 })
    }

    // Fetch the page HTML
    console.log(`[Fetch-Full] Fetching: ${job.jobUrl}`)
    let html: string
    try {
      const response = await fetch(job.jobUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      })

      if (!response.ok) {
        console.log(`[Fetch-Full] HTTP ${response.status}, trying headless browser...`)
        try {
          const rendered = await fetchRenderedHtml(job.jobUrl)
          console.log(`[Fetch-Full] Browser rendered ${rendered.text.length} chars`)
          const extracted = await extractJobFromText(rendered.text, job.jobUrl)
          if ('error' in extracted) {
            return NextResponse.json({ error: extracted.error }, { status: 422 })
          }
          const updateData: Record<string, string> = {}
          if (extracted.description && extracted.description.length > job.description.length) {
            updateData.description = extracted.description
          }
          if (extracted.requirements) updateData.requirements = extracted.requirements
          if (extracted.location && !job.location) updateData.location = extracted.location
          if (extracted.salary && !job.salary) updateData.salary = extracted.salary
          if (extracted.employmentType && !job.employmentType) updateData.employmentType = extracted.employmentType
          if (extracted.experienceLevel && !job.experienceLevel) updateData.experienceLevel = extracted.experienceLevel
          if (Object.keys(updateData).length > 0) {
            await prisma.jobOpportunity.update({ where: { id }, data: updateData })
          }
          console.log(`[Fetch-Full] Updated via browser: ${Object.keys(updateData).join(', ')}`)
          return NextResponse.json({
            success: true,
            description: updateData.description || job.description,
            requirements: updateData.requirements || job.requirements,
            location: updateData.location || job.location,
            salary: updateData.salary || job.salary,
            employmentType: updateData.employmentType || job.employmentType || null,
            experienceLevel: updateData.experienceLevel || job.experienceLevel || null
          })
        } catch (browserError) {
          console.error(`[Fetch-Full] Browser fallback failed:`, browserError)
          return NextResponse.json({ error: 'Failed to fetch page (site may block automated access)' }, { status: 422 })
        }
      }

      html = await response.text()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fetch failed'
      return NextResponse.json({ error: `Failed to fetch page: ${msg}` }, { status: 422 })
    }

    // Try extraction from HTML
    console.log(`[Fetch-Full] Extracting details...`)
    let extracted = await extractJobFromHtml(html, job.jobUrl)

    // Fallback to browser rendering if page requires JS
    if ('error' in extracted && extracted.error.includes('requires JavaScript')) {
      console.log(`[Fetch-Full] Trying headless browser...`)
      try {
        const rendered = await fetchRenderedHtml(job.jobUrl)
        console.log(`[Fetch-Full] Browser rendered ${rendered.text.length} chars`)
        extracted = await extractJobFromText(rendered.text, job.jobUrl)
      } catch (browserError) {
        console.error(`[Fetch-Full] Browser fetch failed:`, browserError)
        return NextResponse.json({ error: 'Page requires JavaScript and browser rendering failed' }, { status: 422 })
      }
    }

    if ('error' in extracted) {
      console.log(`[Fetch-Full] Extraction failed: ${extracted.error}`)
      return NextResponse.json({ error: extracted.error }, { status: 422 })
    }

    // Update the job in DB with enriched data
    const updateData: Record<string, string> = {}
    if (extracted.description && extracted.description.length > job.description.length) {
      updateData.description = extracted.description
    }
    if (extracted.requirements) {
      updateData.requirements = extracted.requirements
    }
    if (extracted.location && !job.location) {
      updateData.location = extracted.location
    }
    if (extracted.salary && !job.salary) {
      updateData.salary = extracted.salary
    }
    if (extracted.employmentType && !job.employmentType) {
      updateData.employmentType = extracted.employmentType
    }
    if (extracted.experienceLevel && !job.experienceLevel) {
      updateData.experienceLevel = extracted.experienceLevel
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.jobOpportunity.update({
        where: { id },
        data: updateData
      })
    }

    console.log(`[Fetch-Full] Updated ${job.title} with ${Object.keys(updateData).join(', ')}`)

    return NextResponse.json({
      success: true,
      description: updateData.description || job.description,
      requirements: updateData.requirements || job.requirements,
      location: updateData.location || job.location,
      salary: updateData.salary || job.salary,
      employmentType: updateData.employmentType || job.employmentType,
      experienceLevel: updateData.experienceLevel || job.experienceLevel
    })

  } catch (error) {
    console.error('[Fetch-Full] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch full description'
    }, { status: 500 })
  }
}
