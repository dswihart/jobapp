'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import JobDetailModal from './JobDetailModal'
import RejectReasonModal from './RejectReasonModal'
import GoodMatchModal from './GoodMatchModal'
import {
  BriefcaseIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  FunnelIcon,
  CheckCircleIcon,
  PaperClipIcon,
  ArrowPathIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  LinkIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { useToast } from './ToastProvider'

interface JobOpportunity {
  id: string
  title: string
  company: string
  description: string
  location?: string
  salary?: string
  employmentType?: string
  experienceLevel?: string
  jobUrl: string
  source: string
  sourceUrl?: string
  fitScore: number
  postedDate: string
  isRead: boolean
  createdAt: string
  userFeedback?: string
  notes?: string
  scoreBreakdown?: string
  attachmentName?: string | null
  attachmentPath?: string | null
}

interface JobOpportunitiesProps {
  userId: string
  onApplicationCreated?: () => void
  refreshTrigger?: number
}

// Helper function to extract domain from URL
const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

// Source badge colors
const sourceColors: Record<string, string> = {
  'RemoteOK': 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  'Remotive': 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  'WeWorkRemotely': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  'Himalayas': 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  'EchoJobs': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  'Arbeitnow': 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
}

const getImportedSourceColor = 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'

const getSourceColor = (source: string): string => {
  // Imported sources (domains) get purple to match section header
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(source)) return getImportedSourceColor
  for (const [key, color] of Object.entries(sourceColors)) {
    if (source.toLowerCase().includes(key.toLowerCase())) return color
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

export default function JobOpportunities({ userId, onApplicationCreated, refreshTrigger }: JobOpportunitiesProps) {
  const toast = useToast()
  const [jobs, setJobs] = useState<JobOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [minFitScore, setMinFitScore] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | '1' | '3' | '7' | '14' | '30'>('all')
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set())
  const [applyingJob, setApplyingJob] = useState<string | null>(null)
  const [draftingJob, setDraftingJob] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobOpportunity | null>(null)
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [rejectingJob, setRejectingJob] = useState<JobOpportunity | null>(null)
  const [approvingJob, setApprovingJob] = useState<JobOpportunity | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadJobs = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    try {
      const response = await fetch('/api/opportunities')
      const data = await response.json()
      if (data.success) {
        setJobs(data.opportunities || [])
      }
    } catch (error) {
      console.error('Failed to load job opportunities:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const loadAppliedJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/applications')
      if (!response.ok) {
        return
      }

      const data = await response.json()
      const applications = Array.isArray(data) ? data : data.applications || []
      const appliedUrls = new Set<string>(
        applications
          .map((app: { jobUrl?: string }) => app.jobUrl)
          .filter((url: string | undefined): url is string => Boolean(url))
      )
      setAppliedJobs(appliedUrls)
    } catch (error) {
      console.error('Failed to load applications:', error)
    }
  }, [])

  useEffect(() => {
    loadJobs()
    loadAppliedJobs()
  }, [loadAppliedJobs, loadJobs])

  // Refresh opportunities when a scan completes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadJobs()
    }
  }, [loadJobs, refreshTrigger])

  const handleFeedback = async (jobId: string, feedback: 'GOOD_MATCH' | 'BAD_MATCH', reasons?: string[], customNote?: string) => {
    if (feedback === 'BAD_MATCH' && !reasons) {
      const job = jobs.find(j => j.id === jobId)
      if (job) setRejectingJob(job)
      return
    }
    if (feedback === 'GOOD_MATCH' && !reasons) {
      const job = jobs.find(j => j.id === jobId)
      if (job) setApprovingJob(job)
      return
    }
    setFeedbackLoading(jobId)
    try {
      const response = await fetch('/api/opportunities/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: jobId, feedback, reasons, customNote })
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        toast.error(errData.error || 'Failed to save feedback')
        return
      }
      {
        const data = await response.json()
        if (data.deleted) {
          setJobs(prev => prev.filter(j => j.id !== jobId))
        } else {
          setJobs(prev => prev.map(j => j.id === jobId ? { ...j, userFeedback: feedback } : j))
        }
      }
    } catch (error) {
      console.error('Error saving feedback:', error)
      toast.error('Failed to save feedback. Please try again.')
    } finally {
      setFeedbackLoading(null)
    }
  }


  const handleDismiss = async (jobId: string, title: string) => {
    if (!window.confirm(`Dismiss "${title}"? This removes it from your list but won't block future matches.`)) return
    try {
      const response = await fetch(`/api/opportunities/${jobId}`, { method: 'DELETE' })
      if (response.ok) {
        setJobs(prev => prev.filter(j => j.id !== jobId))
        if (selectedJob?.id === jobId) setSelectedJob(null)
        toast.info(`Dismissed "${title}"`)
      } else {
        toast.error('Failed to dismiss job')
      }
    } catch (error) {
      console.error('Error dismissing job:', error)
      toast.error('Failed to dismiss job')
    }
  }

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return
    try {
      new URL(importUrl)
    } catch {
      setImportResult('Invalid URL format')
      setTimeout(() => setImportResult(null), 5000)
      return
    }
    setImporting(true)
    setImportResult(null)
    try {
      const response = await fetch('/api/opportunities/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim(), text: importText.trim() || undefined })
      })
      const data = await response.json()
      if (response.ok && data.success) {
        const opp = data.opportunity
        if (data.existing) {
          setImportResult(`Already imported: ${opp.title} at ${opp.company}`)
        } else {
          setImportResult(`Imported: ${opp.title} at ${opp.company} (${opp.fitScore}% fit)`)
        }
        setImportUrl('')
        setImportText('')
        setShowPaste(false)
        loadJobs()
      } else {
        setImportResult(data.error || 'Import failed')
        if (data.botBlocked) setShowPaste(true)
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportResult('Failed to import. Please try again.')
    } finally {
      setImporting(false)
      setTimeout(() => setImportResult(null), 8000)
    }
  }

  const handleImportPdf = async (file: File) => {
    setImporting(true)
    setImportResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/opportunities/import-pdf', { method: 'POST', body: form })
      const data = await response.json()
      if (response.ok && data.success) {
        const opp = data.opportunity
        if (data.alreadyExists) {
          setImportResult(`Already imported: ${opp.title} at ${opp.company}`)
        } else {
          setImportResult(`Imported: ${opp.title} at ${opp.company} (${opp.fitScore}% fit)`)
        }
        loadJobs()
      } else {
        setImportResult(data.error || 'PDF import failed')
      }
    } catch (error) {
      console.error('PDF import error:', error)
      setImportResult('Failed to import PDF. Please try again.')
    } finally {
      setImporting(false)
      if (pdfInputRef.current) pdfInputRef.current.value = ''
      setTimeout(() => setImportResult(null), 8000)
    }
  }

  const handleScanNow = async () => {
    setScanning(true)
    setScanResult(null)
    try {
      const response = await fetch('/api/scan-now', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        setScanResult(`Found ${data.jobsFound} new job(s)`)
        await loadJobs()
      } else {
        setScanResult(`Scan failed: ${data.error}`)
      }
    } catch {
      setScanResult('Scan failed: network error')
    } finally {
      setScanning(false)
      setTimeout(() => setScanResult(null), 5000)
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
        // Archive the opportunity so it moves to applications
        const archiveRes = await fetch(`/api/opportunities/${job.id}`, { method: 'DELETE' })
        if (archiveRes.ok) {
          setJobs(prev => prev.filter(j => j.id !== job.id))
          setSelectedJob(null)
        }
        toast.success(`Applied to ${job.title} at ${job.company} 🎉`)
      } else if (response.status === 409) {
        setAppliedJobs(prev => new Set([...prev, job.jobUrl]))
        const archiveRes = await fetch(`/api/opportunities/${job.id}`, { method: 'DELETE' })
        if (archiveRes.ok) {
          setJobs(prev => prev.filter(j => j.id !== job.id))
          setSelectedJob(null)
        }
      } else {
        console.error('Failed to create application:', data.error)
        toast.error('Failed to create application: ' + data.error)
      }
    } catch (error) {
      console.error('Error creating application:', error)
      toast.error('Error creating application')
    } finally {
      setApplyingJob(null)
    }
  }

  const handleMoveToDraft = async (job: JobOpportunity) => {
    if (draftingJob) return
    setDraftingJob(job.id)
    try {
      const response = await fetch('/api/applications/create-from-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          opportunityId: job.id,
          status: 'DRAFT'
        })
      })

      const data = await response.json()

      if (data.success) {
        await fetch(`/api/opportunities/${job.id}`, { method: 'DELETE' })
        setJobs(prev => prev.filter(j => j.id !== job.id))
        toast.success(`Saved ${job.title} to drafts`)
        onApplicationCreated?.()
      } else if (response.status === 409) {
        await fetch(`/api/opportunities/${job.id}`, { method: 'DELETE' })
        setJobs(prev => prev.filter(j => j.id !== job.id))
        toast.warning('An application already exists for this job')
        onApplicationCreated?.()
      } else {
        console.error('Failed to create draft:', data.error)
        toast.error('Failed to create draft: ' + data.error)
      }
    } catch (error) {
      console.error('Error creating draft:', error)
      toast.error('Error creating draft')
    } finally {
      setDraftingJob(null)
    }
  }


  const markAsRead = useCallback(async (jobId: string) => {
    try {
      await fetch(`/api/opportunities/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      })
      setJobs(prev => prev.map(job =>
        job.id === jobId ? { ...job, isRead: true } : job
      ))
    } catch (error) {
      console.error('Error marking job as read:', error)
    }
  }, [])

  const markAllVisibleAsRead = async () => {
    const unreadJobs = filteredJobs.filter(job => !job.isRead)
    for (const job of unreadJobs) {
      markAsRead(job.id)
    }
  }

  // Mark jobs as read when they're displayed
  useEffect(() => {
    if (!loading && jobs.length > 0) {
      const timer = setTimeout(() => {
        const unreadJobs = jobs.filter(job => !job.isRead).slice(0, 5)
        unreadJobs.forEach(job => markAsRead(job.id))
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [jobs, loading, markAsRead])

  // Get unique sources for filter
  const uniqueSources = Array.from(new Set(jobs.map(j => j.source))).sort()

  const filteredJobs = jobs
    .filter(job => filter === 'all' || !job.isRead)
    .filter(job => job.fitScore >= minFitScore)
    .filter(job => sourceFilter === 'all' || job.source === sourceFilter)
    .filter(job => {
      if (dateFilter === 'all') return true
      const addedMs = new Date(job.createdAt).getTime()
      if (Number.isNaN(addedMs)) return true
      const cutoff = Date.now() - parseInt(dateFilter) * 24 * 60 * 60 * 1000
      return addedMs >= cutoff
    })
    .filter(job => {
      if (!debouncedSearch) return true
      const searchLower = debouncedSearch.toLowerCase()
      const searchableText = [job.title, job.company, job.description, job.location].filter(Boolean).join(' ').toLowerCase()
      return searchableText.includes(searchLower)
    })
    .sort((a, b) => b.fitScore - a.fitScore)

  // Imported jobs have a domain as source (e.g. "careers.bsport.io")
  // Scanned jobs have named sources (e.g. "Himalayas Remote Jobs")
  const isImportedSource = (source: string) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(source)
  const importedJobs = filteredJobs.filter(j => isImportedSource(j.source))
  const scannedJobs = filteredJobs.filter(j => !isImportedSource(j.source))

  const getFitScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20'
    if (score >= 50) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20'
    return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20'
  }

  const isApplied = (jobUrl: string) => appliedJobs.has(jobUrl)

  const renderJobCard = (job: JobOpportunity) => {
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
            {job.scoreBreakdown && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpandedBreakdown(expandedBreakdown === job.id ? null : job.id) }}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mt-1 underline block text-center"
              >
                {expandedBreakdown === job.id ? 'less' : 'why?'}
              </button>
            )}
          </div>

          {/* Job Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setSelectedJob(job)}>
                  {job.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {job.company}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSourceColor(job.source)}`}>
                    {job.source}
                  </span>
                  {job.sourceUrl && (
                    <a
                      href={job.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      title={job.sourceUrl}
                    >
                      {extractDomain(job.sourceUrl)}
                    </a>
                  )}
                  {job.attachmentPath && (
                    <a
                      href={`/api/opportunities/${job.id}/attachment`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/20 dark:text-rose-300"
                      title={job.attachmentName || 'View attached document'}
                    >
                      <PaperClipIcon className="h-3.5 w-3.5" /> PDF
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {applied && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-xs flex items-center gap-1">
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    Applied
                  </span>
                )}
                <button
                  onClick={() => setSelectedJob(job)}
                  aria-label={`View details for ${job.title} at ${job.company}`}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1.5"
                >
                  Details
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback(job.id, 'GOOD_MATCH')}
                  disabled={feedbackLoading === job.id}
                  className={"px-2.5 py-1.5 rounded-lg transition-colors text-sm flex items-center disabled:opacity-50 " + (job.userFeedback === 'GOOD_MATCH' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30')}
                  title="Good match"
                  aria-label={`Mark ${job.title} as good match`}
                >
                  <HandThumbUpIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleFeedback(job.id, 'BAD_MATCH')}
                  disabled={feedbackLoading === job.id}
                  className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm flex items-center disabled:opacity-50"
                  title="Not a match"
                  aria-label={`Reject ${job.title}`}
                >
                  <HandThumbDownIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {(job.location || job.salary) && (
              <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                {job.location && <span>Location: {job.location}</span>}
                {job.salary && <span>Salary: {job.salary}</span>}
              </div>
            )}

            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3 cursor-pointer" onClick={() => setSelectedJob(job)}>
              {job.description.replace(/<[^>]*>/g, '').substring(0, 300)}...
            </p>

            {expandedBreakdown === job.id && job.scoreBreakdown && (
              <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                {job.scoreBreakdown}
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>Posted: {new Date(job.postedDate).toLocaleDateString()}</span>
              <span>&bull;</span>
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
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
        <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BriefcaseIcon className="h-7 w-7" />
              Job Matches
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              AI-matched opportunities based on your profile
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center sm:justify-end">
            {scanResult && (
              <span className="w-full text-sm text-green-600 dark:text-green-400 animate-fade-in sm:w-auto">
                {scanResult}
              </span>
            )}
            <button
              onClick={handleScanNow}
              disabled={scanning}
              className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              title="Scan all sources for new jobs now"
            >
              <ArrowPathIcon className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Scanning...' : 'Scan Now'}
            </button>
            <button
              onClick={markAllVisibleAsRead}
              className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Mark All Read
            </button>
            <button
              onClick={loadJobs}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Toolbar: Import + Filter toggles */}
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <button
            onClick={() => setShowImport(!showImport)}
            className={"px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 " + (showImport ? 'bg-purple-600 text-white' : 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/30')}
          >
            <LinkIcon className="h-4 w-4" />
            Import URL
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={"px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 " + (showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600')}
          >
            <FunnelIcon className="h-4 w-4" />
            Filters
            {(minFitScore > 0 || sourceFilter !== 'all' || debouncedSearch) && (
              <span className="h-2 w-2 bg-blue-500 rounded-full" />
            )}
          </button>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto">
            <button
              onClick={() => setFilter('all')}
              className={"px-3 py-1.5 rounded-lg text-sm transition-colors " + (filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300')}
            >
              All ({jobs.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={"px-3 py-1.5 rounded-lg text-sm transition-colors " + (filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300')}
            >
              New ({jobs.filter(j => !j.isRead).length})
            </button>
          </div>
        </div>

        {/* Expandable Import Bar */}
        {showImport && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Paste job URL to import..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={importing}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && importUrl && handleImportUrl()}
              />
              <button
                onClick={handleImportUrl}
                disabled={importing || !importUrl.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPaste(!showPaste)}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
              >
                {showPaste ? '- Hide paste box' : '+ Site blocked (LinkedIn/Indeed)? Paste the job description instead'}
              </button>
              <span className="text-xs text-gray-400">or</span>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf,.pdf,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImportPdf(f)
                }}
                disabled={importing}
              />
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                disabled={importing}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
              >
                {importing ? 'Reading…' : '+ Upload a job PDF'}
              </button>
            </div>
            {showPaste && (
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste the full job description here. Works for LinkedIn, Infojobs, Indeed and other sites that block automated import. The URL above is still required."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={importing}
              />
            )}
          </div>
        )}
        {importResult && (
          <p className={"text-sm mt-2 " + (importResult.startsWith('Already') || importResult.startsWith('Imported') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{importResult}</p>
        )}

        {/* Collapsible Filters */}
        {showFilters && (
        <div className="flex gap-4 items-center flex-wrap mt-2">
          {/* Source filter */}
          {uniqueSources.length > 1 && (
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700"
            >
              <option value="all">All Sources</option>
              {uniqueSources.map(source => (
                <option key={source} value={source}>
                  {source} ({jobs.filter(j => j.source === source).length})
                </option>
              ))}
            </select>
          )}

          {/* Date added filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700"
          >
            <option value="all">Any date added</option>
            <option value="1">Added today</option>
            <option value="3">Added last 3 days</option>
            <option value="7">Added last week</option>
            <option value="14">Added last 2 weeks</option>
            <option value="30">Added last 30 days</option>
          </select>

          {/* Search Input */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Min Fit: {minFitScore}%
            </label>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={minFitScore}
              onChange={(e) => setMinFitScore(parseInt(e.target.value))}
              className="w-32"
            />
          </div>
        </div>
        )}
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
            <p className="text-lg font-medium">
              {jobs.length === 0 ? 'No matches yet — let’s find some!' : 'No matches at this score'}
            </p>
            <p className="text-sm mt-2">
              {jobs.length === 0
                ? 'Hit "Scan Now" and we’ll go hunting for roles that fit you.'
                : `Try lowering the minimum fit score (currently ${minFitScore}%) to see more.`
              }
            </p>
          </div>
        ) : (
          <>
            {importedJobs.length > 0 && (
              <>
                <div className="px-6 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 flex items-center gap-2 sticky top-0 z-10">
                  <LinkIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                    Manually Imported ({importedJobs.length})
                  </span>
                </div>
                {importedJobs.map(job => renderJobCard(job))}
              </>
            )}
            {scannedJobs.length > 0 && (
              <>
                <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center gap-2 sticky top-0 z-10">
                  <ArrowPathIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    Auto-Scanned ({scannedJobs.length})
                  </span>
                </div>
                {scannedJobs.map(job => renderJobCard(job))}
              </>
            )}
          </>
        )}
      </div>
      {/* Good Match Modal */}
      <GoodMatchModal
        isOpen={!!approvingJob}
        jobTitle={approvingJob?.title || ''}
        jobCompany={approvingJob?.company || ''}
        onConfirm={(reasons, customNote) => {
          if (approvingJob) {
            handleFeedback(approvingJob.id, 'GOOD_MATCH', reasons, customNote)
            setApprovingJob(null)
          }
        }}
        onCancel={() => setApprovingJob(null)}
      />

      {/* Reject Reason Modal */}
      <RejectReasonModal
        isOpen={!!rejectingJob}
        jobTitle={rejectingJob?.title || ''}
        jobCompany={rejectingJob?.company || ''}
        onConfirm={(reasons, customNote) => {
          if (rejectingJob) {
            handleFeedback(rejectingJob.id, 'BAD_MATCH', reasons, customNote)
            setRejectingJob(null)
          }
        }}
        onCancel={() => setRejectingJob(null)}
      />

      {/* Job Detail Modal */}
      <JobDetailModal
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        job={selectedJob}
        onJobUpdate={(updated) => {
          setJobs(prev => prev.map(j => j.id === updated.id ? { ...j, ...updated } : j))
          if (selectedJob && selectedJob.id === updated.id) {
            setSelectedJob(prev => prev ? { ...prev, ...updated } : null)
          }
        }}
        onFeedback={handleFeedback}
        onApply={handleApply}
        onDraft={handleMoveToDraft}
        onDismiss={handleDismiss}
      />
    </div>
  )
}
