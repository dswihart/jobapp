'use client'

import { useEffect, useState } from 'react'
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Application {
  id: string
  company: string
  role: string
}

interface InterviewNotesModalProps {
  isOpen: boolean
  onClose: () => void
  application: Application | null
  onSuccess: () => void
}

interface InterviewDetailsResponse {
  interviewDate?: string | null
  interviewTime?: string | null
  interviewType?: string | null
  interviewRound?: number | null
  interviewNotes?: string | null
  interviewStatus?: string | null
  postInterviewNotes?: string | null
  transcript?: string | null
  companyFeedback?: string | null
}

export default function InterviewNotesModal({
  isOpen,
  onClose,
  application,
  onSuccess,
}: InterviewNotesModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState('')
  const [details, setDetails] = useState<InterviewDetailsResponse>({
    interviewDate: '',
    interviewTime: '',
    interviewType: 'video',
    interviewRound: 1,
    interviewNotes: '',
    interviewStatus: 'completed',
    postInterviewNotes: '',
    transcript: '',
    companyFeedback: '',
  })

  useEffect(() => {
    if (!application || !isOpen) {
      return
    }

    let active = true

    const loadDetails = async () => {
      setLoadingDetails(true)
      setError('')

      try {
        const response = await fetch(`/api/applications/${application.id}/interview`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load interview details')
        }

        if (!active) {
          return
        }

        setDetails({
          interviewDate: data.interviewDate || '',
          interviewTime: data.interviewTime || '',
          interviewType: data.interviewType || 'video',
          interviewRound: data.interviewRound || 1,
          interviewNotes: data.interviewNotes || '',
          interviewStatus: data.interviewStatus || 'completed',
          postInterviewNotes: data.postInterviewNotes || '',
          transcript: data.transcript || '',
          companyFeedback: data.companyFeedback || '',
        })
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load interview details')
        }
      } finally {
        if (active) {
          setLoadingDetails(false)
        }
      }
    }

    loadDetails()

    return () => {
      active = false
    }
  }, [application, isOpen])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!application) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/applications/${application.id}/interview`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewDate: details.interviewDate
            ? details.interviewDate.split('T')[0]
            : null,
          interviewTime: details.interviewTime || null,
          interviewType: details.interviewType || 'video',
          interviewRound: details.interviewRound || 1,
          interviewNotes: details.interviewNotes || null,
          interviewStatus: details.interviewStatus || 'completed',
          postInterviewNotes: details.postInterviewNotes || null,
          transcript: details.transcript || null,
          companyFeedback: details.companyFeedback || null,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save interview notes')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save interview notes')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !application) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Interview Notes
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {application.company} · {application.role}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {loadingDetails && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg">
                Loading interview details...
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interview Status
              </label>
              <select
                value={details.interviewStatus || 'completed'}
                onChange={(e) => setDetails({ ...details, interviewStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Post-Interview Notes
              </label>
              <textarea
                value={details.postInterviewNotes || ''}
                onChange={(e) => setDetails({ ...details, postInterviewNotes: e.target.value })}
                rows={6}
                placeholder="How did it go? What stood out? What follow-up items do you have?"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company Feedback
              </label>
              <textarea
                value={details.companyFeedback || ''}
                onChange={(e) => setDetails({ ...details, companyFeedback: e.target.value })}
                rows={4}
                placeholder="Feedback from the recruiter or interviewers..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Detailed Transcript
              </label>
              <textarea
                value={details.transcript || ''}
                onChange={(e) => setDetails({ ...details, transcript: e.target.value })}
                rows={12}
                placeholder="Paste detailed notes or the full interview transcript here..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 resize-y"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || loadingDetails}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? 'Saving...' : 'Save Interview Notes'}
              </button>
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
