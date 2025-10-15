'use client'
import { useState, useEffect } from 'react'
import { BellIcon, XMarkIcon, SparklesIcon, TrashIcon } from '@heroicons/react/24/outline'

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

interface AlertsPanelProps {
  userId: string
}

export default function AlertsPanel({ userId }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadAlerts = async () => {
    if (!userId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/alerts?userId=${userId}`)
      const data = await response.json()
      if (data.success) {
        setAlerts(data.alerts)
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        // Remove from local state
        setAlerts(alerts.filter(a => a.id !== alertId))
      }
    } catch (error) {
      console.error('Failed to delete alert:', error)
    }
  }

  const clearAllAlerts = async () => {
    if (!confirm('Are you sure you want to clear all alerts?')) return

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

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 60000)
    return () => clearInterval(interval)
  }, [userId])

  const unreadCount = alerts.filter(a => !a.isRead).length

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true)
          loadAlerts()
        }}
        className="relative p-2 rounded-lg transition-colors bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
      >
        <BellIcon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-neutral-700">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <BellIcon className="h-6 w-6" />
                Job Alerts
                {alerts.length > 0 && (
                  <span className="text-sm font-normal text-gray-500">
                    ({alerts.length})
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                {alerts.length > 0 && (
                  <button
                    onClick={clearAllAlerts}
                    className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg transition-colors"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <BellIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No new alerts</p>
                  <p className="text-sm mt-2">We will notify you when new job opportunities are found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.isRead
                          ? 'bg-gray-50 dark:bg-neutral-700/50 border-gray-200 dark:border-neutral-600'
                          : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <SparklesIcon className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium">{alert.message}</p>
                          {alert.opportunity && (
                            <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              <p>Company: {alert.opportunity.company}</p>
                              <p>Fit Score: {alert.opportunity.fitScore}%</p>
                              <a
                                href={alert.opportunity.jobUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 dark:text-purple-400 hover:underline"
                              >
                                View Job Posting →
                              </a>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete alert"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
