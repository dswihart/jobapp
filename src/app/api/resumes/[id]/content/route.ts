import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'
import mammoth from 'mammoth'
import { validateUrlPath, safePathJoin } from '@/lib/safe-path'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: resumeId } = await context.params

    // Validate resumeId format
    if (!/^[a-zA-Z0-9-_]+$/.test(resumeId)) {
      return NextResponse.json(
        { error: 'Invalid resume ID' },
        { status: 400 }
      )
    }

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId }
    })

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    if (resume.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Validate and sanitize the file path from database
    const sanitizedPath = validateUrlPath(resume.fileUrl)
    const filepath = safePathJoin(process.cwd(), 'public', sanitizedPath)
    
    let content = ''

    try {
      if (resume.fileType === 'text/plain') {
        content = await readFile(filepath, 'utf-8')
      } else if (
        resume.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        resume.fileType === 'application/msword'
      ) {
        const result = await mammoth.extractRawText({ path: filepath })
        content = result.value
      } else if (resume.fileType === 'application/pdf') {
        return NextResponse.json(
          { error: 'PDF support temporarily disabled. Please use DOCX or TXT format, or paste your resume content manually.' },
          { status: 400 }
        )
      } else {
        try {
          content = await readFile(filepath, 'utf-8')
        } catch {
          return NextResponse.json(
            { error: 'Unsupported file format. Please use DOCX or TXT format.' },
            { status: 400 }
          )
        }
      }
    } catch (error) {
      console.error('Error reading file:', error)
      return NextResponse.json(
        { error: 'Failed to read resume content' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      content,
      fileName: resume.fileName,
      fileType: resume.fileType,
      name: resume.name
    })
  } catch (error) {
    console.error('Error retrieving resume content:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve resume content' },
      { status: 500 }
    )
  }
}
