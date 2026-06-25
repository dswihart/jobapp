'use client'

import { useState, useEffect } from 'react'

interface Pattern {
  id: number
  pattern_type: string
  pattern_value: string
  frequency: number
  last_seen: string
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  REJECTED_TITLE_KEYWORD: { label: 'Title Keyword', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  REJECTED_COMPANY:       { label: 'Company',       color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  REJECTED_LOCATION:      { label: 'Location',      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  REJECTION_REASON:       { label: 'Reason',        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  REJECTED_SENIORITY:     { label: 'Seniority',     color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
}

export default function RejectionPatternsPanel() {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/patterns')
      .then(r => r.json())
      .then(d => setPatterns(d.patterns ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function deletePattern(id: number) {
    if (!confirm('Remove this learned pattern?')) return
    setDeleting(id)
    await fetch('/api/patterns', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setPatterns(p => p.filter(x => x.id !== id))
    setDeleting(null)
  }

  const types = ['all', ...Array.from(new Set(patterns.map(p => p.pattern_type)))]
  const visible = filter === 'all' ? patterns : patterns.filter(p => p.pattern_type === filter)

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Learned Rejection Patterns</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Patterns the AI has learned from your BAD_MATCH feedback. Used to score down similar jobs.
          </p>
        </div>
        <span className="text-sm text-gray-500">{patterns.length} pattern{patterns.length !== 1 ? 's' : ''}</span>
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading patterns…</div>}

      {!loading && patterns.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed rounded-lg text-gray-400">
          No patterns learned yet. Give thumbs-down feedback on jobs to start learning.
        </div>
      )}

      {!loading && patterns.length > 0 && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {t === 'all' ? 'All' : (TYPE_LABELS[t]?.label ?? t)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {visible.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 group"
              >
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_LABELS[p.pattern_type]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                  {TYPE_LABELS[p.pattern_type]?.label ?? p.pattern_type}
                </span>
                <span className="text-sm text-gray-800 dark:text-gray-200">{p.pattern_value}</span>
                <span className="text-xs text-gray-400">×{p.frequency}</span>
                <button
                  onClick={() => deletePattern(p.id)}
                  disabled={deleting === p.id}
                  className="ml-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
                  title="Remove pattern"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
