import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper to get date string in local timezone (avoids UTC conversion issues)
function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to get start of day in local timezone
function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Helper to get days between two dates
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs((date2.getTime() - date1.getTime()) / oneDay))
}

interface Application {
  id: string
  company: string
  role: string
  status: string
  createdAt: Date
  appliedDate: Date | null
  updatedAt: Date
  jobUrl: string | null
  notes: string | null
  interviewDate: Date | null
  interviewType: string | null
  interviewRound: number | null
  resume?: { name: string } | null
  coverLetter?: { name: string } | null
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
    const format = searchParams.get('format') || 'json'
    const period = searchParams.get('period') || 'all'
    const type = searchParams.get('type') || 'summary'

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
    }) as Application[]

    // Generate statistics based on type
    let data: any

    switch (type) {
      case 'daily':
        data = generateDailyStats(applications, startDate)
        break
      case 'weekly':
        data = generateWeeklyStats(applications, startDate)
        break
      case 'monthly':
        data = generateMonthlyStats(applications)
        break
      case 'applications':
        data = generateApplicationsExport(applications)
        break
      case 'funnel':
        data = generateFunnelStats(applications)
        break
      default:
        data = generateSummaryStats(applications, startDate)
    }

    // Return in requested format
    if (format === 'csv') {
      const csv = convertToCSV(data, type)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="job-stats-${type}-${toDateString(new Date())}.csv"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      period,
      type,
      generatedAt: new Date().toISOString(),
      totalRecords: applications.length,
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

function generateDailyStats(applications: Application[], startDate: Date | null) {
  if (applications.length === 0) return []

  const dateMap = new Map<string, {
    date: string
    dayOfWeek: string
    added: number
    applied: number
    interviews: number
    rejections: number
    pending: number
    cumulative: {
      total: number
      applied: number
      interviewing: number
      rejected: number
    }
  }>()

  // Determine date range
  const minDate = startDate || startOfDay(new Date(applications[0].createdAt))
  const maxDate = startOfDay(new Date())

  // Initialize all dates in range
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
    const dateStr = toDateString(d)
    dateMap.set(dateStr, {
      date: dateStr,
      dayOfWeek: dayNames[d.getDay()],
      added: 0,
      applied: 0,
      interviews: 0,
      rejections: 0,
      pending: 0,
      cumulative: { total: 0, applied: 0, interviewing: 0, rejected: 0 }
    })
  }

  // Count applications added on each date (based on createdAt)
  applications.forEach(app => {
    const createdDate = toDateString(new Date(app.createdAt))
    const stats = dateMap.get(createdDate)
    if (stats) {
      stats.added++
    }

    // Count applications applied on each date (based on appliedDate)
    if (app.appliedDate) {
      const appliedDate = toDateString(new Date(app.appliedDate))
      const appliedStats = dateMap.get(appliedDate)
      if (appliedStats) {
        appliedStats.applied++
      }
    }

    // For interview scheduling
    if (app.interviewDate) {
      const interviewDate = toDateString(new Date(app.interviewDate))
      const interviewStats = dateMap.get(interviewDate)
      if (interviewStats) {
        interviewStats.interviews++
      }
    }
  })

  // Calculate cumulative totals
  const result = Array.from(dateMap.values())
  let cumTotal = 0, cumApplied = 0, cumInterviewing = 0, cumRejected = 0

  // Count current statuses for cumulative tracking
  const statusByDate = new Map<string, { total: number, applied: number, interviewing: number, rejected: number }>()

  applications.forEach(app => {
    const createdDate = toDateString(new Date(app.createdAt))
    if (!statusByDate.has(createdDate)) {
      statusByDate.set(createdDate, { total: 0, applied: 0, interviewing: 0, rejected: 0 })
    }
    const s = statusByDate.get(createdDate)!
    s.total++
    if (app.status === 'APPLIED') s.applied++
    if (app.status === 'INTERVIEWING') s.interviewing++
    if (app.status === 'REJECTED') s.rejected++
  })

  result.forEach(day => {
    const dayStatus = statusByDate.get(day.date)
    if (dayStatus) {
      cumTotal += dayStatus.total
      cumApplied += dayStatus.applied
      cumInterviewing += dayStatus.interviewing
      cumRejected += dayStatus.rejected
    }
    day.cumulative = {
      total: cumTotal,
      applied: cumApplied,
      interviewing: cumInterviewing,
      rejected: cumRejected
    }
  })

  return result
}

function generateWeeklyStats(applications: Application[], startDate: Date | null) {
  if (applications.length === 0) return []

  const weekMap = new Map<string, {
    weekStart: string
    weekEnd: string
    weekNumber: number
    added: number
    applied: number
    interviewing: number
    rejected: number
    pending: number
    responseRate: number
    interviewRate: number
  }>()

  applications.forEach(app => {
    const date = new Date(app.createdAt)
    const weekStart = getWeekStart(date)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekKey = toDateString(weekStart)

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        weekStart: weekKey,
        weekEnd: toDateString(weekEnd),
        weekNumber: getWeekNumber(weekStart),
        added: 0,
        applied: 0,
        interviewing: 0,
        rejected: 0,
        pending: 0,
        responseRate: 0,
        interviewRate: 0
      })
    }

    const stats = weekMap.get(weekKey)!
    stats.added++

    // Count current status
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
  })

  // Calculate rates
  weekMap.forEach(stats => {
    const submitted = stats.applied + stats.interviewing + stats.rejected
    const responses = stats.interviewing + stats.rejected
    stats.responseRate = submitted > 0 ? Math.round((responses / submitted) * 100) : 0
    stats.interviewRate = submitted > 0 ? Math.round((stats.interviewing / submitted) * 100) : 0
  })

  return Array.from(weekMap.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

function generateMonthlyStats(applications: Application[]) {
  if (applications.length === 0) return []

  const monthMap = new Map<string, {
    monthKey: string
    month: string
    year: number
    added: number
    applied: number
    interviewing: number
    rejected: number
    pending: number
    archived: number
    responseRate: number
    interviewRate: number
    avgDaysToResponse: number | null
  }>()

  applications.forEach(app => {
    const date = new Date(app.createdAt)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthName = date.toLocaleDateString('en-US', { month: 'long' })

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        monthKey,
        month: monthName,
        year: date.getFullYear(),
        added: 0,
        applied: 0,
        interviewing: 0,
        rejected: 0,
        pending: 0,
        archived: 0,
        responseRate: 0,
        interviewRate: 0,
        avgDaysToResponse: null
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
      case 'PENDING':
      case 'DRAFT':
        stats.pending++
        break
      case 'ARCHIVED':
        stats.archived++
        break
    }
  })

  // Calculate rates
  monthMap.forEach(stats => {
    const submitted = stats.applied + stats.interviewing + stats.rejected
    const responses = stats.interviewing + stats.rejected
    stats.responseRate = submitted > 0 ? Math.round((responses / submitted) * 100) : 0
    stats.interviewRate = submitted > 0 ? Math.round((stats.interviewing / submitted) * 100) : 0
  })

  return Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

function generateFunnelStats(applications: Application[]) {
  const total = applications.length
  const draft = applications.filter(a => a.status === 'DRAFT').length
  const pending = applications.filter(a => a.status === 'PENDING').length
  const applied = applications.filter(a => a.status === 'APPLIED').length
  const interviewing = applications.filter(a => a.status === 'INTERVIEWING').length
  const rejected = applications.filter(a => a.status === 'REJECTED').length
  const archived = applications.filter(a => a.status === 'ARCHIVED').length

  const submitted = applied + interviewing + rejected
  const gotResponse = interviewing + rejected

  // Calculate time metrics
  const responseTimes: number[] = []
  applications.forEach(app => {
    if (app.appliedDate && (app.status === 'INTERVIEWING' || app.status === 'REJECTED')) {
      const days = daysBetween(new Date(app.appliedDate), new Date(app.updatedAt))
      if (days < 180) { // Exclude outliers > 6 months
        responseTimes.push(days)
      }
    }
  })

  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null

  const medianResponseTime = responseTimes.length > 0
    ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
    : null

  return {
    funnel: {
      total,
      draft,
      pending,
      applied,
      interviewing,
      rejected,
      archived
    },
    conversionRates: {
      draftToApplied: total > 0 ? Math.round((submitted / total) * 100) : 0,
      appliedToResponse: submitted > 0 ? Math.round((gotResponse / submitted) * 100) : 0,
      appliedToInterview: submitted > 0 ? Math.round((interviewing / submitted) * 100) : 0,
      interviewToOffer: 'N/A (offers not tracked)'
    },
    responseMetrics: {
      avgDaysToResponse: avgResponseTime,
      medianDaysToResponse: medianResponseTime,
      applicationsWithResponse: gotResponse,
      applicationsAwaitingResponse: applied
    },
    statusBreakdown: [
      { status: 'DRAFT', count: draft, percentage: total > 0 ? Math.round((draft / total) * 100) : 0 },
      { status: 'PENDING', count: pending, percentage: total > 0 ? Math.round((pending / total) * 100) : 0 },
      { status: 'APPLIED', count: applied, percentage: total > 0 ? Math.round((applied / total) * 100) : 0 },
      { status: 'INTERVIEWING', count: interviewing, percentage: total > 0 ? Math.round((interviewing / total) * 100) : 0 },
      { status: 'REJECTED', count: rejected, percentage: total > 0 ? Math.round((rejected / total) * 100) : 0 },
      { status: 'ARCHIVED', count: archived, percentage: total > 0 ? Math.round((archived / total) * 100) : 0 }
    ]
  }
}

function generateApplicationsExport(applications: Application[]) {
  return applications.map(app => ({
    id: app.id,
    company: app.company,
    role: app.role,
    status: app.status,
    createdAt: toDateString(new Date(app.createdAt)),
    appliedDate: app.appliedDate ? toDateString(new Date(app.appliedDate)) : '',
    updatedAt: toDateString(new Date(app.updatedAt)),
    daysSinceCreated: daysBetween(new Date(app.createdAt), new Date()),
    daysSinceApplied: app.appliedDate ? daysBetween(new Date(app.appliedDate), new Date()) : null,
    jobUrl: app.jobUrl || '',
    notes: app.notes || '',
    resume: app.resume?.name || '',
    coverLetter: app.coverLetter?.name || '',
    interviewDate: app.interviewDate ? toDateString(new Date(app.interviewDate)) : '',
    interviewType: app.interviewType || '',
    interviewRound: app.interviewRound || ''
  }))
}

function generateSummaryStats(applications: Application[], startDate: Date | null) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Basic counts
  const totalApplications = applications.length
  const statusCounts: Record<string, number> = {
    DRAFT: 0, PENDING: 0, APPLIED: 0, INTERVIEWING: 0, REJECTED: 0, ARCHIVED: 0
  }

  let last7DaysApps = 0
  let last30DaysApps = 0
  let last90DaysApps = 0
  let appsWithAppliedDate = 0

  applications.forEach(app => {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1

    const createdAt = new Date(app.createdAt)
    if (createdAt >= sevenDaysAgo) last7DaysApps++
    if (createdAt >= thirtyDaysAgo) last30DaysApps++
    if (createdAt >= ninetyDaysAgo) last90DaysApps++
    if (app.appliedDate) appsWithAppliedDate++
  })

  // Calculate accurate metrics
  const submitted = statusCounts.APPLIED + statusCounts.INTERVIEWING + statusCounts.REJECTED
  const gotResponse = statusCounts.INTERVIEWING + statusCounts.REJECTED

  const responseRate = submitted > 0 ? Math.round((gotResponse / submitted) * 100) : 0
  const interviewRate = submitted > 0 ? Math.round((statusCounts.INTERVIEWING / submitted) * 100) : 0
  const rejectionRate = submitted > 0 ? Math.round((statusCounts.REJECTED / submitted) * 100) : 0

  // Time-based averages
  const activeDays = applications.length > 0
    ? daysBetween(new Date(applications[0].createdAt), now) + 1
    : 0
  const activeWeeks = Math.max(1, Math.ceil(activeDays / 7))

  const avgPerDay = activeDays > 0 ? Math.round((totalApplications / activeDays) * 10) / 10 : 0
  const avgPerWeek = Math.round(totalApplications / activeWeeks)

  // First and last dates
  const firstApp = applications.length > 0 ? applications[0].createdAt : null
  const lastApp = applications.length > 0 ? applications[applications.length - 1].createdAt : null

  // Response time calculation
  const responseTimes: number[] = []
  applications.forEach(app => {
    if (app.appliedDate && (app.status === 'INTERVIEWING' || app.status === 'REJECTED')) {
      const days = daysBetween(new Date(app.appliedDate), new Date(app.updatedAt))
      if (days < 180) responseTimes.push(days)
    }
  })
  const avgResponseDays = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null

  return {
    overview: {
      totalApplications,
      activeApplications: statusCounts.APPLIED + statusCounts.INTERVIEWING,
      submitted,
      gotResponse,
      interviews: statusCounts.INTERVIEWING,
      rejections: statusCounts.REJECTED,
      pending: statusCounts.DRAFT + statusCounts.PENDING,
      archived: statusCounts.ARCHIVED
    },
    rates: {
      responseRate: `${responseRate}%`,
      interviewRate: `${interviewRate}%`,
      rejectionRate: `${rejectionRate}%`,
      submissionRate: totalApplications > 0 ? `${Math.round((submitted / totalApplications) * 100)}%` : '0%'
    },
    averages: {
      applicationsPerDay: avgPerDay,
      applicationsPerWeek: avgPerWeek,
      avgDaysToResponse: avgResponseDays,
      activeDays,
      activeWeeks
    },
    recentActivity: {
      last7Days: last7DaysApps,
      last30Days: last30DaysApps,
      last90Days: last90DaysApps
    },
    byStatus: statusCounts,
    dateRange: {
      firstApplication: firstApp ? toDateString(new Date(firstApp)) : null,
      lastApplication: lastApp ? toDateString(new Date(lastApp)) : null,
      periodStart: startDate ? toDateString(startDate) : null,
      periodEnd: toDateString(now)
    },
    dailyStats: generateDailyStats(applications, startDate).slice(-30),
    weeklyStats: generateWeeklyStats(applications, startDate).slice(-12),
    monthlyStats: generateMonthlyStats(applications).slice(-12),
    funnel: generateFunnelStats(applications)
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function getWeekNumber(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function convertToCSV(data: any, type: string): string {
  if (type === 'applications') {
    const headers = ['ID', 'Company', 'Role', 'Status', 'Created', 'Applied', 'Updated', 'Days Since Created', 'Days Since Applied', 'Job URL', 'Notes', 'Resume', 'Cover Letter', 'Interview Date', 'Interview Type', 'Round']
    const rows = data.map((app: any) => [
      app.id,
      `"${(app.company || '').replace(/"/g, '""')}"`,
      `"${(app.role || '').replace(/"/g, '""')}"`,
      app.status,
      app.createdAt,
      app.appliedDate,
      app.updatedAt,
      app.daysSinceCreated,
      app.daysSinceApplied || '',
      `"${app.jobUrl}"`,
      `"${(app.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${app.resume}"`,
      `"${app.coverLetter}"`,
      app.interviewDate,
      app.interviewType,
      app.interviewRound
    ].join(','))
    return [headers.join(','), ...rows].join('\n')
  }

  if (type === 'daily') {
    const headers = ['Date', 'Day', 'Added', 'Applied', 'Interviews', 'Rejections', 'Pending', 'Cumulative Total', 'Cumulative Applied', 'Cumulative Interviewing', 'Cumulative Rejected']
    const rows = data.map((d: any) => [
      d.date, d.dayOfWeek, d.added, d.applied, d.interviews, d.rejections, d.pending,
      d.cumulative.total, d.cumulative.applied, d.cumulative.interviewing, d.cumulative.rejected
    ].join(','))
    return [headers.join(','), ...rows].join('\n')
  }

  if (type === 'weekly') {
    const headers = ['Week Start', 'Week End', 'Week #', 'Added', 'Applied', 'Interviewing', 'Rejected', 'Pending', 'Response Rate %', 'Interview Rate %']
    const rows = data.map((d: any) => [
      d.weekStart, d.weekEnd, d.weekNumber, d.added, d.applied, d.interviewing, d.rejected, d.pending, d.responseRate, d.interviewRate
    ].join(','))
    return [headers.join(','), ...rows].join('\n')
  }

  if (type === 'monthly') {
    const headers = ['Month', 'Year', 'Added', 'Applied', 'Interviewing', 'Rejected', 'Pending', 'Archived', 'Response Rate %', 'Interview Rate %']
    const rows = data.map((d: any) => [
      d.month, d.year, d.added, d.applied, d.interviewing, d.rejected, d.pending, d.archived, d.responseRate, d.interviewRate
    ].join(','))
    return [headers.join(','), ...rows].join('\n')
  }

  if (type === 'funnel') {
    const lines = [
      'Stage,Count,Percentage',
      ...data.statusBreakdown.map((s: any) => `${s.status},${s.count},${s.percentage}%`),
      '',
      'Conversion Metric,Value',
      `Draft to Applied,${data.conversionRates.draftToApplied}%`,
      `Applied to Response,${data.conversionRates.appliedToResponse}%`,
      `Applied to Interview,${data.conversionRates.appliedToInterview}%`,
      '',
      'Response Metric,Value',
      `Avg Days to Response,${data.responseMetrics.avgDaysToResponse || 'N/A'}`,
      `Median Days to Response,${data.responseMetrics.medianDaysToResponse || 'N/A'}`,
      `With Response,${data.responseMetrics.applicationsWithResponse}`,
      `Awaiting Response,${data.responseMetrics.applicationsAwaitingResponse}`
    ]
    return lines.join('\n')
  }

  // Summary
  const s = data
  const lines = [
    'OVERVIEW',
    'Metric,Value',
    `Total Applications,${s.overview.totalApplications}`,
    `Active Applications,${s.overview.activeApplications}`,
    `Submitted,${s.overview.submitted}`,
    `Got Response,${s.overview.gotResponse}`,
    `Interviews,${s.overview.interviews}`,
    `Rejections,${s.overview.rejections}`,
    `Pending/Draft,${s.overview.pending}`,
    `Archived,${s.overview.archived}`,
    '',
    'RATES',
    `Response Rate,${s.rates.responseRate}`,
    `Interview Rate,${s.rates.interviewRate}`,
    `Rejection Rate,${s.rates.rejectionRate}`,
    `Submission Rate,${s.rates.submissionRate}`,
    '',
    'AVERAGES',
    `Applications/Day,${s.averages.applicationsPerDay}`,
    `Applications/Week,${s.averages.applicationsPerWeek}`,
    `Avg Days to Response,${s.averages.avgDaysToResponse || 'N/A'}`,
    `Active Days,${s.averages.activeDays}`,
    `Active Weeks,${s.averages.activeWeeks}`,
    '',
    'RECENT ACTIVITY',
    `Last 7 Days,${s.recentActivity.last7Days}`,
    `Last 30 Days,${s.recentActivity.last30Days}`,
    `Last 90 Days,${s.recentActivity.last90Days}`,
    '',
    'DATE RANGE',
    `First Application,${s.dateRange.firstApplication || 'N/A'}`,
    `Last Application,${s.dateRange.lastApplication || 'N/A'}`,
    '',
    'BY STATUS',
    ...Object.entries(s.byStatus).map(([status, count]) => `${status},${count}`)
  ]
  return lines.join('\n')
}
