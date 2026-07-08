import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const requestedUserId = searchParams.get('userId')
    const userId = requestedUserId || authResult.user.id

    if (userId !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    const totalApplications = await prisma.application.count({ where: { userId } })
    const statusCounts = await prisma.application.groupBy({
      where: { userId },
      by: ['status'],
      _count: { status: true }
    })

    const dailyStats = []
    const dailyGoal = user.dailyApplicationGoal ?? 4

    for (let i = 6; i >= 0; i--) {
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
        count,
        goalMet: count >= dailyGoal,
        dayLabel: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      })
    }

    return NextResponse.json({
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
      dailyStats
    })
  } catch (error) {
    console.error('Error fetching user statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user statistics' },
      { status: 500 }
    )
  }
}
