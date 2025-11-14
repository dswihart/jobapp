'use client'

import { useState, useEffect } from 'react'
import {
  BellIcon,
  XMarkIcon,
  SparklesIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface Alert {
  id: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  opportunity?: {
    id: string
    title: string
    company: string
    fitScore: number
    jobUrl: string
  }
}

interface FollowUp {
  id: string
  title: string
  description: string | null
  dueDate: string
  priority: string
  type: string
  completed: boolean
  application?: {
    company: string
    role: string
    status: string
  }
}

interface UnifiedNotificationsPanelProps {
  userId: string
}

type NotificationItem = {
  id: string
  type: 'alert' | 'followup' | 'overdue'
  title: string
  message: string
  timestamp: string
  priority?: string
  data: Alert | FollowUp
}

export default function UnifiedNotificationsPanel({ userId }: UnifiedNotificationsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([])
  const [overdueFollowUps, setOverdueFollowUps] = useState<FollowUp[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'jobs' | 'tasks'>('all')

  const loadAlerts = async () => {
    if (!userId) return

    try {
      const response = await fetch(`/api/alerts?userId=${userId}`)
      const data = await response.json()
      if (data.success) {
        setAlerts(data.alerts)
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    }
  }

  const fetchFollowUps = async () => {
    try {
      const response = await fetch(`/api/followups?userId=${userId}`)
      const data = await response.json()

      if (data.upcoming) {
        setUpcomingFollowUps(data.upcoming)
        setOverdueFollowUps(data.overdue || [])
      }
    } catch (error) {
      console.error('Error fetching follow-ups:', error)
    }
  }

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadAlerts(), fetchFollowUps()])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadAll, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [userId])

  const deleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setAlerts(alerts.filter(a => a.id !== alertId))
      }
    } catch (error) {
      console.error('Failed to delete alert:', error)
    }
  }

  const markFollowUpComplete = async (followUpId: string) => {
    try {
      await fetch('/api/followups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpId, completed: true })
      })
      await fetchFollowUps()
    } catch (error) {
      console.error('Error marking follow-up as complete:', error)
    }
  }

  const clearAllAlerts = async () => {
    if (!confirm('Are you sure you want to clear all job alerts?')) return

    try {
      const response = await fetch(`/api/alerts?userId=${userId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setAlerts([])
      }
    } catch (error) {
      console.error('Failed to clear alerts:', error)
    }
  }

  // Combine all notifications
  const allNotifications: NotificationItem[] = [
    ...alerts.map(alert => ({
      id: alert.id,
      type: 'alert' as const,
      title: alert.opportunity?.company || 'Job Alert',
      message: alert.message,
      timestamp: alert.createdAt,
      data: alert
    })),
    ...overdueFollowUps.map(fu => ({
      id: fu.id,
      type: 'overdue' as const,
      title: fu.title,
      message: fu.application ? `${fu.application.company} - ${fu.application.role}` : 'Task overdue',
      timestamp: fu.dueDate,
      priority: fu.priority,
      data: fu
    })),
    ...upcomingFollowUps.map(fu => ({
      id: fu.id,
      type: 'followup' as const,
      title: fu.title,
      message: fu.application ? `${fu.application.company} - ${fu.application.role}` : 'Upcoming task',
      timestamp: fu.dueDate,
      priority: fu.priority,
      data: fu
    }))
  ]

  // Filter based on active tab
  const filteredNotifications = allNotifications.filter(notif => {
    if (activeTab === 'all') return true
    if (activeTab === 'jobs') return notif.type === 'alert'
    if (activeTab === 'tasks') return notif.type === 'followup' || notif.type === 'overdue'
    return true
  })

  // Sort by timestamp (newest first)
  filteredNotifications.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const totalCount = allNotifications.length
  const unreadAlertsCount = alerts.filter(a => !a.isRead).length
  const overdueCount = overdueFollowUps.length

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMs < 0) {
      const absDiffHours = Math.abs(diffHours)
      const absDiffDays = Math.abs(diffDays)
      if (absDiffHours < 24) {
        return `${absDiffHours} hours ago`
      } else {
        return `${absDiffDays} days ago`
      }
    } else if (diffHours < 1) {
      return 'In less than 1 hour'
    } else if (diffHours < 24) {
      return `In ${diffHours} hours`
    } else {
      return `In ${diffDays} days`
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <BellIcon className="h-6 w-6" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto bottom-0 sm:bottom-auto sm:right-0 sm:top-auto mt-0 sm:mt-2 w-auto sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    activeTab === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    activeTab === 'jobs'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Jobs ({alerts.length})
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    activeTab === 'tasks'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Tasks ({upcomingFollowUps.length + overdueFollowUps.length})
                </button>
              </div>

              {activeTab === 'jobs' && alerts.length > 0 && (
                <button
                  onClick={clearAllAlerts}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Clear all job alerts
                </button>
              )}
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Loading...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        notif.type === 'overdue' ? 'bg-red-50 dark:bg-red-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 ${
                          notif.type === 'alert' ? 'text-blue-500' :
                          notif.type === 'overdue' ? 'text-red-500' :
                          'text-yellow-500'
                        }`}>
                          {notif.type === 'alert' ? (
                            <SparklesIcon className="h-5 w-5" />
                          ) : notif.type === 'overdue' ? (
                            <ClockIcon className="h-5 w-5" />
                          ) : (
                            <CheckCircleIcon className="h-5 w-5" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notif.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {notif.message}
                          </p>

                          {/* Alert specific details */}
                          {notif.type === 'alert' && (notif.data as Alert).opportunity && (
                            <div className="mt-1">
                              <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                                {(notif.data as Alert).opportunity?.fitScore}% match
                              </span>
                            </div>
                          )}

                          {/* Follow-up specific details */}
                          {(notif.type === 'followup' || notif.type === 'overdue') && (
                            <div className="mt-1">
                              <span className={`text-xs px-2 py-1 rounded ${
                                (notif.data as FollowUp).priority === 'high'
                                  ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                  : (notif.data as FollowUp).priority === 'medium'
                                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                              }`}>
                                {(notif.data as FollowUp).priority} priority
                              </span>
                            </div>
                          )}

                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatDate(notif.timestamp)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex gap-1">
                          {notif.type === 'alert' && (
                            <>
                              {(notif.data as Alert).opportunity && (
                                <a
                                  href={(notif.data as Alert).opportunity?.jobUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs"
                                >
                                  View
                                </a>
                              )}
                              <button
                                onClick={() => deleteAlert(notif.id)}
                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {(notif.type === 'followup' || notif.type === 'overdue') && (
                            <button
                              onClick={() => markFollowUpComplete(notif.id)}
                              className="text-green-600 hover:text-green-700 dark:text-green-400 text-xs"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
