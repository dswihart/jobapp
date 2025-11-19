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
    const today = new Date()
    
    // Get last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      // Count only APPLIED and INTERVIEWING applications (matching user stats logic)
      const count = await prisma.application.count({
        where: {
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
