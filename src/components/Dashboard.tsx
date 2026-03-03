'use client'
import { SparklesIcon, ChartBarIcon } from '@heroicons/react/24/outline'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { AcademicCapIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import EnhancedProfileEditor from './EnhancedProfileEditor'
import ThemeToggle from './ThemeToggle'
import UnifiedNotificationsPanel from './UnifiedNotificationsPanel'
import JobSearchSettings from './JobSearchSettings'
import JobSourcesManager from './JobSourcesManager'
import ResumeManager from './ResumeManager'
import JobMonitor from './JobMonitor'

import JobOpportunities from './JobOpportunities'
import CollapsibleSection from './CollapsibleSection'

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
  const [user, setUser] = useState<User | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user')
      const data = await response.json()
      setUser(data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
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
                <a
                  href="/stats"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
                >
                  <ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Stats &amp; Goals</span>
                  <span className="sm:hidden">Stats</span>
                </a>
                <a
                  href="/skills"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
                >
                  <AcademicCapIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Skills</span>
                </a>
                <button
                  onClick={() => setIsProfileModalOpen(true)} aria-label="Open profile settings"
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm sm:text-base"
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
                  aria-label="Logout from application" title="Logout"
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CollapsibleSection title="Job Sources" defaultExpanded={false} className="mb-8">
          <JobSourcesManager userId={user?.id || ""} />
        </CollapsibleSection>

        <CollapsibleSection title="My Resumes" defaultExpanded={false} className="mb-8">
          <ResumeManager />
        </CollapsibleSection>

        <CollapsibleSection title="Job Opportunities" defaultExpanded={true} className="mb-8">
          <JobOpportunities userId={user?.id || ""} onApplicationCreated={() => {}} />
        </CollapsibleSection>
      </main>

      {isProfileModalOpen && user?.id && (
        <EnhancedProfileEditor
          userId={user.id}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  )
}
