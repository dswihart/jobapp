import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user info including their daily goal
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        dailyApplicationGoal: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const totalApplications = await prisma.application.count({
      where: { userId }
    })

    const statusCounts = await prisma.application.groupBy({
      where: { userId },
      by: ['status'],
      _count: {
        status: true
      }
    })

    const dailyStats = []
    const dailyGoal = user.dailyApplicationGoal || 5 // Default to 5 if not set
    
    for (let i = 6; i >= 0; i--) {  // Reverse order for left-to-right chronological display
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const count = await prisma.application.count({
        where: {
          userId,
          status: 'APPLIED',
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
      })

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        count: count,
        goalMet: count >= dailyGoal,
        dayLabel: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      })
    }

    const stats = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        dailyGoal
      },
      total: totalApplications,
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status
        return acc
      }, {} as Record<string, number>),
      dailyStats: dailyStats
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching user statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user statistics' },
      { status: 500 }
    )
  }
}
