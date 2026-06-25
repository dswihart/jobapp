import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReminderEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  if (cronSecret !== (process.env.CRON_SECRET || 'change-this-secret')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  let followUpsSent = 0
  let interviewsSent = 0

  const users = await prisma.user.findMany({ select: { id: true, email: true } })

  for (const user of users) {
    if (!user.email) continue

    // Follow-up reminders
    const dueFollowUps = await prisma.followUp.findMany({
      where: {
        userId: user.id,
        completed: false,
        notified: false,
        dueDate: { lte: in24h },
      },
      orderBy: { dueDate: 'asc' },
    })

    if (dueFollowUps.length > 0) {
      try {
        await sendReminderEmail(user.email, 'follow-ups', dueFollowUps.map(f => ({
          title: f.title,
          dueDate: f.dueDate,
          priority: f.priority,
          type: f.type,
        })))
        await prisma.followUp.updateMany({
          where: { id: { in: dueFollowUps.map(f => f.id) } },
          data: { notified: true, notifiedAt: now },
        })
        followUpsSent += dueFollowUps.length
        console.log(`[Reminders] ${dueFollowUps.length} follow-up(s) sent to ${user.email}`)
      } catch (err) {
        console.error('[Reminders] Follow-up email error:', err)
      }
    }

    // Interview reminders — join via raw SQL since schema has no explicit relation.
    // reminder_sent_at guard ensures each interview is reminded ONCE (mirrors followUp.notified),
    // preventing the hourly cron from re-sending the same reminder every run.
    const upcoming = await prisma.$queryRaw<Array<{
      id: string
      scheduled_date: Date
      scheduled_time: string | null
      interview_type: string
      location: string | null
      meeting_link: string | null
      role: string | null
      company: string | null
    }>>`
      SELECT i.id, i.scheduled_date, i.scheduled_time, i.interview_type, i.location, i.meeting_link,
             a.role, a.company
      FROM interviews i
      LEFT JOIN applications a ON a.id = i.application_id
      WHERE a."userId" = ${user.id}
        AND i.status = 'scheduled'
        AND i.reminder_sent_at IS NULL
        AND i.scheduled_date >= ${now}
        AND i.scheduled_date <= ${in24h}
      ORDER BY i.scheduled_date ASC
    `

    if (upcoming.length > 0) {
      try {
        await sendReminderEmail(user.email, 'interviews', upcoming.map(i => ({
          title: `${i.interview_type} interview — ${i.role ?? 'Role'} at ${i.company ?? 'Company'}`,
          dueDate: i.scheduled_date,
          priority: 'high',
          type: 'interview',
          meetingLink: i.meeting_link ?? undefined,
          location: i.location ?? undefined,
        })))
        for (const iv of upcoming) {
          await prisma.$executeRaw`UPDATE interviews SET reminder_sent_at = ${now} WHERE id = ${iv.id}`
        }
        interviewsSent += upcoming.length
        console.log(`[Reminders] ${upcoming.length} interview reminder(s) sent to ${user.email}`)
      } catch (err) {
        console.error('[Reminders] Interview email error:', err)
      }
    }
  }

  return NextResponse.json({ success: true, followUpsSent, interviewsSent })
}
