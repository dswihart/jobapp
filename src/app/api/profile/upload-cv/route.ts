import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import * as pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 })
    }

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filename = `${userId}-${randomUUID()}-${file.name}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes')
    const filepath = path.join(uploadDir, filename)

    // Create directory if it doesn't exist
    await mkdir(uploadDir, { recursive: true })
    await writeFile(filepath, buffer)

    const fileUrl = `/uploads/resumes/${filename}`

    // Extract text from file
    let fileText = ''

    console.log('[Upload CV] File type:', file.type, 'Name:', file.name)

    if (file.type === 'text/plain') {
      fileText = buffer.toString('utf-8')
      console.log('[Upload CV] Extracted text from .txt file, length:', fileText.length)
    } else if (file.type === 'application/pdf') {
      try {
        // @ts-expect-error - pdfParse typing issue
        const pdfData = await pdfParse(buffer)
        fileText = pdfData.text
        console.log('[Upload CV] Extracted text from PDF, length:', fileText.length)
      } catch (pdfError) {
        console.error('[Upload CV] PDF parsing error:', pdfError)
        fileText = 'Failed to extract text from PDF. Please try uploading a .txt version of your resume.'
      }
    } else if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const result = await mammoth.extractRawText({ buffer })
        fileText = result.value
        console.log('[Upload CV] Extracted text from DOCX, length:', fileText.length)
        
        if (result.messages && result.messages.length > 0) {
          console.log('[Upload CV] Mammoth warnings:', result.messages)
        }
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
