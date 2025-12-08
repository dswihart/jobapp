import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { sanitizeFilename, safePathJoin } from '@/lib/safe-path'

const prisma = new PrismaClient()

// Helper function to parse resume content and create a structured DOCX
function parseResumeContent(content: string) {
  const lines = content.split('\n').filter(line => line.trim())
  const paragraphs: Paragraph[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Check if it's a heading (all caps, or ends with :, or specific keywords)
    const isHeading = /^[A-Z\s]{3,}:?$/.test(trimmedLine) ||
                     /^(PROFESSIONAL SUMMARY|EXPERIENCE|EDUCATION|SKILLS|CERTIFICATIONS|PROJECTS|CONTACT|SUMMARY)/i.test(trimmedLine)

    if (isHeading) {
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.replace(/:$/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 }
        })
      )
    } else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
      // Bullet points
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.replace(/^[•\-*]\s*/, ''),
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 }
        })
      )
    } else if (trimmedLine) {
      // Regular paragraph
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(trimmedLine)],
          spacing: { before: 120, after: 120 }
        })
      )
    }
  }

  return paragraphs
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content, jobId, jobSource, filename } = body

    if (!content || !filename) {
      return NextResponse.json(
        { error: 'Content and filename are required' },
        { status: 400 }
      )
    }

    // Sanitize the filename to prevent path traversal
    const safeFilename = sanitizeFilename(filename)

    // Parse the resume content and create a DOCX document
    const paragraphs = parseResumeContent(content)

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    })

    // Generate the DOCX file as a buffer
    const buffer = await Packer.toBuffer(doc)

    // Create a DOCX file with the tailored resume content
    const uniqueFilename = `${session.user.id}-${randomUUID()}-${safeFilename}.docx`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes')
    const filepath = safePathJoin(uploadDir, uniqueFilename)

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filepath, buffer)

    const fileUrl = `/uploads/resumes/${uniqueFilename}`

    // Get job details based on source
    let jobDetails = null
    let applicationId = null

    if (jobId) {
      // Validate jobId format
      if (!/^[a-zA-Z0-9-_]+$/.test(jobId)) {
        return NextResponse.json(
          { error: 'Invalid job ID format' },
          { status: 400 }
        )
      }

      if (jobSource === 'application') {
        // It's from the job tracker (application)
        const application = await prisma.application.findUnique({
          where: { id: jobId },
          select: { id: true, role: true, company: true }
        })
        if (application) {
          jobDetails = { title: application.role, company: application.company }
          applicationId = application.id
        }
      } else {
        // It's from opportunities
        const opportunity = await prisma.jobOpportunity.findUnique({
          where: { id: jobId },
          select: { title: true, company: true }
        })
        if (opportunity) {
          jobDetails = opportunity
        }
      }
    }

    // Create resume record
    const resume = await prisma.resume.create({
      data: {
        name: jobDetails
          ? `Tailored for ${jobDetails.title} at ${jobDetails.company}`
          : `Tailored Resume - ${new Date().toLocaleDateString()}`,
        fileName: safeFilename + '.docx',
        fileUrl,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: buffer.length,
        description: jobDetails
          ? `AI-enhanced resume tailored for ${jobDetails.title} position at ${jobDetails.company}`
          : 'AI-enhanced resume',
        isPrimary: false,
        userId: session.user.id
      }
    })

    // If this is for an application (draft), link the resume to it
    if (applicationId) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { resumeId: resume.id }
      })
      console.log(`[Resume Tailor] Linked resume ${resume.id} to application ${applicationId}`)
    }

    return NextResponse.json({
      success: true,
      resume,
      linkedToApplication: !!applicationId,
      message: applicationId
        ? 'Tailored resume saved successfully as DOCX and linked to application!'
        : 'Tailored resume saved successfully as DOCX'
    })
  } catch (error) {
    console.error('Error saving tailored resume:', error)
    return NextResponse.json(
      { error: 'Failed to save tailored resume', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
