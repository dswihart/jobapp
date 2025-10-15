'use client'
import { useState } from 'react'
import { MagnifyingGlassIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface JobMonitorProps {
  userId: string
  onComplete?: () => void
}

export default function JobMonitor({ userId, onComplete }: JobMonitorProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{message: string, count: number} | null>(null)
  const [error, setError] = useState('')

  const runMonitor = async () => {
    setLoading(true)
    setResult(null)
    setError('')

    try {
      const response = await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const data = await response.json()

      if (data.success) {
        setResult({ message: data.message, count: data.count || 0 })
        if (onComplete) {
          setTimeout(() => onComplete(), 500)
        }
      } else {
        setError(data.error || 'Failed to monitor job boards')
      }
    } catch (err) {
      setError('Error monitoring job boards')
      console.error('Monitor error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={runMonitor}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        <MagnifyingGlassIcon className="h-5 w-5" />
        {loading ? 'Scanning Job Boards...' : 'Scan New Jobs'}
      </button>
      {result && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
          <CheckCircleIcon className="h-5 w-5" />
          <span>{result.message}</span>
        </div>
      )}
      {error && (
        <div className="px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
