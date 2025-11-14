import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get total applications count for this user
    const total = await prisma.application.count({
      where: { userId }
    })

    // Get applications by status for this user
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

    // Get daily stats for the last 7 days (matching community stats logic)
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const dailyStats = []

    // Generate stats for last 7 days in chronological order (oldest first)
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      // Count APPLIED and INTERVIEWING applications for goal achievement
      const count = await prisma.application.count({
        where: {
          userId,
          OR: [
            { status: 'APPLIED' },
            { status: 'INTERVIEWING' }
          ],
          AND: {
            OR: [
              {
                appliedDate: {
                  gte: date,
                  lt: nextDate
                }
              },
              {
                AND: [
                  { appliedDate: null },
                  {
                    updatedAt: {
                      gte: date,
                      lt: nextDate
                    }
                  }
                ]
              }
            ]
          }
        }
      })

      const dayName = dayLabels[date.getDay()]
      const monthName = monthNames[date.getMonth()]
      const dayNum = date.getDate()

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        count: count,
        dayLabel: `${dayName}, ${monthName} ${dayNum}`
      })
    }

    return NextResponse.json({
      userId,
      userName: user.name || user.email?.split('@')[0] || 'User',
      dailyGoal: 5, // Default goal for now
      total,
      byStatus: {
        DRAFT: byStatus.DRAFT || 0,
        APPLIED: byStatus.APPLIED || 0,
        INTERVIEWING: byStatus.INTERVIEWING || 0,
        REJECTED: byStatus.REJECTED || 0,
        OFFER: byStatus.OFFER || 0,
        ACCEPTED: byStatus.ACCEPTED || 0
      },
      dailyStats
    })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json({ error: 'Failed to fetch user statistics' }, { status: 500 })
  }
}