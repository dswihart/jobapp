'use client'
import { Cog6ToothIcon, UserCircleIcon, MagnifyingGlassIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import ThemeToggle from '../ThemeToggle'
import UnifiedNotificationsPanel from '../UnifiedNotificationsPanel'

interface User {
  id: string
  name?: string
  email: string
}

interface TopBarProps {
  user: User | null
  scanning: boolean
  onScan: () => void
  onSettingsOpen: () => void
  onProfileOpen: () => void
  onLogout: () => void
}

export default function TopBar({ user, scanning, onScan, onSettingsOpen, onProfileOpen, onLogout }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between h-full px-4 gap-4">
        {/* Logo */}
        <div className="flex-shrink-0">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            <span className="hidden sm:inline">Job Tracker</span>
            <span className="sm:hidden">JT</span>
          </h1>
        </div>

        {/* H2: Scan Now — simple inline button, result shown as banner in AppShell */}
        {user?.id && (
          <div className="flex-1 flex justify-center">
            <button
              onClick={onScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              <MagnifyingGlassIcon className={`h-4 w-4 ${scanning ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{scanning ? 'Scanning...' : 'Scan Now'}</span>
              <span className="sm:hidden">{scanning ? '...' : 'Scan'}</span>
            </button>
          </div>
        )}

        {/* Right utilities */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <ThemeToggle />
          {user?.id && <UnifiedNotificationsPanel userId={user.id} />}
          <button
            onClick={onSettingsOpen}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            aria-label="Settings"
          >
            <Cog6ToothIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={onProfileOpen}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            aria-label="Profile"
          >
            <UserCircleIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            <span className="hidden lg:inline text-sm font-medium text-gray-700 dark:text-gray-300">
              {user?.name || user?.email?.split('@')[0] || 'Profile'}
            </span>
          </button>
          {/* H1: Logout button */}
          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>
    </header>
  )
}
