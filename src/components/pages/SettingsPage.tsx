'use client'
import { UserCircleIcon } from '@heroicons/react/24/outline'
import JobSourcesManager from '../JobSourcesManager'
import ResumeManager from '../ResumeManager'
import JobSearchSettings from '../JobSearchSettings'

interface User {
  id: string
  name?: string
  email: string
}

interface SettingsPageProps {
  user: User | null
  onProfileOpen: () => void
}

export default function SettingsPage({ user, onProfileOpen }: SettingsPageProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Settings</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your job search configuration</p>
      </div>

      {/* Profile */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Profile</h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCircleIcon className="h-10 w-10 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">{user?.name || 'Your Name'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={onProfileOpen}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Edit Profile
          </button>
        </div>
      </section>

      {/* Job Search Settings */}
      {user?.id && (
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Job Search Settings</h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <JobSearchSettings userId={user.id} defaultOpen={true} />
          </div>
        </section>
      )}

      {/* Job Sources */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Job Sources</h3>
        <JobSourcesManager userId={user?.id || ''} />
      </section>

      {/* Resumes */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">My Resumes</h3>
        <ResumeManager />
      </section>
    </div>
  )
}
