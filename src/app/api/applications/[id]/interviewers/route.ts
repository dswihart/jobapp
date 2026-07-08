import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Application-scoped interviewer roster — "enter once, inherited across rounds".
// App-scoped rows carry applicationId and interviewId=null so the modal's legacy
// per-round deleteMany({interviewId}) can never wipe them.

async function ownedApp(id: string, userId: string) {
  return prisma.application.findFirst({ where: { id, userId }, select: { id: true } })
}

type RosterInput = {
  name?: string
  title?: string
  department?: string
  email?: string
  linkedInUrl?: string
  notes?: string
  impression?: string
  topics?: string[]
}

// GET — the roster for display: unions app-scoped rows with any legacy per-round
// rows for this application, deduped by name+email.
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
    if (!(await ownedApp(id, session.user.id))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const rows = await prisma.interviewer.findMany({
      where: { OR: [{ applicationId: id }, { interview: { applicationId: id } }] },
      orderBy: { createdAt: 'asc' },
    })
    const seen = new Set<string>()
    const roster = rows.filter(r => {
      const k = `${r.name.trim().toLowerCase()}|${(r.email || '').trim().toLowerCase()}`
      if (!r.name.trim() || seen.has(k)) return false
      seen.add(k)
      return true
    })
    return NextResponse.json({ roster })
  } catch (error) {
    console.error('Error fetching app roster:', error)
    return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 })
  }
}

// PUT — replace the roster with the provided list, consolidated to application
// scope. Removes every interviewer tied to this application (app-scoped OR any
// of its rounds) and recreates the list as app-scoped rows.
export async function PUT(
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
    const list: RosterInput[] = Array.isArray(data?.interviewers) ? data.interviewers : []
    const clean = list
      .filter(iv => iv && typeof iv.name === 'string' && iv.name.trim())
      .slice(0, 50)

    const appInterviewIds = (
      await prisma.interview.findMany({ where: { applicationId: id }, select: { id: true } })
    ).map(i => i.id)

    await prisma.$transaction(async (tx) => {
      await tx.interviewer.deleteMany({
        where: {
          OR: [
            { applicationId: id },
            ...(appInterviewIds.length ? [{ interviewId: { in: appInterviewIds } }] : []),
          ],
        },
      })
      if (clean.length) {
        await tx.interviewer.createMany({
          data: clean.map(iv => ({
            applicationId: id,
            interviewId: null,
            name: String(iv.name).slice(0, 200),
            title: iv.title?.slice(0, 200) || null,
            department: iv.department?.slice(0, 200) || null,
            email: iv.email?.slice(0, 200) || null,
            linkedInUrl: iv.linkedInUrl?.slice(0, 400) || null,
            notes: iv.notes?.slice(0, 2000) || null,
            impression: iv.impression || null,
            topics: Array.isArray(iv.topics) ? iv.topics.slice(0, 20) : [],
          })),
        })
      }
    })

    const roster = await prisma.interviewer.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ success: true, roster })
  } catch (error) {
    console.error('Error updating app roster:', error)
    return NextResponse.json({ error: 'Failed to update roster' }, { status: 500 })
  }
}
