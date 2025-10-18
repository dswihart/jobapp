'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import ApplicationsByDateChart from '@/components/ApplicationsByDateChart'

interface Stats {
  total: number
  byStatus: Record<string, number>
  dailyStats?: Array<{
    date: string
    count: number
    dayLabel: string
  }>
}

// Array of motivational messages that rotate daily
const motivationalMessages = [
  "Keep up the momentum!",
  "Every application brings you closer to your dream job!",
  "You're doing great! Stay consistent!",
  "Your persistence will pay off!",
  "Today is a new opportunity!",
  "Believe in yourself and your journey!",
  "Small steps lead to big achievements!",
  "Stay positive and keep pushing forward!",
  "Your next opportunity is just around the corner!",
  "Success is the sum of small efforts repeated daily!",
  "Don't stop until you're proud!",
  "Great things take time - keep going!",
  "You're one application closer to success!",
  "Stay focused on your goals!",
  "Your dedication is inspiring!",
  "Every no brings you closer to a yes!",
  "Progress, not perfection!",
  "Keep your head up and keep moving forward!",
  "You've got this!",
  "Consistency is key to success!",
  "Your future self will thank you!",
  "Make today count!",
  "Dream big, work hard, stay focused!",
  "You're building your future, one application at a time!",
  "Keep pushing - opportunities are coming!",
  "Your hard work will be rewarded!",
  "Stay committed to your goals!",
  "Never give up on your dreams!",
  "You're making excellent progress!",
  "Keep going - you're unstoppable!"
];

// Function to get day of year (for rotating messages)
const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

// Calculate enhanced metrics from stats
const getEnhancedMetrics = (stats: Stats | null) => {
  if (!stats) return null

  const applied = stats.byStatus.APPLIED || 0
  const interviewing = stats.byStatus.INTERVIEWING || 0
  const rejected = stats.byStatus.REJECTED || 0
  const draft = stats.byStatus.DRAFT || 0

  const activePipeline = applied + interviewing
  const responseRate = applied > 0 ? Math.round((interviewing / applied) * 100) : 0
  const rejectionRate = (applied + rejected) > 0 ? Math.round((rejected / (applied + rejected)) * 100) : 0

  return {
    activePipeline,
    responseRate,
    rejectionRate
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [dailyMessage, setDailyMessage] = useState('')

  useEffect(() => {
    // Set daily motivational message based on day of year
    const dayOfYear = getDayOfYear();
    const messageIndex = dayOfYear % motivationalMessages.length;
    setDailyMessage(motivationalMessages[messageIndex]);

    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const enhancedMetrics = getEnhancedMetrics(stats)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Statistics Header */}
      {stats && enhancedMetrics && (
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <div className="text-center mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-50 flex items-center justify-center gap-2">
                <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                Job Application Tracker
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                Community Statistics & Insights
              </p>
            </div>

            {/* Daily Motivational Banner */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg shadow-lg mb-4 sm:mb-6 p-3 sm:p-4">
              <p className="text-center text-sm sm:text-lg font-semibold text-white">{dailyMessage}</p>
            </div>

            {/* Enhanced Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 sm:mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3 sm:p-4 text-center border border-blue-200 dark:border-blue-800">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{enhancedMetrics.activePipeline}</div>
                <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mt-1 font-medium">Active Pipeline</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Applications in progress</div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3 sm:p-4 text-center border border-green-200 dark:border-green-800">
                <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{enhancedMetrics.responseRate}%</div>
                <div className="text-xs sm:text-sm text-green-700 dark:text-green-300 mt-1 font-medium">Response Rate</div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">Applications to interviews</div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-3 sm:p-4 text-center border border-orange-200 dark:border-orange-800">
                <div className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{enhancedMetrics.rejectionRate}%</div>
                <div className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mt-1 font-medium">Rejection Rate</div>
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">Keep trying!</div>
              </div>
            </div>

            {/* Status Breakdown Section Title */}
            <div className="text-center mb-3">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Application Status Breakdown</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 text-center border border-neutral-200 dark:border-neutral-700">
                <div className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.total}</div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Total</div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
                <div className="text-xl sm:text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.byStatus.DRAFT || 0}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Draft</div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800">
                <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.byStatus.APPLIED || 0}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Applied</div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center border border-yellow-200 dark:border-yellow-800">
                <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.byStatus.INTERVIEWING || 0}</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Interviewing</div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center border border-red-200 dark:border-red-800">
                <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.byStatus.REJECTED || 0}</div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">Rejected</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applications Over Time Chart */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <ApplicationsByDateChart showTitle={true} height={300} />
        </div>
      )}

      {/* Community Daily Goal Achievement */}
      {stats && stats.dailyStats && (
        <div className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
                Community Goal Achievement
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                Past 7 Days - Goal: 6 applications/day
              </p>
            </div>

            {/* Past 7 Days Goal Tracker */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 sm:p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4">
                {stats.dailyStats.map((day, index) => {
                  const dailyGoal = 6 // Community default goal
                  const goalMet = day.count >= dailyGoal
                  return (
                    <div
                      key={day.date}
                      className={`rounded-lg p-2 sm:p-4 text-center border-2 ${
                        goalMet
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600'
                      }`}
                    >
                      <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 sm:mb-2 truncate">
                        {day.dayLabel}
                      </div>
                      <div className="flex items-center justify-center mb-1 sm:mb-2">
                        {goalMet ? (
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className={`text-xl sm:text-2xl font-bold ${
                        goalMet ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {day.count}
                      </div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 hidden sm:block">
                        applications
                      </div>
                      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-500 mt-1">
                        Goal: {dailyGoal}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3 sm:p-4 text-center border border-blue-200 dark:border-blue-800">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.dailyStats.reduce((sum, day) => sum + day.count, 0)}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 font-medium">
                  Total Applications (7 Days)
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3 sm:p-4 text-center border border-green-200 dark:border-green-800">
                <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.dailyStats.filter(day => day.count >= 6).length}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300 mt-1 font-medium">
                  Days Goal Met
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-3 sm:p-4 text-center border border-purple-200 dark:border-purple-800">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.round((stats.dailyStats.reduce((sum, day) => sum + day.count, 0) / 7) * 10) / 10}
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300 mt-1 font-medium">
                  Average per Day
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="mt-4 sm:mt-6 text-center bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-white font-semibold">
                Join the community and set your own daily goals! Customize from 1-20 applications per day.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div>
            <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-50">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              Or{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                create a new account
              </Link>
            </p>
          </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 placeholder-neutral-500 dark:placeholder-neutral-400 text-neutral-900 dark:text-neutral-50 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 placeholder-neutral-500 dark:placeholder-neutral-400 text-neutral-900 dark:text-neutral-50 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
