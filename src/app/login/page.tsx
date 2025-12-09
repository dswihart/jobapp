'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChartBarIcon, SunIcon, MoonIcon, UserIcon, CalendarDaysIcon, CheckCircleIcon, ClockIcon, TrophyIcon } from '@heroicons/react/24/outline'
import ApplicationsByDateChart from '@/components/ApplicationsByDateChart'

interface InterviewStats {
  total: number
  upcoming: number
  completed: number
  passRate: number
  passed: number
  failed: number
  byType: Record<string, number>
  byOutcome: Record<string, number>
}

interface Stats {
  total: number
  byStatus: Record<string, number>
  dailyStats?: Array<{
    date: string
    count: number
    dayLabel: string
  }>
  interviews?: InterviewStats
}

interface UserStats extends Stats {
  userName: string
  userId: string
  dailyGoal: number
}

// Array of motivational messages that rotate daily
const motivationalMessages = [
  "Keep up the momentum! 🚀",
  "Every application brings you closer to your dream job! 💼",
  "You're doing great! Stay consistent! ⭐",
  "Your persistence will pay off! 💪",
  "Today is a new opportunity! 🌟",
  "Believe in yourself and your journey! 🎯",
  "Small steps lead to big achievements! 📈",
  "Stay positive and keep pushing forward! ➡️",
  "Your next opportunity is just around the corner! 🔄",
  "Success is the sum of small efforts repeated daily! 🔁",
  "Don't stop until you're proud! 🏆",
  "Great things take time - keep going! ⏰",
  "You're one application closer to success! ✅",
  "Stay focused on your goals! 🎯",
  "Your dedication is inspiring! ✨",
  "Every no brings you closer to a yes! ✔️",
  "Progress, not perfection! 📊",
  "Keep your head up and keep moving forward! 🚶",
  "You've got this! 💯",
  "Consistency is key to success! 🔑",
  "Your future self will thank you! 🙏",
  "Make today count! 📅",
  "Dream big, work hard, stay focused! 🌠",
  "You're building your future, one application at a time! 🏗️",
  "Keep pushing - opportunities are coming! 🚪",
  "Your hard work will be rewarded! 🎁",
  "Stay committed to your goals! 📌",
  "Never give up on your dreams! 💫",
  "You're making excellent progress! 📈",
  "Keep going - you're unstoppable! 🔥"
];

// Function to get day of year (for rotating messages)
const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

// Function to get initials from full name
const getInitials = (fullName: string) => {
  return fullName
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3) // Limit to 3 initials
};

// Calculate enhanced metrics from stats
const getEnhancedMetrics = (stats: Stats | null) => {
  if (!stats) return null

  const applied = stats.byStatus.APPLIED || 0
  const interviewing = stats.byStatus.INTERVIEWING || 0
  const rejected = stats.byStatus.REJECTED || 0

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
  const [darkMode, setDarkMode] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>('community')
  const [usersList, setUsersList] = useState<UserStats[]>([])
  const [currentUserStats, setCurrentUserStats] = useState<UserStats | null>(null)

  useEffect(() => {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode))
      document.documentElement.classList.toggle('dark', JSON.parse(savedDarkMode))
    } else {
      // Check system preference
      const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      setDarkMode(systemDarkMode)
      document.documentElement.classList.toggle('dark', systemDarkMode)
    }

    // Set daily motivational message based on day of year
    const dayOfYear = getDayOfYear();
    const messageIndex = dayOfYear % motivationalMessages.length;
    setDailyMessage(motivationalMessages[messageIndex]);

    fetchStats()
    fetchUsers()
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

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/list')
      if (response.ok) {
        const users = await response.json()
        setUsersList(users)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchUserStats = async (userId: string) => {
    if (userId === 'community') {
      setCurrentUserStats(null)
      await fetchStats()
      return
    }

    try {
      const response = await fetch(`/api/stats/user/${userId}`)
      if (response.ok) {
        const userStats = await response.json()
        setCurrentUserStats(userStats)
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }

  const handleUserChange = async (userId: string) => {
    setSelectedUser(userId)
    await fetchUserStats(userId)
  }

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode))
    document.documentElement.classList.toggle('dark', newDarkMode)
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

  const displayStats = currentUserStats || stats
  const enhancedMetrics = getEnhancedMetrics(displayStats)
  const dailyGoal = currentUserStats?.dailyGoal || 5

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header with Dark Mode Toggle and User Selector */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              Job Application Tracker
            </h1>

            <div className="flex items-center gap-3">
              {/* User Selector Dropdown */}
              <div className="relative">
                <select
                  value={selectedUser}
                  onChange={(e) => handleUserChange(e.target.value)}
                  className="appearance-none bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 pr-8 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="community">Community Stats</option>
                  {usersList.map(user => (
                    <option key={user.userId} value={user.userId}>
                      {getInitials(user.userName)}
                    </option>
                  ))}
                </select>
                <UserIcon className="absolute right-2 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <SunIcon className="h-5 w-5 text-yellow-500" />
                ) : (
                  <MoonIcon className="h-5 w-5 text-neutral-700" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Motivational Message - Large and Centered */}
      {displayStats && (
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-2 animate-pulse">
                {dailyMessage}
              </h2>
              <p className="text-lg sm:text-xl text-white/90">
                {selectedUser === 'community' ? 'Community Statistics' : `${currentUserStats?.userName ? getInitials(currentUserStats.userName) : ""}'s Progress`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Goal Achievement Section - Last 30 Days */}
      {displayStats && displayStats.dailyStats && (
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="text-center mb-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-50">
                Last 30 Days - Goal Achievement ({dailyGoal} Applications/Day)
              </h2>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-10 gap-1">
                {displayStats.dailyStats.map((day, index) => {
                  const date = new Date(day.date)
                  const dayNum = date.getDate()
                  const monthShort = date.toLocaleDateString("en-US", { month: "short" })
                  const weekday = date.toLocaleDateString("en-US", { weekday: "short" })
                  const count = day.count || 0
                  const goalMet = count >= dailyGoal
                  const isToday = date.toDateString() === new Date().toDateString()

                  return (
                    <div
                      key={day.date}
                      className={"aspect-square flex flex-col items-center justify-center rounded text-center " + (
                        isToday
                          ? "bg-blue-100 dark:bg-blue-900 border border-blue-500 dark:border-blue-400"
                          : goalMet
                            ? "bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600"
                            : count >= 2
                              ? "bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600"
                              : "bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600"
                      )}
                    >
                      <div className="text-[7px] text-neutral-600 dark:text-neutral-400">
                        {weekday}
                      </div>
                      <div className="text-[7px] text-neutral-600 dark:text-neutral-400">
                        {monthShort}
                      </div>
                      <div className="text-[10px] font-bold text-neutral-900 dark:text-neutral-100">
                        {dayNum}
                      </div>
                      <div className={"text-[10px] font-bold " + (
                        goalMet ? "text-green-700 dark:text-green-400" : count >= 2 ? "text-yellow-700 dark:text-yellow-400" : "text-red-700 dark:text-red-400"
                      )}>
                        {count}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Section */}
      {displayStats && enhancedMetrics && (
        <div className="bg-neutral-50 dark:bg-neutral-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
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

            {/* Status Breakdown */}
            <div className="text-center mb-3">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Application Status Breakdown</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 text-center border border-neutral-200 dark:border-neutral-700">
                <div className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{displayStats.total}</div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Total</div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
                <div className="text-xl sm:text-2xl font-bold text-gray-600 dark:text-gray-400">{displayStats.byStatus.DRAFT || 0}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Draft</div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800">
                <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{displayStats.byStatus.APPLIED || 0}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Applied</div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center border border-yellow-200 dark:border-yellow-800">
                <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{displayStats.byStatus.INTERVIEWING || 0}</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Interviewing</div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center border border-red-200 dark:border-red-800">
                <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{displayStats.byStatus.REJECTED || 0}</div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">Rejected</div>
              </div>
            </div>

            {/* Interview Statistics Section */}
            {displayStats.interviews && displayStats.interviews.total > 0 && (
              <>
                <div className="text-center mt-6 mb-3">
                  <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-2">
                    <CalendarDaysIcon className="h-5 w-5" />
                    Interview Statistics
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-3 text-center border border-indigo-200 dark:border-indigo-800">
                    <CalendarDaysIcon className="h-5 w-5 mx-auto text-indigo-600 dark:text-indigo-400 mb-1" />
                    <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">{displayStats.interviews.total}</div>
                    <div className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">Total Interviews</div>
                  </div>

                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-lg p-3 text-center border border-cyan-200 dark:border-cyan-800">
                    <ClockIcon className="h-5 w-5 mx-auto text-cyan-600 dark:text-cyan-400 mb-1" />
                    <div className="text-xl sm:text-2xl font-bold text-cyan-600 dark:text-cyan-400">{displayStats.interviews.upcoming}</div>
                    <div className="text-xs text-cyan-700 dark:text-cyan-300 mt-1">Upcoming</div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg p-3 text-center border border-emerald-200 dark:border-emerald-800">
                    <CheckCircleIcon className="h-5 w-5 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
                    <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{displayStats.interviews.completed}</div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">Completed</div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-3 text-center border border-amber-200 dark:border-amber-800">
                    <TrophyIcon className="h-5 w-5 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
                    <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{displayStats.interviews.passRate}%</div>
                    <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">Pass Rate</div>
                  </div>
                </div>

                {/* Interview Outcomes */}
                {(displayStats.interviews.passed > 0 || displayStats.interviews.failed > 0) && (
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center border border-green-200 dark:border-green-800">
                      <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{displayStats.interviews.passed}</div>
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1">Passed</div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center border border-red-200 dark:border-red-800">
                      <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{displayStats.interviews.failed}</div>
                      <div className="text-xs text-red-700 dark:text-red-300 mt-1">Failed</div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Summary Stats */}
            {displayStats.dailyStats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3 sm:p-4 text-center border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {displayStats.dailyStats.reduce((sum, day) => sum + day.count, 0)}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 font-medium">
                    Total Applications (30 Days)
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3 sm:p-4 text-center border border-green-200 dark:border-green-800">
                  <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                    {displayStats.dailyStats.filter(day => day.count >= dailyGoal).length}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 mt-1 font-medium">
                    Days Goal Met
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-3 sm:p-4 text-center border border-purple-200 dark:border-purple-800">
                  <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {Math.round((displayStats.dailyStats.reduce((sum, day) => sum + day.count, 0) / 30) * 10) / 10}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300 mt-1 font-medium">
                    Average per Day
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Applications Over Time Chart */}
      {displayStats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <ApplicationsByDateChart showTitle={true} height={300} userId={selectedUser !== 'community' ? selectedUser : undefined} />
        </div>
      )}

      {/* Login Form */}
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
