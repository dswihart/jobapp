import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDailyBuckets } from '@/lib/stats-dates'

export async function GET() {
  try {
    const totalApplications = await prisma.application.count()

    const statusCounts = await prisma.application.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    // Bucket by the user's local (Europe/Madrid) calendar days so "today" shows
    // even while the server's UTC day still lags behind. 16-day window.
    const dailyStats = []
    for (const bucket of getDailyBuckets(16)) {
      // Count strictly by appliedDate (single source of truth shared with the
      // post-login /stats page). Applications with no appliedDate are not counted.
      const count = await prisma.application.count({
        where: {
          appliedDate: {
            gte: bucket.start,
            lt: bucket.end
          }
        }
      })

      dailyStats.push({
        date: bucket.dateStr,
        count,
        dayLabel: new Date(bucket.dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
      })
    }

    const now = new Date()
    const totalInterviews = await prisma.interview.count()
    const upcomingInterviews = await prisma.interview.count({
      where: {
        scheduledDate: { gte: now },
        status: { in: ['scheduled', 'rescheduled'] }
      }
    })
    const completedInterviews = await prisma.interview.count({
      where: {
        status: 'completed'
      }
    })
    const interviewOutcomes = await prisma.interview.groupBy({
      by: ['outcome'],
      _count: {
        outcome: true
      },
      where: {
        outcome: { not: null }
      }
    })

    const passedCount = interviewOutcomes.find(o => o.outcome === 'passed')?._count?.outcome || 0
    const failedCount = interviewOutcomes.find(o => o.outcome === 'failed')?._count?.outcome || 0
    const passRate = (passedCount + failedCount) > 0
      ? Math.round((passedCount / (passedCount + failedCount)) * 100)
      : 0

    const interviewTypes = await prisma.interview.groupBy({
      by: ['interviewType'],
      _count: {
        interviewType: true
      }
    })

    const stats = {
      total: totalApplications,
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status
        return acc
      }, {} as Record<string, number>),
      dailyStats,
      interviews: {
        total: totalInterviews,
        upcoming: upcomingInterviews,
        completed: completedInterviews,
        passRate,
        passed: passedCount,
        failed: failedCount,
        byType: interviewTypes.reduce((acc, item) => {
          acc[item.interviewType] = item._count.interviewType
          return acc
        }, {} as Record<string, number>),
        byOutcome: interviewOutcomes.reduce((acc, item) => {
          if (item.outcome) {
            acc[item.outcome] = item._count.outcome
          }
          return acc
        }, {} as Record<string, number>)
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
