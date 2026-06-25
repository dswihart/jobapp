import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDailyBuckets } from '@/lib/stats-dates'

function isPublicDanielAccount(user: { email?: string | null; name?: string | null }) {
  const email = (user.email || '').toLowerCase()
  const name = (user.name || '').toLowerCase()

  return (
    email.includes('dswihart') ||
    email.includes('swihart') ||
    name.includes('daniel swihart')
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!isPublicDanielAccount(user)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const total = await prisma.application.count({
      where: { userId }
    })

    const statusCounts = await prisma.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        status: true
      }
    })

    const byStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status
      return acc
    }, {} as Record<string, number>)

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    // Bucket by the user's local (Europe/Madrid) calendar days so "today" shows
    // even while the server's UTC day still lags behind. 16-day window.
    const dailyStats = []
    for (const bucket of getDailyBuckets(16)) {
      // Count strictly by appliedDate (single source of truth shared with the
      // post-login /stats page). Applications with no appliedDate are not counted.
      const count = await prisma.application.count({
        where: {
          userId,
          appliedDate: {
            gte: bucket.start,
            lt: bucket.end
          }
        }
      })

      // Label parts from the bucket's calendar date (UTC-read to avoid re-shifting).
      const labelDate = new Date(bucket.dateStr)
      const dayName = dayLabels[labelDate.getUTCDay()]
      const monthName = monthNames[labelDate.getUTCMonth()]
      const dayNum = labelDate.getUTCDate()

      dailyStats.push({
        date: bucket.dateStr,
        count,
        dayLabel: dayName + ', ' + monthName + ' ' + dayNum
      })
    }

    return NextResponse.json({
      userId,
      userName: user.name || 'User',
      dailyGoal: 5,
      total,
      byStatus: {
        DRAFT: byStatus.DRAFT || 0,
        PENDING: byStatus.PENDING || 0,
        APPLIED: byStatus.APPLIED || 0,
        INTERVIEWING: byStatus.INTERVIEWING || 0,
        REJECTED: byStatus.REJECTED || 0,
        ARCHIVED: byStatus.ARCHIVED || 0
      },
      dailyStats
    })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json({ error: 'Failed to fetch user statistics' }, { status: 500 })
  }
}
