"use client"

import { useState, useEffect } from "react"
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline"

interface JobSource {
  id: string
  name: string
  description?: string
  sourceType: string
  feedUrl?: string
  scrapeUrl?: string
  enabled: boolean
  isBuiltIn: boolean
  createdAt: string
}

interface Props {
  userId: string
}

export default function JobSourcesManager({ userId }: Props) {
  const [sources, setSources] = useState<JobSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sourceType: "rss",
    feedUrl: "",
    scrapeUrl: "",
    enabled: true,
  })

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    try {
      const response = await fetch("/api/user-job-sources")
      if (response.ok) {
        const data = await response.json()
        setSources(data.sources)
      }
    } catch (error) {
      console.error("Error loading sources:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/user-job-sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      })

      if (response.ok) {
        setSources(prev =>
          prev.map(s => (s.id === id ? { ...s, enabled } : s))
        )
      }
    } catch (error) {
      console.error("Error toggling source:", error)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return

    try {
      const response = await fetch(`/api/user-job-sources?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setSources(prev => prev.filter(s => s.id !== id))
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete source")
      }
    } catch (error) {
      console.error("Error deleting source:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch("/api/user-job-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await loadSources()
        setShowAddForm(false)
        setFormData({ name: "", description: "", sourceType: "rss", feedUrl: "", scrapeUrl: "", enabled: true })
      }
    } catch (error) {
      console.error("Error saving source:", error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading sources...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Job Sources</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage where your job opportunities come from
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Source
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Add New Source</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Source Type</label>
                <select
                  value={formData.sourceType}
                  onChange={e => setFormData({ ...formData, sourceType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                >
                  <option value="rss">RSS Feed</option>
                  <option value="web_scrape">Web Scraping</option>
                  <option value="api">API</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                rows={2}
              />
            </div>

            {formData.sourceType === "rss" && (
              <div>
                <label className="block text-sm font-medium mb-1">RSS Feed URL</label>
                <input
                  type="url"
                  value={formData.feedUrl}
                  onChange={e => setFormData({ ...formData, feedUrl: e.target.value })}
                  placeholder="https://example.com/jobs.rss"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                  required
                />
              </div>
            )}

            {formData.sourceType === "web_scrape" && (
              <div>
                <label className="block text-sm font-medium mb-1">Website URL</label>
                <input
                  type="url"
                  value={formData.scrapeUrl}
                  onChange={e => setFormData({ ...formData, scrapeUrl: e.target.value })}
                  placeholder="https://example.com/jobs"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Source
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {sources.map(source => (
          <div
            key={source.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={source.enabled}
                  onChange={e => handleToggle(source.id, e.target.checked)}
                  className="h-5 w-5 rounded"
                />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {source.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {source.description || `${source.sourceType.toUpperCase()} source`}
                  </p>
                  {(source.feedUrl || source.scrapeUrl) && (
                    <a
                      href={source.feedUrl || source.scrapeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline block mt-1"
                      title={source.feedUrl || source.scrapeUrl}
                    >
                      🔗 {source.feedUrl || source.scrapeUrl}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {true && (
              <button
                onClick={() => handleDelete(source.id, source.name)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                title="Delete source"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        ))}

        {sources.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-gray-500">
              No job sources configured yet. Add your first source to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
