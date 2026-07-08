import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import { sanitizeFilename, safePathJoin } from '@/lib/safe-path'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const requestedUserId = formData.get('userId') as string | null
    const userId = authResult.user.id

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 10MB.'
      }, { status: 413 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const safeOriginalName = sanitizeFilename(file.name)
    const filename = `${userId}-${randomUUID()}-${safeOriginalName}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes')
    const filepath = safePathJoin(uploadDir, filename)

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filepath, buffer)

    const fileUrl = `/uploads/resumes/${filename}`
    let fileText = ''

    const fileName = safeOriginalName.toLowerCase()
    const isDocx = fileName.endsWith('.docx') || fileName.endsWith('.doc') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword'
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf'
    const isTxt = fileName.endsWith('.txt') || file.type === 'text/plain'

    if (isTxt) {
      try {
        fileText = buffer.toString('utf-8')
      } catch {
        fileText = buffer.toString('latin1')
      }
    } else if (isPdf) {
      try {
        // pdf-parse v2 class API (new PDFParse({data}).getText()).
        const parser = new PDFParse({ data: buffer })
        try {
          const pdfData = await parser.getText()
          fileText = pdfData.text
        } finally {
          await parser.destroy?.()
        }
      } catch (pdfError) {
        console.error('[Upload CV] PDF parsing error:', pdfError)
        fileText = 'Failed to extract text from PDF. Please try uploading a .txt version of your resume.'
      }
    } else if (isDocx) {
      try {
        const result = await mammoth.extractRawText({ buffer })
        fileText = result.value
      } catch (docError) {
        console.error('[Upload CV] DOCX parsing error:', docError)
        fileText = 'Failed to extract text from DOCX. Please try uploading a PDF or TXT file.'
      }
    } else {
      fileText = 'Unsupported file type. Please upload PDF, DOCX, or TXT file.'
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileText,
      filename
    })
  } catch (error) {
    console.error('Error uploading CV:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to upload CV'
    }, { status: 500 })
  }
}
