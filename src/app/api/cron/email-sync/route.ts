import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncApplicationEmailsForUser } from '@/lib/email-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// POST /api/cron/email-sync — scheduled Gmail sync (mirrors send-reminders auth).
// The app uses a single shared Gmail mailbox (GMAIL_APP_PASSWORD + NOTIFY_EMAIL),
// so we sync the user that owns that mailbox. Falls back to the primary (oldest)
// user if no email match is found. Run hourly via cron.
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  if (cronSecret !== (process.env.CRON_SECRET || 'change-this-secret')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const mailbox = (process.env.GMAIL_SYNC_EMAIL || process.env.NOTIFY_EMAIL || '').toLowerCase()

  let targets = mailbox
    ? await prisma.user.findMany({ where: { email: mailbox }, select: { id: true } })
    : []

  if (targets.length === 0) {
    const primary = await prisma.user.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
    if (primary) targets = [primary]
  }

  const results: Array<{ userId: string; summary?: unknown; error?: string }> = []
  for (const u of targets) {
    try {
      const summary = await syncApplicationEmailsForUser(u.id)
      results.push({ userId: u.id, summary })
    } catch (error) {
      console.error(`[cron email-sync] failed for ${u.id}:`, error)
      results.push({ userId: u.id, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  console.log(`[cron email-sync] synced ${results.length} user(s)`)
  return NextResponse.json({ success: true, synced: results.length, results })
}
