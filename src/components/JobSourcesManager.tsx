"use client"

import { useState, useEffect } from "react"
import {
  PlusIcon,
  TrashIcon,
  BeakerIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline"

interface JobSource {
  id: string
  name: string
  description?: string
  sourceType: string
  feedUrl?: string
  scrapeUrl?: string
  scrapeSelector?: string
  titleSelector?: string
  companySelector?: string
  linkSelector?: string
  descriptionSelector?: string
  apiEndpoint?: string
  apiKey?: string
  searchKeywords?: string[]
  excludeKeywords?: string[]
  enabled: boolean
  isBuiltIn: boolean
  createdAt: string
}

interface TestResult {
  success: boolean
  jobCount?: number
  sampleTitles?: string[]
  error?: string
}

interface Props {
  userId: string
}

const sourceTypeConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  rss: {
    label: "RSS",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/20",
  },
  api: {
    label: "API",
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/20",
  },
  web_scrape: {
    label: "Scrape",
    color: "text-teal-700 dark:text-teal-400",
    bg: "bg-teal-100 dark:bg-teal-900/20",
  },
}

const emptyForm = {
  name: "",
  description: "",
  sourceType: "rss",
  feedUrl: "",
  scrapeUrl: "",
  scrapeSelector: "",
  titleSelector: "",
  companySelector: "",
  linkSelector: "",
  descriptionSelector: "",
  apiEndpoint: "",
  apiKey: "",
  searchKeywords: "",
  excludeKeywords: "",
  enabled: true,
}

export default function JobSourcesManager({ userId }: Props) {
  const [sources, setSources] = useState<JobSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [testingSource, setTestingSource] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [expandedSource, setExpandedSource] = useState<string | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })

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
        setSources((prev) =>
          prev.map((s) => (s.id === id ? { ...s, enabled } : s))
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
        setSources((prev) => prev.filter((s) => s.id !== id))
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete source")
      }
    } catch (error) {
      console.error("Error deleting source:", error)
    }
  }

  const handleTestSource = async (id: string) => {
    setTestingSource(id)
    setExpandedSource(id)
    try {
      const response = await fetch("/api/user-job-sources/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: id }),
      })
      const data = await response.json()
      setTestResults((prev) => ({ ...prev, [id]: data }))
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, error: "Network error" },
      }))
    } finally {
      setTestingSource(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      ...formData,
      searchKeywords: formData.searchKeywords
        ? formData.searchKeywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        : [],
      excludeKeywords: formData.excludeKeywords
        ? formData.excludeKeywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        : [],
    }

    try {
      const response = await fetch("/api/user-job-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        await loadSources()
        setShowAddForm(false)
        setFormData({ ...emptyForm })
      }
    } catch (error) {
      console.error("Error saving source:", error)
    }
  }

  // Group sources by type
  const groupedSources = sources.reduce<Record<string, JobSource[]>>(
    (acc, source) => {
      const type = source.sourceType || "other"
      if (!acc[type]) acc[type] = []
      acc[type].push(source)
      return acc
    },
    {}
  )

  if (loading) {
    return <div className="text-center py-8">Loading sources...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Job Sources
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {sources.filter((s) => s.enabled).length} of {sources.length}{" "}
            sources enabled
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Source Type
                </label>
                <select
                  value={formData.sourceType}
                  onChange={(e) =>
                    setFormData({ ...formData, sourceType: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                >
                  <option value="rss">RSS Feed</option>
                  <option value="web_scrape">Web Scraping</option>
                  <option value="api">API</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                rows={2}
              />
            </div>

            {/* Source-type-specific fields */}
            {formData.sourceType === "rss" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  RSS Feed URL
                </label>
                <input
                  type="url"
                  value={formData.feedUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, feedUrl: e.target.value })
                  }
                  placeholder="https://example.com/jobs.rss"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                  required
                />
              </div>
            )}

            {formData.sourceType === "api" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    API Endpoint
                  </label>
                  <input
                    type="url"
                    value={formData.apiEndpoint}
                    onChange={(e) =>
                      setFormData({ ...formData, apiEndpoint: e.target.value })
                    }
                    placeholder="https://api.example.com/jobs"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    API Key (optional)
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, apiKey: e.target.value })
                    }
                    placeholder="Bearer token or API key"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                  />
                </div>
              </>
            )}

            {formData.sourceType === "web_scrape" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.scrapeUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, scrapeUrl: e.target.value })
                    }
                    placeholder="https://example.com/jobs"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Container Selector
                    </label>
                    <input
                      type="text"
                      value={formData.scrapeSelector}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scrapeSelector: e.target.value,
                        })
                      }
                      placeholder=".job-listing, .job-card"
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Title Selector
                    </label>
                    <input
                      type="text"
                      value={formData.titleSelector}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          titleSelector: e.target.value,
                        })
                      }
                      placeholder="h2, .job-title"
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Company Selector
                    </label>
                    <input
                      type="text"
                      value={formData.companySelector}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companySelector: e.target.value,
                        })
                      }
                      placeholder=".company, .employer"
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Link Selector
                    </label>
                    <input
                      type="text"
                      value={formData.linkSelector}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          linkSelector: e.target.value,
                        })
                      }
                      placeholder="a"
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Keywords section - all source types */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                Keyword Filters
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Search Keywords
                  </label>
                  <input
                    type="text"
                    value={formData.searchKeywords}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        searchKeywords: e.target.value,
                      })
                    }
                    placeholder="cybersecurity, security engineer, SIEM"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Comma-separated. Only keep jobs matching these terms.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Exclude Keywords
                  </label>
                  <input
                    type="text"
                    value={formData.excludeKeywords}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        excludeKeywords: e.target.value,
                      })
                    }
                    placeholder="intern, junior, part-time"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Comma-separated. Remove jobs containing these terms.
                  </p>
                </div>
              </div>
            </div>

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

      {/* Grouped source list */}
      {Object.entries(groupedSources).map(([type, typeSources]) => {
        const config = sourceTypeConfig[type] || {
          label: type,
          color: "text-gray-700 dark:text-gray-400",
          bg: "bg-gray-100 dark:bg-gray-900/20",
        }
        return (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2 py-1 rounded ${config.color} ${config.bg}`}
              >
                {config.label}
              </span>
              <span className="text-xs text-gray-500">
                {typeSources.filter((s) => s.enabled).length}/
                {typeSources.length} enabled
              </span>
            </div>

            {typeSources.map((source) => {
              const testResult = testResults[source.id]
              const isExpanded = expandedSource === source.id
              const isTesting = testingSource === source.id

              return (
                <div
                  key={source.id}
                  className={`border rounded-lg overflow-hidden ${
                    source.enabled
                      ? "border-gray-200 dark:border-gray-700"
                      : "border-gray-100 dark:border-gray-800 opacity-60"
                  }`}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={source.enabled}
                        onChange={(e) =>
                          handleToggle(source.id, e.target.checked)
                        }
                        className="h-5 w-5 rounded flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {source.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {source.feedUrl ||
                            source.scrapeUrl ||
                            source.apiEndpoint ||
                            "No URL configured"}
                        </p>
                        {(source.searchKeywords?.length ?? 0) > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {source.searchKeywords
                              ?.slice(0, 3)
                              .map((kw, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded"
                                >
                                  {kw}
                                </span>
                              ))}
                            {(source.searchKeywords?.length ?? 0) > 3 && (
                              <span className="text-xs text-gray-400">
                                +{(source.searchKeywords?.length ?? 0) - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Test result indicator */}
                      {testResult && (
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            testResult.success
                              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                          }`}
                        >
                          {testResult.success
                            ? `${testResult.jobCount} jobs`
                            : "Failed"}
                        </span>
                      )}

                      <button
                        onClick={() => handleTestSource(source.id)}
                        disabled={isTesting}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50"
                        title="Test source"
                      >
                        {isTesting ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        ) : (
                          <BeakerIcon className="h-5 w-5" />
                        )}
                      </button>

                      <button
                        onClick={() =>
                          setExpandedSource(isExpanded ? null : source.id)
                        }
                        className="p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                        title="Details"
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="h-5 w-5" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(source.id, source.name)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete source"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 text-sm space-y-2">
                      {source.description && (
                        <p className="text-gray-600 dark:text-gray-400">
                          {source.description}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium text-gray-500">
                            Type:
                          </span>{" "}
                          {source.sourceType}
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">
                            Created:
                          </span>{" "}
                          {new Date(source.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {(source.searchKeywords?.length ?? 0) > 0 && (
                        <div>
                          <span className="font-medium text-xs text-gray-500">
                            Search Keywords:
                          </span>
                          <div className="flex gap-1 flex-wrap mt-1">
                            {source.searchKeywords?.map((kw, i) => (
                              <span
                                key={i}
                                className="text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(source.excludeKeywords?.length ?? 0) > 0 && (
                        <div>
                          <span className="font-medium text-xs text-gray-500">
                            Exclude Keywords:
                          </span>
                          <div className="flex gap-1 flex-wrap mt-1">
                            {source.excludeKeywords?.map((kw, i) => (
                              <span
                                key={i}
                                className="text-xs px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Test result details */}
                      {testResult && testResult.success && testResult.sampleTitles && (
                        <div>
                          <span className="font-medium text-xs text-gray-500">
                            Sample jobs found:
                          </span>
                          <ul className="mt-1 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                            {testResult.sampleTitles.map((title, i) => (
                              <li key={i} className="truncate">
                                &bull; {title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {testResult && !testResult.success && (
                        <div className="text-xs text-red-600 dark:text-red-400">
                          Error: {testResult.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {sources.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500">
            No job sources configured yet. Add your first source to get started.
          </p>
        </div>
      )}
    </div>
  )
}
