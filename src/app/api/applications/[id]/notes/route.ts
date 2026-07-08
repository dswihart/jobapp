import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Application-scoped running notes thread (append-only) + the shared
// "enter once" interviewContext prep blurb. Shared across all interview rounds.

async function ownedApp(id: string, userId: string) {
  return prisma.application.findFirst({
    where: { id, userId },
    select: { id: true, interviewContext: true },
  })
}

// GET — the full thread (chronological) plus the shared prep blurb.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const app = await ownedApp(id, session.user.id)
    if (!app) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const notes = await prisma.interviewNote.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, body: true, round: true, authorType: true, createdAt: true },
    })
    return NextResponse.json({ notes, interviewContext: app.interviewContext || '' })
  } catch (error) {
    console.error('Error fetching notes thread:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

// POST { body, interviewId?, round? } — append one note. Never overwrites.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    if (!(await ownedApp(id, session.user.id))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const data = await req.json().catch(() => ({}))
    const body = typeof data?.body === 'string' ? data.body.trim() : ''
    if (!body) {
      return NextResponse.json({ error: 'Note body is required' }, { status: 400 })
    }
    const note = await prisma.interviewNote.create({
      data: {
        applicationId: id,
        interviewId: typeof data?.interviewId === 'string' ? data.interviewId : null,
        round: Number.isInteger(data?.round) ? data.round : null,
        body: body.slice(0, 8000),
        authorType: 'user',
      },
      select: { id: true, body: true, round: true, authorType: true, createdAt: true },
    })
    return NextResponse.json({ success: true, note }, { status: 201 })
  } catch (error) {
    console.error('Error appending note:', error)
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 })
  }
}

// PATCH { interviewContext } — update the shared prep blurb (not a note).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    if (!(await ownedApp(id, session.user.id))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const data = await req.json().catch(() => ({}))
    const interviewContext =
      typeof data?.interviewContext === 'string' ? data.interviewContext.slice(0, 8000) : null
    await prisma.application.update({
      where: { id },
      data: { interviewContext },
    })
    return NextResponse.json({ success: true, interviewContext: interviewContext || '' })
  } catch (error) {
    console.error('Error updating interview context:', error)
    return NextResponse.json({ error: 'Failed to update context' }, { status: 500 })
  }
}
