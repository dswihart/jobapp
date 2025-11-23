'use client'

import { useState, useEffect } from 'react'
import { ArrowDownTrayIcon, ArrowPathIcon, ChartBarIcon, CalendarDaysIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface StatsData {
  overview: {
    totalApplications: number
    totalInterviews: number
    totalRejections: number
    responseRate: string
    interviewRate: string
    avgApplicationsPerWeek: number
    avgApplicationsPerDay: number
    firstApplicationDate: string
    lastApplicationDate: string
  }
  byStatus: Record<string, number>
  recentActivity: {
    last7Days: number
    last30Days: number
  }
  dailyStats: Array<{
    date: string
    added: number
    applied: number
    interviewing: number
    rejected: number
  }>
  weeklyStats: Array<{
    weekStart: string
    weekEnd: string
    added: number
    applied: number
    responseRate: number
  }>
  monthlyStats: Array<{
    month: string
    year: number
    added: number
    applied: number
    responseRate: number
  }>
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('all')
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/stats/export?period=${period}&type=summary`)
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
    DRAFT: 'bg-gray-100 text-gray-800',
    PENDING: 'bg-purple-100 text-purple-800',
    APPLIED: 'bg-blue-100 text-blue-800',
    INTERVIEWING: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    ARCHIVED: 'bg-yellow-100 text-yellow-800'
  }

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
        <div className="text-red-600">{error}</div>
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
              Application Statistics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your job search progress over time
            </p>
          </div>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
          >
            &larr; Back to Dashboard
          </Link>
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
                <div className="text-3xl font-bold text-green-600">
                  {stats.overview.totalInterviews}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Interviews</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.overview.interviewRate}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Interview Rate</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.overview.avgApplicationsPerWeek}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg/Week</div>
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
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Last 7 days</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.recentActivity.last7Days}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Last 30 days</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.recentActivity.last30Days}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Daily average</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.overview.avgApplicationsPerDay}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Response Metrics
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Response Rate</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.overview.responseRate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Interview Rate</span>
                    <span className="text-2xl font-bold text-green-600">
                      {stats.overview.interviewRate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Rejections</span>
                    <span className="text-2xl font-bold text-red-600">
                      {stats.overview.totalRejections}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Trend */}
            {stats.weeklyStats.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Weekly Trend (Last 12 Weeks)
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">Week</th>
                        <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Added</th>
                        <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Applied</th>
                        <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Response %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.weeklyStats.map((week, idx) => (
                        <tr key={idx} className="border-b dark:border-gray-700">
                          <td className="py-2 px-3 text-gray-900 dark:text-white">
                            {week.weekStart}
                          </td>
                          <td className="text-right py-2 px-3 text-gray-900 dark:text-white">
                            {week.added}
                          </td>
                          <td className="text-right py-2 px-3 text-gray-900 dark:text-white">
                            {week.applied}
                          </td>
                          <td className="text-right py-2 px-3">
                            <span className={week.responseRate > 20 ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}>
                              {week.responseRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Export Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ArrowDownTrayIcon className="h-5 w-5" />
                Export Data
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Download your job application data in CSV or JSON format for further analysis.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DocumentTextIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-medium text-gray-900 dark:text-white">Summary</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Overview statistics</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport('summary', 'csv')}
                      disabled={exporting === 'summary-csv'}
                      className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {exporting === 'summary-csv' ? 'Exporting...' : 'CSV'}
                    </button>
                    <button
                      onClick={() => handleExport('summary', 'json')}
                      disabled={exporting === 'summary-json'}
                      className="flex-1 px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      {exporting === 'summary-json' ? 'Exporting...' : 'JSON'}
                    </button>
                  </div>
                </div>

                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDaysIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-medium text-gray-900 dark:text-white">Daily Stats</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Day by day breakdown</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport('daily', 'csv')}
                      disabled={exporting === 'daily-csv'}
                      className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {exporting === 'daily-csv' ? 'Exporting...' : 'CSV'}
                    </button>
                    <button
                      onClick={() => handleExport('daily', 'json')}
                      disabled={exporting === 'daily-json'}
                      className="flex-1 px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      {exporting === 'daily-json' ? 'Exporting...' : 'JSON'}
                    </button>
                  </div>
                </div>

                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ChartBarIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-medium text-gray-900 dark:text-white">Weekly Stats</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Week by week trends</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport('weekly', 'csv')}
                      disabled={exporting === 'weekly-csv'}
                      className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {exporting === 'weekly-csv' ? 'Exporting...' : 'CSV'}
                    </button>
                    <button
                      onClick={() => handleExport('weekly', 'json')}
                      disabled={exporting === 'weekly-json'}
                      className="flex-1 px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      {exporting === 'weekly-json' ? 'Exporting...' : 'JSON'}
                    </button>
                  </div>
                </div>

                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DocumentTextIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-medium text-gray-900 dark:text-white">All Applications</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Full application data</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport('applications', 'csv')}
                      disabled={exporting === 'applications-csv'}
                      className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {exporting === 'applications-csv' ? 'Exporting...' : 'CSV'}
                    </button>
                    <button
                      onClick={() => handleExport('applications', 'json')}
                      disabled={exporting === 'applications-json'}
                      className="flex-1 px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      {exporting === 'applications-json' ? 'Exporting...' : 'JSON'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
