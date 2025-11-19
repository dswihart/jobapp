'use client'
import { DocumentTextIcon, SparklesIcon } from '@heroicons/react/24/outline'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { PlusIcon, ChartBarIcon, ViewColumnsIcon, ListBulletIcon, ArrowRightOnRectangleIcon, LinkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import ApplicationList from './ApplicationList'
import ApplicationBoard from './ApplicationBoard'
import ProgressChart from './ProgressChart'
import ApplicationModal from './ApplicationModal'
import CoverLetterModal from './CoverLetterModal'
import EnhancedProfileEditor from './EnhancedProfileEditor'
import ThemeToggle from './ThemeToggle'
import UnifiedNotificationsPanel from './UnifiedNotificationsPanel'
import JobSearchSettings from './JobSearchSettings'
import JobSourcesManager from './JobSourcesManager'
import ResumeManager from './ResumeManager'
import JobMonitor from './JobMonitor'

import JobOpportunities from './JobOpportunities'
import CollapsibleSection from './CollapsibleSection'
import ApplicationsByDateChart from './ApplicationsByDateChart'
interface Application {
  id: string
  company: string
  role: string
  status: 'DRAFT' | 'PENDING' | 'APPLIED' | 'INTERVIEWING' | 'REJECTED' | 'ARCHIVED'
  notes?: string
  jobUrl?: string
  appliedDate?: string
  createdAt: string
  updatedAt: string
  contacts: Contact[]
}

interface Contact {
  id: string
  name: string
  title?: string
  email?: string
  phone?: string
  notes?: string
}

interface User {
  id: string
  name?: string
  email: string
  skills: string[]
  experience?: string
  resumeUrl?: string
  dailyApplicationGoal?: number
}


export default function Dashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)
  const [isCoverLetterModalOpen, setIsCoverLetterModalOpen] = useState(false)
  const [coverLetterApplication, setCoverLetterApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [isParsingUrl, setIsParsingUrl] = useState(false)
  const [todayApplicationsCount, setTodayApplicationsCount] = useState(0)
  const [dailyMessage, setDailyMessage] = useState('')
  const [pastDaysGoals, setPastDaysGoals] = useState<Array<{ date: string; count: number; goalMet: boolean }>>([])
  const [last30DaysTotal, setLast30DaysTotal] = useState(0)
  // Restore original line
  // Fetch AI-generated motivational message
  const fetchMotivationalMessage = async () => {
    try {
      const userId = user?.id
      const url = userId
        ? `/api/ai/motivational-message?userId=${userId}`
        : '/api/ai/motivational-message'

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setDailyMessage(data.message)
      } else {
        setDailyMessage('Keep pushing forward! Your dream job awaits!')
      }
    } catch (error) {
      console.error('Failed to fetch motivational message:', error)
      setDailyMessage('Every application brings you closer to success!')
    }
  }

  useEffect(() => {
    fetchApplications()
    fetchUser()
    fetchMotivationalMessage()
  }, [])

  useEffect(() => {
    // Calculate today's applications count
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Helper function to get date string in YYYY-MM-DD format using LOCAL timezone
    const getDateString = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const todayStr = getDateString(new Date())
    
    const count = applications.filter(app => {
      if (!app.appliedDate) return false
      const appliedDateStr = getDateString(new Date(app.appliedDate))
      return appliedDateStr === todayStr
    }).length

    setTodayApplicationsCount(count)

    // Calculate past 7 days goals (using user's daily goal or default to 6)
    const dailyGoal = user?.dailyApplicationGoal || 6
    const goalData = []
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = getDateString(date)

      const dayCount = applications.filter(app => {
        if (!app.appliedDate) return false
        const appliedDateStr = getDateString(new Date(app.appliedDate))
        return appliedDateStr === dateStr
      }).length

      goalData.push({
        date: date.toISOString(),
        count: dayCount,
        goalMet: dayCount >= dailyGoal
      })
    }

    setPastDaysGoals(goalData.reverse())

    // Calculate total applications for last 7 days
    const total7Days = goalData.reduce((sum, day) => sum + day.count, 0)
    setLast30DaysTotal(total7Days)
  }, [applications, user])

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications')
      const data = await response.json()
      if (Array.isArray(data)) {
        setApplications(data)
      } else {
        setApplications([])
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user')
      const data = await response.json()
      setUser(data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  }

  const handleApplicationSubmit = async (applicationData: Partial<Application>) => {
    try {
      const isEditing = editingApplication?.id && editingApplication.id !== ''
      const url = isEditing ? `/api/applications/${editingApplication.id}` : '/api/applications'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...applicationData,
          userId: user?.id || 'default-user-id'
        }),
      })

      if (response.ok) {
        await fetchApplications()
        setIsApplicationModalOpen(false)
        setEditingApplication(null)
      }
    } catch (error) {
      console.error('Failed to save application:', error)
    }
  }

  const handleEditApplication = (application: Application) => {
    setEditingApplication(application)
    setIsApplicationModalOpen(true)
  }

  const handleGenerateCoverLetter = (application: Application) => {
    setCoverLetterApplication(application)
    setIsCoverLetterModalOpen(true)
  }
  const handleDeleteApplication = async (id: string) => {
    try {
      await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
      })
      await fetchApplications()
    } catch (error) {
      console.error('Failed to delete application:', error)
    }
  }

  const handleStatusUpdate = async (id: string, status: Application['status']) => {
    try {
      await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })
      await fetchApplications()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const handleQuickAddFromUrl = async () => {
    const jobUrl = prompt('Enter the job posting URL:')
    if (!jobUrl) return

    setIsParsingUrl(true)
    try {
      const response = await fetch('/api/ai/parse-job-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: jobUrl }),
      })

      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Parse job URL failed:', errorText)
        alert(`Failed to parse job URL: ${errorText || response.statusText}`)
        return
      }

      const result = await response.json()

      if (result.success && result.data) {
        // Show fit score if available
        if (result.fitScore) {
          const fitMessage = `
Job parsed successfully!

Match Score: ${result.fitScore.overall}%
- Title Match: ${result.fitScore.titleMatch}%
- Skill Match: ${result.fitScore.skillMatch}%
- Experience Match: ${result.fitScore.experienceMatch}%
- Location Match: ${result.fitScore.locationMatch}%

Would you like to add this job to your applications?`
          
          if (!confirm(fitMessage)) {
            return
          }
        }

        // Pre-populate the application modal with parsed data
        // Pre-populate the application modal with parsed data
        setEditingApplication({
          id: '',
          company: result.data.company,
          role: result.data.role,
          status: result.data.status,
          notes: result.data.notes,
          jobUrl: result.data.jobUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          contacts: [],
        } as Application)
        setIsApplicationModalOpen(true)
      } else {
        alert(`Failed to parse job URL: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to parse job URL:', error)
      alert('Failed to parse job URL. Please try again.')
    } finally {
      setIsParsingUrl(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Job Application Tracker</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage your job search pipeline</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ThemeToggle />
                {user?.id && <UnifiedNotificationsPanel userId={user.id} />}
                <JobMonitor userId={user?.id || ""} onComplete={() => {}} />
                {user?.id && <JobSearchSettings userId={user.id} onSettingsSaved={fetchUser} />}
                <a
                  href="/resume-tailor"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
                >
                  <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Resume Tailor</span>
                  <span className="sm:hidden">Tailor</span>
                </a>
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm sm:text-base"
                >
                  Profile
                </button>
                <button
                  onClick={handleQuickAddFromUrl}
                  disabled={isParsingUrl}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
                  title="Add job from URL (or try our LinkedIn bookmarklet at /bookmarklet)"
                >
                  <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">{isParsingUrl ? 'Parsing...' : 'Add from URL'}</span>
                  <span className="sm:hidden">{isParsingUrl ? '...' : 'URL'}</span>
                </button>
                <button
                  onClick={() => {
                    setEditingApplication(null)
                    setIsApplicationModalOpen(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
                >
                  <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Add Application</span>
                  <span className="sm:hidden">Add</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">Exit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 7-Day Application Tracker */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white dark:bg-gray-800 rounded-full p-3">
                <ChartBarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Last 30 Days Total</h2>
                <p className="text-xs text-purple-100">Applications submitted in the past week</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-white">{last30DaysTotal}</div>
              <p className="text-sm text-purple-100">
                {last30DaysTotal === 1 ? 'application' : 'applications'} / {(user?.dailyApplicationGoal || 6) * 30} goal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Today&apos;s Applications Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-slate-700 dark:to-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white dark:bg-gray-800 rounded-full p-3">
                <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Today&apos;s Applications - {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h2>
                <p className="text-xs text-blue-100">{dailyMessage}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-white">{todayApplicationsCount}</div>
              <p className="text-sm text-blue-100">
                {todayApplicationsCount === 1 ? 'application' : 'applications'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Past 30 Days Goals Tracker */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">Past 30 Days Goal Tracker ({user?.dailyApplicationGoal || 6} applications/day)</h3>
          <div className="grid grid-cols-10 gap-1 max-w-5xl mx-auto">
            {pastDaysGoals.map((day, index) => {
              const dateObj = new Date(day.date)
              const dayNum = dateObj.toLocaleDateString("en-US", { day: "numeric" })
              const monthShort = dateObj.toLocaleDateString("en-US", { month: "short" })
              const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" })
              
              return (
                <div key={index} className={`aspect-square flex flex-col items-center justify-center rounded text-center border ${day.goalMet ? "bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600" : day.count >= 2 ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600" : "bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600"}`}>
                  <div className="text-[7px] text-gray-600 dark:text-gray-400">
                    {weekday}
                  </div>
                  <div className="text-[7px] text-gray-600 dark:text-gray-400">
                    {monthShort}
                  </div>
                  <div className="text-[10px] font-bold text-gray-900 dark:text-gray-100">
                    {dayNum}
                  </div>
                  <div className={`text-[10px] font-bold ${day.goalMet ? "text-green-700 dark:text-green-400" : day.count >= 2 ? "text-yellow-700 dark:text-yellow-400" : "text-red-700 dark:text-red-400"}`}>
                    {day.count}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CollapsibleSection title="Job Sources" defaultExpanded={false} className="mb-8">
          <JobSourcesManager userId={user?.id || ""} />
        </CollapsibleSection>

        <CollapsibleSection title="My Resumes" defaultExpanded={false} className="mb-8">
          <ResumeManager />
        </CollapsibleSection>

<CollapsibleSection title="Job Opportunities" defaultExpanded={false} className="mb-8">
          <JobOpportunities userId={user?.id || ""} onApplicationCreated={fetchApplications} />
        </CollapsibleSection>

        <CollapsibleSection title="Applications Over Time" defaultExpanded={true} className="mb-8">
          <ApplicationsByDateChart userId={user?.id} />
        </CollapsibleSection>

        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ChartBarIcon className="h-6 w-6 mr-2" />
              Application Progress
            </h2>
            <ProgressChart applications={applications} />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-center sm:justify-start">
            <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 shadow'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <ListBulletIcon className="h-5 w-5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                  viewMode === 'board'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 shadow'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <ViewColumnsIcon className="h-5 w-5" />
                <span>Board</span>
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <ApplicationList
            applications={applications}
            onEdit={handleEditApplication}
            onDelete={handleDeleteApplication}
            onStatusUpdate={handleStatusUpdate}
            onRefresh={fetchApplications}
            onGenerateCoverLetter={handleGenerateCoverLetter}
            userId={user?.id || "default-user-id"}
          />
        ) : (
          <ApplicationBoard
            applications={applications}
            onEdit={handleEditApplication}
            onStatusUpdate={handleStatusUpdate}
            onDelete={handleDeleteApplication}
          />
        )}
      </main>

      <ApplicationModal
        isOpen={isApplicationModalOpen}
        onClose={() => {
          setIsApplicationModalOpen(false)
          setEditingApplication(null)
        }}
        onSubmit={handleApplicationSubmit}
        application={editingApplication}
      />
n      <CoverLetterModal
        isOpen={isCoverLetterModalOpen}
        onClose={() => {
          setIsCoverLetterModalOpen(false)
          setCoverLetterApplication(null)
        }}
        application={coverLetterApplication}
        onSuccess={fetchApplications}
      />

      {isProfileModalOpen && user?.id && (
        <EnhancedProfileEditor
          userId={user.id}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  )
}
