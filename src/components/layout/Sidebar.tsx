'use client'
import { usePathname } from 'next/navigation'
import {
  BriefcaseIcon,
  CheckCircleIcon,
  CalendarIcon,
  ChartBarIcon,
  SparklesIcon,
  BuildingOffice2Icon,
  KeyIcon,
} from '@heroicons/react/24/outline'

type TabName = 'opportunities' | 'applications' | 'interviews' | 'settings'

interface SidebarProps {
  activeTab: TabName
  onTabChange: (tab: TabName) => void
  applicationCount: number
}

const navItems = [
  { tab: 'opportunities' as TabName, label: 'Opportunities', icon: BriefcaseIcon },
  { tab: 'applications' as TabName, label: 'Applications', icon: CheckCircleIcon },
  { tab: 'interviews' as TabName, label: 'Interviews', icon: CalendarIcon },
]

const linkItems = [
  { href: '/stats', label: 'Stats & Goals', icon: ChartBarIcon },
  { href: '/resume-tailor', label: 'Resume Tailor', icon: SparklesIcon },
  { href: '/companies', label: 'Target Companies', icon: BuildingOffice2Icon },
  { href: '/account', label: 'Account', icon: KeyIcon },
]

export default function Sidebar({ activeTab, onTabChange, applicationCount }: SidebarProps) {
  const pathname = usePathname()
  return (
    <aside className="fixed top-16 left-0 bottom-0 w-[200px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-30 hidden md:flex flex-col py-4">
      <nav className="flex flex-col gap-1 px-2">
        {navItems.map(({ tab, label, icon: Icon }) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {tab === 'applications' && applicationCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 font-medium">
                  {applicationCount}
                </span>
              )}
            </button>
          )
        })}

        <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

        {linkItems.map(({ href, label, icon: Icon }) => {
          const isLinkActive = pathname === href
          return (
            <a
              key={href}
              href={href}
              aria-current={isLinkActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isLinkActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{label}</span>
            </a>
          )
        })}
      </nav>
    </aside>
  )
}
