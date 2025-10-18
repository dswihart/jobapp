import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const totalApplications = await prisma.application.count()

    const statusCounts = await prisma.application.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    const dailyStats = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const count = await prisma.application.count({
        where: {
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
        dayLabel: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      })
    }

    const stats = {
      total: totalApplications,
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status
        return acc
      }, {} as Record<string, number>),
      dailyStats: dailyStats
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
