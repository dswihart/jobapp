"use client"

import { useEffect, useState } from "react"
import { PlusIcon, TrashIcon, PencilSquareIcon, PauseIcon, PlayIcon } from "@heroicons/react/24/outline"

type AtsPlatform = "greenhouse" | "lever" | "ashby" | "workable" | "workday" | "custom"
type CompanyStatus = "active" | "paused" | "rejected"
type SpainPresenceEvidence = "manual" | "careers_page"

interface Company {
  id: string
  name: string
  careersUrl: string
  atsPlatform: AtsPlatform
  atsSlug: string | null
  status: CompanyStatus
  spainPresenceEvidence: SpainPresenceEvidence | null
  spainPresenceUrl: string | null
  hqCountry: string
  sizeBand: string | null
  discoverySource: "manual" | "automated"
  lastScrapedAt: string | null
  lastScrapeError: string | null
  createdAt: string
  updatedAt: string
}

const platformStyle: Record<AtsPlatform, { label: string; badge: string }> = {
  greenhouse: { label: "Greenhouse", badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  lever: { label: "Lever", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  ashby: { label: "Ashby", badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  workable: { label: "Workable", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  workday: { label: "Workday", badge: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
  custom: { label: "Custom", badge: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300" },
}

const statusStyle: Record<CompanyStatus, string> = {
  active: "text-green-700 dark:text-green-400",
  paused: "text-amber-700 dark:text-amber-400",
  rejected: "text-red-700 dark:text-red-400",
}

const emptyForm = {
  name: "",
  careersUrl: "",
  atsPlatform: "greenhouse" as AtsPlatform,
  atsSlug: "",
  status: "active" as CompanyStatus,
  spainPresenceEvidence: "manual" as SpainPresenceEvidence,
  spainPresenceUrl: "",
  hqCountry: "US",
  sizeBand: "",
}

export default function TargetCompaniesManager() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | CompanyStatus>("all")

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/companies")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setCompanies(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (c: Company) => {
    setEditingId(c.id)
    setForm({
      name: c.name,
      careersUrl: c.careersUrl,
      atsPlatform: c.atsPlatform,
      atsSlug: c.atsSlug || "",
      status: c.status,
      spainPresenceEvidence: c.spainPresenceEvidence || "manual",
      spainPresenceUrl: c.spainPresenceUrl || "",
      hqCountry: c.hqCountry,
      sizeBand: c.sizeBand || "",
    })
    setShowForm(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        ...form,
        atsSlug: form.atsSlug || null,
        spainPresenceUrl: form.spainPresenceUrl || null,
        sizeBand: form.sizeBand || null,
      }
      const res = editingId
        ? await fetch(`/api/companies/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `HTTP ${res.status}`)
      }
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSubmitting(false)
    }
  }

  const togglePause = async (c: Company) => {
    const next: CompanyStatus = c.status === "active" ? "paused" : "active"
    const res = await fetch(`/api/companies/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) await load()
  }

  const del = async (c: Company, force: boolean) => {
    const label = force ? "permanently delete" : "mark as rejected"
    if (!confirm(`Are you sure you want to ${label} ${c.name}?`)) return
    const res = await fetch(`/api/companies/${c.id}${force ? "?force=true" : ""}`, {
      method: "DELETE",
    })
    if (res.ok) await load()
  }

  const filtered = companies.filter((c) => statusFilter === "all" || c.status === statusFilter)
  const counts = {
    all: companies.length,
    active: companies.filter((c) => c.status === "active").length,
    paused: companies.filter((c) => c.status === "paused").length,
    rejected: companies.filter((c) => c.status === "rejected").length,
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Target Companies
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            US-HQ tech companies with Spain operational presence. Jobs flow into your opportunities feed automatically via ATS adapters (Greenhouse / Lever / Ashby), filtered to Spain-eligible roles.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" /> Add Company
        </button>
      </div>

      <div className="flex gap-2 mb-4 text-sm">
        {(["all", "active", "paused", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full border ${
              statusFilter === s
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent"
                : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700"
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-neutral-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          No companies yet. Click <strong>Add Company</strong> above, or run the seed script:{" "}
          <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
            npx tsx prisma/seed-target-companies.ts
          </code>
        </div>
      ) : (
        <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
              <tr className="text-left text-neutral-700 dark:text-neutral-300">
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">HQ / Size</th>
                <th className="px-3 py-2 font-medium">Last Scraped</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filtered.map((c) => (
                <tr key={c.id} className="bg-white dark:bg-neutral-950">
                  <td className="px-3 py-2">
                    <div className="font-medium text-neutral-900 dark:text-neutral-50">{c.name}</div>
                    <a
                      href={c.careersUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline break-all"
                    >
                      {c.careersUrl}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${platformStyle[c.atsPlatform].badge}`}>
                      {platformStyle[c.atsPlatform].label}
                    </span>
                    {c.atsSlug && (
                      <div className="mt-0.5 text-xs text-neutral-500 font-mono">{c.atsSlug}</div>
                    )}
                  </td>
                  <td className={`px-3 py-2 font-medium ${statusStyle[c.status]}`}>{c.status}</td>
                  <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                    <div>{c.hqCountry}</div>
                    {c.sizeBand && <div className="text-xs text-neutral-500">{c.sizeBand}</div>}
                  </td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 text-xs">
                    {c.lastScrapedAt ? new Date(c.lastScrapedAt).toLocaleString() : "—"}
                    {c.lastScrapeError && (
                      <div className="mt-0.5 text-red-600 dark:text-red-400" title={c.lastScrapeError}>
                        ⚠ {c.lastScrapeError.slice(0, 60)}
                        {c.lastScrapeError.length > 60 ? "…" : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => togglePause(c)}
                        className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        title={c.status === "active" ? "Pause" : "Resume"}
                      >
                        {c.status === "active" ? (
                          <PauseIcon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                        ) : (
                          <PlayIcon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                      </button>
                      <button
                        onClick={() => del(c, false)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Reject (soft delete)"
                      >
                        <TrashIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
            <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-50">
              {editingId ? "Edit Company" : "Add Target Company"}
            </h2>
            <form onSubmit={submit} className="space-y-4">
              <Field label="Name" required>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Careers URL" required>
                <input
                  type="url"
                  required
                  value={form.careersUrl}
                  onChange={(e) => setForm({ ...form, careersUrl: e.target.value })}
                  className={INPUT_CLASS}
                  placeholder="https://boards.greenhouse.io/example"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="ATS Platform" required>
                  <select
                    value={form.atsPlatform}
                    onChange={(e) => setForm({ ...form, atsPlatform: e.target.value as AtsPlatform })}
                    className={INPUT_CLASS}
                  >
                    <option value="greenhouse">Greenhouse</option>
                    <option value="lever">Lever</option>
                    <option value="ashby">Ashby</option>
                    <option value="workable">Workable</option>
                    <option value="workday">Workday</option>
                    <option value="custom">Custom</option>
                  </select>
                </Field>
                <Field label="ATS Slug" help="e.g. 'datadog' for boards.greenhouse.io/datadog">
                  <input
                    type="text"
                    value={form.atsSlug}
                    onChange={(e) => setForm({ ...form, atsSlug: e.target.value })}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as CompanyStatus })}
                    className={INPUT_CLASS}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </Field>
                <Field label="HQ Country">
                  <input
                    type="text"
                    maxLength={3}
                    value={form.hqCountry}
                    onChange={(e) => setForm({ ...form, hqCountry: e.target.value.toUpperCase() })}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Spain Evidence">
                  <select
                    value={form.spainPresenceEvidence}
                    onChange={(e) =>
                      setForm({ ...form, spainPresenceEvidence: e.target.value as SpainPresenceEvidence })
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="manual">Manual</option>
                    <option value="careers_page">Careers page</option>
                  </select>
                </Field>
                <Field label="Size Band" help="e.g. 50-200">
                  <input
                    type="text"
                    value={form.sizeBand}
                    onChange={(e) => setForm({ ...form, sizeBand: e.target.value })}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
              <Field label="Spain Evidence URL" help="Citation: LinkedIn page / hiring post / team page">
                <input
                  type="url"
                  value={form.spainPresenceUrl}
                  onChange={(e) => setForm({ ...form, spainPresenceUrl: e.target.value })}
                  className={INPUT_CLASS}
                />
              </Field>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                  }}
                  className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Saving…" : editingId ? "Save Changes" : "Add Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

function Field({
  label,
  required,
  help,
  children,
}: {
  label: string
  required?: boolean
  help?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
      {help && <p className="mt-1 text-xs text-neutral-500">{help}</p>}
    </div>
  )
}
