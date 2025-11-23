import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface DailyStats {
  date: string
  added: number
  applied: number
  interviewing: number
  rejected: number
  pending: number
}

interface WeeklyStats {
  weekStart: string
  weekEnd: string
  added: number
  applied: number
  interviewing: number
  rejected: number
  responseRate: number
}

interface MonthlyStats {
  month: string
  year: number
  added: number
  applied: number
  interviewing: number
  rejected: number
  responseRate: number
}

interface StatusTransition {
  date: string
  from: string
  to: string
  company: string
  role: string
  daysInPreviousStatus: number
}

// GET /api/stats/export - Get comprehensive stats with export support
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json, csv
    const period = searchParams.get('period') || 'all' // all, 30days, 90days, year
    const type = searchParams.get('type') || 'summary' // summary, daily, weekly, monthly, applications

    // Calculate date range
    let startDate: Date | null = null
    const now = new Date()

    switch (period) {
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
    }

    // Fetch all applications for the user
    const applications = await prisma.application.findMany({
      where: {
        userId: session.user.id,
        ...(startDate && { createdAt: { gte: startDate } })
      },
      orderBy: { createdAt: 'asc' },
      include: {
        resume: { select: { name: true } },
        coverLetter: { select: { name: true } }
      }
    })

    // Generate statistics based on type
    let data: any

    switch (type) {
      case 'daily':
        data = generateDailyStats(applications)
        break
      case 'weekly':
        data = generateWeeklyStats(applications)
        break
      case 'monthly':
        data = generateMonthlyStats(applications)
        break
      case 'applications':
        data = generateApplicationsExport(applications)
        break
      default:
        data = generateSummaryStats(applications)
    }

    // Return in requested format
    if (format === 'csv') {
      const csv = convertToCSV(data, type)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="job-stats-${type}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      period,
      type,
      generatedAt: new Date().toISOString(),
      data
    })
  } catch (error) {
    console.error('Error generating stats export:', error)
    return NextResponse.json(
      { error: 'Failed to generate statistics' },
      { status: 500 }
    )
  }
}

function generateDailyStats(applications: any[]): DailyStats[] {
  const dateMap = new Map<string, DailyStats>()

  // Get date range
  if (applications.length === 0) return []

  const minDate = new Date(Math.min(...applications.map(a => new Date(a.createdAt).getTime())))
  const maxDate = new Date()

  // Initialize all dates
  for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    dateMap.set(dateStr, {
      date: dateStr,
      added: 0,
      applied: 0,
      interviewing: 0,
      rejected: 0,
      pending: 0
    })
  }

  // Count applications
  applications.forEach(app => {
    const createdDate = new Date(app.createdAt).toISOString().split('T')[0]
    const stats = dateMap.get(createdDate)
    if (stats) {
      stats.added++
      switch (app.status) {
        case 'APPLIED':
          stats.applied++
          break
        case 'INTERVIEWING':
          stats.interviewing++
          break
        case 'REJECTED':
          stats.rejected++
          break
        case 'PENDING':
        case 'DRAFT':
          stats.pending++
          break
      }
    }
  })

  return Array.from(dateMap.values())
}

function generateWeeklyStats(applications: any[]): WeeklyStats[] {
  const weekMap = new Map<string, WeeklyStats>()

  applications.forEach(app => {
    const date = new Date(app.createdAt)
    const weekStart = getWeekStart(date)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekKey = weekStart.toISOString().split('T')[0]

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        weekStart: weekKey,
        weekEnd: weekEnd.toISOString().split('T')[0],
        added: 0,
        applied: 0,
        interviewing: 0,
        rejected: 0,
        responseRate: 0
      })
    }

    const stats = weekMap.get(weekKey)!
    stats.added++

    switch (app.status) {
      case 'APPLIED':
        stats.applied++
        break
      case 'INTERVIEWING':
        stats.interviewing++
        break
      case 'REJECTED':
        stats.rejected++
        break
    }
  })

  // Calculate response rates
  weekMap.forEach(stats => {
    const responses = stats.interviewing + stats.rejected
    stats.responseRate = stats.applied > 0 ? Math.round((responses / stats.applied) * 100) : 0
  })

  return Array.from(weekMap.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

function generateMonthlyStats(applications: any[]): MonthlyStats[] {
  const monthMap = new Map<string, MonthlyStats>()

  applications.forEach(app => {
    const date = new Date(app.createdAt)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthName = date.toLocaleDateString('en-US', { month: 'long' })

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        month: monthName,
        year: date.getFullYear(),
        added: 0,
        applied: 0,
        interviewing: 0,
        rejected: 0,
        responseRate: 0
      })
    }

    const stats = monthMap.get(monthKey)!
    stats.added++

    switch (app.status) {
      case 'APPLIED':
        stats.applied++
        break
      case 'INTERVIEWING':
        stats.interviewing++
        break
      case 'REJECTED':
        stats.rejected++
        break
    }
  })

  // Calculate response rates
  monthMap.forEach(stats => {
    const responses = stats.interviewing + stats.rejected
    stats.responseRate = stats.applied > 0 ? Math.round((responses / stats.applied) * 100) : 0
  })

  return Array.from(monthMap.values())
}

function generateApplicationsExport(applications: any[]) {
  return applications.map(app => ({
    id: app.id,
    company: app.company,
    role: app.role,
    status: app.status,
    createdAt: app.createdAt,
    appliedDate: app.appliedDate,
    updatedAt: app.updatedAt,
    jobUrl: app.jobUrl || '',
    notes: app.notes || '',
    resume: app.resume?.name || '',
    coverLetter: app.coverLetter?.name || '',
    interviewDate: app.interviewDate || '',
    interviewType: app.interviewType || '',
    interviewRound: app.interviewRound || ''
  }))
}

function generateSummaryStats(applications: any[]) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const totalApplications = applications.length
  const statusCounts: Record<string, number> = {}
  let totalInterviews = 0
  let totalRejections = 0
  let last30DaysApps = 0
  let last7DaysApps = 0

  applications.forEach(app => {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1

    if (app.status === 'INTERVIEWING') totalInterviews++
    if (app.status === 'REJECTED') totalRejections++

    const createdAt = new Date(app.createdAt)
    if (createdAt >= thirtyDaysAgo) last30DaysApps++
    if (createdAt >= sevenDaysAgo) last7DaysApps++
  })

  const appliedCount = (statusCounts['APPLIED'] || 0) + (statusCounts['INTERVIEWING'] || 0) + (statusCounts['REJECTED'] || 0)
  const responseRate = appliedCount > 0 ? Math.round(((totalInterviews + totalRejections) / appliedCount) * 100) : 0
  const interviewRate = appliedCount > 0 ? Math.round((totalInterviews / appliedCount) * 100) : 0

  // Calculate averages
  const avgApplicationsPerWeek = Math.round(last30DaysApps / 4.3)
  const avgApplicationsPerDay = Math.round((last7DaysApps / 7) * 10) / 10

  // Get first and last application dates
  const firstApp = applications.length > 0 ? applications[0].createdAt : null
  const lastApp = applications.length > 0 ? applications[applications.length - 1].createdAt : null

  return {
    overview: {
      totalApplications,
      totalInterviews,
      totalRejections,
      responseRate: `${responseRate}%`,
      interviewRate: `${interviewRate}%`,
      avgApplicationsPerWeek,
      avgApplicationsPerDay,
      firstApplicationDate: firstApp,
      lastApplicationDate: lastApp
    },
    byStatus: statusCounts,
    recentActivity: {
      last7Days: last7DaysApps,
      last30Days: last30DaysApps
    },
    dailyStats: generateDailyStats(applications).slice(-30), // Last 30 days
    weeklyStats: generateWeeklyStats(applications).slice(-12), // Last 12 weeks
    monthlyStats: generateMonthlyStats(applications).slice(-12) // Last 12 months
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
  return new Date(d.setDate(diff))
}

function convertToCSV(data: any, type: string): string {
  if (type === 'applications') {
    const headers = ['ID', 'Company', 'Role', 'Status', 'Created At', 'Applied Date', 'Updated At', 'Job URL', 'Notes', 'Resume', 'Cover Letter', 'Interview Date', 'Interview Type', 'Interview Round']
    const rows = data.map((app: any) => [
      app.id,
      `"${app.company.replace(/"/g, '""')}"`,
      `"${app.role.replace(/"/g, '""')}"`,
      app.status,
      app.createdAt,
      app.appliedDate || '',
      app.updatedAt,
      app.jobUrl,
      `"${(app.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${app.resume}"`,
      `"${app.coverLetter}"`,
      app.interviewDate || '',
      app.interviewType || '',
      app.interviewRound || ''
    ].join(','))
    return [headers.join(','), ...rows].join('\n')
  }

  if (type === 'daily') {
    const headers = ['Date', 'Added', 'Applied', 'Interviewing', 'Rejected', 'Pending']
    const rows = data.map((d: DailyStats) => [d.date, d.added, d.applied, d.interviewing, d.rejected, d.pending].join(','))
    return [headers.join(','), ...rows].join('\n')
  }

  if (type === 'weekly') {
    const headers = ['Week Start', 'Week End', 'Added', 'Applied', 'Interviewing', 'Rejected', 'Response Rate %']
    const rows = data.map((d: WeeklyStats) => [d.weekStart, d.weekEnd, d.added, d.applied, d.interviewing, d.rejected, d.responseRate].join(','))
    return [headers.join(','), ...rows].join('\n')
  }

  if (type === 'monthly') {
    const headers = ['Month', 'Year', 'Added', 'Applied', 'Interviewing', 'Rejected', 'Response Rate %']
    const rows = data.map((d: MonthlyStats) => [d.month, d.year, d.added, d.applied, d.interviewing, d.rejected, d.responseRate].join(','))
    return [headers.join(','), ...rows].join('\n')
  }

  // Summary - convert to flat structure
  const summary = data
  const lines = [
    'Metric,Value',
    `Total Applications,${summary.overview.totalApplications}`,
    `Total Interviews,${summary.overview.totalInterviews}`,
    `Total Rejections,${summary.overview.totalRejections}`,
    `Response Rate,${summary.overview.responseRate}`,
    `Interview Rate,${summary.overview.interviewRate}`,
    `Avg Applications/Week,${summary.overview.avgApplicationsPerWeek}`,
    `Avg Applications/Day,${summary.overview.avgApplicationsPerDay}`,
    `Last 7 Days,${summary.recentActivity.last7Days}`,
    `Last 30 Days,${summary.recentActivity.last30Days}`,
    '',
    'Status,Count',
    ...Object.entries(summary.byStatus).map(([status, count]) => `${status},${count}`)
  ]
  return lines.join('\n')
}
