'use client'

import { useState, useEffect } from 'react'
import { BellIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface FollowUp {
  id: string
  title: string
  description: string | null
  dueDate: string
  priority: string
  type: string
  completed: boolean
  application: {
    company: string
    role: string
    status: string
  }
}

interface NotificationPanelProps {
  userId: string
}

export default function NotificationPanel({ userId }: NotificationPanelProps) {
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([])
  const [overdueFollowUps, setOverdueFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFollowUps()
    // Refresh every 5 minutes
    const interval = setInterval(fetchFollowUps, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [userId])

  const markAsComplete = async (followUpId: string) => {
    try {
      await fetch('/api/followups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpId, completed: true })
      })
      fetchFollowUps()
    } catch (error) {
      console.error('Error marking follow-up as complete:', error)
    }
  }

  const totalNotifications = upcomingFollowUps.length + overdueFollowUps.length

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 0) {
      return `${Math.abs(diffHours)} hours ago`
    } else if (diffHours < 1) {
      return 'In less than 1 hour'
    } else if (diffHours < 24) {
      return `In ${diffHours} hours`
    } else if (diffDays === 1) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400'
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'low':
        return 'text-green-600 dark:text-green-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (loading) return null

  return (
    <div className="relative">
      {/* Notification Bell Icon */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <BellIcon className="h-6 w-6" />
        {totalNotifications > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {totalNotifications}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-full sm:w-96 max-w-md mx-auto sm:mx-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {totalNotifications === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No pending notifications
              </div>
            ) : (
              <>
                {/* Overdue Follow-ups */}
                {overdueFollowUps.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20">
                    <div className="px-4 py-2 text-xs font-semibold text-red-800 dark:text-red-200 uppercase">
                      Overdue ({overdueFollowUps.length})
                    </div>
                    {overdueFollowUps.map((followUp) => (
                      <div
                        key={followUp.id}
                        className="px-4 py-3 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${getPriorityColor(followUp.priority)}`}>
                              {followUp.title}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {followUp.application.company} - {followUp.application.role}
                            </div>
                            {followUp.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {followUp.description}
                              </div>
                            )}
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {formatDate(followUp.dueDate)}
                            </div>
                          </div>
                          <button
                            onClick={() => markAsComplete(followUp.id)}
                            className="ml-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                            title="Mark as complete"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upcoming Follow-ups */}
                {upcomingFollowUps.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-900">
                      Upcoming ({upcomingFollowUps.length})
                    </div>
                    {upcomingFollowUps.map((followUp) => (
                      <div
                        key={followUp.id}
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${getPriorityColor(followUp.priority)}`}>
                              {followUp.title}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {followUp.application.company} - {followUp.application.role}
                            </div>
                            {followUp.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {followUp.description}
                              </div>
                            )}
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              {formatDate(followUp.dueDate)}
                            </div>
                          </div>
                          <button
                            onClick={() => markAsComplete(followUp.id)}
                            className="ml-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                            title="Mark as complete"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
