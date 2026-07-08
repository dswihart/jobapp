'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChartBarIcon, SunIcon, MoonIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import ApplicationsByDateChart from '@/components/ApplicationsByDateChart'

interface UpcomingInterview {
  id: string
  interviewId: string
  company: string
  role: string
  interviewDate: string
  interviewTime?: string
  interviewType?: string
  interviewRound?: number
  interviewNotes?: string
  status: string
  interviewStatus: string
}

interface InterviewFeedResponse {
  upcoming?: UpcomingInterview[]
  needsFollowUp?: UpcomingInterview[]
}

interface Stats {
  total: number
  byStatus: Record<string, number>
  dailyStats?: Array<{
    date: string
    count: number
    interviews?: number
    dayLabel: string
  }>
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
  if (!stats?.byStatus) return null

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
  // Default the public landing page to the primary user's own stats, not the
  // community aggregate. (No one is logged in here, so "mine" = default-user-id.)
  const [selectedUser, setSelectedUser] = useState<string>('default-user-id')
  const [usersList, setUsersList] = useState<UserStats[]>([])
  const [currentUserStats, setCurrentUserStats] = useState<UserStats | null>(null)
  const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterview[]>([])
  const [loadingUpcomingInterviews, setLoadingUpcomingInterviews] = useState(false)

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
    // Load the primary user's own stats immediately so the page shows "mine"
    // from first paint (no community flash before the users list resolves).
    fetchUserStats('default-user-id')
    fetchUpcomingInterviews('default-user-id')
  }, [])

  const mergeInterviewFeed = (data: InterviewFeedResponse) => {
    const future = data.upcoming || []
    const recentPast = data.needsFollowUp || []

    return [...future, ...recentPast].sort((a, b) => {
      const aTime = new Date(a.interviewDate).getTime()
      const bTime = new Date(b.interviewDate).getTime()
      return aTime - bTime
    })
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      if (!response.ok) {
        setStats(null)
        return
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setStats(null)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/list')
      if (response.ok) {
        const users = await response.json()
        setUsersList(users)
        if (Array.isArray(users) && users.length > 0) {
          // Prefer the primary user ("mine"); fall back to the first user only
          // if they aren't in the list.
          const mine = users.find((u: UserStats) => u.userId === 'default-user-id')
          const defaultUserId = mine ? mine.userId : users[0].userId
          setSelectedUser(defaultUserId)
          await Promise.all([
            fetchUserStats(defaultUserId),
            fetchUpcomingInterviews(defaultUserId),
          ])
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchUserStats = async (userId: string) => {
    if (userId === 'community') {
      setCurrentUserStats(null)
      setUpcomingInterviews([])
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

  const fetchUpcomingInterviews = async (userId: string) => {
    if (userId === 'community') {
      setLoadingUpcomingInterviews(true)
      try {
        const response = await fetch('/api/interviews/upcoming?scope=calendar-two-weeks&pastDays=16')
        if (!response.ok) {
          setUpcomingInterviews([])
          return
        }

        const data = await response.json()
        setUpcomingInterviews(mergeInterviewFeed(data))
      } catch (error) {
        console.error('Failed to fetch upcoming interviews:', error)
        setUpcomingInterviews([])
      } finally {
        setLoadingUpcomingInterviews(false)
      }
      return
    }

    setLoadingUpcomingInterviews(true)
    try {
      const response = await fetch(`/api/interviews/upcoming?userId=${userId}&scope=calendar-two-weeks&pastDays=16`)
      if (!response.ok) {
        setUpcomingInterviews([])
        return
      }

      const data = await response.json()
      setUpcomingInterviews(mergeInterviewFeed(data))
    } catch (error) {
      console.error('Failed to fetch upcoming interviews:', error)
      setUpcomingInterviews([])
    } finally {
      setLoadingUpcomingInterviews(false)
    }
  }

  const handleUserChange = async (userId: string) => {
    setSelectedUser(userId)
    await Promise.all([
      fetchUserStats(userId),
      fetchUpcomingInterviews(userId),
    ])
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
  const dailyGoal = currentUserStats?.dailyGoal || 4
  const hasSelectedUser = true

  const formatInterviewDate = (dateValue: string) => {
    const date = new Date(dateValue)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatInterviewTime = (dateValue: string, timeValue?: string) => {
    if (timeValue) {
      return timeValue
    }
    return 'Time TBD'
  }

  const getInterviewDisplayStatus = (interview: UpcomingInterview) => {
    const boundary = interview.interviewTime
      ? new Date(`${interview.interviewDate.split('T')[0]}T${interview.interviewTime}`)
      : new Date(new Date(interview.interviewDate).setHours(23, 59, 59, 999))

    return boundary.getTime() >= Date.now() ? 'Upcoming' : 'Recent'
  }

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

      {/* Goal Achievement Section - Last 30 Days */}
      {displayStats && displayStats.dailyStats && (
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="text-center mb-3">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-50">
                Last 16 Days - Goal Achievement ({dailyGoal}/day · applications + interviews)
              </h2>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-7 gap-2 sm:gap-3">
                {displayStats.dailyStats.slice(-16).map((day, index) => {
                  const date = new Date(day.date)
                  const dayNum = date.getDate()
                  const monthShort = date.toLocaleDateString("en-US", { month: "short" })
                  const weekday = date.toLocaleDateString("en-US", { weekday: "short" })
                  const count = day.count || 0
                  const interviews = day.interviews || 0
                  const progress = count + interviews
                  const goalMet = progress >= dailyGoal
                  const isToday = date.toDateString() === new Date().toDateString()

                  return (
                    <div
                      key={day.date}
                      className={"min-h-[88px] sm:min-h-[124px] rounded-xl px-2 py-3 sm:px-3 sm:py-4 flex flex-col items-center justify-center text-center shadow-sm " + (isToday ? "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1 " : "") + (
                        goalMet
                          ? "bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600"
                          : isToday
                            ? "bg-blue-100 dark:bg-blue-900 border border-blue-500 dark:border-blue-400"
                            : progress >= 2
                              ? "bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600"
                              : "bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600"
                      )}
                    >
                      <div className="text-[9px] sm:text-xs text-neutral-600 dark:text-neutral-400">
                        {weekday}
                      </div>
                      <div className="text-[9px] sm:text-xs text-neutral-600 dark:text-neutral-400">
                        {monthShort}
                      </div>
                      <div className="text-sm sm:text-xl font-bold text-neutral-900 dark:text-neutral-100">
                        {dayNum}
                      </div>
                      <div className={"text-base sm:text-2xl font-bold " + (
                        goalMet ? "text-green-700 dark:text-green-400" : progress >= 2 ? "text-yellow-700 dark:text-yellow-400" : "text-red-700 dark:text-red-400"
                      )}>
                        {progress}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 sm:mb-7">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 sm:p-5 text-center border border-blue-200 dark:border-blue-800">
                <div className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">{enhancedMetrics.activePipeline}</div>
                <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mt-1 font-medium">Active Pipeline</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Applications in progress</div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 sm:p-5 text-center border border-green-200 dark:border-green-800">
                <div className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400">{enhancedMetrics.responseRate}%</div>
                <div className="text-xs sm:text-sm text-green-700 dark:text-green-300 mt-1 font-medium">Response Rate</div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">Applications to interviews</div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 sm:p-5 text-center border border-orange-200 dark:border-orange-800">
                <div className="text-3xl sm:text-4xl font-bold text-orange-600 dark:text-orange-400">{enhancedMetrics.rejectionRate}%</div>
                <div className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mt-1 font-medium">Rejection Rate</div>
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">Keep trying!</div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="text-center mb-3">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Application Status Breakdown</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 text-center border border-neutral-200 dark:border-neutral-700">
                <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">{displayStats.total}</div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Total</div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-800">
                <div className="text-2xl sm:text-3xl font-bold text-gray-600 dark:text-gray-400">{displayStats.byStatus.DRAFT || 0}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Draft</div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-800">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{displayStats.byStatus.APPLIED || 0}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Applied</div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 text-center border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400">{displayStats.byStatus.INTERVIEWING || 0}</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Interview Stage</div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center border border-red-200 dark:border-red-800">
                <div className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">{displayStats.byStatus.REJECTED || 0}</div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">Rejected</div>
              </div>
            </div>

            {/* Summary Stats */}
            {displayStats.dailyStats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mt-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 sm:p-5 text-center border border-blue-200 dark:border-blue-800">
                  <div className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {displayStats.dailyStats.slice(-16).reduce((sum, day) => sum + day.count, 0)}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 font-medium">
                    Total Applications (16 Days)
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 sm:p-5 text-center border border-green-200 dark:border-green-800">
                  <div className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400">
                    {displayStats.dailyStats.slice(-16).filter(day => (day.count || 0) + (day.interviews || 0) >= dailyGoal).length}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 mt-1 font-medium">
                    Days Goal Met
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 sm:p-5 text-center border border-purple-200 dark:border-purple-800">
                  <div className="text-3xl sm:text-4xl font-bold text-purple-600 dark:text-purple-400">
                    {Math.round((displayStats.dailyStats.slice(-16).reduce((sum, day) => sum + day.count, 0) / 16) * 10) / 10}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300 mt-1 font-medium">
                    Average per Day
                  </div>
                </div>
              </div>
            )}

            {hasSelectedUser && (
              <div className="mt-6">
                <div className="text-center mb-3">
                  <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-2">
                    <CalendarDaysIcon className="h-5 w-5" />
                    Interview Timeline
                  </h2>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                  {loadingUpcomingInterviews ? (
                    <div className="px-4 py-6 text-sm text-neutral-500 dark:text-neutral-400 text-center">
                      Loading upcoming interviews...
                    </div>
                  ) : upcomingInterviews.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-neutral-500 dark:text-neutral-400 text-center">
                      No future interviews or recent interviews from the last 16 days.
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {upcomingInterviews.map((interview) => (
                        <div key={interview.interviewId} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                              {interview.company}
                            </div>
                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                              {interview.role}
                            </div>
                          </div>
                          <div className="sm:text-right">
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {formatInterviewDate(interview.interviewDate)}
                            </div>
                            <div className="text-sm text-neutral-700 dark:text-neutral-300">
                              {formatInterviewTime(interview.interviewDate, interview.interviewTime)}
                              {interview.interviewType ? ` · ${interview.interviewType}` : ''}
                              {interview.interviewRound ? ` · Round ${interview.interviewRound}` : ''}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                              {getInterviewDisplayStatus(interview)} · {interview.interviewStatus}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Applications Over Time Chart */}
      {displayStats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <ApplicationsByDateChart showTitle={true} height={300} userId={selectedUser !== 'community' ? selectedUser : undefined} days={16} />
        </div>
      )}

      {/* Login Form */}
      <div className="flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          {displayStats && (
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-5 py-5 sm:px-6 sm:py-6 text-center shadow-sm">
              <h2 className="text-xl sm:text-3xl font-bold text-white">
                {dailyMessage}
              </h2>
              <p className="mt-1 text-sm sm:text-base text-white/90">
                {currentUserStats?.userName ? `${getInitials(currentUserStats.userName)}'s Progress` : 'Application Progress'}
              </p>
            </div>
          )}
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
