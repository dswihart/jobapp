import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const pad = (n: number) => String(n).padStart(2, "0")
const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n")

// GET /api/interviews/[id]/ics — download a single interview as an .ics event.
// Times are emitted as "floating" local time so they show at the stated clock
// time in whatever calendar the user imports into (fine for a single-TZ user).
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

  const day = new Date(interview.scheduledDate).toISOString().slice(0, 10) // YYYY-MM-DD
  const [y, m, d] = day.split("-").map(Number)
  const timeStr =
    interview.scheduledTime && /^\d{2}:\d{2}$/.test(interview.scheduledTime) ? interview.scheduledTime : null

  let dtstart: string
  let dtend: string
  if (timeStr) {
    const [hh, mm] = timeStr.split(":").map(Number)
    const start = new Date(Date.UTC(y, m - 1, d, hh, mm))
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const fmt = (dt: Date) =>
      `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`
    dtstart = `DTSTART:${fmt(start)}`
    dtend = `DTEND:${fmt(end)}`
  } else {
    const next = new Date(Date.UTC(y, m - 1, d + 1))
    dtstart = `DTSTART;VALUE=DATE:${y}${pad(m)}${pad(d)}`
    dtend = `DTEND;VALUE=DATE:${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`
  }

  const company = interview.application?.company || "Company"
  const role = interview.application?.role || ""
  const summary = `Interview: ${company}${role ? " — " + role : ""}`
  const descParts = [`${interview.interviewType} interview (round ${interview.round})`]
  if (interview.application?.jobUrl) descParts.push(interview.application.jobUrl)
  if (interview.preparationNotes) descParts.push(interview.preparationNotes)
  const location = interview.meetingLink || interview.location || ""
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Job Tracker//Interview//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:interview-${interview.id}@jobapp.aigrowise.com`,
    `DTSTAMP:${dtstamp}`,
    dtstart,
    dtend,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(descParts.join("\n"))}`,
    location ? `LOCATION:${esc(location)}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean)

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="interview-${interview.id}.ics"`,
    },
  })
}
