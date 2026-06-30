'use client'
import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import BottomTabBar from './BottomTabBar'
import JobOpportunities from '../JobOpportunities'
import ApplicationList from '../ApplicationList'
import ApplicationModal from '../ApplicationModal'
import EnhancedProfileEditor from '../EnhancedProfileEditor'
import SettingsPage from '../pages/SettingsPage'
import DailyEncouragement from '../DailyEncouragement'
import InterviewsSection from '../InterviewsSection'
import CreateInterviewModal from '../CreateInterviewModal'
import InterviewDetailModal from '../InterviewDetailModal'

type TabName = 'opportunities' | 'applications' | 'interviews' | 'settings'

interface User {
  id: string
  name?: string
  email: string
  skills: string[]
  experience?: string
  resumeUrl?: string
  dailyApplicationGoal?: number
}

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
  contacts: { id: string; name: string; title?: string; email?: string; phone?: string; notes?: string }[]
  resume?: { id: string; name: string; fileUrl: string; fileName: string } | null
  coverLetter?: { id: string; name: string; fileUrl: string; fileName: string } | null
}

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<TabName>('opportunities')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [opportunityRefreshTrigger, setOpportunityRefreshTrigger] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [scanBanner, setScanBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  // Multi-interview management (global Interviews tab)
  const [interviewRefreshTrigger, setInterviewRefreshTrigger] = useState(0)
  const [createInterviewOpen, setCreateInterviewOpen] = useState(false)
  const [preselectedAppId, setPreselectedAppId] = useState<string | undefined>(undefined)
  const [detailInterview, setDetailInterview] = useState<any>(null)

  useEffect(() => {
    fetchUser()
    autoArchiveStale().then(fetchApplications)
  }, [])

  useEffect(() => {
    if (!scanBanner) return
    const timer = setTimeout(() => setScanBanner(null), 5000)
    return () => clearTimeout(timer)
  }, [scanBanner])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user')
      if (!response.ok) return
      const data = await response.json()
      setUser(data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setLoading(false)
    }
  }

  const autoArchiveStale = async () => {
    try {
      await fetch('/api/applications/auto-archive', { method: 'POST' })
    } catch (_e) {
      // non-critical
    }
  }

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications')
      if (response.ok) {
        const data = await response.json()
        setApplications(data)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    }
  }

  const handleScan = async () => {
    if (scanning) return
    setScanning(true)
    setScanBanner(null)
    try {
      const response = await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const data = await response.json()
      if (data.success) {
        setScanBanner({ message: data.message || 'Scan complete', type: 'success' })
        // Trigger JobOpportunities to reload
        setOpportunityRefreshTrigger(t => t + 1)
      } else {
        setScanBanner({ message: data.error || 'Scan failed', type: 'error' })
      }
    } catch (_e) {
      setScanBanner({ message: 'Error connecting to scanner', type: 'error' })
    } finally {
      setScanning(false)
    }
  }

  const handleLogout = () => signOut({ callbackUrl: '/login' })

  const handleDeleteApplication = async (id: string) => {
    if (!confirm('Delete this application?')) return
    try {
      const response = await fetch(`/api/applications/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setApplications(prev => prev.filter(a => a.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete application:', error)
    }
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const app = applications.find(a => a.id === id)
      if (!app) return
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: app.company,
          role: app.role,
          status,
          notes: app.notes,
          jobUrl: app.jobUrl,
          appliedDate: app.appliedDate,
        })
      })
      if (response.ok) {
        const updated = await response.json()
        setApplications(prev => prev.map(a => a.id === id ? updated : a))
      }
    } catch (error) {
      console.error('Failed to update application status:', error)
    }
  }

  const handleEditApplication = async (data: Partial<Application>) => {
    if (!editingApp) return
    try {
      const response = await fetch(`/api/applications/${editingApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: data.company ?? editingApp.company,
          role: data.role ?? editingApp.role,
          status: data.status ?? editingApp.status,
          notes: data.notes ?? editingApp.notes,
          jobUrl: data.jobUrl ?? editingApp.jobUrl,
          appliedDate: data.appliedDate ?? editingApp.appliedDate,
          createdAt: data.createdAt ?? editingApp.createdAt,
          resumeId: data.resumeId ?? editingApp.resumeId,
          coverLetterId: data.coverLetterId ?? editingApp.coverLetterId,
        })
      })
      if (response.ok) {
        const updated = await response.json()
        setApplications(prev => prev.map(a => a.id === editingApp.id ? updated : a))
        setEditingApp(null)
      }
    } catch (error) {
      console.error('Failed to update application:', error)
    }
  }

  const activeApplicationCount = applications.filter(
    a => !['ARCHIVED', 'REJECTED'].includes(a.status)
  ).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'opportunities':
        return (
          <JobOpportunities
            userId={user?.id || ''}
            onApplicationCreated={fetchApplications}
            refreshTrigger={opportunityRefreshTrigger}
          />
        )
      case 'applications':
        return applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-2">No applications yet</p>
            <p className="text-sm">Click &quot;Apply&quot; on a job opportunity to get started.</p>
            <button
              onClick={() => setActiveTab('opportunities')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Browse Opportunities
            </button>
          </div>
        ) : (
          <ApplicationList
            applications={applications}
            onEdit={(app) => setEditingApp(app)}
            onDelete={handleDeleteApplication}
            onStatusUpdate={handleStatusUpdate}
            onRefresh={fetchApplications}
            onAddInterview={(applicationId) => {
              setPreselectedAppId(applicationId)
              setCreateInterviewOpen(true)
            }}
            userId={user?.id || ''}
          />
        )
      case 'interviews':
        return (
          <InterviewsSection
            refreshTrigger={interviewRefreshTrigger}
            onCreateInterview={(applicationId) => {
              setPreselectedAppId(applicationId)
              setCreateInterviewOpen(true)
            }}
            onOpenInterviewDetail={(interview) => {
              setDetailInterview(interview)
            }}
          />
        )
      case 'settings':
        return (
          <SettingsPage
            user={user}
            onProfileOpen={() => setIsProfileModalOpen(true)}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar
        user={user}
        scanning={scanning}
        onScan={handleScan}
        onSettingsOpen={() => setActiveTab('settings')}
        onProfileOpen={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {scanBanner && (
        <div className={`fixed top-16 left-0 right-0 z-30 px-4 py-2 text-sm text-center font-medium transition-all ${
          scanBanner.type === 'success'
            ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-b border-green-200 dark:border-green-800'
            : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-b border-red-200 dark:border-red-800'
        }`}>
          {scanBanner.message}
          <button onClick={() => setScanBanner(null)} className="ml-3 opacity-60 hover:opacity-100" aria-label="Dismiss">✕</button>
        </div>
      )}

      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        applicationCount={activeApplicationCount}
      />

      <main className={`pt-16 md:ml-[200px] pb-24 md:pb-8 min-h-screen${scanBanner ? " mt-9" : ""}`}>
        <div className="p-4 md:p-6">
          {activeTab !== 'settings' && (
            <DailyEncouragement
              name={user?.name}
              appliedToday={applications.filter(a => {
                const d = a.appliedDate || a.createdAt
                return d ? new Date(d).toDateString() === new Date().toDateString() : false
              }).length}
              goal={user?.dailyApplicationGoal ?? 6}
            />
          )}
          {renderContent()}
        </div>
      </main>

      <BottomTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        applicationCount={activeApplicationCount}
      />

      {isProfileModalOpen && user?.id && (
        <EnhancedProfileEditor
          userId={user.id}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

      {editingApp && (
        <ApplicationModal
          isOpen={true}
          onClose={() => setEditingApp(null)}
          onSubmit={handleEditApplication}
          application={editingApp}
        />
      )}

      {createInterviewOpen && (
        <CreateInterviewModal
          isOpen={createInterviewOpen}
          onClose={() => setCreateInterviewOpen(false)}
          preselectedApplicationId={preselectedAppId}
          onSuccess={() => {
            setCreateInterviewOpen(false)
            setInterviewRefreshTrigger(t => t + 1)
            fetchApplications()
          }}
        />
      )}

      {detailInterview && (
        <InterviewDetailModal
          isOpen={!!detailInterview}
          interview={detailInterview}
          onClose={() => setDetailInterview(null)}
          onSuccess={() => {
            setInterviewRefreshTrigger(t => t + 1)
            fetchApplications()
          }}
        />
      )}
    </div>
  )
}
