'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'

interface Interview {
  id: string
  scheduledDate: string | null
  scheduledTime?: string | null
  interviewType: string
  round: number
  status: string
  archived?: boolean
}

interface Application {
  id: string
  company: string
  role: string
  status: string
  jobUrl?: string | null
  notes?: string | null
  appliedDate?: string | null
  createdAt: string
  interviews?: Interview[]
}

export default function ApplicationDetailPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && id) {
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, id])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/applications/' + id, { cache: 'no-store' })
      if (res.status === 404) {
        setError('Application not found.')
        setApplication(null)
      } else if (!res.ok) {
        setError('Failed to load application.')
      } else {
        setApplication(await res.json())
      }
    } catch {
      setError('Failed to load application.')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (d?: string | null) =>
    d
      ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : 'Date TBD'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Back
        </Link>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-white dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400 shadow">
            {error}
          </div>
        ) : application ? (
          <div className="space-y-6">
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                    <h1 className="text-2xl font-bold truncate">{application.company}</h1>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-gray-600 dark:text-gray-300">
                    <BriefcaseIcon className="h-4 w-4 text-gray-400" />
                    <span>{application.role}</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 capitalize shrink-0">
                  {application.status?.toLowerCase()}
                </span>
              </div>

              {application.jobUrl && (
                <a
                  href={application.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" /> View original job posting
                </a>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Applied</dt>
                  <dd className="text-gray-900 dark:text-white">{fmt(application.appliedDate || application.createdAt)}</dd>
                </div>
              </dl>

              {application.notes && (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Notes
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{application.notes}</p>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Interviews</h2>
                <span className="text-sm text-gray-400">({application.interviews?.length || 0})</span>
              </div>
              {application.interviews && application.interviews.length > 0 ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {application.interviews.map((iv) => (
                    <li key={iv.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                      <div className="text-gray-900 dark:text-white">
                        {fmt(iv.scheduledDate)}
                        {iv.scheduledTime ? ' · ' + iv.scheduledTime : ''}
                        <span className="ml-2 text-gray-500 dark:text-gray-400 capitalize">
                          {iv.interviewType} · Round {iv.round}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                        {iv.status?.replace(/_/g, ' ')}
                        {iv.archived ? ' · archived' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No interviews recorded for this application.</p>
              )}
              <Link href="/" className="mt-4 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Manage interviews →
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
