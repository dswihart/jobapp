'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline'

interface Application {
  id: string
  company: string
  role: string
  interviewDate?: string | null
  interviewTime?: string | null
  interviewType?: string | null
  interviewRound?: number | null
  interviewNotes?: string | null
}

interface InterviewModalProps {
  isOpen: boolean
  onClose: () => void
  application: Application | null
  onSuccess: () => void
}

export default function InterviewModal({ isOpen, onClose, application, onSuccess }: InterviewModalProps) {
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewTime, setInterviewTime] = useState('')
  const [interviewType, setInterviewType] = useState('video')
  const [interviewRound, setInterviewRound] = useState(1)
  const [interviewNotes, setInterviewNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (application && isOpen) {
      // Pre-fill if interview details already exist
      setInterviewDate(application.interviewDate ? application.interviewDate.split('T')[0] : '')
      setInterviewTime(application.interviewTime || '')
      setInterviewType(application.interviewType || 'video')
      setInterviewRound(application.interviewRound || 1)
      setInterviewNotes(application.interviewNotes || '')
    }
  }, [application, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!application) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/applications/${application.id}/interview`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewDate: interviewDate ? new Date(interviewDate + 'T' + (interviewTime || '00:00')).toISOString() : null,
          interviewTime,
          interviewType,
          interviewRound,
          interviewNotes
        })
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
        // Reset form
        setInterviewDate('')
        setInterviewTime('')
        setInterviewType('video')
        setInterviewRound(1)
        setInterviewNotes('')
      } else {
        setError(data.error || 'Failed to schedule interview')
      }
    } catch (err) {
      setError('Error scheduling interview')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClearInterview = async () => {
    if (!application || !confirm('Are you sure you want to clear the interview details?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/applications/${application.id}/interview`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewDate: null,
          interviewTime: null,
          interviewType: null,
          interviewRound: null,
          interviewNotes: null
        })
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
      }
    } catch (err) {
      setError('Error clearing interview')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !application) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Schedule Interview
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="font-medium text-gray-900 dark:text-white">{application.company}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{application.role}</div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interview Date *
                </label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interview Time
                </label>
                <input
                  type="time"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interview Type
                </label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="phone">Phone</option>
                  <option value="video">Video Call</option>
                  <option value="in-person">In Person</option>
                  <option value="panel">Panel Interview</option>
                  <option value="technical">Technical Interview</option>
                  <option value="behavioral">Behavioral Interview</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interview Round
                </label>
                <select
                  value={interviewRound}
                  onChange={(e) => setInterviewRound(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1st Round (Initial Screening)</option>
                  <option value={2}>2nd Round</option>
                  <option value={3}>3rd Round</option>
                  <option value={4}>4th Round</option>
                  <option value={5}>Final Round</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interview Notes
              </label>
              <textarea
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                rows={4}
                placeholder="Add notes about the interview (topics to prepare, interviewer names, meeting link, etc.)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>📅 Automatic Follow-ups:</strong>
                <ul className="mt-2 space-y-1 ml-4 list-disc">
                  <li>24 hours before: Preparation reminder</li>
                  <li>24 hours after: Thank you email reminder</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? 'Saving...' : 'Schedule Interview'}
              </button>

              {application.interviewDate && (
                <button
                  type="button"
                  onClick={handleClearInterview}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Clear
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}