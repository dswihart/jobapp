export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { createLLMClient } from '@/lib/llm-client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'
import mammoth from 'mammoth'
import { validateUrlPath, safePathJoin } from '@/lib/safe-path'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await request.json()
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    // Fetch job
    const job = await prisma.jobOpportunity.findUnique({ where: { id: jobId } })
    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Find primary resume
    const resume = await prisma.resume.findFirst({
      where: { userId: session.user.id, isPrimary: true }
    })
    if (!resume) {
      return NextResponse.json({ error: 'No primary resume found. Upload a resume first.' }, { status: 404 })
    }

    // Read resume content from disk
    let resumeContent = ''
    try {
      const sanitizedPath = validateUrlPath(resume.fileUrl)
      const filepath = safePathJoin(process.cwd(), 'public', sanitizedPath)

      if (resume.fileType === 'text/plain') {
        resumeContent = await readFile(filepath, 'utf-8')
      } else if (
        resume.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        resume.fileType === 'application/msword'
      ) {
        const result = await mammoth.extractRawText({ path: filepath })
        resumeContent = result.value
      } else {
        resumeContent = await readFile(filepath, 'utf-8')
      }
    } catch {
      return NextResponse.json({ error: 'Failed to read resume content' }, { status: 500 })
    }

    if (!resumeContent.trim()) {
      return NextResponse.json({ error: 'Resume content is empty' }, { status: 400 })
    }

    // AI analysis
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
    }

    const anthropic = createLLMClient({ apiKey })

    const jobText = [
      `Title: ${job.title}`,
      `Company: ${job.company}`,
      job.location ? `Location: ${job.location}` : '',
      job.salary ? `Salary: ${job.salary}` : '',
      `Description: ${job.description}`,
      job.requirements ? `Requirements: ${job.requirements}` : ''
    ].filter(Boolean).join('\n')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      temperature: 0.2,
      messages: [{
        role: 'user',
        content: `Analyze how well this resume matches the job posting. Return ONLY valid JSON.

JOB POSTING:
${jobText}

RESUME:
${resumeContent}

Return JSON with:
{
  "matchScore": <number 0-100>,
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "gaps": ["<gap 1>", "<gap 2>", ...],
  "suggestions": ["<suggestion 1>", "<suggestion 2>", ...]
}

- matchScore: overall match percentage
- strengths: 3-5 areas where the resume strongly matches the job requirements
- gaps: 2-4 areas where the resume is missing skills or experience the job requires
- suggestions: 2-4 specific actions to improve the resume for this job

Return ONLY the JSON object.`
      }]
    })

    const responseText = message.content[0]
    if (responseText.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected AI response' }, { status: 500 })
    }

    const jsonMatch = responseText.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const analysis = JSON.parse(jsonMatch[0])

    return NextResponse.json({ success: true, analysis })

  } catch (error) {
    console.error('[Match-Resume] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Match analysis failed'
    }, { status: 500 })
  }
}
