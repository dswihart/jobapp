import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import * as pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

// Configure route to allow larger file uploads (10MB)
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds timeout

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 })
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 413 })
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

    console.log('[Upload CV] File type:', file.type, 'Name:', file.name, 'Size:', file.size)

    const fileName = file.name.toLowerCase()
    const isDocx = fileName.endsWith('.docx') || fileName.endsWith('.doc') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword'
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf'
    const isTxt = fileName.endsWith('.txt') || file.type === 'text/plain'

    if (isTxt) {
      // Try UTF-8 first, fallback to other encodings
      try {
        fileText = buffer.toString('utf-8')
      } catch (e) {
        // Fallback to latin1 if UTF-8 fails
        fileText = buffer.toString('latin1')
      }
      console.log('[Upload CV] Extracted text from .txt file, length:', fileText.length)
    } else if (isPdf) {
      try {
        // Parse PDF with options to preserve formatting and handle multiple languages
        // @ts-expect-error - pdfParse typing issue
        const pdfData = await pdfParse(buffer, {
          max: 0, // Parse all pages
          // pdf-parse uses pdf.js which handles UTF-8 and various encodings automatically
        })
        fileText = pdfData.text
        console.log('[Upload CV] Extracted text from PDF, length:', fileText.length, 'pages:', pdfData.numpages)
      } catch (pdfError) {
        console.error('[Upload CV] PDF parsing error:', pdfError)
        fileText = 'Failed to extract text from PDF. Please try uploading a .txt version of your resume.'
      }
    } else if (isDocx) {
      try {
        // mammoth handles multiple languages and encodings automatically
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
