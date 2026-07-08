'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  UsersIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

// Phase 4 "shared context" panel rendered inside an expanded application
// pipeline. Delivers "enter once, inherited across rounds": an app-scoped
// interviewer roster, a shared prep blurb (interviewContext), and an
// append-only running notes thread — all keyed on the application, not a round.

interface RosterMember {
  id?: string
  name: string
  title?: string | null
  email?: string | null
  // Passthrough fields the panel doesn't edit but must NOT drop when the roster
  // is re-saved (they may have been set via the per-round interviewer editor).
  department?: string | null
  linkedInUrl?: string | null
  notes?: string | null
  impression?: string | null
  topics?: string[]
}

interface ThreadNote {
  id: string
  body: string
  round: number | null
  authorType: string
  createdAt: string
}

export default function SharedContextPanel({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = useState(true)
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [notes, setNotes] = useState<ThreadNote[]>([])
  const [interviewContext, setInterviewContext] = useState('')

  // roster edit state
  const [editingRoster, setEditingRoster] = useState(false)
  const [rosterDraft, setRosterDraft] = useState<RosterMember[]>([])
  const [savingRoster, setSavingRoster] = useState(false)

  // context edit state
  const [editingContext, setEditingContext] = useState(false)
  const [contextDraft, setContextDraft] = useState('')
  const [savingContext, setSavingContext] = useState(false)

  // notes composer
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, nRes] = await Promise.all([
        fetch(`/api/applications/${applicationId}/interviewers`, { cache: 'no-store' }),
        fetch(`/api/applications/${applicationId}/notes`, { cache: 'no-store' }),
      ])
      if (rRes.ok) {
        const rd = await rRes.json()
        setRoster(Array.isArray(rd?.roster) ? rd.roster : [])
      }
      if (nRes.ok) {
        const nd = await nRes.json()
        setNotes(Array.isArray(nd?.notes) ? nd.notes : [])
        setInterviewContext(nd?.interviewContext || '')
      }
    } catch {
      /* surfaced by empty state */
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    load()
  }, [load])

  // ── Roster ────────────────────────────────────────────────────────────────
  const startEditRoster = () => {
    // Keep the full member objects so passthrough fields (department, linkedIn,
    // notes, impression, topics) survive a name/title/email edit + save.
    setRosterDraft(roster.map(r => ({ ...r, title: r.title || '', email: r.email || '' })))
    if (roster.length === 0) setRosterDraft([{ name: '', title: '', email: '' }])
    setEditingRoster(true)
  }
  const saveRoster = async () => {
    setSavingRoster(true)
    try {
      const interviewers = rosterDraft
        .map(r => ({
          ...r,
          name: r.name.trim(),
          title: (r.title || '').trim(),
          email: (r.email || '').trim(),
        }))
        .filter(r => r.name)
      const res = await fetch(`/api/applications/${applicationId}/interviewers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewers }),
      })
      if (res.ok) {
        const d = await res.json()
        setRoster(Array.isArray(d?.roster) ? d.roster : [])
        setEditingRoster(false)
      }
    } finally {
      setSavingRoster(false)
    }
  }

  // ── Context ───────────────────────────────────────────────────────────────
  const saveContext = async () => {
    setSavingContext(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewContext: contextDraft }),
      })
      if (res.ok) {
        setInterviewContext(contextDraft)
        setEditingContext(false)
      }
    } finally {
      setSavingContext(false)
    }
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  const addNote = async () => {
    const body = noteDraft.trim()
    if (!body) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (res.ok) {
        const d = await res.json()
        if (d?.note) setNotes(prev => [...prev, d.note])
        setNoteDraft('')
      }
    } finally {
      setSavingNote(false)
    }
  }

  const inputCls =
    'w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-800/40">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        Shared across all rounds
      </div>

      {loading ? (
        <div className="py-2 text-sm text-gray-400">Loading shared context…</div>
      ) : (
        <div className="space-y-4">
          {/* Roster */}
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <UsersIcon className="h-4 w-4 text-gray-400" /> Interviewers
              </div>
              {!editingRoster && (
                <button
                  onClick={startEditRoster}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  <PencilSquareIcon className="h-3.5 w-3.5" /> {roster.length ? 'Edit' : 'Add'}
                </button>
              )}
            </div>

            {editingRoster ? (
              <div className="space-y-2">
                {rosterDraft.map((m, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-1.5">
                    <input
                      className={`${inputCls} min-w-[7rem] flex-1`}
                      placeholder="Name"
                      value={m.name}
                      onChange={e => setRosterDraft(d => d.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    />
                    <input
                      className={`${inputCls} min-w-[7rem] flex-1`}
                      placeholder="Title (optional)"
                      value={m.title || ''}
                      onChange={e => setRosterDraft(d => d.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                    />
                    <input
                      className={`${inputCls} min-w-[8rem] flex-1`}
                      placeholder="Email (optional)"
                      value={m.email || ''}
                      onChange={e => setRosterDraft(d => d.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))}
                    />
                    <button
                      onClick={() => setRosterDraft(d => d.filter((_, j) => j !== i))}
                      className="rounded p-1 text-gray-400 hover:text-red-600"
                      aria-label="Remove interviewer"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setRosterDraft(d => [...d, { name: '', title: '', email: '' }])}
                    className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 dark:text-gray-300"
                  >
                    <PlusIcon className="h-3.5 w-3.5" /> Add person
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => setEditingRoster(false)} className="text-xs text-gray-500 hover:underline">
                      Cancel
                    </button>
                    <button
                      onClick={saveRoster}
                      disabled={savingRoster}
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingRoster ? 'Saving…' : 'Save roster'}
                    </button>
                  </div>
                </div>
              </div>
            ) : roster.length === 0 ? (
              <p className="text-sm text-gray-400">No interviewers added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {roster.map((m, i) => (
                  <span
                    key={m.id || i}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-gray-700 shadow-sm dark:bg-gray-700 dark:text-gray-200"
                    title={m.email || undefined}
                  >
                    <span className="font-medium">{m.name}</span>
                    {m.title && <span className="text-gray-400">· {m.title}</span>}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Shared prep blurb */}
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <DocumentTextIcon className="h-4 w-4 text-gray-400" /> Prep notes for this company
              </div>
              {!editingContext && (
                <button
                  onClick={() => {
                    setContextDraft(interviewContext)
                    setEditingContext(true)
                  }}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  <PencilSquareIcon className="h-3.5 w-3.5" /> {interviewContext ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {editingContext ? (
              <div className="space-y-2">
                <textarea
                  className={`${inputCls} min-h-[80px]`}
                  placeholder="Anything worth carrying into every round — role focus, who referred you, comp target, key themes…"
                  value={contextDraft}
                  onChange={e => setContextDraft(e.target.value)}
                />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setEditingContext(false)} className="text-xs text-gray-500 hover:underline">
                    Cancel
                  </button>
                  <button
                    onClick={saveContext}
                    disabled={savingContext}
                    className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingContext ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : interviewContext ? (
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{interviewContext}</p>
            ) : (
              <p className="text-sm text-gray-400">No shared prep notes yet.</p>
            )}
          </section>

          {/* Notes thread */}
          <section>
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-400" /> Running notes
              {notes.length > 0 && <span className="text-xs font-normal text-gray-400">({notes.length})</span>}
            </div>
            {notes.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {notes.map(n => (
                  <li key={n.id} className="rounded-md bg-white px-2.5 py-1.5 text-sm text-gray-700 shadow-sm dark:bg-gray-700 dark:text-gray-200">
                    <div className="whitespace-pre-wrap">{n.body}</div>
                    <div className="mt-0.5 text-[11px] text-gray-400">
                      {n.round ? `Round ${n.round} · ` : ''}
                      {n.authorType !== 'user' ? `${n.authorType} · ` : ''}
                      {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-start gap-1.5">
              <textarea
                className={`${inputCls} min-h-[38px]`}
                placeholder="Add a note that stays with this application…"
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') addNote()
                }}
              />
              <button
                onClick={addNote}
                disabled={savingNote || !noteDraft.trim()}
                className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingNote ? '…' : 'Add'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
