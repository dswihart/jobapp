'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CalendarIcon,
  ClockIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  SparklesIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  VideoCameraIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
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
  aiAnalysis?: Record<string, unknown>
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

interface InterviewsSectionProps {
  onOpenInterviewDetail: (interview: Interview) => void
  onCreateInterview: (applicationId?: string) => void
  refreshTrigger?: number
}

export default function InterviewsSection({
  onOpenInterviewDetail,
  onCreateInterview,
  refreshTrigger
}: InterviewsSectionProps) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter === 'upcoming') {
        params.set('upcoming', 'true')
      } else if (filter === 'completed') {
        params.set('status', 'completed')
      }

      const response = await fetch('/api/interviews?' + params.toString())
      const data = await response.json()

      if (data.interviews) {
        setInterviews(data.interviews)
      }
    } catch (error) {
      console.error('Error fetching interviews:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchInterviews()
  }, [fetchInterviews, refreshTrigger])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'no-show': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getOutcomeIcon = (outcome?: string) => {
    switch (outcome) {
      case 'passed':
      case 'moved_forward':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'pending':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      default:
        return null
    }
  }

  const getInterviewTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <VideoCameraIcon className="h-4 w-4" />
      case 'phone': return <PhoneIcon className="h-4 w-4" />
      case 'in-person': return <MapPinIcon className="h-4 w-4" />
      default: return <CalendarIcon className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date()
  }

  const upcomingInterviews = interviews.filter(i =>
    isUpcoming(i.scheduledDate) && ['scheduled', 'rescheduled'].includes(i.status)
  )
  const pastInterviews = interviews.filter(i =>
    !isUpcoming(i.scheduledDate) || !['scheduled', 'rescheduled'].includes(i.status)
  )

  const displayInterviews = filter === 'upcoming' ? upcomingInterviews :
                           filter === 'completed' ? pastInterviews : interviews

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Interviews</h2>
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm px-2 py-0.5 rounded-full">
              {interviews.length}
            </span>
          </div>
          <button
            onClick={() => onCreateInterview()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Add Interview</span>
          </button>
        </div>

        <div className="flex gap-2">
          {(['all', 'upcoming', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : 'Past'}
              {f === 'upcoming' && upcomingInterviews.length > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {upcomingInterviews.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {displayInterviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No interviews found</p>
            <p className="text-sm mt-1">
              {filter === 'upcoming'
                ? 'Schedule your next interview to see it here'
                : 'Add interviews to track your progress'}
            </p>
          </div>
        ) : (
          displayInterviews.map((interview) => (
            <div key={interview.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {interview.application?.company || 'Unknown Company'}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {interview.application?.role || 'Unknown Role'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {formatDate(interview.scheduledDate)}
                    </span>
                    {interview.scheduledTime && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {interview.scheduledTime}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      {getInterviewTypeIcon(interview.interviewType)}
                      <span className="capitalize">{interview.interviewType}</span>
                    </span>
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
                      Round {interview.round}
                    </span>
                  </div>

                  {interview.interviewers.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <UserGroupIcon className="h-4 w-4" />
                      <span>{interview.interviewers.map(i => i.name).join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {getOutcomeIcon(interview.outcome || undefined)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                    {interview.status}
                  </span>
                  {interview.aiAnalysis && (
                    <SparklesIcon className="h-5 w-5 text-purple-500" title="AI Analysis Available" />
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === interview.id ? null : interview.id)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {expandedId === interview.id ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {expandedId === interview.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {interview.stage && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Stage:</span>
                        <span className="ml-2 text-gray-900 dark:text-white capitalize">{interview.stage}</span>
                      </div>
                    )}
                    {interview.location && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Location:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{interview.location}</span>
                      </div>
                    )}
                    {interview.duration && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{interview.duration} min</span>
                      </div>
                    )}
                    {interview.outcome && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Outcome:</span>
                        <span className="ml-2 text-gray-900 dark:text-white capitalize">{interview.outcome.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>

                  {interview.interviewers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Interviewers</h4>
                      <div className="flex flex-wrap gap-2">
                        {interview.interviewers.map((interviewer) => (
                          <div key={interviewer.id} className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">{interviewer.name}</span>
                            {interviewer.title && (
                              <span className="text-gray-500 dark:text-gray-400 ml-1">({interviewer.title})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(interview.preparationNotes || interview.postInterviewNotes) && (
                    <div className="space-y-2">
                      {interview.preparationNotes && (
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Prep Notes: </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {interview.preparationNotes.substring(0, 150)}
                            {interview.preparationNotes.length > 150 ? '...' : ''}
                          </span>
                        </div>
                      )}
                      {interview.postInterviewNotes && (
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Post-Interview Notes: </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {interview.postInterviewNotes.substring(0, 150)}
                            {interview.postInterviewNotes.length > 150 ? '...' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {interview.followUpSteps && interview.followUpSteps.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <SparklesIcon className="h-4 w-4 text-purple-500" />
                        AI Suggested Follow-ups
                      </h4>
                      <ul className="space-y-1">
                        {interview.followUpSteps.slice(0, 3).map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              step.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                              step.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {step.priority}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">{step.action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => onOpenInterviewDetail(interview)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      View Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
