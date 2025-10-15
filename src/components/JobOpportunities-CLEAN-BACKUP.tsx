'use client'
import { useState, useEffect } from 'react'
import { BriefcaseIcon, ArrowTopRightOnSquareIcon, SparklesIcon, FunnelIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface JobOpportunity {
  id: string
  title: string
  company: string
  description: string
  location?: string
  salary?: string
  jobUrl: string
  source: string
  fitScore: number
  postedDate: string
  isRead: boolean
  createdAt: string
}

interface JobOpportunitiesProps {
  userId: string
}

export default function JobOpportunities({ userId }: JobOpportunitiesProps) {
  const [jobs, setJobs] = useState<JobOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [minFitScore, setMinFitScore] = useState(40)
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set())
  const [applyingJob, setApplyingJob] = useState<string | null>(null)

  useEffect(() => {
    loadJobs()
    loadAppliedJobs()
  }, [userId])

  const loadJobs = async () => {
    if (!userId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/opportunities?userId=${userId}`)
      const data = await response.json()
      if (data.success) {
        setJobs(data.opportunities || [])
      }
    } catch (error) {
      console.error('Failed to load job opportunities:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAppliedJobs = async () => {
    try {
      const response = await fetch(`/api/applications?userId=${userId}`)
      const data = await response.json()
      if (data.success) {
        const appliedUrls = new Set<string>(
          data.applications
            .map((app: { jobUrl?: string }) => app.jobUrl)
            .filter((url: string | undefined): url is string => Boolean(url))
        )
        setAppliedJobs(appliedUrls)
      }
    } catch (error) {
      console.error('Failed to load applications:', error)
    }
  }

  const handleApply = async (job: JobOpportunity) => {
    setApplyingJob(job.id)
    try {
      const response = await fetch('/api/applications/create-from-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          opportunityId: job.id
        })
      })

      const data = await response.json()

      if (data.success) {
        setAppliedJobs(prev => new Set([...prev, job.jobUrl]))
        // Show success message or notification
        console.log('Application created successfully')
      } else if (response.status === 409) {
        // Already applied
        setAppliedJobs(prev => new Set([...prev, job.jobUrl]))
      } else {
        console.error('Failed to create application:', data.error)
        alert('Failed to create application: ' + data.error)
      }
    } catch (error) {
      console.error('Error creating application:', error)
      alert('Error creating application')
    } finally {
      setApplyingJob(null)
    }
  }

  const filteredJobs = jobs
    .filter(job => filter === 'all' || !job.isRead)
    .filter(job => job.fitScore >= minFitScore)
    .sort((a, b) => b.fitScore - a.fitScore)

  const getFitScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20'
    if (score >= 50) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20'
    return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20'
  }

  const isApplied = (jobUrl: string) => appliedJobs.has(jobUrl)

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BriefcaseIcon className="h-7 w-7" />
              Job Matches
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              AI-matched opportunities based on your profile
            </p>
          </div>
          <button
            onClick={loadJobs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All ({jobs.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              New ({jobs.filter(j => !j.isRead).length})
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <FunnelIcon className="h-4 w-4 text-gray-500" />
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Min Fit: {minFitScore}%
            </label>
            <input
              type="range"
              min="30"
              max="90"
              step="5"
              value={minFitScore}
              onChange={(e) => setMinFitScore(parseInt(e.target.value))}
              className="w-32"
            />
          </div>
        </div>
      </div>

      {/* Job List */}
      <div className="divide-y divide-gray-200 dark:divide-neutral-700">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <BriefcaseIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No job matches found</p>
            <p className="text-sm mt-2">
              {jobs.length === 0
                ? 'Click "Scan Job Boards" to find opportunities'
                : `Try lowering the minimum fit score (currently ${minFitScore}%)`
              }
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const applied = isApplied(job.jobUrl)
            const applying = applyingJob === job.id

            return (
              <div
                key={job.id}
                className={`p-6 hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors ${
                  !job.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Fit Score Badge */}
                  <div className="flex-shrink-0">
                    <div className={`w-16 h-16 rounded-lg ${getFitScoreColor(job.fitScore)} flex flex-col items-center justify-center`}>
                      <SparklesIcon className="h-5 w-5 mb-0.5" />
                      <span className="text-lg font-bold">{job.fitScore}%</span>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {job.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {job.company} • {job.source}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {applied ? (
                          <div className="px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2 text-sm">
                            <CheckCircleIcon className="h-4 w-4" />
                            Applied
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApply(job)}
                            disabled={applying}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {applying ? 'Adding...' : 'Apply'}
                          </button>
                        )}
                        <a
                          href={job.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          View Job
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    {(job.location || job.salary) && (
                      <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {job.location && <span>📍 {job.location}</span>}
                        {job.salary && <span>💰 {job.salary}</span>}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                      {job.description.replace(/<[^>]*>/g, '').substring(0, 300)}...
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Posted: {new Date(job.postedDate).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Added: {new Date(job.createdAt).toLocaleDateString()}</span>
                      {!job.isRead && (
                        <span className="ml-auto px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
