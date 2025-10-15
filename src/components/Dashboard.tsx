'use client'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

import { useState, useEffect } from 'react'
import { PlusIcon, ChartBarIcon, ViewColumnsIcon, ListBulletIcon } from '@heroicons/react/24/outline'
import ApplicationList from './ApplicationList'
import ApplicationBoard from './ApplicationBoard'
import ProgressChart from './ProgressChart'
import ApplicationModal from './ApplicationModal'
import EnhancedProfileEditor from './EnhancedProfileEditor'
import ThemeToggle from './ThemeToggle'
import AlertsPanel from './AlertsPanel'
import JobSearchSettings from './JobSearchSettings'
import SourceManager from './SourceManager'
import JobMonitor from './JobMonitor'

import JobOpportunities from './JobOpportunities'
import CollapsibleSection from './CollapsibleSection'
interface Application {
  id: string
  company: string
  role: string
  status: 'APPLIED' | 'INTERVIEWING' | 'PENDING' | 'REJECTED'
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
}

export default function Dashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApplications()
    fetchUser()
  }, [])

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications')
      const data = await response.json()
      setApplications(data)
    } catch (error) {
      console.error('Failed to fetch applications:', error)
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
      const url = editingApplication ? `/api/applications/${editingApplication.id}` : '/api/applications'
      const method = editingApplication ? 'PUT' : 'POST'

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
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Application Tracker</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your job search pipeline</p>
            </div>
            <div className="flex space-x-4">
              <ThemeToggle />
              <JobMonitor userId={user?.id || ""} onComplete={() => {}} />
              {user?.id && <AlertsPanel userId={user.id} />}
              {user?.id && <JobSearchSettings userId={user.id} />}
              <a
                href="/cover-letters"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <DocumentTextIcon className="h-5 w-5" />
                <span>Cover Letters</span>
              </a>
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg"
              >
                Profile
              </button>
              <button
                onClick={() => {
                  setEditingApplication(null)
                  setIsApplicationModalOpen(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Application</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CollapsibleSection title="Job Sources" defaultExpanded={false} className="mb-8"><SourceManager /></CollapsibleSection>

<CollapsibleSection title="Job Opportunities" defaultExpanded={false} className="mb-8"><JobOpportunities userId={user?.id || ""} /></CollapsibleSection>
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

      {isProfileModalOpen && (
        <EnhancedProfileEditor
          userId={user?.id || ""}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  )
}
