'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarIcon, PlusIcon } from '@heroicons/react/24/outline'
import SummaryEmailButton from './SummaryEmailButton'
import ApplicationPipeline from './ApplicationPipeline'
import type { Interview } from '@/lib/interview-types'

interface InterviewsSectionProps {
  onOpenInterviewDetail: (interview: Interview) => void
  onCreateInterview: (applicationId?: string) => void
  refreshTrigger?: number
}

type TabFilter = 'all' | 'upcoming' | 'completed' | 'archived'

interface Group {
  application: NonNullable<Interview['application']>
  all: Interview[]
  visible: Interview[]
  needsActionCount: number
  soonestUpcoming: number // ms timestamp, or Infinity
  latestActivity: number // ms timestamp, or 0
}

// A date-TBD interview (needs_scheduling or null date) is OPEN: shown in
// Upcoming so the user can schedule/confirm it, never bucketed as Past.
const needsScheduling = (i: Interview) =>
  (i.status === 'needs_scheduling' || !i.scheduledDate) &&
  i.status !== 'completed' && i.status !== 'cancelled'
const isUpcomingDated = (i: Interview) =>
  !!i.scheduledDate && new Date(i.scheduledDate) > new Date() &&
  ['scheduled', 'rescheduled'].includes(i.status)
const isOpenUpcoming = (i: Interview) => needsScheduling(i) || isUpcomingDated(i)
// A round the user still has to act on: an unconfirmed auto-detected row, or one
// that has no date yet.
const isNeedsAction = (i: Interview) => !i.archived && (!!i.autoDetected || needsScheduling(i))

const visibleUnderFilter = (i: Interview, filter: TabFilter): boolean => {
  if (filter === 'archived') return !!i.archived
  if (i.archived) return false
  if (filter === 'upcoming') return isOpenUpcoming(i)
  if (filter === 'completed') return !isOpenUpcoming(i)
  return true // 'all' (non-archived)
}

export default function InterviewsSection({
  onOpenInterviewDetail,
  onCreateInterview,
  refreshTrigger,
}: InterviewsSectionProps) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TabFilter>('all')
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null)
  const [collapseOverrides, setCollapseOverrides] = useState<Record<string, boolean>>({})
  const [preppingId, setPreppingId] = useState<string | null>(null)
  const [prepError, setPrepError] = useState('')

  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true)
      // Always fetch the full set and bucket client-side so needs_scheduling /
      // null-date rounds (which the server 'upcoming' filter would drop) still
      // surface, and so ordinals are computed over the full pipeline.
      const response = await fetch('/api/interviews', { cache: 'no-store' })
      const data = await response.json()
      if (data.interviews) setInterviews(data.interviews)
    } catch (error) {
      console.error('Error fetching interviews:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInterviews()
  }, [fetchInterviews, refreshTrigger])

  // Re-pull when the user returns to the tab/window so interviews created
  // out-of-band (email-sync cron, another device) surface without a reload.
  useEffect(() => {
    const refetchIfVisible = () => {
      if (document.visibilityState === 'visible') fetchInterviews()
    }
    window.addEventListener('focus', refetchIfVisible)
    document.addEventListener('visibilitychange', refetchIfVisible)
    return () => {
      window.removeEventListener('focus', refetchIfVisible)
      document.removeEventListener('visibilitychange', refetchIfVisible)
    }
  }, [fetchInterviews])

  const confirmAutoDetected = async (interviewId: string) => {
    try {
      await fetch('/api/interviews/' + interviewId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoDetected: false }),
      })
      fetchInterviews()
    } catch (error) {
      console.error('Error confirming interview:', error)
    }
  }

  const archiveInterview = async (interviewId: string, archived: boolean) => {
    try {
      await fetch('/api/interviews/' + interviewId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      })
      fetchInterviews()
    } catch (error) {
      console.error('Error archiving interview:', error)
    }
  }

  const prepInterview = async (interviewId: string, regenerate: boolean) => {
    setPreppingId(interviewId)
    setPrepError('')
    try {
      const res = await fetch('/api/interviews/' + interviewId + '/prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setPrepError(data.error || 'Prep failed — try again.')
      } else {
        await fetchInterviews()
      }
    } catch {
      setPrepError('Prep failed — try again.')
    } finally {
      setPreppingId(null)
    }
  }

  // ---- Group interviews by application ----
  const groupsMap = new Map<string, Group>()
  for (const iv of interviews) {
    const app = iv.application
    if (!app) continue // orphan guard; every interview should carry its application
    let g = groupsMap.get(app.id)
    if (!g) {
      g = { application: app, all: [], visible: [], needsActionCount: 0, soonestUpcoming: Infinity, latestActivity: 0 }
      groupsMap.set(app.id, g)
    }
    g.all.push(iv)
    if (isNeedsAction(iv)) g.needsActionCount++
    if (isUpcomingDated(iv) && iv.scheduledDate) {
      g.soonestUpcoming = Math.min(g.soonestUpcoming, new Date(iv.scheduledDate).getTime())
    }
    if (iv.scheduledDate) {
      g.latestActivity = Math.max(g.latestActivity, new Date(iv.scheduledDate).getTime())
    }
  }

  const groups = Array.from(groupsMap.values())
  for (const g of groups) {
    g.visible = g.all.filter(i => visibleUnderFilter(i, filter))
  }
  const visibleGroups = groups.filter(g => g.visible.length > 0)

  // Order: soonest upcoming dated round first; then needs-action groups; then
  // most recent activity.
  visibleGroups.sort((a, b) => {
    if (a.soonestUpcoming !== b.soonestUpcoming) return a.soonestUpcoming - b.soonestUpcoming
    const aNeeds = a.needsActionCount > 0 ? 0 : 1
    const bNeeds = b.needsActionCount > 0 ? 0 : 1
    if (aNeeds !== bNeeds) return aNeeds - bNeeds
    return b.latestActivity - a.latestActivity
  })

  // Nearest-upcoming group (first finite soonestUpcoming) is expanded by default.
  const nearestUpcomingId = visibleGroups.find(g => Number.isFinite(g.soonestUpcoming))?.application.id
  const isExpanded = (g: Group): boolean => {
    const override = collapseOverrides[g.application.id]
    if (override !== undefined) return override
    return g.needsActionCount > 0 || g.application.id === nearestUpcomingId
  }
  const toggleGroup = (id: string) =>
    setCollapseOverrides(prev => {
      const g = groups.find(x => x.application.id === id)
      const currentlyExpanded = prev[id] !== undefined
        ? prev[id]
        : (!!g && (g.needsActionCount > 0 || id === nearestUpcomingId))
      return { ...prev, [id]: !currentlyExpanded }
    })

  const upcomingCount = interviews.filter(i => !i.archived && isOpenUpcoming(i)).length

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded bg-gray-200 dark:bg-gray-700" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white shadow dark:bg-gray-800">
      <div className="border-b border-gray-200 p-6 dark:border-gray-700">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Interviews</h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {interviews.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SummaryEmailButton />
            <button
              onClick={() => onCreateInterview()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Add Interview</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {(['all', 'upcoming', 'completed', 'archived'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : f === 'completed' ? 'Past' : 'Archived'}
              {f === 'upcoming' && upcomingCount > 0 && (
                <span className="ml-2 rounded-full bg-blue-600 px-1.5 py-0.5 text-xs text-white">{upcomingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {visibleGroups.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <CalendarIcon className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p className="text-lg font-medium">No interviews found</p>
            <p className="mt-1 text-sm">
              {filter === 'upcoming'
                ? 'Schedule your next interview to see it here'
                : 'Add interviews to track your progress'}
            </p>
          </div>
        ) : (
          visibleGroups.map((g) => (
            <ApplicationPipeline
              key={g.application.id}
              application={g.application}
              allInterviews={g.all}
              visibleInterviews={g.visible}
              expanded={isExpanded(g)}
              onToggleCollapse={() => toggleGroup(g.application.id)}
              expandedRoundId={expandedRoundId}
              onToggleRound={(id) => setExpandedRoundId(expandedRoundId === id ? null : id)}
              onCreateInterview={onCreateInterview}
              onOpenDetail={onOpenInterviewDetail}
              onConfirm={confirmAutoDetected}
              onArchive={archiveInterview}
              onPrep={prepInterview}
              preppingId={preppingId}
              prepError={prepError}
              needsActionCount={g.needsActionCount}
            />
          ))
        )}
      </div>
    </div>
  )
}
