import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { sanitizeFilename, safePathJoin } from '@/lib/safe-path'

// POST /api/cover-letter/upload - Upload a cover letter file and attach it to the
// user's library. Mirrors /api/resumes (multipart form-data: file + name). The
// existing /api/cover-letter POST is reserved for AI generation (JSON body), so
// file uploads get their own route.
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null

    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 })
    }

    // Validate file type (same set the resume upload accepts)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed' },
        { status: 400 }
      )
    }

    // Save file to public/uploads/cover-letters with a sanitized, unique name
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const safeOriginalName = sanitizeFilename(file.name)
    const filename = `${session.user.id}-${randomUUID()}-${safeOriginalName}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'cover-letters')
    const filepath = safePathJoin(uploadDir, filename)

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filepath, buffer)

    const fileUrl = `/uploads/cover-letters/${filename}`

    const coverLetter = await prisma.coverLetter.create({
      data: {
        name,
        fileName: safeOriginalName,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        description: description || null,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        fileName: true,
        fileUrl: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, coverLetter })
  } catch (error) {
    console.error('Error uploading cover letter:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload cover letter' },
      { status: 500 }
    )
  }
}
