'use client'
import { useState, useEffect } from 'react'
import { DocumentTextIcon, SparklesIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface Job {
  id: string
  title: string
  company: string
  fitScore: number
}

export default function CoverLettersPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const r = await fetch('/api/opportunities')
      if (r.status === 401) {
        router.push('/login')
        return
      }
      const d = await r.json()
      if (d.success) {
        setJobs(d.opportunities || [])
      }
    } catch (err) {
      setError('Failed to load jobs')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const generate = async (job: Job) => {
    setGenerating(job.id)
    setSelectedJob(job)
    setCoverLetter(null)
    setError(null)
    
    try {
      const r = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
      })
      
      if (r.status === 401) {
        router.push('/login')
        return
      }
      
      const d = await r.json()
      if (d.success) {
        setCoverLetter(d.coverLetter)
      } else {
        setError(d.error || 'Failed to generate cover letter')
      }
    } catch (err) {
      setError('Failed to generate cover letter')
      console.error(err)
    } finally {
      setGenerating(null)
    }
  }

  const copyToClipboard = () => {
    if (coverLetter) {
      navigator.clipboard.writeText(coverLetter)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Cover Letter Generator</h1>
            <p className="text-gray-600 dark:text-gray-400">Select a job opportunity to generate a tailored cover letter</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-white">Select Job Opportunity</h2>
            </div>
            <div className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading jobs...</div>
              ) : jobs.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No job opportunities found. Scan for jobs first!</div>
              ) : (
                jobs.map(job => (
                  <div 
                    key={job.id} 
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${generating === job.id ? 'opacity-50' : ''}`}
                    onClick={() => !generating && generate(job)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{job.company}</p>
                      </div>
                      {job.fitScore && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                          {job.fitScore}% fit
                        </span>
                      )}
                    </div>
                    {generating === job.id && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                        <SparklesIcon className="h-4 w-4 animate-pulse" />
                        Generating cover letter...
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white">Generated Cover Letter</h2>
              {coverLetter && (
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="p-4">
              {!selectedJob ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <DocumentTextIcon className="h-16 w-16 mb-4 opacity-50" />
                  <p>Select a job to generate a cover letter</p>
                </div>
              ) : coverLetter ? (
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-gray-800 dark:text-gray-200">{coverLetter}</pre>
                </div>
              ) : generating ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <SparklesIcon className="h-16 w-16 mb-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                  <p className="text-gray-600 dark:text-gray-400">Generating your personalized cover letter...</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
