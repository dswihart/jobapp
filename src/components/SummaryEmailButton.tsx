'use client'

import { useState } from 'react'
import { EnvelopeIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

/**
 * Self-contained button that emails the signed-in user a 2-week job-search
 * summary (applications sent, interviews done + outcomes, upcoming interviews).
 * Shows inline send status; no props required.
 */
export default function SummaryEmailButton() {
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  const send = async () => {
    if (sending) return
    setSending(true)
    setStatus(null)
    try {
      const res = await fetch('/api/summary-email', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setStatus({ ok: true, text: `Sent to ${data.sentTo}` })
      } else {
        setStatus({ ok: false, text: data.error || 'Could not send summary' })
      }
    } catch {
      setStatus({ ok: false, text: 'Could not send summary' })
    } finally {
      setSending(false)
      setTimeout(() => setStatus(null), 6000)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status && (
        <span
          className={`hidden sm:flex items-center gap-1 text-sm ${
            status.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {status.ok ? <CheckCircleIcon className="h-4 w-4" /> : <ExclamationCircleIcon className="h-4 w-4" />}
          {status.text}
        </span>
      )}
      <button
        onClick={send}
        disabled={sending}
        title="Email me a 2-week summary of applications, interviews and outcomes"
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
      >
        <EnvelopeIcon className="h-5 w-5" />
        <span className="hidden sm:inline">{sending ? 'Sending…' : 'Email me a 2-week summary'}</span>
        <span className="sm:hidden">{sending ? '…' : 'Summary'}</span>
      </button>
    </div>
  )
}
