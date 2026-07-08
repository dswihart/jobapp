import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function isPublicDanielAccount(user: { email?: string | null; name?: string | null }) {
  const email = (user.email || '').toLowerCase()
  const name = (user.name || '').toLowerCase()

  return (
    email.includes('dswihart') ||
    email.includes('swihart') ||
    name.includes('daniel swihart')
  )
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const searchParams = request.nextUrl.searchParams
    const fallbackUserId = searchParams.get('userId')
    const userId = session?.user?.id || fallbackUserId
    const days = Math.max(1, Math.min(30, Number(searchParams.get('days') || '7')))

    if (!session?.user?.id && userId) {
      const publicUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          name: true,
        },
      })

      if (!publicUser || !isPublicDanielAccount(publicUser)) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
    }

    // Get applications - either for specific user (if authenticated) or all users (if public)
    const applications = await prisma.application.findMany({
      where: userId ? { userId } : {},
      select: {
        createdAt: true,
        appliedDate: true,
        status: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Interviews scheduled/completed, bucketed by scheduled date. Interview has
    // no userId, so scope via the same set of applications this query covers.
    const scopedAppIds = (
      await prisma.application.findMany({
        where: userId ? { userId } : {},
        select: { id: true },
      })
    ).map(a => a.id)
    const interviewRows = scopedAppIds.length
      ? await prisma.interview.findMany({
          where: {
            applicationId: { in: scopedAppIds },
            scheduledDate: { not: null },
            status: { notIn: ['cancelled', 'canceled'] },
          },
          select: { scheduledDate: true },
        })
      : []

    // Group jobs added by created date
    const addedDateMap = new Map<string, number>()
    // Group jobs applied by applied date
    const appliedDateMap = new Map<string, number>()
    // Group interviews by scheduled date
    const interviewDateMap = new Map<string, number>()

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

    interviewRows.forEach(iv => {
      const d = iv.scheduledDate!.toISOString().split('T')[0]
      interviewDateMap.set(d, (interviewDateMap.get(d) || 0) + 1)
    })

    // Get all unique dates from all maps
    const allDates = new Set([...addedDateMap.keys(), ...appliedDateMap.keys(), ...interviewDateMap.keys()])

    // Convert to array of objects for the chart
    const data = Array.from(allDates).sort().map(date => ({
      date,
      added: addedDateMap.get(date) || 0,
      applied: appliedDateMap.get(date) || 0,
      interviews: interviewDateMap.get(date) || 0,
      formattedDate: new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }))

    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - (days - 1))
    daysAgo.setHours(0, 0, 0, 0)

    const recentData = data.filter(item => new Date(item.date) >= daysAgo)

    // Calculate totals
    const totalAdded = applications.length
    const totalApplied = applications.filter(app =>
      app.appliedDate || app.status === 'APPLIED' || app.status === 'INTERVIEWING'
    ).length

    return NextResponse.json({
      success: true,
      allTime: data,
      recentDays: recentData,
      total: totalAdded,
      totalApplied: totalApplied,
      totalInterviews: interviewRows.length,
      rangeDays: days,
    })
  } catch (error) {
    console.error('Applications by date error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch application statistics' },
      { status: 500 }
    )
  }
}
