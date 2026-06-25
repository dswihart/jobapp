'use client'
import {
  BriefcaseIcon,
  CheckCircleIcon,
  CalendarIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

type TabName = 'opportunities' | 'applications' | 'interviews' | 'settings'

interface BottomTabBarProps {
  activeTab: TabName
  onTabChange: (tab: TabName) => void
  applicationCount: number
}

export default function BottomTabBar({ activeTab, onTabChange, applicationCount }: BottomTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center">
        <button
          onClick={() => onTabChange('opportunities')}
          className={`flex flex-col items-center py-2 flex-1 text-xs font-medium transition-colors ${
            activeTab === 'opportunities'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <BriefcaseIcon className="h-6 w-6 mb-0.5" />
          <span>Opps</span>
        </button>

        <button
          onClick={() => onTabChange('applications')}
          className={`flex flex-col items-center py-2 flex-1 text-xs font-medium transition-colors relative ${
            activeTab === 'applications'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <div className="relative">
            <CheckCircleIcon className="h-6 w-6 mb-0.5" />
            {applicationCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                {applicationCount > 9 ? '9+' : applicationCount}
              </span>
            )}
          </div>
          <span>Apps</span>
        </button>

        <button
          onClick={() => onTabChange('interviews')}
          className={`flex flex-col items-center py-2 flex-1 text-xs font-medium transition-colors ${
            activeTab === 'interviews'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <CalendarIcon className="h-6 w-6 mb-0.5" />
          <span>Interviews</span>
        </button>

        <a
          href="/stats"
          className="flex flex-col items-center py-2 flex-1 text-xs font-medium text-gray-500 dark:text-gray-400 transition-colors"
        >
          <ChartBarIcon className="h-6 w-6 mb-0.5" />
          <span>Stats</span>
        </a>

        <a
          href="/resume-tailor"
          className="flex flex-col items-center py-2 flex-1 text-xs font-medium text-gray-500 dark:text-gray-400 transition-colors"
        >
          <SparklesIcon className="h-6 w-6 mb-0.5" />
          <span>Tailor</span>
        </a>
      </div>
    </nav>
  )
}
