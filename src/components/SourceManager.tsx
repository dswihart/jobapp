'use client'
import { useState, useEffect } from 'react'
import { PlusIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'

interface JobSourceConfig {
  name: string
  enabled: boolean
  type: 'api' | 'rss'
  rateLimitPerHour?: number
}

interface NewSource {
  name: string
  apiUrl: string
  type: 'api' | 'rss'
}

export default function SourceManager() {
  const [sources, setSources] = useState<JobSourceConfig[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSource, setNewSource] = useState<NewSource>({
    name: '',
    apiUrl: '',
    type: 'api'
  })
  const [loading, setLoading] = useState(false)
  const [deployStatus, setDeployStatus] = useState('')
  const [deletingSource, setDeletingSource] = useState<string | null>(null)

  // Built-in sources that cannot be deleted
  const builtInSources = ['Remotive', 'The Muse']

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    try {
      const response = await fetch('/api/sources')
      const data = await response.json()
      setSources(data.sources || [])
    } catch (error) {
      console.error('Failed to load sources:', error)
    }
  }

  const toggleSource = async (name: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/sources/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, enabled })
      })

      if (response.ok) {
        loadSources()
      }
    } catch (error) {
      console.error('Failed to toggle source:', error)
    }
  }

  const handleDeleteSource = async (sourceName: string) => {
    if (builtInSources.includes(sourceName)) {
      alert('Cannot delete built-in sources')
      return
    }

    if (!confirm(`Are you sure you want to delete "${sourceName}"?\n\nThis will:\n- Delete the source file\n- Rebuild the application\n- Restart the service\n\nThis action cannot be undone.`)) {
      return
    }

    setDeletingSource(sourceName)

    try {
      const response = await fetch('/api/sources/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceName })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Source "${sourceName}" deleted successfully!\n\nThe application will rebuild automatically. This may take 30-60 seconds.`)
        // Wait a bit then reload
        setTimeout(() => {
          loadSources()
        }, 2000)
      } else {
        alert(`Failed to delete source: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to delete source:', error)
      alert('Failed to delete source')
    } finally {
      setDeletingSource(null)
    }
  }

  const handleAddSource = () => {
    setShowAddForm(true)
    setDeployStatus('')
  }

  const handleSubmitNewSource = async () => {
    if (!newSource.name || !newSource.apiUrl) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)
    setDeployStatus('Creating source file...')

    try {
      const response = await fetch('/api/sources/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource)
      })

      const data = await response.json()

      if (response.ok) {
        setDeployStatus('✓ Source created! Rebuilding application...')

        setTimeout(() => {
          setDeployStatus('✓ Rebuilding... This may take 30-60 seconds.')
        }, 2000)

        setTimeout(() => {
          setDeployStatus('✓ Restarting service...')
        }, 10000)

        setTimeout(() => {
          setDeployStatus('✓ Complete! Reloading sources...')
          loadSources()
        }, 15000)

        setTimeout(() => {
          setNewSource({ name: '', apiUrl: '', type: 'api' })
          setShowAddForm(false)
          setDeployStatus('')
          alert(`Source "${newSource.name}" added successfully! It will appear in the next scan.`)
        }, 18000)

      } else {
        setDeployStatus('')
        alert(data.error || 'Failed to add source')
      }
    } catch (error) {
      console.error('Failed to add source:', error)
      setDeployStatus('')
      alert('Failed to add source')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Job Sources</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage where your job listings come from
          </p>
        </div>
        <button
          onClick={handleAddSource}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Source
        </button>
      </div>

      {/* Source List */}
      <div className="space-y-3">
        {sources.map((source) => (
          <div
            key={source.name}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {source.enabled ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-gray-400" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{source.name}</h3>
                  {builtInSources.includes(source.name) && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                      Built-in
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-neutral-700 rounded">
                    {source.type.toUpperCase()}
                  </span>
                  {source.rateLimitPerHour && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {source.rateLimitPerHour} req/hour limit
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={source.enabled}
                  onChange={(e) => toggleSource(source.name, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>

              {/* Delete Button */}
              {!builtInSources.includes(source.name) && (
                <button
                  onClick={() => handleDeleteSource(source.name)}
                  disabled={deletingSource === source.name}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete source"
                >
                  {deletingSource === source.name ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <TrashIcon className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {sources.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No sources configured. Add your first source!
          </div>
        )}
      </div>

      {/* Add Source Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-4">Add New Job Source</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Source Name</label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="e.g., LinkedIn, Indeed, Stack Overflow"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">API URL</label>
                <input
                  type="text"
                  value={newSource.apiUrl}
                  onChange={(e) => setNewSource({ ...newSource, apiUrl: e.target.value })}
                  placeholder="https://api.jobboard.com/jobs"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Source Type</label>
                <select
                  value={newSource.type}
                  onChange={(e) => setNewSource({ ...newSource, type: e.target.value as 'api' | 'rss' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="api">API</option>
                  <option value="rss">RSS Feed</option>
                </select>
              </div>

              {deployStatus && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
                  <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {deployStatus}
                  </p>
                </div>
              )}

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-300">
                  <strong>✓ Fully Automated:</strong> No manual steps required!
                </p>
                <ul className="list-disc list-inside text-sm text-green-700 dark:text-green-400 mt-2 space-y-1">
                  <li>Source file will be created automatically</li>
                  <li>Application will rebuild automatically</li>
                  <li>Service will restart automatically</li>
                  <li>Your new source will be ready in ~1 minute</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmitNewSource}
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  'Add Source & Deploy'
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewSource({ name: '', apiUrl: '', type: 'api' })
                  setDeployStatus('')
                }}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 dark:bg-neutral-700 rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          💡 How It Works
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-400 mb-2">
          When you add or delete a source, the system automatically:
        </p>
        <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
          <li>Creates or deletes the source integration file</li>
          <li>Rebuilds the application with your changes</li>
          <li>Restarts the service to apply updates</li>
          <li>Your sources are immediately ready to use!</li>
        </ol>
        <p className="text-xs text-blue-600 dark:text-blue-500 mt-3">
          Note: Built-in sources (Remotive, The Muse) cannot be deleted. Custom sources can be removed at any time.
        </p>
      </div>
    </div>
  )
}
