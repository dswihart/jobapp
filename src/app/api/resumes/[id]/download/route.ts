import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { validateUrlPath, safePathJoin } from '@/lib/safe-path'

export const dynamic = 'force-dynamic'

// GET /api/resumes/[id]/download
// Streams the stored resume file as an authenticated download
// (Content-Disposition: attachment). Used by the "download the resume I used in
// this application" action. Unlike linking to the public /uploads path, this
// enforces auth + ownership before serving the PII document.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: resumeId } = await context.params

    // resume ids are cuids — reject anything with path/odd characters early.
    if (!/^[a-zA-Z0-9-_]+$/.test(resumeId)) {
      return NextResponse.json({ error: 'Invalid resume ID' }, { status: 400 })
    }

    const resume = await prisma.resume.findUnique({ where: { id: resumeId } })
    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }
    if (resume.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Resolve the on-disk path safely (mirrors the resume content route) to
    // prevent path traversal out of public/.
    const sanitizedPath = validateUrlPath(resume.fileUrl)
    const filepath = safePathJoin(process.cwd(), 'public', sanitizedPath)

    let fileBuffer: Buffer
    try {
      fileBuffer = await readFile(filepath)
    } catch (err) {
      console.error('Error reading resume file:', err)
      return NextResponse.json({ error: 'Resume file is missing' }, { status: 404 })
    }

    // Safe download filename: ASCII fallback + RFC 5987 UTF-8 form for unicode names.
    const rawName = (resume.fileName || resume.name || 'resume').toString()
    const asciiName = rawName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\\r\n]/g, '_')
    const encodedName = encodeURIComponent(rawName)

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': resume.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Error downloading resume:', error)
    return NextResponse.json({ error: 'Failed to download resume' }, { status: 500 })
  }
}
