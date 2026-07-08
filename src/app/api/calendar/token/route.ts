import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { randomBytes } from "crypto"

// Session-authed management of the user's subscribable calendar feed token.
// Self-checks the session inside the handler (independent of middleware).
//
//  GET  -> returns the current feed path (or null if not yet minted)
//  POST -> mints a token if absent (or rotates when {rotate:true}); rotating
//          revokes the old feed URL. Returns the feed path.

function feedPath(token: string): string {
  return `/api/calendar/${token}/interviews.ics`
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { calendarFeedToken: true },
  })
  const token = user?.calendarFeedToken || null
  return NextResponse.json({ feedPath: token ? feedPath(token) : null })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const rotate = body?.rotate === true

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { calendarFeedToken: true },
  })

  let token = existing?.calendarFeedToken || null
  if (!token || rotate) {
    token = randomBytes(32).toString("hex")
    await prisma.user.update({
      where: { id: session.user.id },
      data: { calendarFeedToken: token },
    })
  }

  return NextResponse.json({ feedPath: feedPath(token) })
}
