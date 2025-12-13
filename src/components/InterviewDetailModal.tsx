'use client'

import { useState, useEffect } from 'react'
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  VideoCameraIcon,
  PhoneIcon,
  MapPinIcon,
  UserGroupIcon,
  DocumentTextIcon,
  SparklesIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'

interface Interviewer {
  id: string
  name: string
  title?: string
  department?: string
  email?: string
  linkedInUrl?: string
  notes?: string
  impression?: string
  topics: string[]
}

interface Interview {
  id: string
  applicationId: string
  scheduledDate: string
  scheduledTime?: string
  duration?: number
  actualDate?: string
  interviewType: string
  round: number
  stage?: string
  location?: string
  meetingLink?: string
  status: string
  outcome?: string
  preparationNotes?: string
  postInterviewNotes?: string
  transcript?: string
  aiAnalysis?: {
    overallAssessment?: {
      score?: number
      summary?: string
      strengths?: string[]
      areasForImprovement?: string[]
    }
    keyMoments?: Array<{
      type: string
      description: string
      impact: string
    }>
    questionsAsked?: Array<{
      question: string
      yourResponse: string
      evaluation: string
      suggestedImprovement: string
    }>
    interviewerSentiment?: {
      overall: string
      signals: string[]
      concerns: string[]
    }
    thankyouEmailPoints?: string[]
    nextRoundPreparation?: {
      likelyTopics: string[]
      questionsToAsk: string[]
      areasToStudy: string[]
    }
  }
  followUpSteps?: Array<{ priority: string; action: string; timing: string; reason: string }>
  analyzedAt?: string
  companyFeedback?: string
  interviewers: Interviewer[]
  application?: {
    id: string
    company: string
    role: string
    status: string
  }
}

interface InterviewDetailModalProps {
  isOpen: boolean
  onClose: () => void
  interview: Interview | null
  onSuccess: () => void
}

type TabType = 'details' | 'interviewers' | 'transcript' | 'analysis'

export default function InterviewDetailModal({
  isOpen,
  onClose,
  interview,
  onSuccess
}: InterviewDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  // Local interview state to update after analysis
  const [localInterview, setLocalInterview] = useState<Interview | null>(interview)

  // Form states
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    duration: '',
    interviewType: 'video',
    round: 1,
    stage: '',
    location: '',
    meetingLink: '',
    status: 'scheduled',
    outcome: '',
    preparationNotes: '',
    postInterviewNotes: '',
    transcript: '',
    companyFeedback: '',
  })

  // Interviewer form
  const [newInterviewer, setNewInterviewer] = useState({
    name: '',
    title: '',
    department: '',
    email: '',
    linkedInUrl: '',
    notes: '',
    impression: '',
  })
  const [interviewers, setInterviewers] = useState<Interviewer[]>([])

  useEffect(() => {
    if (interview && isOpen) {
      setFormData({
        scheduledDate: interview.scheduledDate ? interview.scheduledDate.split('T')[0] : '',
        scheduledTime: interview.scheduledTime || '',
        duration: interview.duration?.toString() || '',
        interviewType: interview.interviewType || 'video',
        round: interview.round || 1,
        stage: interview.stage || '',
        location: interview.location || '',
        meetingLink: interview.meetingLink || '',
        status: interview.status || 'scheduled',
        outcome: interview.outcome || '',
        preparationNotes: interview.preparationNotes || '',
        postInterviewNotes: interview.postInterviewNotes || '',
        transcript: interview.transcript || '',
        companyFeedback: interview.companyFeedback || '',
      })
      setInterviewers(interview.interviewers || [])
      setEditMode(false)
      setLocalInterview(interview)
      setActiveTab("details")
    }
  }, [interview, isOpen])

  const handleSave = async () => {
    if (!interview) return
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/interviews/' + interview.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime || null,
          duration: formData.duration ? parseInt(formData.duration) : null,
          interviewType: formData.interviewType,
          round: formData.round,
          stage: formData.stage || null,
          location: formData.location || null,
          meetingLink: formData.meetingLink || null,
          status: formData.status,
          outcome: formData.outcome || null,
          preparationNotes: formData.preparationNotes || null,
          postInterviewNotes: formData.postInterviewNotes || null,
          transcript: formData.transcript || null,
          companyFeedback: formData.companyFeedback || null,
        })
      })

      const data = await response.json()
      if (data.success) {
        setEditMode(false)
        onSuccess()
      } else {
        setError(data.error || 'Failed to update interview')
      }
    } catch (err) {
      setError('Error updating interview')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddInterviewer = async () => {
    if (!interview || !newInterviewer.name.trim()) return
    setLoading(true)

    try {
      const response = await fetch('/api/interviews/' + interview.id + '/interviewers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInterviewer)
      })

      const data = await response.json()
      if (data.success) {
        setInterviewers([...interviewers, data.interviewer])
        setNewInterviewer({
          name: '',
          title: '',
          department: '',
          email: '',
          linkedInUrl: '',
          notes: '',
          impression: '',
        })
        onSuccess()
      }
    } catch (err) {
      console.error('Error adding interviewer:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeTranscript = async () => {
    if (!interview || !formData.transcript.trim()) return
    setAnalyzing(true)
    setError('')

    try {
      // First save the transcript if changed
      if (formData.transcript !== interview.transcript) {
        await fetch('/api/interviews/' + interview.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: formData.transcript })
        })
      }

      // Then analyze
      const response = await fetch('/api/interviews/' + interview.id + '/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      if (data.success) {
        // Update local interview with analysis data
        if (data.interview) {
          setLocalInterview(data.interview)
        }
        onSuccess()
        setActiveTab('analysis')
      } else {
        setError(data.error || 'Failed to analyze transcript')
      }
    } catch (err) {
      setError('Error analyzing transcript')
      console.error(err)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDelete = async () => {
    if (!interview || !confirm('Are you sure you want to delete this interview?')) return
    setLoading(true)

    try {
      const response = await fetch('/api/interviews/' + interview.id, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        onSuccess()
        onClose()
      }
    } catch (err) {
      console.error('Error deleting interview:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !interview) return null

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'details', label: 'Details', icon: <DocumentTextIcon className="h-4 w-4" /> },
    { id: 'interviewers', label: 'Interviewers', icon: <UserGroupIcon className="h-4 w-4" /> },
    { id: 'transcript', label: 'Transcript', icon: <DocumentTextIcon className="h-4 w-4" /> },
    { id: 'analysis', label: 'AI Analysis', icon: <SparklesIcon className="h-4 w-4" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {interview.application?.company} - Round {interview.round}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {interview.application?.role}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="p-2 text-green-600 hover:text-green-700"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-400 hover:text-red-600"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 -mb-4 border-b border-transparent">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === 'analysis' && localInterview?.aiAnalysis && (
                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs px-1.5 py-0.5 rounded">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      disabled={!editMode}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
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
                      disabled={!editMode}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      disabled={!editMode}
                      placeholder="60"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Interview Type
                    </label>
                    <select
                      value={formData.interviewType}
                      onChange={(e) => setFormData({ ...formData, interviewType: e.target.value })}
                      disabled={!editMode}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
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
                      disabled={!editMode}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
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
                      disabled={!editMode}
                      placeholder="e.g., Technical, Cultural Fit, Final"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      disabled={!editMode}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="rescheduled">Rescheduled</option>
                      <option value="no-show">No Show</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Outcome
                    </label>
                    <select
                      value={formData.outcome}
                      onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                      disabled={!editMode}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
                    >
                      <option value="">Not Set</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                      <option value="moved_forward">Moved Forward</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location / Platform
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    disabled={!editMode}
                    placeholder="e.g., Zoom, Google Meet, Office Address"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meeting Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.meetingLink}
                      onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                      disabled={!editMode}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
                    />
                    {formData.meetingLink && (
                      <a
                        href={formData.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <LinkIcon className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preparation Notes
                  </label>
                  <textarea
                    value={formData.preparationNotes}
                    onChange={(e) => setFormData({ ...formData, preparationNotes: e.target.value })}
                    disabled={!editMode}
                    rows={4}
                    placeholder="Topics to prepare, questions to ask, research notes..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Post-Interview Notes
                  </label>
                  <textarea
                    value={formData.postInterviewNotes}
                    onChange={(e) => setFormData({ ...formData, postInterviewNotes: e.target.value })}
                    disabled={!editMode}
                    rows={4}
                    placeholder="How it went, key moments, impressions..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Company Feedback
                  </label>
                  <textarea
                    value={formData.companyFeedback}
                    onChange={(e) => setFormData({ ...formData, companyFeedback: e.target.value })}
                    disabled={!editMode}
                    rows={3}
                    placeholder="Feedback received from the company..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Interviewers Tab */}
            {activeTab === 'interviewers' && (
              <div className="space-y-6">
                {/* Add New Interviewer */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Add Interviewer</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Name *"
                      value={newInterviewer.name}
                      onChange={(e) => setNewInterviewer({ ...newInterviewer, name: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Title/Role"
                      value={newInterviewer.title}
                      onChange={(e) => setNewInterviewer({ ...newInterviewer, title: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Department"
                      value={newInterviewer.department}
                      onChange={(e) => setNewInterviewer({ ...newInterviewer, department: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newInterviewer.email}
                      onChange={(e) => setNewInterviewer({ ...newInterviewer, email: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="url"
                      placeholder="LinkedIn URL"
                      value={newInterviewer.linkedInUrl}
                      onChange={(e) => setNewInterviewer({ ...newInterviewer, linkedInUrl: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white md:col-span-2"
                    />
                    <textarea
                      placeholder="Notes about this interviewer..."
                      value={newInterviewer.notes}
                      onChange={(e) => setNewInterviewer({ ...newInterviewer, notes: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white md:col-span-2 resize-none"
                      rows={2}
                    />
                  </div>
                  <button
                    onClick={handleAddInterviewer}
                    disabled={!newInterviewer.name.trim() || loading}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Interviewer
                  </button>
                </div>

                {/* Interviewers List */}
                <div className="space-y-4">
                  {interviewers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <UserGroupIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No interviewers added yet</p>
                    </div>
                  ) : (
                    interviewers.map((interviewer) => (
                      <div
                        key={interviewer.id}
                        className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{interviewer.name}</h4>
                            {interviewer.title && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{interviewer.title}</p>
                            )}
                            {interviewer.department && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{interviewer.department}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {interviewer.email && (
                              <a
                                href={'mailto:' + interviewer.email}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                Email
                              </a>
                            )}
                            {interviewer.linkedInUrl && (
                              <a
                                href={interviewer.linkedInUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                LinkedIn
                              </a>
                            )}
                          </div>
                        </div>
                        {interviewer.notes && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{interviewer.notes}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Transcript Tab */}
            {activeTab === 'transcript' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Paste your interview transcript here for AI analysis
                  </p>
                  <button
                    onClick={handleAnalyzeTranscript}
                    disabled={analyzing || !formData.transcript.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                  </button>
                </div>
                <textarea
                  value={formData.transcript}
                  onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                  rows={20}
                  placeholder="Paste your interview transcript here...

Example format:
Interviewer: Tell me about yourself.
Me: I'm a software engineer with 5 years of experience...

Interviewer: What's your experience with React?
Me: I've been working with React for the past 3 years..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none font-mono text-sm"
                />
                <p className="text-xs text-gray-400">
                  Tip: Include as much detail as possible for better AI analysis
                </p>
              </div>
            )}

            {/* Analysis Tab */}
            {activeTab === 'analysis' && (
              <div className="space-y-6">
                {!localInterview?.aiAnalysis ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <SparklesIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No AI analysis yet</p>
                    <p className="text-sm mt-1">Add a transcript and click &quot;Analyze with AI&quot; to get insights</p>
                  </div>
                ) : (
                  <>
                    {/* Overall Assessment */}
                    {localInterview?.aiAnalysis.overallAssessment && (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Overall Assessment</h3>
                        {localInterview?.aiAnalysis.overallAssessment.score && (
                          <div className="flex items-center gap-4 mb-4">
                            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                              {localInterview?.aiAnalysis.overallAssessment.score}/10
                            </div>
                          </div>
                        )}
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                          {localInterview?.aiAnalysis.overallAssessment.summary}
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                          {localInterview?.aiAnalysis.overallAssessment.strengths && (
                            <div>
                              <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Strengths</h4>
                              <ul className="space-y-1">
                                {localInterview?.aiAnalysis.overallAssessment.strengths.map((s, i) => (
                                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                    <span className="text-green-500">✓</span> {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {localInterview?.aiAnalysis.overallAssessment.areasForImprovement && (
                            <div>
                              <h4 className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">Areas to Improve</h4>
                              <ul className="space-y-1">
                                {localInterview?.aiAnalysis.overallAssessment.areasForImprovement.map((a, i) => (
                                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                    <span className="text-orange-500">→</span> {a}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Follow-up Steps */}
                    {localInterview?.followUpSteps && localInterview?.followUpSteps.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Follow-up Actions</h3>
                        <div className="space-y-3">
                          {localInterview?.followUpSteps.map((step, idx) => (
                            <div
                              key={idx}
                              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                            >
                              <div className="flex items-start gap-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  step.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                  step.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {step.priority}
                                </span>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{step.action}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    <span className="font-medium">When:</span> {step.timing}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    <span className="font-medium">Why:</span> {step.reason}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Thank You Email Points */}
                    {localInterview?.aiAnalysis.thankyouEmailPoints && localInterview?.aiAnalysis.thankyouEmailPoints.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Thank You Email Points</h3>
                        <ul className="space-y-2 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                          {localInterview?.aiAnalysis.thankyouEmailPoints.map((point, idx) => (
                            <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                              <span className="text-green-500">•</span> {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Questions Asked */}
                    {localInterview?.aiAnalysis.questionsAsked && localInterview?.aiAnalysis.questionsAsked.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Questions Analysis</h3>
                        <div className="space-y-4">
                          {localInterview?.aiAnalysis.questionsAsked.map((q, idx) => (
                            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <p className="font-medium text-gray-900 dark:text-white mb-2">&quot;{q.question}&quot;</p>
                              <div className="space-y-2 text-sm">
                                <p className="text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Your response:</span> {q.yourResponse}
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Evaluation:</span> {q.evaluation}
                                </p>
                                {q.suggestedImprovement && (
                                  <p className="text-blue-600 dark:text-blue-400">
                                    <span className="font-medium">Suggestion:</span> {q.suggestedImprovement}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next Round Preparation */}
                    {localInterview?.aiAnalysis.nextRoundPreparation && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Prepare for Next Round</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          {localInterview?.aiAnalysis.nextRoundPreparation.likelyTopics && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">Likely Topics</h4>
                              <ul className="space-y-1">
                                {localInterview?.aiAnalysis.nextRoundPreparation.likelyTopics.map((t, i) => (
                                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400">• {t}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {localInterview?.aiAnalysis.nextRoundPreparation.questionsToAsk && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-2">Questions to Ask</h4>
                              <ul className="space-y-1">
                                {localInterview?.aiAnalysis.nextRoundPreparation.questionsToAsk.map((q, i) => (
                                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400">• {q}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {localInterview?.aiAnalysis.nextRoundPreparation.areasToStudy && (
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Areas to Study</h4>
                              <ul className="space-y-1">
                                {localInterview?.aiAnalysis.nextRoundPreparation.areasToStudy.map((a, i) => (
                                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400">• {a}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
