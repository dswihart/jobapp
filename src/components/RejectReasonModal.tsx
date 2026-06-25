'use client'
import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface RejectReasonModalProps {
  isOpen: boolean
  jobTitle: string
  jobCompany: string
  onConfirm: (reasons: string[], customNote: string) => void
  onCancel: () => void
}

const DEFAULT_REASONS = [
  { id: 'wrong_location', label: 'Wrong location / not remote enough', priority: 100, emphasized: true },
  { id: 'wrong_language', label: 'Wrong language (requires a language I don’t want)', priority: 95, emphasized: true },
  { id: 'not_relevant_skills', label: 'Not relevant to my skills' },
  { id: 'wrong_domain', label: 'Wrong industry or domain' },
  { id: 'too_senior', label: 'Too senior for me' },
  { id: 'too_junior', label: 'Too junior for me' },
  { id: 'not_authorized_location', label: 'Not authorized to work in this location', priority: 90, emphasized: true },
  { id: 'already_applied', label: 'Already applied elsewhere' },
]

export default function RejectReasonModal({
  isOpen,
  jobTitle,
  jobCompany,
  onConfirm,
  onCancel,
}: RejectReasonModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [customNote, setCustomNote] = useState('')
  const [sortedReasons, setSortedReasons] = useState(DEFAULT_REASONS)

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/opportunities/reason-frequencies')
      .then(res => res.ok ? res.json() : { frequencies: {} })
      .then(data => {
        const freq: Record<string, number> = data.frequencies || {}
        const sorted = [...DEFAULT_REASONS].sort((a, b) => {
          const pa = a.priority || 0
          const pb = b.priority || 0
          if (pa !== pb) return pb - pa
          const fa = freq[a.id] || 0
          const fb = freq[b.id] || 0
          return fb - fa
        })
        setSortedReasons(sorted)
      })
      .catch(() => setSortedReasons(DEFAULT_REASONS))
  }, [isOpen])

  if (!isOpen) return null

  const toggleReason = (id: string) => {
    setSelectedReasons(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  const handleConfirm = () => {
    onConfirm(selectedReasons, customNote.trim())
    setSelectedReasons([])
    setCustomNote('')
  }

  const handleCancel = () => {
    setSelectedReasons([])
    setCustomNote('')
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={handleCancel} role="presentation">
      <div
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Why isn&apos;t this a good fit?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {jobTitle} at {jobCompany}
            </p>
          </div>
          <button onClick={handleCancel} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {sortedReasons.map(reason => (
            <button
              key={reason.id}
              onClick={() => toggleReason(reason.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedReasons.includes(reason.id)
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
                  : reason.emphasized
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                    : 'bg-gray-50 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 border border-transparent hover:bg-gray-100 dark:hover:bg-neutral-600'
              }`}
            >
              <span>{reason.label}</span>
              {reason.emphasized && (
                <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide">
                  High impact
                </span>
              )}
            </button>
          ))}

          <textarea
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            placeholder="Additional notes (optional)..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-sm mt-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-neutral-700">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            disabled={selectedReasons.length === 0 && !customNote.trim()}
          >
            Reject & Block
          </button>
        </div>
      </div>
    </div>
  )
}
