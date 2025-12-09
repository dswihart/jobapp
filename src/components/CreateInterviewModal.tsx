'use client'

import { useState, useEffect } from 'react'
import {
  XMarkIcon,
  CalendarIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

interface Application {
  id: string
  company: string
  role: string
  status: string
}

interface CreateInterviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedApplicationId?: string
}

export default function CreateInterviewModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedApplicationId
}: CreateInterviewModalProps) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    applicationId: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: '60',
    interviewType: 'video',
    round: 1,
    stage: '',
    location: '',
    meetingLink: '',
    preparationNotes: '',
  })

  const [interviewers, setInterviewers] = useState<Array<{
    name: string
    title: string
    email: string
  }>>([])

  const [newInterviewer, setNewInterviewer] = useState({
    name: '',
    title: '',
    email: '',
  })

  useEffect(() => {
    if (isOpen) {
      fetchApplications()
      if (preselectedApplicationId) {
        setFormData(prev => ({ ...prev, applicationId: preselectedApplicationId }))
      }
    }
  }, [isOpen, preselectedApplicationId])

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications')
      const data = await response.json()
      if (Array.isArray(data)) {
        // Filter to only show applications that are in interviewing-relevant statuses
        const relevantApps = data.filter((app: Application) =>
          ['APPLIED', 'INTERVIEWING', 'PENDING'].includes(app.status)
        )
        setApplications(relevantApps)
      }
    } catch (err) {
      console.error('Error fetching applications:', err)
    }
  }

  const handleAddInterviewer = () => {
    if (newInterviewer.name.trim()) {
      setInterviewers([...interviewers, { ...newInterviewer }])
      setNewInterviewer({ name: '', title: '', email: '' })
    }
  }

  const handleRemoveInterviewer = (index: number) => {
    setInterviewers(interviewers.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.applicationId || !formData.scheduledDate) {
      setError('Please select an application and date')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: formData.applicationId,
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime || null,
          duration: formData.duration ? parseInt(formData.duration) : null,
          interviewType: formData.interviewType,
          round: formData.round,
          stage: formData.stage || null,
          location: formData.location || null,
          meetingLink: formData.meetingLink || null,
          preparationNotes: formData.preparationNotes || null,
          interviewers: interviewers.length > 0 ? interviewers : undefined,
        })
      })

      const data = await response.json()

      if (data.success) {
        // Reset form
        setFormData({
          applicationId: '',
          scheduledDate: '',
          scheduledTime: '',
          duration: '60',
          interviewType: 'video',
          round: 1,
          stage: '',
          location: '',
          meetingLink: '',
          preparationNotes: '',
        })
        setInterviewers([])
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'Failed to create interview')
      }
    } catch (err) {
      setError('Error creating interview')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

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
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Application Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Application *
              </label>
              <select
                value={formData.applicationId}
                onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select an application...</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company} - {app.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="60"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Type & Round */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interview Type
                </label>
                <select
                  value={formData.interviewType}
                  onChange={(e) => setFormData({ ...formData, interviewType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  Round
                </label>
                <select
                  value={formData.round}
                  onChange={(e) => setFormData({ ...formData, round: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {[1, 2, 3, 4, 5].map((r) => (
                    <option key={r} value={r}>Round {r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stage
                </label>
                <input
                  type="text"
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  placeholder="e.g., Technical, HR"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Location & Link */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location / Platform
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Zoom, Google Meet, Office"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Link
                </label>
                <input
                  type="url"
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Interviewers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interviewers
              </label>
              <div className="space-y-2">
                {interviewers.map((interviewer, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                    <span className="flex-1 text-gray-900 dark:text-white">
                      {interviewer.name}
                      {interviewer.title && <span className="text-gray-500 dark:text-gray-400 ml-1">({interviewer.title})</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInterviewer(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newInterviewer.name}
                    onChange={(e) => setNewInterviewer({ ...newInterviewer, name: e.target.value })}
                    placeholder="Interviewer name"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <input
                    type="text"
                    value={newInterviewer.title}
                    onChange={(e) => setNewInterviewer({ ...newInterviewer, title: e.target.value })}
                    placeholder="Title (optional)"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddInterviewer}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Preparation Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preparation Notes
              </label>
              <textarea
                value={formData.preparationNotes}
                onChange={(e) => setFormData({ ...formData, preparationNotes: e.target.value })}
                rows={4}
                placeholder="Topics to prepare, questions to ask, research notes..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Creating...' : 'Create Interview'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
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
