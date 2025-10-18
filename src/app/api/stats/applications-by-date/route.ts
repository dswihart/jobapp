import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    // Get applications - either for specific user (if authenticated) or all users (if public)
    const applications = await prisma.application.findMany({
      where: session?.user?.id ? { userId: session.user.id } : {},
      select: {
        createdAt: true,
        appliedDate: true,
        status: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Group jobs added by created date
    const addedDateMap = new Map<string, number>()
    // Group jobs applied by applied date
    const appliedDateMap = new Map<string, number>()

    applications.forEach(app => {
      // Track when job was added (created)
      const createdDate = app.createdAt.toISOString().split('T')[0]
      addedDateMap.set(createdDate, (addedDateMap.get(createdDate) || 0) + 1)

      // Track when job was applied (if appliedDate exists or status is APPLIED)
      if (app.appliedDate) {
        const appliedDate = new Date(app.appliedDate).toISOString().split('T')[0]
        appliedDateMap.set(appliedDate, (appliedDateMap.get(appliedDate) || 0) + 1)
      } else if (app.status === 'APPLIED' || app.status === 'INTERVIEWING') {
        // If no appliedDate but status is APPLIED/INTERVIEWING, use createdAt as fallback
        appliedDateMap.set(createdDate, (appliedDateMap.get(createdDate) || 0) + 1)
      }
    })

    // Get all unique dates from both maps
    const allDates = new Set([...addedDateMap.keys(), ...appliedDateMap.keys()])

    // Convert to array of objects for the chart
    const data = Array.from(allDates).sort().map(date => ({
      date,
      added: addedDateMap.get(date) || 0,
      applied: appliedDateMap.get(date) || 0,
      formattedDate: new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }))

    // Get last 30 days statistics
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentData = data.filter(item => new Date(item.date) >= thirtyDaysAgo)

    // Calculate totals
    const totalAdded = applications.length
    const totalApplied = applications.filter(app =>
      app.appliedDate || app.status === 'APPLIED' || app.status === 'INTERVIEWING'
    ).length

    return NextResponse.json({
      success: true,
      allTime: data,
      last30Days: recentData,
      total: totalAdded,
      totalApplied: totalApplied
    })
  } catch (error) {
    console.error('Applications by date error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch application statistics' },
      { status: 500 }
    )
  }
}
