import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { buildVevent, buildVcalendar, nowDtstamp } from "@/lib/ics"
import { computeOrdinals } from "@/lib/pipeline-ordinal"

// GET /api/interviews/[id]/ics — download a single interview as an .ics event.
// Session-authed attachment. Times are floating local (see lib/ics.ts). Uses the
// shared builder + derived pipeline ordinal so the downloaded event matches the
// subscribable feed (same UID) and the in-app "Round N".
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: { application: { select: { userId: true, company: true, role: true, jobUrl: true } } },
  })

  if (!interview || interview.application?.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!interview.scheduledDate) {
    return NextResponse.json({ error: "Interview has no scheduled date yet" }, { status: 400 })
  }

  // Derive this interview's pipeline ordinal from its siblings so the .ics label
  // matches the app and the feed.
  const siblings = await prisma.interview.findMany({
    where: { applicationId: interview.applicationId },
    select: { id: true, round: true, scheduledDate: true, createdAt: true, status: true },
  })
  const ordinal = computeOrdinals(siblings).get(interview.id)
  const roundLabel = ordinal ? `Round ${ordinal}` : `Round ${interview.round}`

  const vevent = buildVevent(interview, interview.application || {}, roundLabel, nowDtstamp())
  const body = buildVcalendar([vevent])

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="interview-${interview.id}.ics"`,
    },
  })
}
