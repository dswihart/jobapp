'use client'

import { useState, useEffect } from 'react'
import { ArrowDownTrayIcon, ArrowPathIcon, ChartBarIcon, CalendarDaysIcon, DocumentTextIcon, FunnelIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import SourceAnalytics from '@/components/SourceAnalytics'

interface Application {
  id: string
  appliedDate?: string
}

interface UserData {
  id?: string
  dailyApplicationGoal?: number
}

interface StatsData {
  overview: {
    totalApplications: number
    activeApplications: number
    submitted: number
    gotResponse: number
    interviews: number
    rejections: number
    pending: number
    archived: number
  }
  rates: {
    responseRate: string
    interviewRate: string
    rejectionRate: string
    submissionRate: string
  }
  averages: {
    applicationsPerDay: number
    applicationsPerWeek: number
    avgDaysToResponse: number | null
    activeDays: number
    activeWeeks: number
  }
  recentActivity: {
    last14Days: number
    last7Days: number
    last30Days: number
    last90Days: number
  }
  byStatus: Record<string, number>
  dateRange: {
    firstApplication: string | null
    lastApplication: string | null
  }
  funnel: {
    funnel: Record<string, number>
    conversionRates: Record<string, number | string>
    responseMetrics: {
      avgDaysToResponse: number | null
      medianDaysToResponse: number | null
      applicationsWithResponse: number
      applicationsAwaitingResponse: number
    }
    statusBreakdown: Array<{ status: string; count: number; percentage: number }>
  }
  weeklyStats: Array<{
    weekStart: string
    weekEnd: string
    added: number
    applied: number
    responseRate: number
    interviewRate: number
  }>
  monthlyStats: Array<{
    month: string
    year: number
    added: number
    applied: number
    responseRate: number
  }>
}

function getDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Map the selected Time Period to the number of days shown in the goal grid.
// Default (All Time / unrecognized) keeps the focused 16-day recent view.
function periodToGridDays(period: string): number {
  switch (period) {
    case '30days': return 30
    case '90days': return 90
    case 'year': return 365
    default: return 16
  }
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('all')
  const [exporting, setExporting] = useState<string | null>(null)

  // Goal tracker state
  const [applications, setApplications] = useState<Application[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const [pastDaysGoals, setPastDaysGoals] = useState<Array<{ date: string; count: number; interviews: number; goalMet: boolean }>>([])
  const [last14DaysTotal, setLast14DaysTotal] = useState(0)
  const [last14DaysInterviews, setLast14DaysInterviews] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [todayInterviews, setTodayInterviews] = useState(0)

  useEffect(() => {
    fetchStats()
  }, [period])

  useEffect(() => {
    fetchApplications()
    fetchUser()
  }, [])

  // Build the daily goal grid from the SAME endpoint the before-login page uses
  // (/api/stats/user/[userId]) so the counting/timezone logic matches exactly.
  // The window follows the selected Time Period (default 16 days), so picking
  // "Last 30 Days" shows a 30-day goal grid, etc.
  const gridDays = periodToGridDays(period)
  useEffect(() => {
    const userId = userData?.id
    if (!userId) return
    const dailyGoal = userData?.dailyApplicationGoal ?? 4
    let cancelled = false

    ;(async () => {
      try {
        const response = await fetch(`/api/stats/user/${userId}?days=${gridDays}`, { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        const dailyStats: Array<{ date: string; count: number; interviews?: number }> = Array.isArray(data?.dailyStats) ? data.dailyStats : []
        // The daily goal counts applications submitted AND interviews that day.
        const goalData = dailyStats.map(day => ({
          date: day.date,
          count: day.count || 0,
          interviews: day.interviews || 0,
          goalMet: ((day.count || 0) + (day.interviews || 0)) >= dailyGoal
        }))
        if (cancelled) return
        setPastDaysGoals(goalData)
        setLast14DaysTotal(goalData.reduce((sum, day) => sum + day.count, 0))
        setLast14DaysInterviews(goalData.reduce((sum, day) => sum + day.interviews, 0))
        setTodayCount(goalData.length ? goalData[goalData.length - 1].count : 0)
        setTodayInterviews(goalData.length ? goalData[goalData.length - 1].interviews : 0)
      } catch (error) {
        console.error('Failed to load daily stats:', error)
      }
    })()

    return () => { cancelled = true }
  }, [userData, gridDays])

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications', { cache: 'no-store' })
      const data = await response.json()
      if (Array.isArray(data)) setApplications(data)
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    }
  }

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user', { cache: 'no-store' })
      const data = await response.json()
      setUserData(data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  }

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/stats/export?period=${period}&type=summary`, { cache: 'no-store' })
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      } else {
        setError(result.error || 'Failed to load statistics')
      }
    } catch (err) {
      setError('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (type: string, format: string) => {
    setExporting(`${type}-${format}`)
    try {
      const response = await fetch(`/api/stats/export?period=${period}&type=${type}&format=${format}`)

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `job-stats-${type}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `job-stats-${type}-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(null)
    }
  }

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    PENDING: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    APPLIED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    INTERVIEWING: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    ARCHIVED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  }

  const dailyGoal = userData?.dailyApplicationGoal ?? 4
  const todayProgress = todayCount + todayInterviews
  const last14DaysProgress = last14DaysTotal + last14DaysInterviews

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <ArrowPathIcon className="h-6 w-6 animate-spin" />
          <span>Loading statistics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button onClick={fetchStats} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ChartBarIcon className="h-7 w-7" />
              Statistics &amp; Goals
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your job search progress and daily goals
            </p>
          </div>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Daily Goal Tracker */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          {/* Today's count + 14-day total header */}
          <div className="grid grid-cols-2 divide-x dark:divide-gray-700">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">Today</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1.5">
                    <span className={`text-3xl font-bold ${todayProgress >= dailyGoal ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                      {todayCount}
                    </span>
                    <span className="text-xs text-gray-500">applied</span>
                    {todayInterviews > 0 && (
                      <span className="text-sm" title={`${todayInterviews} interview${todayInterviews === 1 ? '' : 's'} today`}>
                        🎙️ {todayInterviews}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Goal {dailyGoal}{todayProgress >= dailyGoal ? ' · met 🎉' : ` · ${todayProgress}/${dailyGoal}`}</div>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">Last {gridDays} Days</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Applications &amp; interviews</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1.5">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {last14DaysTotal}
                    </span>
                    <span className="text-xs text-gray-500">applied</span>
                    {last14DaysInterviews > 0 && (
                      <span className="text-sm" title={`${last14DaysInterviews} interview${last14DaysInterviews === 1 ? '' : 's'}`}>
                        🎙️ {last14DaysInterviews}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400">Goal {dailyGoal * gridDays} · {last14DaysProgress} toward goal</div>
                </div>
              </div>
            </div>
          </div>

          {/* 14-day grid */}
          <div className="border-t dark:border-gray-700 p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">
              Past {gridDays} Days Goal Tracker ({dailyGoal}/day · applications + interviews)
            </h3>
            <div className="grid grid-cols-7 gap-2 sm:gap-3 max-w-6xl mx-auto">
              {pastDaysGoals.map((day, index) => {
                const dateObj = new Date(day.date)
                const dayNum = dateObj.toLocaleDateString("en-US", { day: "numeric" })
                const monthShort = dateObj.toLocaleDateString("en-US", { month: "short" })
                const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" })
                const isToday = dateObj.toDateString() === new Date().toDateString()

                return (
                  <div
                    key={index}
                    title={`${weekday} ${monthShort} ${dayNum}: ${day.count} application${day.count === 1 ? '' : 's'} + ${day.interviews} interview${day.interviews === 1 ? '' : 's'} = ${day.count + day.interviews} toward goal of ${dailyGoal}`}
                    className={`min-h-[88px] sm:min-h-[124px] px-2 py-3 sm:px-3 sm:py-4 flex flex-col items-center justify-center rounded-xl text-center border shadow-sm ${isToday ? "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1 dark:ring-offset-gray-800 " : ""}${
                      day.goalMet
                        ? "bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600"
                        : isToday
                          ? "bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-400"
                          : (day.count + day.interviews) >= 2
                            ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600"
                            : "bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600"
                    }`}
                  >
                    <div className="text-[9px] sm:text-xs text-gray-600 dark:text-gray-400">{weekday}</div>
                    <div className="text-[9px] sm:text-xs text-gray-600 dark:text-gray-400">{monthShort}</div>
                    <div className="text-sm sm:text-xl font-bold text-gray-900 dark:text-gray-100">{dayNum}</div>
                    <div className={`text-base sm:text-2xl font-bold ${
                      day.goalMet
                        ? "text-green-700 dark:text-green-400"
                        : (day.count + day.interviews) >= 2
                          ? "text-yellow-700 dark:text-yellow-400"
                          : "text-red-700 dark:text-red-400"
                    }`}>
                      {day.count}
                    </div>
                    {day.interviews > 0 && (
                      <div
                        className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[9px] sm:text-xs font-semibold leading-none"
                        title={`includes ${day.interviews} interview${day.interviews === 1 ? '' : 's'}`}
                      >
                        🎙️ {day.interviews}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Period Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Period:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Time' },
                { value: '30days', label: 'Last 30 Days' },
                { value: '90days', label: 'Last 90 Days' },
                { value: 'year', label: 'Last Year' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    period === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchStats}
              className="ml-auto p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Refresh"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {stats && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.overview.totalApplications}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Applications</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.overview.submitted}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Submitted</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-3xl font-bold text-green-600">
                  {stats.overview.interviews}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Interviews</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.rates.interviewRate}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Interview Rate</div>
              </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {/* Activity Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Activity
                </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Last 14 days</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats.recentActivity.last14Days}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Last 30 days</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats.recentActivity.last30Days}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Last 90 days</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats.recentActivity.last90Days}
                    </span>
                  </div>
                  <hr className="dark:border-gray-700" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Avg per day</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats.averages.applicationsPerDay}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Avg per week</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats.averages.applicationsPerWeek}
                    </span>
                  </div>
                </div>
              </div>

              {/* Response Metrics */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Response Metrics
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Response Rate</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats.rates.responseRate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Interview Rate</span>
                    <span className="text-xl font-bold text-green-600">
                      {stats.rates.interviewRate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Rejection Rate</span>
                    <span className="text-xl font-bold text-red-600">
                      {stats.rates.rejectionRate}
                    </span>
                  </div>
                  <hr className="dark:border-gray-700" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Avg days to response</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats.averages.avgDaysToResponse ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Awaiting response</span>
                    <span className="text-xl font-bold text-blue-600">
                      {stats.funnel?.responseMetrics?.applicationsAwaitingResponse ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conversion Funnel */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5" />
                  Conversion Funnel
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Draft &rarr; Submitted</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats.funnel?.conversionRates?.draftToApplied ?? 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Submitted &rarr; Response</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats.funnel?.conversionRates?.appliedToResponse ?? 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Submitted &rarr; Interview</span>
                    <span className="text-xl font-bold text-green-600">
                      {stats.funnel?.conversionRates?.appliedToInterview ?? 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Applications by Status
              </h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.byStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className={`px-4 py-2 rounded-lg ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}
                  >
                    <span className="font-medium">{status}</span>
                    <span className="ml-2 font-bold">{count}</span>
                    {stats.overview.totalApplications > 0 && (
                      <span className="ml-1 text-xs opacity-75">
                        ({Math.round((count / stats.overview.totalApplications) * 100)}%)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Trend */}
            {stats.weeklyStats && stats.weeklyStats.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Weekly Trend
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">Week</th>
                        <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Added</th>
                        <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Applied</th>
                        <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Response %</th>
                        <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Interview %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.weeklyStats.slice(-12).map((week, idx) => (
                        <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="py-2 px-3 text-gray-900 dark:text-white">
                            {week.weekStart}
                          </td>
                          <td className="text-right py-2 px-3 text-gray-900 dark:text-white font-medium">
                            {week.added}
                          </td>
                          <td className="text-right py-2 px-3 text-blue-600 font-medium">
                            {week.applied}
                          </td>
                          <td className="text-right py-2 px-3">
                            <span className={week.responseRate > 20 ? 'text-green-600 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                              {week.responseRate}%
                            </span>
                          </td>
                          <td className="text-right py-2 px-3">
                            <span className={week.interviewRate > 10 ? 'text-green-600 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                              {week.interviewRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Date Range Info */}
            {stats.dateRange.firstApplication && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6 text-sm text-gray-600 dark:text-gray-400">
                <strong>Date Range:</strong> {stats.dateRange.firstApplication} to {stats.dateRange.lastApplication}
                {' \u2022 '}<strong>Active:</strong> {stats.averages.activeDays} days ({stats.averages.activeWeeks} weeks)
              </div>
            )}

            {/* Export Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ArrowDownTrayIcon className="h-5 w-5" />
                Export Data
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Download your job application data for further analysis.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { type: 'summary', label: 'Summary', desc: 'Overview stats', icon: DocumentTextIcon },
                  { type: 'daily', label: 'Daily', desc: 'Day by day', icon: CalendarDaysIcon },
                  { type: 'weekly', label: 'Weekly', desc: 'Week trends', icon: ChartBarIcon },
                  { type: 'funnel', label: 'Funnel', desc: 'Conversion data', icon: FunnelIcon },
                  { type: 'applications', label: 'All Data', desc: 'Full export', icon: DocumentTextIcon }
                ].map(({ type, label, desc, icon: Icon }) => (
                  <div key={type} className="border dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="font-medium text-gray-900 dark:text-white">{label}</h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{desc}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExport(type, 'csv')}
                        disabled={exporting === `${type}-csv`}
                        className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {exporting === `${type}-csv` ? '...' : 'CSV'}
                      </button>
                      <button
                        onClick={() => handleExport(type, 'json')}
                        disabled={exporting === `${type}-json`}
                        className="flex-1 px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                      >
                        {exporting === `${type}-json` ? '...' : 'JSON'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Source Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Source Performance</h2>
              <SourceAnalytics />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
