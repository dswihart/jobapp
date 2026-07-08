import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { validateUrlPath, safePathJoin } from '@/lib/safe-path'

export const dynamic = 'force-dynamic'

// GET /api/opportunities/[id]/attachment
// Streams the source PDF/DOCX attached to an imported opportunity, enforcing
// auth + ownership before serving (mirrors /api/resumes/[id]/download). Served
// inline so a PDF opens in the browser tab.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await context.params
    // opportunity ids are cuids — reject path/odd characters early.
    if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid opportunity ID' }, { status: 400 })
    }

    const opportunity = await prisma.jobOpportunity.findUnique({ where: { id } })
    if (!opportunity || !opportunity.attachmentPath) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }
    if (opportunity.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Resolve on disk safely (prevents traversal out of public/).
    const sanitizedPath = validateUrlPath(opportunity.attachmentPath)
    const filepath = safePathJoin(process.cwd(), 'public', sanitizedPath)

    let fileBuffer: Buffer
    try {
      fileBuffer = await readFile(filepath)
    } catch (err) {
      console.error('Error reading opportunity attachment:', err)
      return NextResponse.json({ error: 'Attachment file is missing' }, { status: 404 })
    }

    const rawName = (opportunity.attachmentName || 'document').toString()
    const asciiName = rawName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\\r\n]/g, '_')
    const encodedName = encodeURIComponent(rawName)

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': opportunity.attachmentType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Error serving opportunity attachment:', error)
    return NextResponse.json({ error: 'Failed to load attachment' }, { status: 500 })
  }
}
