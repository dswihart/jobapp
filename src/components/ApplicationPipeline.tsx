'use client'

import {
  BuildingOfficeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import RoundCard from './RoundCard'
import SharedContextPanel from './SharedContextPanel'
import type { Interview, PipelineApplication } from '@/lib/interview-types'
import { computeOrdinals, inPipelineOrder, roundCount } from '@/lib/pipeline-ordinal'

interface ApplicationPipelineProps {
  application: PipelineApplication
  // ALL of the application's interviews (the ordinal basis), regardless of the
  // active tab filter.
  allInterviews: Interview[]
  // The subset visible under the current tab filter (already filtered by the
  // parent). Ordinals still come from allInterviews so numbers stay stable.
  visibleInterviews: Interview[]
  expanded: boolean
  onToggleCollapse: () => void
  expandedRoundId: string | null
  onToggleRound: (id: string) => void
  onCreateInterview: (applicationId: string) => void
  onOpenDetail: (interview: Interview) => void
  onConfirm: (id: string) => void
  onArchive: (id: string, archived: boolean) => void
  onPrep: (id: string, regenerate: boolean) => void
  preppingId: string | null
  prepError: string
  needsActionCount: number
}

const appStatusColor = (status: string) => {
  switch (status) {
    case 'INTERVIEWING': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 'ARCHIVED': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    case 'APPLIED': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}

export default function ApplicationPipeline({
  application,
  allInterviews,
  visibleInterviews,
  expanded,
  onToggleCollapse,
  expandedRoundId,
  onToggleRound,
  onCreateInterview,
  onOpenDetail,
  onConfirm,
  onArchive,
  onPrep,
  preppingId,
  prepError,
  needsActionCount,
}: ApplicationPipelineProps) {
  const ordinals = computeOrdinals(allInterviews)
  const rounds = roundCount(allInterviews)
  const orderedVisible = inPipelineOrder(visibleInterviews)

  return (
    <div>
      {/* Group header — click to collapse/expand the round pipeline. */}
      <button
        onClick={onToggleCollapse}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        {expanded
          ? <ChevronDownIcon className="h-5 w-5 shrink-0 text-gray-400" />
          : <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-400" />}
        <BuildingOfficeIcon className="h-5 w-5 shrink-0 text-gray-400" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-gray-900 dark:text-white">{application.company}</span>
            <span className="text-gray-400">•</span>
            <span className="truncate text-gray-600 dark:text-gray-300">{application.role}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {needsActionCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <ExclamationCircleIcon className="h-3.5 w-3.5" />
              {needsActionCount} to confirm
            </span>
          )}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {rounds} {rounds === 1 ? 'round' : 'rounds'}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${appStatusColor(application.status)}`}>
            {application.status.replace(/_/g, ' ').toLowerCase()}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 px-4 pb-4 pl-6">
          <div className="flex items-center gap-3 text-xs">
            <Link
              href={`/applications/${application.id}`}
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Open application
            </Link>
            {application.jobUrl && (
              <a
                href={application.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
              >
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" /> Job posting
              </a>
            )}
          </div>

          {/* Phase 4: roster + prep blurb + notes shared across every round. */}
          <SharedContextPanel applicationId={application.id} />

          {orderedVisible.map((interview) => (
            <RoundCard
              key={interview.id}
              interview={interview}
              ordinal={ordinals.get(interview.id) ?? null}
              expanded={expandedRoundId === interview.id}
              onToggleExpand={() => onToggleRound(interview.id)}
              onOpenDetail={onOpenDetail}
              onConfirm={onConfirm}
              onArchive={onArchive}
              onPrep={onPrep}
              preppingId={preppingId}
              prepError={prepError}
            />
          ))}

          <div className="pl-10">
            <button
              onClick={() => onCreateInterview(application.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              <PlusIcon className="h-4 w-4" /> Schedule next round
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
