'use client'
import { useEffect, useState } from 'react'
import {
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  SparklesIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface JobOpportunity {
  id: string
  title: string
  company: string
  description: string
  requirements?: string
  location?: string
  salary?: string
  employmentType?: string
  experienceLevel?: string
  jobUrl: string
  source: string
  fitScore: number
  postedDate: string
  isRead: boolean
  createdAt: string
  userFeedback?: string
  notes?: string
  scoreBreakdown?: string
}

interface MatchAnalysis {
  matchScore: number
  strengths: string[]
  gaps: string[]
  suggestions: string[]
}

interface JobDetailModalProps {
  isOpen: boolean
  onClose: () => void
  job: JobOpportunity | null
  onJobUpdate: (job: Partial<JobOpportunity> & { id: string }) => void
  onFeedback: (jobId: string, feedback: 'GOOD_MATCH' | 'BAD_MATCH') => void
  onApply: (job: JobOpportunity)  => void
  onDraft?: (job: JobOpportunity) => void
  onDismiss?: (jobId: string, title: string) => void
}

const getFitScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
  if (score >= 50) return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20'
  return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20'
}

const getMatchScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
  if (score >= 50) return 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
  return 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
}

export default function JobDetailModal({ isOpen, onClose, job, onJobUpdate, onFeedback, onApply, onDraft, onDismiss }: JobDetailModalProps) {
  const [fetchingDescription, setFetchingDescription] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null)
  const [analyzingMatch, setAnalyzingMatch] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)

  useEffect(() => {
    if (!job || !isOpen) return

    setNotes(job.notes || '')
    setMatchAnalysis(null)
    setMatchError(null)
    setFetchError(null)
    setFetchingDescription(false)
    setAnalyzingMatch(false)
    setSavingNotes(false)
    setNotesSaved(false)
  }, [isOpen, job])

  if (!isOpen || !job) return null

  const handleFetchFull = async () => {
    setFetchingDescription(true)
    setFetchError(null)
    try {
      const response = await fetch(`/api/opportunities/${job.id}/fetch-full`, { method: 'POST' })
      const data = await response.json()
      if (response.ok && data.success) {
        onJobUpdate({
          id: job.id,
          description: data.description,
          requirements: data.requirements,
          location: data.location,
          salary: data.salary,
          employmentType: data.employmentType,
          experienceLevel: data.experienceLevel
        })
      } else {
        setFetchError(data.error || 'Failed to fetch description')
      }
    } catch {
      setFetchError('Network error fetching description')
    } finally {
      setFetchingDescription(false)
    }
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      const response = await fetch(`/api/opportunities/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })
      if (response.ok) {
        onJobUpdate({ id: job.id, notes })
        setNotesSaved(true)
        setTimeout(() => setNotesSaved(false), 2000)
      }
    } catch {
      // silent fail for notes
    } finally {
      setSavingNotes(false)
    }
  }

  const handleAnalyzeMatch = async () => {
    setAnalyzingMatch(true)
    setMatchError(null)
    try {
      const response = await fetch('/api/ai/match-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
      })
      const data = await response.json()
      if (response.ok && data.success && data.analysis) {
        const a = data.analysis
        setMatchAnalysis({
          matchScore: typeof a.matchScore === 'number' ? a.matchScore : 0,
          strengths: Array.isArray(a.strengths) ? a.strengths : [],
          gaps: Array.isArray(a.gaps) ? a.gaps : [],
          suggestions: Array.isArray(a.suggestions) ? a.suggestions : []
        })
      } else {
        setMatchError(data.error || 'Analysis failed')
      }
    } catch {
      setMatchError('Network error during analysis')
    } finally {
      setAnalyzingMatch(false)
    }
  }

  const cleanDescription = job.description.replace(/<[^>]*>/g, '')
  const isShortDescription = cleanDescription.length < 500

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-3xl max-h-[90vh] flex flex-col animate-slide-up sm:animate-none" role="dialog" aria-modal="true" aria-label={job.title + ' at ' + job.company}>
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl sm:rounded-t-lg z-10 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{job.company}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-sm font-bold px-2 py-1 rounded ${getFitScoreColor(job.fitScore)}`}>
                    {job.fitScore}% fit
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {job.source}
                  </span>
                  {job.location && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{job.location}</span>
                  )}
                  {job.salary && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{job.salary}</span>
                  )}
                  {job.employmentType && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">{job.employmentType}</span>
                  )}
                  {job.experienceLevel && (
                    <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full">{job.experienceLevel}</span>
                  )}
                </div>
                {job.scoreBreakdown && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                    <span className="font-medium">Score reasoning: </span>{job.scoreBreakdown}
                  </div>
                )}
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Description */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  Description
                </h4>
                {isShortDescription && (
                  <button
                    onClick={handleFetchFull}
                    disabled={fetchingDescription}
                    className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <ArrowPathIcon className={`h-3.5 w-3.5 ${fetchingDescription ? 'animate-spin' : ''}`} />
                    {fetchingDescription ? 'Fetching...' : 'Fetch Full Description'}
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {cleanDescription}
              </div>
              {fetchError && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">{fetchError}</p>
              )}
            </section>

            {/* Requirements */}
            {job.requirements && (
              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Requirements</h4>
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {job.requirements.replace(/<[^>]*>/g, '')}
                </div>
              </section>
            )}

            {/* Notes */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">Notes</h4>
                {notesSaved && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircleIcon className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                {savingNotes && (
                  <span className="text-xs text-gray-400">Saving...</span>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Add your notes about this job..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y"
              />
            </section>

            {/* Resume Match Analysis */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5" />
                  Resume Match
                </h4>
                {!matchAnalysis && (
                  <button
                    onClick={handleAnalyzeMatch}
                    disabled={analyzingMatch}
                    className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <SparklesIcon className={`h-3.5 w-3.5 ${analyzingMatch ? 'animate-pulse' : ''}`} />
                    {analyzingMatch ? 'Analyzing...' : 'Analyze Match'}
                  </button>
                )}
              </div>

              {matchError && (
                <p className="text-sm text-red-600 dark:text-red-400">{matchError}</p>
              )}

              {matchAnalysis && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold px-3 py-1 rounded ${getMatchScoreColor(matchAnalysis.matchScore)}`}>
                      {matchAnalysis.matchScore}%
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">match score</span>
                  </div>

                  {matchAnalysis.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1 uppercase">Strengths</p>
                      {matchAnalysis.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 mb-1">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {matchAnalysis.gaps.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1 uppercase">Gaps</p>
                      {matchAnalysis.gaps.map((g, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 mb-1">
                          <XCircleIcon className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>{g}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {matchAnalysis.suggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1 uppercase">Suggestions</p>
                      {matchAnalysis.suggestions.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 mb-1">
                          <LightBulbIcon className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleAnalyzeMatch}
                    disabled={analyzingMatch}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Re-analyze
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Primary actions */}
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
              >
                View Job <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </a>
              <button
                onClick={() => onApply(job)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Apply
              </button>
              {onDraft && (
                <button
                  onClick={() => { onDraft(job); onClose() }}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                >
                  Save as Draft
                </button>
              )}
              <Link
                href={`/resume-tailor?jobId=${job.id}`}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-2"
              >
                <DocumentTextIcon className="h-4 w-4" /> Tailor Resume
              </Link>

              {/* Right-aligned feedback + dismiss */}
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => onFeedback(job.id, 'GOOD_MATCH')}
                  className={"px-3 py-2 rounded-lg text-sm flex items-center gap-1 " + (job.userFeedback === 'GOOD_MATCH' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30')}
                  title="Good match"
                  aria-label="Mark as good match"
                >
                  <HandThumbUpIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { onFeedback(job.id, 'BAD_MATCH'); onClose() }}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-sm flex items-center gap-1"
                  title="Not a match"
                  aria-label="Reject this job"
                >
                  <HandThumbDownIcon className="h-4 w-4" />
                </button>
                {onDismiss && (
                  <button
                    onClick={() => { onDismiss(job.id, job.title); onClose() }}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm flex items-center gap-1"
                    title="Dismiss without blocking"
                    aria-label="Dismiss this job"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
