import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendJobSearchSummaryEmail } from '@/lib/email'

/**
 * POST /api/summary-email
 * Emails the signed-in user an easy-to-read 2-week job-search digest:
 *  - how many applications they sent (applied) in the last 14 days
 *  - interviews already done in that window and how they turned out
 *  - upcoming interviews in the next 14 days
 * Sent to the user's own account email.
 */
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, dailyApplicationGoal: true },
    })
    const dailyGoal = user?.dailyApplicationGoal ?? 4
    // Only ever email the signed-in user's OWN address — never a shared fallback
    // mailbox, which in this multi-user app would leak one user's digest to another.
    const toEmail = user?.email
    if (!toEmail) {
      return NextResponse.json({ error: 'No email address on file to send to' }, { status: 400 })
    }

    const now = new Date()
    const rangeStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const rangeAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    // Applications "sent" = those with an appliedDate inside the window.
    const appsSent = await prisma.application.findMany({
      where: { userId, appliedDate: { gte: rangeStart, lte: now } },
      select: { company: true, role: true, appliedDate: true },
      orderBy: { appliedDate: 'desc' },
    })

    // Interview ↔ application has no Prisma relation, so map by id (mirrors the
    // /api/interviews GET pattern).
    const userApps = await prisma.application.findMany({
      where: { userId },
      select: { id: true, company: true, role: true },
    })
    const appById = new Map(userApps.map(a => [a.id, a]))
    const appIds = userApps.map(a => a.id)

    const interviews = appIds.length
      ? await prisma.interview.findMany({
          where: { applicationId: { in: appIds } },
          select: {
            applicationId: true,
            scheduledDate: true,
            scheduledTime: true,
            interviewType: true,
            round: true,
            status: true,
            outcome: true,
            autoDetected: true,
          },
          orderBy: { scheduledDate: 'asc' },
        })
      : []

    // A round is "passed" when the application has a LATER, non-cancelled round
    // than this one — advancing to a next round implies you cleared this one. Used
    // to show ✅ Passed even when the user never manually set the outcome.
    const activeStatus = (s: string | null) => s !== 'cancelled' && s !== 'canceled'
    const hasLaterRound = (i: { applicationId: string; round: number; scheduledDate: Date | null }) =>
      interviews.some(
        s =>
          s.applicationId === i.applicationId &&
          activeStatus(s.status) &&
          (s.round > i.round ||
            (s.scheduledDate != null && i.scheduledDate != null && s.scheduledDate.getTime() > i.scheduledDate.getTime() && s.round !== i.round))
      )

    // "Done" = already happened in the last 14 days and not cancelled (covers
    // past interviews whether or not the user marked them completed).
    const completedInterviews = interviews
      .filter(i => i.status !== 'cancelled' && i.scheduledDate != null && i.scheduledDate <= now && i.scheduledDate >= rangeStart)
      .sort((a, b) => (b.scheduledDate?.getTime() ?? 0) - (a.scheduledDate?.getTime() ?? 0))
      .map(i => {
        const app = appById.get(i.applicationId)
        return {
          company: app?.company || 'Unknown company',
          role: app?.role || 'Unknown role',
          date: i.scheduledDate,
          round: i.round,
          // Inferred pass: a later round exists, so this one was cleared.
          outcome: i.outcome || (hasLaterRound(i) ? 'passed' : null),
          inferred: !i.outcome && hasLaterRound(i),
          status: i.status,
        }
      })

    // Upcoming = scheduled/rescheduled in the next 14 days.
    const upcomingInterviews = interviews
      .filter(i => ['scheduled', 'rescheduled'].includes(i.status) && i.scheduledDate != null && i.scheduledDate > now && i.scheduledDate <= rangeAhead)
      .map(i => {
        const app = appById.get(i.applicationId)
        return {
          company: app?.company || 'Unknown company',
          role: app?.role || 'Unknown role',
          date: i.scheduledDate,
          time: i.scheduledTime,
          type: i.interviewType,
          autoDetected: i.autoDetected,
        }
      })

    // Conversion stats over the user's full history (so the rates have meaningful
    // denominators rather than a noisy 2-week sample).
    const totalApplied = await prisma.application.count({
      where: { userId, appliedDate: { not: null } },
    })
    const interviewedApps = new Set(interviews.map(i => i.applicationId)).size
    const recordedOutcomes = interviews.filter(i => !!i.outcome).length
    const positiveOutcomes = interviews.filter(
      i => i.outcome === 'passed' || i.outcome === 'moved_forward'
    ).length

    // ── Likelihood of securing an offer by a given month-end ──────────────────
    // Transparent heuristic (not a promise): the chance that at least one "live"
    // interview process closes to an offer before the horizon, scaled by the
    // user's demonstrated advance rate and how much time is left. Computed for
    // both this month-end and next month-end.
    const advanceRateNum = recordedOutcomes > 0 ? positiveOutcomes / recordedOutcomes : 0.35
    const dead = ['failed', 'no-show', 'cancelled']
    const recentCutoff = new Date(now.getTime() - 21 * 86_400_000)
    const forecastByMonthEnd = (endDate: Date) => {
      const daysLeft = Math.max(1, Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000))
      const liveAppIds = new Set<string>()
      for (const i of interviews) {
        const upcoming =
          ['scheduled', 'rescheduled'].includes(i.status) && i.scheduledDate != null && i.scheduledDate > now && i.scheduledDate <= endDate
        const recentlyActive =
          i.scheduledDate != null && i.scheduledDate <= now && i.scheduledDate >= recentCutoff && !dead.includes(i.status) && i.outcome !== 'failed'
        if (upcoming || recentlyActive) liveAppIds.add(i.applicationId)
      }
      const liveProcesses = liveAppIds.size
      const timeFactor = Math.min(1, Math.max(0.08, daysLeft / 25)) // a fast remaining loop ≈ 25 days
      const perProcess = advanceRateNum * 0.4 * timeFactor // 0.4 = base P(a live process → offer | advancing, time)
      const likelihood = liveProcesses > 0 ? 1 - Math.pow(1 - perProcess, liveProcesses) : 0
      const offerLikelihoodPct = liveProcesses > 0 ? Math.max(2, Math.min(80, Math.round(likelihood * 100))) : 0
      const monthLabel = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
      return { offerLikelihoodPct, liveProcesses, daysLeft, monthLabel }
    }
    const endThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))
    const endNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0, 23, 59, 59))
    const forecast = {
      thisMonth: forecastByMonthEnd(endThisMonth),
      nextMonth: forecastByMonthEnd(endNextMonth),
    }

    // Days in the 2-week window where (applications applied + interviews that day)
    // met the daily goal. Bucketed by calendar day; cancelled interviews excluded.
    const windowDays = 14
    const perDay = new Map<string, number>()
    for (const a of appsSent) {
      if (!a.appliedDate) continue
      const k = a.appliedDate.toISOString().slice(0, 10)
      perDay.set(k, (perDay.get(k) || 0) + 1)
    }
    for (const i of interviews) {
      if (i.status === 'cancelled' || i.status === 'canceled') continue
      if (i.scheduledDate == null || i.scheduledDate < rangeStart || i.scheduledDate > now) continue
      const k = i.scheduledDate.toISOString().slice(0, 10)
      perDay.set(k, (perDay.get(k) || 0) + 1)
    }
    let daysGoalMet = 0
    for (const v of perDay.values()) if (v >= dailyGoal) daysGoalMet++

    // Ordered per-day series for the streak strip (oldest -> newest, ending today).
    const series: Array<{ value: number; met: boolean; isToday: boolean }> = []
    let totalActions = 0
    const todayKey = now.toISOString().slice(0, 10)
    for (let i = windowDays - 1; i >= 0; i--) {
      const k = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const v = perDay.get(k) || 0
      totalActions += v
      series.push({ value: v, met: v >= dailyGoal, isToday: k === todayKey })
    }
    const avgPerDay = Math.round((totalActions / windowDays) * 10) / 10

    await sendJobSearchSummaryEmail(toEmail, {
      rangeStart,
      rangeEnd: now,
      applications: appsSent.map(a => ({ company: a.company, role: a.role, appliedDate: a.appliedDate })),
      completedInterviews,
      upcomingInterviews,
      stats: { totalApplied, interviewedApps, recordedOutcomes, positiveOutcomes },
      forecast,
      goal: { dailyGoal, daysGoalMet, windowDays, series, avgPerDay },
    })

    return NextResponse.json({
      success: true,
      sentTo: toEmail,
      counts: {
        applications: appsSent.length,
        completedInterviews: completedInterviews.length,
        upcomingInterviews: upcomingInterviews.length,
      },
    })
  } catch (error) {
    console.error('Error sending summary email:', error)
    return NextResponse.json({ error: 'Failed to send summary email' }, { status: 500 })
  }
}
