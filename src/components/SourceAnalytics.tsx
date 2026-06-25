'use client'
import { useState, useEffect } from 'react'

interface SourceStat {
  source: string
  jobCount: number
  avgFitScore: number
  thumbsUp: number
  appliedCount: number
}

export default function SourceAnalytics() {
  const [stats, setStats] = useState<SourceStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/stats/sources')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => { setStats(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  if (loading) return <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-lg" />
  if (error) return <p className="text-red-500 dark:text-red-400 text-sm">Failed to load source data.</p>
  if (stats.length === 0) return <p className="text-gray-500 dark:text-gray-400 text-sm">No source data yet. Sources will appear after jobs are scanned.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th className="pb-2 pr-4 font-medium">Source</th>
            <th className="pb-2 pr-4 font-medium text-right">Jobs</th>
            <th className="pb-2 pr-4 font-medium text-right">Avg Score</th>
            <th className="pb-2 pr-4 font-medium text-right">Liked</th>
            <th className="pb-2 font-medium text-right">Applied</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {stats.map(s => (
            <tr key={s.source} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{s.source}</td>
              <td className="py-2 pr-4 text-right text-gray-600 dark:text-gray-400">{s.jobCount}</td>
              <td className="py-2 pr-4 text-right">
                <span className={`font-medium ${s.avgFitScore >= 70 ? 'text-green-600 dark:text-green-400' : s.avgFitScore >= 50 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                  {s.avgFitScore}%
                </span>
              </td>
              <td className="py-2 pr-4 text-right text-gray-600 dark:text-gray-400">{s.thumbsUp}</td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{s.appliedCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
