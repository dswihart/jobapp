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
    
    // Get last 3 months of data
    const today = new Date()
    
    for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
      const targetMonth = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
      const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate()

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day)
        date.setHours(0, 0, 0, 0)

        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        const count = await prisma.application.count({
          where: {
            appliedDate: {
              gte: date,
              lt: nextDate
            }
          }
        })

        dailyStats.push({
          date: date.toISOString().split('T')[0],
          count: count,
          dayLabel: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        })
      }
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
