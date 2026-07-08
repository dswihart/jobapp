'use client'

import { useState } from 'react'
import { CalendarDaysIcon, XMarkIcon, ClipboardDocumentIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

// "Subscribe in calendar" — mints (or reuses) the user's feed token and shows a
// modal with a webcal:// deep link (best on mobile), a copyable https URL, and a
// rotate/revoke action. The feed auto-updates in Google/Apple Calendar as rounds
// are scheduled/rescheduled.
export default function CalendarSubscribeButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedPath, setFeedPath] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const httpsUrl = feedPath ? `${typeof window !== 'undefined' ? window.location.origin : ''}${feedPath}` : ''
  const webcalUrl = feedPath && typeof window !== 'undefined'
    ? `webcal://${window.location.host}${feedPath}`
    : ''

  const openModal = async () => {
    setOpen(true)
    setError('')
    if (feedPath) return
    setLoading(true)
    try {
      // Reuse an existing token if present, else mint one.
      let res = await fetch('/api/calendar/token', { cache: 'no-store' })
      let data = await res.json().catch(() => ({}))
      if (!data?.feedPath) {
        res = await fetch('/api/calendar/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        data = await res.json().catch(() => ({}))
      }
      if (!res.ok || !data?.feedPath) {
        setError(data?.error || 'Could not create the calendar feed.')
      } else {
        setFeedPath(data.feedPath)
      }
    } catch {
      setError('Could not create the calendar feed.')
    } finally {
      setLoading(false)
    }
  }

  const rotate = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/calendar/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.feedPath) setError(data?.error || 'Could not rotate the feed.')
      else { setFeedPath(data.feedPath); setCopied(false) }
    } catch {
      setError('Could not rotate the feed.')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(httpsUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Copy failed — select and copy the URL manually.')
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        title="Subscribe to your interviews in Google / Apple Calendar"
        className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <CalendarDaysIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Subscribe</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80" onClick={() => setOpen(false)} />
          <div className="relative w-full rounded-t-2xl bg-white p-6 shadow-xl dark:bg-gray-800 sm:max-w-md sm:rounded-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <CalendarDaysIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Subscribe to interviews
              </h3>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Add this feed to Google or Apple Calendar and every scheduled interview round
              appears automatically — and updates itself when you reschedule. It stays in sync;
              no re-importing.
            </p>

            {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Preparing your feed…</p>}
            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

            {feedPath && !loading && (
              <div className="space-y-3">
                <a
                  href={webcalUrl}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <CalendarDaysIcon className="h-5 w-5" /> Add to calendar
                </a>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Or copy the feed URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={httpsUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    />
                    <button
                      onClick={copy}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={rotate}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  <ArrowPathIcon className="h-3.5 w-3.5" /> Reset link (revokes the old one)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
