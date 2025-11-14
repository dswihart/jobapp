import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { Document, Packer, Paragraph, TextRun } from 'docx'

const prisma = new PrismaClient()

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
    const { content, applicationId, company, role } = body

    if (!content || !company || !role) {
      return NextResponse.json(
        { error: 'Content, company, and role are required' },
        { status: 400 }
      )
    }

    const paragraphs = content.split('\n').filter((line: string) => line.trim()).map((line: string) =>
      new Paragraph({
        children: [new TextRun(line.trim())],
        spacing: { before: 120, after: 120 }
      })
    )

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    })

    const buffer = await Packer.toBuffer(doc)

    const sanitizedCompany = company.replace(/[^a-z0-9]/gi, '_')
    const sanitizedRole = role.replace(/[^a-z0-9]/gi, '_')
    const filename = `cover_letter_${sanitizedCompany}_${sanitizedRole}`
    const uniqueFilename = `${session.user.id}-${randomUUID()}-${filename}.docx`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'cover-letters')
    const filepath = path.join(uploadDir, uniqueFilename)

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filepath, buffer)

    const fileUrl = `/uploads/cover-letters/${uniqueFilename}`

    const coverLetter = await prisma.coverLetter.create({
      data: {
        name: `Cover Letter for ${role} at ${company}`,
        fileName: filename + '.docx',
        fileUrl,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: buffer.length,
        description: `AI-generated cover letter for ${role} position at ${company}`,
        content,
        userId: session.user.id
      }
    })

    let linkedToApplication = false
    if (applicationId) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { coverLetterId: coverLetter.id }
      })
      linkedToApplication = true
      console.log(`[Cover Letter] Linked cover letter ${coverLetter.id} to application ${applicationId}`)
    }

    return NextResponse.json({
      success: true,
      coverLetter,
      linkedToApplication,
      fileUrl,
      filename: uniqueFilename,
      message: linkedToApplication
        ? 'Cover letter saved successfully as DOCX and linked to application!'
        : 'Cover letter saved successfully as DOCX'
    })
  } catch (error) {
    console.error('Error saving cover letter:', error)
    return NextResponse.json(
      { error: 'Failed to save cover letter', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
