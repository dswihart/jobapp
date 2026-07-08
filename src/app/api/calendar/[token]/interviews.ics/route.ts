import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildVevent, buildVcalendar, nowDtstamp } from "@/lib/ics"
import { computeOrdinals } from "@/lib/pipeline-ordinal"

// GET /api/calendar/[token]/interviews.ics — PUBLIC subscribable calendar feed.
//
// Public by design: calendar clients (Google/Apple) can't send a session cookie,
// so the opaque per-user token IS the credential. This route is intentionally
// NOT behind the auth middleware — the middleware matcher excludes dotted paths
// (".ics"), so it never runs here. The token maps to exactly one user, so there
// is no cross-user exposure; a bad/rotated token returns 404.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // A malformed/empty token must never fall through to an unscoped query.
  if (!token || token.length < 16) {
    return new NextResponse("Not found", { status: 404 })
  }

  const user = await prisma.user.findUnique({
    where: { calendarFeedToken: token },
    select: { id: true },
  })
  if (!user) {
    return new NextResponse("Not found", { status: 404 })
  }

  // Only this user's non-archived, dated interviews become events.
  const apps = await prisma.application.findMany({
    where: { userId: user.id },
    select: { id: true, company: true, role: true, jobUrl: true },
  })
  const appById = new Map(apps.map(a => [a.id, a]))
  const interviews = await prisma.interview.findMany({
    where: {
      applicationId: { in: apps.map(a => a.id) },
      archived: false,
      scheduledDate: { not: null },
    },
    select: {
      id: true, applicationId: true, round: true, scheduledDate: true, scheduledTime: true,
      createdAt: true, status: true, interviewType: true, meetingLink: true, location: true,
      preparationNotes: true, updatedAt: true,
    },
  })

  // Derive per-application ordinals so each event's "Round N" matches the app.
  const byApp = new Map<string, typeof interviews>()
  for (const iv of interviews) {
    const list = byApp.get(iv.applicationId) || []
    list.push(iv)
    byApp.set(iv.applicationId, list)
  }
  const ordinalById = new Map<string, number>()
  for (const [appId, list] of byApp) {
    const ords = computeOrdinals(list)
    for (const [ivId, ord] of ords) ordinalById.set(ivId, ord)
    void appId
  }

  const dtstamp = nowDtstamp()
  const vevents = interviews.map((iv) => {
    const ordinal = ordinalById.get(iv.id)
    const roundLabel = ordinal ? `Round ${ordinal}` : `Round ${iv.round}`
    return buildVevent(iv, appById.get(iv.applicationId) || {}, roundLabel, dtstamp)
  }).filter(v => v.length > 0)

  const body = buildVcalendar(vevents, { name: "Job Interviews" })

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // Inline (not attachment) so calendar clients subscribe rather than download.
      "Content-Disposition": 'inline; filename="interviews.ics"',
      "Cache-Control": "no-cache",
    },
  })
}
