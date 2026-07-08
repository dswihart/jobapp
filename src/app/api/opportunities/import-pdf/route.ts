export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createHash } from 'crypto'
import { extractJobFromText, analyzeJobFitEnhanced } from '@/lib/ai-service'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// POST /api/opportunities/import-pdf — import a job from an uploaded PDF (or
// DOCX). Extracts the document text, runs it through the SAME AI extraction +
// fit-scoring + save pipeline as the URL/paste importer (/api/opportunities/
// import), and saves the result as a JobOpportunity. One job per document
// (the common "saved the job page as a PDF" case).
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const fileName = (file.name || 'document').toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 })
    }
    if (buffer.length > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 15 MB).' }, { status: 400 })
    }

    // Extract plain text from the document.
    let text = ''
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf'
    const isDocx = fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    try {
      if (isPdf) {
        // pdf-parse v2 class API (new PDFParse({data}).getText()).
        const parser = new PDFParse({ data: buffer })
        try {
          const pdfData = await parser.getText()
          text = (pdfData?.text || '').trim()
        } finally {
          await parser.destroy?.()
        }
      } else if (isDocx) {
        const result = await mammoth.extractRawText({ buffer })
        text = (result?.value || '').trim()
      } else {
        return NextResponse.json({ error: 'Unsupported file type — upload a PDF or DOCX.' }, { status: 400 })
      }
    } catch (parseErr) {
      console.error('[Import PDF] Text extraction failed:', parseErr)
      return NextResponse.json({ error: 'Could not read text from that file. If it is a scanned image, it has no selectable text to import.' }, { status: 422 })
    }

    if (text.length < 80) {
      return NextResponse.json({ error: 'Not enough readable text in this document — it may be a scanned image or an empty page.' }, { status: 422 })
    }

    // Synthetic, content-addressed URL so the NOT-NULL jobUrl is satisfied and
    // re-uploading the same document dedupes instead of creating a duplicate.
    const contentHash = createHash('sha1').update(text).digest('hex').slice(0, 16)
    const safeName = (file.name || 'document').replace(/[^\w.\-]+/g, '_').slice(0, 60)
    const syntheticUrl = `pdf://${safeName}#${contentHash}`

    const existing = await prisma.jobOpportunity.findFirst({
      where: { userId, jobUrl: syntheticUrl },
    })
    if (existing) {
      return NextResponse.json({ success: true, alreadyExists: true, opportunity: existing })
    }

    console.log(`[Import PDF] Extracting job from ${text.length} chars of "${safeName}"...`)
    const extracted = await extractJobFromText(text, syntheticUrl)
    if (!extracted || extracted.error || !extracted.title || !extracted.company) {
      console.warn(`[Import PDF] Extraction failed for "${safeName}":`, JSON.stringify(extracted))
      return NextResponse.json(
        { error: extracted?.error || 'Could not identify a job posting in this document.' },
        { status: 422 }
      )
    }

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
      salaryExpectation: user.salaryExpectation || undefined,
    }

    console.log(`[Import PDF] Scoring fit for ${extracted.title} at ${extracted.company}...`)
    const fitScore = await analyzeJobFitEnhanced(
      enhancedProfile,
      {
        title: extracted.title,
        company: extracted.company,
        description: extracted.description,
        requirements: extracted.requirements || '',
        location: extracted.location,
        salary: extracted.salary,
      },
      userId
    )

    const opportunity = await prisma.jobOpportunity.create({
      data: {
        title: extracted.title,
        company: extracted.company,
        description: extracted.description,
        requirements: extracted.requirements,
        location: extracted.location,
        salary: extracted.salary,
        jobUrl: syntheticUrl,
        source: 'pdf',
        fitScore: fitScore.overall,
        scoreBreakdown: fitScore.scoreBreakdown,
        employmentType: extracted.employmentType || null,
        experienceLevel: extracted.experienceLevel || null,
        postedDate: new Date(),
        userId,
      },
    })

    // Attach the source document to the opportunity so it can be re-opened later.
    // Stored under public/uploads/opportunities as `${userId}-${id}.<ext>`: the
    // userId prefix satisfies the /uploads ownership middleware, and it is served
    // through the auth+ownership route /api/opportunities/[id]/attachment. A
    // write failure must not fail the import (the job is already saved).
    let attachment = opportunity
    try {
      const ext = isPdf ? 'pdf' : 'docx'
      const diskName = `${userId}-${opportunity.id}.${ext}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'opportunities')
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, diskName), buffer)
      attachment = await prisma.jobOpportunity.update({
        where: { id: opportunity.id },
        data: {
          attachmentPath: `/uploads/opportunities/${diskName}`,
          attachmentName: (file.name || `document.${ext}`).slice(0, 200),
          attachmentType: isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      })
    } catch (attachErr) {
      console.error('[Import PDF] Could not attach source file:', attachErr)
    }

    console.log(`[Import PDF] Saved: ${extracted.title} at ${extracted.company} (${fitScore.overall}% fit)`)

    const threshold = user.notificationThreshold ?? 80
    if (threshold > 0 && fitScore.overall >= threshold) {
      await prisma.alert.create({
        data: {
          message: `Strong match (${fitScore.overall}%): ${extracted.title} at ${extracted.company}`,
          type: 'HIGH_FIT_SCORE',
          userId,
          opportunityId: opportunity.id,
        },
      })
    }

    return NextResponse.json({ success: true, opportunity: attachment }, { status: 201 })
  } catch (error) {
    console.error('[Import PDF] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF import failed' },
      { status: 500 }
    )
  }
}
