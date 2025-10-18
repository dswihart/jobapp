import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

// GET /api/resumes - List all resumes for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const resumes = await prisma.resume.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ resumes })
  } catch (error) {
    console.error('Error fetching resumes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resumes' },
      { status: 500 }
    )
  }
}

// POST /api/resumes - Upload a new resume
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const isPrimary = formData.get('isPrimary') === 'true'

    if (!file || !name) {
      return NextResponse.json(
        { error: 'File and name are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed' },
        { status: 400 }
      )
    }

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filename = `${session.user.id}-${randomUUID()}-${file.name}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'resumes')
    const filepath = path.join(uploadDir, filename)

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filepath, buffer)

    const fileUrl = `/uploads/resumes/${filename}`

    // If setting as primary, unset other primary resumes
    if (isPrimary) {
      await prisma.resume.updateMany({
        where: { userId: session.user.id, isPrimary: true },
        data: { isPrimary: false }
      })
    }

    // Create resume record
    const resume = await prisma.resume.create({
      data: {
        name,
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        description: description || null,
        isPrimary,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true, resume })
  } catch (error) {
    console.error('Error uploading resume:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload resume' },
      { status: 500 }
    )
  }
}

// DELETE /api/resumes?id=xxx - Delete a resume
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const resumeId = searchParams.get('id')

    if (!resumeId) {
      return NextResponse.json(
        { error: 'Resume ID is required' },
        { status: 400 }
      )
    }

    // Find resume
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId }
    })

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (resume.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete file
    try {
      const filepath = path.join(process.cwd(), 'public', resume.fileUrl)
      await unlink(filepath)
    } catch (fileError) {
      console.error('Error deleting file:', fileError)
      // Continue even if file deletion fails
    }

    // Delete database record
    await prisma.resume.delete({
      where: { id: resumeId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting resume:', error)
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 }
    )
  }
}

// PATCH /api/resumes - Update resume details
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, name, description, isPrimary } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Resume ID is required' },
        { status: 400 }
      )
    }

    // Find resume
    const resume = await prisma.resume.findUnique({
      where: { id }
    })

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (resume.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // If setting as primary, unset other primary resumes
    if (isPrimary === true) {
      await prisma.resume.updateMany({
        where: { userId: session.user.id, isPrimary: true, id: { not: id } },
        data: { isPrimary: false }
      })
    }

    // Update resume
    const updatedResume = await prisma.resume.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isPrimary !== undefined && { isPrimary })
      }
    })

    return NextResponse.json({ success: true, resume: updatedResume })
  } catch (error) {
    console.error('Error updating resume:', error)
    return NextResponse.json(
      { error: 'Failed to update resume' },
      { status: 500 }
    )
  }
}
