'use client'
import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface GoodMatchModalProps {
  isOpen: boolean
  jobTitle: string
  jobCompany: string
  onConfirm: (reasons: string[], customNote: string) => void
  onCancel: () => void
}

const GOOD_MATCH_REASONS = [
  { id: 'right_skills', label: 'Matches my skills well' },
  { id: 'good_location', label: 'Good location / remote friendly' },
  { id: 'right_seniority', label: 'Right seniority level' },
  { id: 'interesting_company', label: 'Interesting company' },
  { id: 'good_domain', label: 'Right industry or domain' },
  { id: 'good_salary', label: 'Good compensation' },
  { id: 'growth_opportunity', label: 'Growth opportunity' },
]

export default function GoodMatchModal({
  isOpen,
  jobTitle,
  jobCompany,
  onConfirm,
  onCancel,
}: GoodMatchModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [customNote, setCustomNote] = useState('')

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
        role="dialog"
        aria-modal="true"
        aria-label="Select good match reasons"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">What makes this a good fit?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {jobTitle} at {jobCompany}
            </p>
          </div>
          <button onClick={handleCancel} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {GOOD_MATCH_REASONS.map(reason => (
            <button
              key={reason.id}
              onClick={() => toggleReason(reason.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedReasons.includes(reason.id)
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700'
                  : 'bg-gray-50 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 border border-transparent hover:bg-gray-100 dark:hover:bg-neutral-600'
              }`}
            >
              {reason.label}
            </button>
          ))}

          <textarea
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            placeholder="Additional notes (optional)..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-sm mt-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
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
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            disabled={selectedReasons.length === 0 && !customNote.trim()}
          >
            Save Feedback
          </button>
        </div>
      </div>
    </div>
  )
}
